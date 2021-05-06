import { Client } from "@typeit/discord";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export class Main {
	private static _client: Client;

	static get client(): Client {
		return this._client;
	}

	static start() {
		if (!process.env.DC_BOT_TOKEN) {
			throw new Error(
				"No Bot token given, please use a .env file or set the DC_BOT_TOKEN environment variable"
			);
		}

		this._client = new Client();

		this._client.login(
			process.env.DC_BOT_TOKEN!,
			path.resolve(__dirname, "discords/*.ts"),
			path.resolve(__dirname, "discords/*.js")
		);
	}
}

Main.start();
