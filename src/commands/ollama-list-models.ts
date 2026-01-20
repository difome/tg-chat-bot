import {ChatCommand} from "../base/chat-command";
import {Message} from "typescript-telegram-bot-api";
import {ollama} from "../index";
import {logError, oldReplyToMessage, sendMessage} from "../util/utils";
import {Requirements} from "../base/requirements";
import {Requirement} from "../base/requirement";

export class OllamaListModels extends ChatCommand {
    title = "/ollamaListModels";
    description = "List all Ollama models";

    requirements = Requirements.Build(Requirement.BOT_CREATOR);

    async execute(msg: Message): Promise<void> {
        try {
            const listResponse = await ollama.list();

            const modelsString = listResponse.models
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(e => `\`${e.model}\``)
                .join("\n");

            const message = "Доступные модели:\n\n" + modelsString;

            await sendMessage({
                chat_id: msg.chat.id,
                text: message,
                parse_mode: "Markdown",
            });
        } catch (e) {
            console.error(e);
            await oldReplyToMessage(msg, "Не получилось загрузить список моделей").catch(logError);
        }
    }
}