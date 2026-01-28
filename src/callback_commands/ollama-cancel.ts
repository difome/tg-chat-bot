import {CallbackCommand} from "../base/callback-command";
import {CallbackQuery} from "typescript-telegram-bot-api";
import {abortOllamaRequest, bot, getOllamaRequest} from "../index";
import {logError} from "../util/utils";
import {MessageStore} from "../common/message-store";
import {StoredMessage} from "../model/stored-message";
import {Requirements} from "../base/requirements";
import {Requirement} from "../base/requirement";
import {Environment} from "../common/environment";

export class OllamaCancel extends CallbackCommand {

    data = "/cancel_ollama";
    text = "Cancel Ollama generation";

    requirements = Requirements.Build(Requirement.SAME_USER);

    async execute(query: CallbackQuery): Promise<void> {
        const chatId = query.message.chat.id;
        const fromId = query.from.id;
        const messageId = query.message.message_id;

        const uuid = query.data.split(" ")[1];
        if (!uuid) return;

        const request = getOllamaRequest(uuid);
        if (request) {
            if (request.fromId !== fromId && fromId !== Environment.CREATOR_ID) return;

            const aborted = abortOllamaRequest(uuid);
            console.log(`aborted request ${uuid}:`, aborted);
        } else {
            console.log(`no request with uuid "${uuid}" found`);
        }

        let msg: StoredMessage | null = null;
        try {
            msg = await MessageStore.get(chatId, messageId);
        } catch (e) {
            logError(e);
        }

        console.log(`Message for ${chatId}-${messageId}:`, msg);

        let content: string | null = null;

        if (msg?.text?.trim()?.length > 0) {
            content = msg?.text.trim();
            if (content.length + Environment.ollamaCancelledText.length > 4096) {
                content = content.substring(0, 4096 - Environment.ollamaCancelledText.length - 2) + "\n";
            }
        }

        const newText = `${content ? content : ""}${Environment.ollamaCancelledText}`;

        try {
            await bot.editMessageText({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: "Markdown",
                reply_markup: {inline_keyboard: []},
            });

            if (msg) {
                await MessageStore.put(msg);
            }
        } catch (e) {
            logError(e);
        }
    }
}