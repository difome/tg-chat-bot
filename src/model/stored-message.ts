export type StoredMessage = {
    chatId: number;
    id: number;
    replyToMessageId?: number;
    fromId: number;
    text?: string;
    date: number;
    photoMaxSizeFilePath?: string[];
};