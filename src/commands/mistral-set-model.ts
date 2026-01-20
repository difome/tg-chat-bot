import {ChatCommand} from "../base/chat-command";
import {Requirements} from "../base/requirements";
import {Requirement} from "../base/requirement";
import {Message} from "typescript-telegram-bot-api";
import {Environment} from "../common/environment";
import {logError, replyToMessage} from "../util/utils";

export class MistralSetModel extends ChatCommand {
    argsMode = "required" as const;

    title = "/mistralSetModel";
    description = "Set Mistral model";

    requirements = Requirements.Build(Requirement.BOT_CREATOR);

    async execute(msg: Message, match?: RegExpExecArray | null): Promise<void> {
        const newModel = match?.[3];
        Environment.setMistralModel(newModel || Environment.MISTRAL_MODEL);

        const text = newModel ? `Выбрана модель "${newModel}"`
            : `Модель не задана. Будет использоваться стандартная модель "${Environment.MISTRAL_MODEL}".`;

        await replyToMessage({message: msg, text: text}).catch(logError);
    }
}