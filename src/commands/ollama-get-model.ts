import {ChatCommand} from "../base/chat-command";
import {Message} from "typescript-telegram-bot-api";
import {boolToEmoji, logError, replyToMessage} from "../util/utils";
import {Environment} from "../common/environment";
import {ollama} from "../index";
import {ShowResponse} from "ollama";

export class OllamaGetModel extends ChatCommand {
    title = "/ollamaGetModel";
    description = "Ollama model info";

    async execute(msg: Message): Promise<void> {
        try {
            const showResponse = await this.loadModelInfo();

            const caps = showResponse.capabilities;

            const text = "```Ollama\n" +
                `model: ${Environment.OLLAMA_MODEL}\n\n` +
                `vision: ${boolToEmoji(caps.includes("vision"))}\n` +
                `thinking: ${boolToEmoji(caps.includes("thinking"))}\n` +
                `tools: ${boolToEmoji(caps.includes("tools"))}`
                + "```";

            await replyToMessage({message: msg, text: text, parse_mode: "Markdown"}).catch(logError);
        } catch (e) {
            logError(e);
            await replyToMessage({message: msg, text: e.toString()}).catch(logError);
        }
    }

    async loadModelInfo(): Promise<ShowResponse | null> {
        return ollama.show({model: Environment.OLLAMA_MODEL});
    }
}