import { Command, CommandMessage } from "@typeit/discord";
import db from "../utils/db";
import * as uuid from "uuid";

export abstract class Login {
	@Command("login")
	async login(command: CommandMessage) {
		const discordId = command.author.id;

		const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

		const code = uuid.v4();
		//await db.set("userMap." + code, discordId).write();
		db.push("/userMap/" + code, discordId);
		db.save();
		command.reply(
			`Please go to ${serverUrl}?code=${encodeURIComponent(
				code
			)} to login`
		);
	}
}
