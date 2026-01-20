export type StoredMessage = {
    chatId: number;
    id: number;
    replyToMessageId?: number | null;
    fromId: number;
    text?: string;
    date: number;
    photoMaxSizeFilePath?: string | null;
};