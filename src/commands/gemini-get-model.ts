import {ChatCommand} from "../base/chat-command";
import {Message} from "typescript-telegram-bot-api";
import {logError, replyToMessage} from "../util/utils";
import {Environment} from "../common/environment";

export class GeminiGetModel extends ChatCommand {
    title = "/geminiGetModel";
    description = "Get current Gemini model";

    async execute(msg: Message): Promise<void> {
        await replyToMessage({message: msg, text: `Текущая модель: "${Environment.GEMINI_MODEL}"`}).catch(logError);
    }
}