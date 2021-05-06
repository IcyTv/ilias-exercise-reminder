import express from "express";
import path from "path";
import { urlencoded } from "body-parser";
import * as uuid from "uuid";
import { login } from "../api/login";
import db from "../utils/db";

const app = express();

const codeMap: { [code: string]: string } = {};

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "../views"));

app.use(urlencoded({ extended: true }));

app.get("*", express.static(path.join(__dirname, "../public")));

app.get("/", async (req, res) => {
	const code = req.query.code as string;
	const failiure = req.query.failiure;
	if (!code) {
		console.warn("No code found");
		return res.render("nocode");
	}
	if (!db.exists("userMap/" + code)) {
		console.log("User map does not contain code");
		return res.render("nocode");
	}

	const discordId = db.getData("userMap/" + code);

	// if (!db.get("userMap").has(code).value()) {
	// 	console.log("User Map does not contain code", code);
	// 	return res.render("nocode");
	// }
	// const discordId = await db.get("userMap." + code).value();
	res.render("index", { discordId: discordId, code, failiure });
});

app.post("/callback", async (req, res) => {
	console.log(req.body);
	const { username, password, discordId, code } = req.body;

	if (!username || !password || !code) {
		return res.redirect(
			`/?failiure=${encodeURIComponent(
				"No username or password given..."
			)}&code=${code}`
		);
	} else {
		if (!db.exists("userMap/" + code)) {
			return res.render("nocode");
		}
		try {
			const userData = await login(username, password);
			console.log(userData);
			db.push("users", { test: "Test" });
			db.delete("userMap/" + code);
			return res.render("success");
		} catch (err) {
			res.redirect(`/?failiure=${encodeURIComponent(err)}&code=${code}`);
		}
	}
});

app.listen(3000, () => {
	console.log("App listening on http://localhost:3000");
});
