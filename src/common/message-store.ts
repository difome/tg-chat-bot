import {StoredMessage} from "../model/stored-message";
import {Message} from "typescript-telegram-bot-api";
import {extractTextMessage, getPhotoMaxSize, isStoredMessage} from "../util/utils";
import {messageDao} from "../index";

export class MessageStore {
    private static map = new Map<string, StoredMessage>();

    private static key(chatId: number, messageId: number) {
        return `${chatId}:${messageId}`;
    }

    static all(): Map<string, StoredMessage> {
        return this.map;
    }

    static async put(m: Message | StoredMessage): Promise<StoredMessage> {
        const msg: StoredMessage = isStoredMessage(m) ? m : {
            chatId: m.chat.id,
            id: m.message_id,
            replyToMessageId: m.reply_to_message?.message_id ?? null,
            fromId: m.from.id,
            text: extractTextMessage(m),
            date: m.date ?? 0,
            photoMaxSizeFilePath: m.photo ? [getPhotoMaxSize(m.photo).file_unique_id] : null
        };

        this.map.set(this.key(msg.chatId, msg.id), msg);
        await messageDao.insert(messageDao.mapStoredTo([msg]));
        return msg;
    }

    static async get(chatId: number, messageId: number): Promise<StoredMessage | null> {
        const message = await messageDao.getById({chatId: chatId, id: messageId});
        if (!message) return null;

        this.map.set(this.key(message.chatId, messageId), message);
        return message;
    }

    static clear() {
        this.map.clear();
    }
}