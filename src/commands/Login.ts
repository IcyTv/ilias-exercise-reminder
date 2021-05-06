import { Command, CommandMessage } from "@typeit/discord";
import dbPromise from "../utils/db";
import * as uuid from "uuid";

export abstract class Login {
	@Command("login")
	async login(command: CommandMessage) {
		const db = await dbPromise;
		const discordId = command.author.id;

		const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

		const user = db.get("users").findKey(discordId);
		if (user.isNull()) {
			const code = uuid.v4();
			await db.set("userMap." + code, discordId).write();
			command.reply(`Please go to ${serverUrl}?code=${code} to login`);
		} else {
			command.reply(
				"You are already logged in...\nIf you want to change your login information please use `" +
					command.prefix +
					"relogin`"
			);
		}
	}
}
