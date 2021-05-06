import {
	CommandNotFound,
	Discord,
	CommandMessage,
	On,
	ArgsOf,
	Client,
} from "@typeit/discord";
import path from "path";

@Discord("!", {
	import: [path.resolve(__dirname, "..", "commands", "*.ts")],
})
export class DiscordApp {
	@CommandNotFound()
	notFound(command: CommandMessage) {
		command.reply("Sorry, but I don't know what you mean...");
	}
}
