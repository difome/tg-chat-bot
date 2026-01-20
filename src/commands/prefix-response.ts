import {ChatCommand} from "../base/chat-command";
import {Message} from "typescript-telegram-bot-api";
import {logError, randomValue, oldReplyToMessage} from "../util/utils";
import {prefixAnswers} from "../db/database";

export class PrefixResponse extends ChatCommand {
    async execute(msg: Message): Promise<void> {
        await oldReplyToMessage(msg, randomValue(prefixAnswers)).catch(logError);
    }
}