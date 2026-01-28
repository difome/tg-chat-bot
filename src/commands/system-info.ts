import {ChatCommand} from "../base/chat-command";
import {logError, replyToMessage} from "../util/utils";
import {Message} from "typescript-telegram-bot-api";

export class SystemInfo extends ChatCommand {
    title = "/systemInfo";
    description = "System information";

    private static systemInfoText: string;

    static setSystemInfo(info: string) {
        SystemInfo.systemInfoText = info;
    }

    async execute(msg: Message) {
        await replyToMessage({message: msg, text: SystemInfo.systemInfoText}).catch(logError);
    }
}