import { Command, CommandMessage } from "@typeit/discord";

export abstract class Help {
	@Command("help")
	async help(command: CommandMessage) {
		command.reply("TODO");
	}
}
