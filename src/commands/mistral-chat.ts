import {ChatCommand} from "../base/chat-command";
import {Requirements} from "../base/requirements";
import {Requirement} from "../base/requirement";
import {Message} from "typescript-telegram-bot-api";
import {
    collectReplyChainText,
    editMessageText,
    escapeMarkdownV2Text,
    logError,
    replyToMessage,
    startIntervalEditor
} from "../util/utils";
import {Environment} from "../common/environment";
import {bot} from "../index";
import {MessageStore} from "../common/message-store";
import {Mistral} from "@mistralai/mistralai";

export class MistralChat extends ChatCommand {
    regexp = /^\/mistral\s([^]+)/i;
    title = "/mistral";
    description = "Chat with AI (Mistral)";

    requirements = Requirements.Build(Requirement.BOT_CREATOR);

    private mistralAi = new Mistral({apiKey: Environment.MISTRAL_API_KEY});

    async execute(msg: Message, match?: RegExpExecArray): Promise<void> {
        console.log("match", match);
        return this.executeMistral(msg, match?.[1]);
    }

    async executeMistral(msg: Message, text: string): Promise<void> {
        if (!text || text.trim().length === 0) return;

        const chatId = msg.chat.id;

        const messageParts = await collectReplyChainText(msg, "/mistral");
        console.log("MESSAGE PARTS", messageParts);

        const chatMessages = messageParts.map(part => {
            return {
                role: part.bot ? "assistant" : "user",
                content: part.content
            };
        });
        chatMessages.reverse();
        chatMessages.unshift({role: "system", content: Environment.SYSTEM_PROMPT});

        // let chatContent = "";
        // for (const part of chatMessages) {
            // chatContent += `${part.role.toUpperCase()}:\n${part.content}\n\n`;
        // }

        // chatContent = chatContent.trim();

        let waitMessage: Message;

        const startTime = new Date().getSeconds();

        try {
            waitMessage = await bot.sendMessage({
                chat_id: chatId,
                text: Environment.waitText,
                reply_parameters: {
                    chat_id: chatId,
                    message_id: msg.message_id
                }
            });

            const stream = await this.mistralAi.chat.stream({
                model: "mistral-small-latest",
                messages: chatMessages as any
            });

            let messageText = "";
            let shouldBreak = false;
            let diff = 0;

            const editor = startIntervalEditor({
                intervalMs: 4500,
                getText: () => messageText,
                editFn: async (text) => {
                    await editMessageText(chatId, waitMessage.message_id, escapeMarkdownV2Text(text), "Markdown");
                },
                onStop: async () => {
                }
            });

            try {
                for await (const chunk of stream) {
                    // const text = chunk.text;
                    const text = chunk.data.choices[0].delta.content;
                    console.log("chunk", chunk);

                    // const text = "";
                    const length = (messageText + text).length;
                    if (length > 4096) {
                        messageText = messageText.slice(0, 4093) + "...";
                        shouldBreak = true;
                    } else {
                        messageText += text;
                    }

                    if (shouldBreak) {
                        console.log("messageText", messageText);
                        console.log("length", length);
                        console.log("break", true);

                        diff = Math.abs(new Date().getSeconds() - startTime);
                        await editor.tick();
                        await editor.stop();
                        break;
                    }

                    console.log("messageText", messageText);
                    console.log("length", messageText.length);

                    diff = Math.abs(new Date().getSeconds() - startTime);
                }
            } finally {
                await editor.tick();
                await editor.stop();

                console.log("time", diff);
                console.log("ended", true);

                waitMessage.reply_to_message = msg;
                waitMessage.text = messageText;
                MessageStore.put(waitMessage);

                await replyToMessage(waitMessage, `⏱️ ${diff}s`);
            }
        } catch (error) {
            console.error(error);

            // if (error instanceof ApiError) {
            //     if (error.status === 429) {
            //         await replyToMessage(waitMessage, "На сегодня всё, лимиты закончились.").catch(logError);
            //         return;
            //     }
            // }

            await replyToMessage(waitMessage, `Произошла ошибка!\n${error.toString()}`).catch(logError);
        }
    }
}