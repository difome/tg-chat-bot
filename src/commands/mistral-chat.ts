import {ChatCommand} from "../base/chat-command";
import {Requirements} from "../base/requirements";
import {Requirement} from "../base/requirement";
import {Message} from "typescript-telegram-bot-api";
import {
    collectReplyChainText,
    editMessageText,
    escapeMarkdownV2Text,
    extractText,
    logError,
    oldReplyToMessage,
    startIntervalEditor
} from "../util/utils";
import {Environment} from "../common/environment";
import {bot, mistralAi} from "../index";
import {MessageStore} from "../common/message-store";
import fs from "node:fs";

export class MistralChat extends ChatCommand {
    command = "mistral";
    argsMode = "required" as const;

    title = "/mistral";
    description = "Chat with AI (Mistral)";

    requirements = Requirements.Build(Requirement.BOT_CREATOR);

    async execute(msg: Message, match?: RegExpExecArray): Promise<void> {
        console.log("match", match);
        return this.executeMistral(msg, match?.[3]);
    }

    async executeMistral(msg: Message, text: string): Promise<void> {
        if (!text || text.trim().length === 0) return;

        const chatId = msg.chat.id;

        const messageParts = await collectReplyChainText(msg, "/mistral");
        console.log("MESSAGE PARTS", messageParts);

        const chatMessages = messageParts.map(part => {
            const content = [];
            content.push({
                type: "text",
                text: (Environment.USE_NAMES_IN_PROMPT && !part.bot ? `MESSAGE FROM USER "${part.name}":\n` : "") + extractText(part.content, Environment.BOT_PREFIX),
            });

            if (part.images && part.images.length > 0) {
                const base64Image = Buffer.from(fs.readFileSync(part.images[0])).toString("base64");
                content.push({
                    type: "image_url",
                    imageUrl: "data:image/jpeg;base64," + base64Image
                });
            }

            return {
                role: part.bot ? "assistant" : "user",
                content: content,
            };
        });
        chatMessages.reverse();
        chatMessages.unshift({role: "system", content: [{type: "text", text: Environment.SYSTEM_PROMPT}]});

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

            const stream = await mistralAi.chat.stream({
                model: Environment.MISTRAL_MODEL,
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
            await editor.tick();

            try {
                for await (const chunk of stream) {
                    const text = chunk.data.choices[0].delta.content;
                    console.log("chunk", chunk);

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

                await oldReplyToMessage(waitMessage, `⏱️ ${diff}s`);
            }
        } catch (error) {
            console.error(error);

            // if (error instanceof ApiError) {
            //     if (error.status === 429) {
            //         await replyToMessage(waitMessage, "На сегодня всё, лимиты закончились.").catch(logError);
            //         return;
            //     }
            // }

            await oldReplyToMessage(waitMessage, `Произошла ошибка!\n${error.toString()}`).catch(logError);
        }
    }
}