import { Command } from "commander";
import chalk from "chalk";
import { getCourses, getExerciseDeadlines } from "./api/getExercises";
import { login } from "./api/login";
import { CookieJar } from "tough-cookie";
import promptSync from "prompt-sync";
import inquirer from "inquirer";
import open from "open";
import * as googleapis from "googleapis";
import express from "express";
import dotenv from "dotenv";
import moment from "moment";
import keytar from "keytar";

dotenv.config();

const prompt = promptSync({ sigint: true });

const program = new Command();
program.version("0.0.1");
program.requiredOption("-u --user <username>", "Username for ILIAS");
program.option("--reset-password", "Allows reset of saved password");
program.option("--reset-token", "Resets Google OAuth tokens");

program.parse();

const options = program.opts();

if (options.resetToken) {
	console.log(chalk.red("Resetting Google OAuth token!"));
}

if (options.resetPassword) {
	console.log(chalk.red("Resetting ILIAS password!"));
}

let oauth2Client: googleapis.Auth.OAuth2Client;
let tasklistId: string;

const getGoogleLogin = async () => {
	console.log(chalk.green("Preparing Google OAuth"));
	oauth2Client = new googleapis.Auth.OAuth2Client({
		clientId: process.env.GOOGLE_CLIENT_ID,
		//clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		redirectUri: "http://localhost:5000/callback",
	});

	const refreshToken = await keytar.getPassword(
		"ilias-exercise-reminder",
		options.user + "_refresh_token"
	);

	if (!refreshToken || options.resetToken) {
		oauth2Client.on("tokens", async (tokens) => {
			if (tokens.refresh_token) {
				await keytar.setPassword(
					"ilias-exercise-reminder",
					options.user + "_refresh_token",
					tokens.refresh_token
				);
			}
		});

		const scopes = [
			// "https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/tasks",
		];

		const url = oauth2Client.generateAuthUrl({
			access_type: "offline",
			scope: scopes,
		});

		const app = express();
		const prom = new Promise<void>((resolve, reject) => {
			app.get("/callback", async (req, res) => {
				const authorizationCode = req.query.code as string;
				const { tokens } = await oauth2Client.getToken(
					authorizationCode
				);
				oauth2Client.setCredentials(tokens);
				res.end("Success, you can close this window");
				resolve();
			});
		});

		const server = app.listen(5000);

		try {
			open(url);

			console.log(
				chalk.yellow("If it does not open automatically, go to " + url)
			);
		} catch (e) {
			console.log(
				chalk.red("Cannot open your browser,"),
				chalk.yellow("please go to ", url)
			);
		}
		await prom;
		server.close();
	} else {
		console.log(
			chalk.green(
				"Got saved tokens for google, to reset use --reset-token"
			)
		);
		oauth2Client.setCredentials({
			refresh_token: refreshToken,
		});
	}
};

const createTaskListIfNotExists = async () => {
	const tasks = new googleapis.tasks_v1.Tasks({
		auth: oauth2Client,
	});

	const tasklists = await tasks.tasklists.list();

	let exists = false;
	for (let tasklist of tasklists.data.items!) {
		if (tasklist.title === "ILIAS Exercises") {
			exists = true;
			tasklistId = tasklist.id!;
			break;
		}
	}
	if (!exists) {
		console.log(chalk.green("Creating tasklist"));
		const res = await tasks.tasklists.insert({
			requestBody: {
				title: "ILIAS Exercises",
			},
		});
		tasklistId = res.data.id!;
	}
};

function ISODateString(d: Date) {
	if (!d) return null;
	function pad(n: number) {
		return n < 10 ? "0" + n : n;
	}
	return (
		d.getUTCFullYear() +
		"-" +
		pad(d.getUTCMonth() + 1) +
		"-" +
		pad(d.getUTCDate()) +
		"T" +
		pad(d.getUTCHours()) +
		":" +
		pad(d.getUTCMinutes()) +
		":" +
		pad(d.getUTCSeconds()) +
		"Z"
	);
}

const stringToColor = (string: string) => {
	let hash = 0;
	if (string.length === 0) return hash;
	for (var i = 0; i < string.length; i++) {
		hash = string.charCodeAt(i) + ((hash << 5) - hash);
		hash = hash & hash;
	}
	var rgb = [0, 0, 0];
	for (var i = 0; i < 3; i++) {
		var value = (hash >> (i * 8)) & 255;
		rgb[i] = value;
	}
	return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
};

const main = async () => {
	await getGoogleLogin();
	await createTaskListIfNotExists();

	let password = await keytar.getPassword(
		"ilias-exercise-reminder",
		options.user
	);

	if (!password || options.resetPassword) {
		password = prompt("Password?: ", { echo: "*" });
		await keytar.setPassword(
			"ilias-exercise-reminder",
			options.user,
			password
		);
	}

	const cookieJar = new CookieJar();
	await login(options.user, password, { cookieJar });
	const courses = await getCourses(cookieJar);

	const selected = await inquirer.prompt([
		{
			type: "checkbox",
			name: "courses",
			message: "Please choose which courses you want to be reminded of",
			choices: courses.map((v) => ({
				name: v.name,
				value: v,
			})),
		},
	]);
	const deadlines = await getExerciseDeadlines(selected.courses, cookieJar);

	const tasks = new googleapis.tasks_v1.Tasks({
		auth: oauth2Client,
	});

	const existingTasks = await tasks.tasks.list({
		tasklist: tasklistId,
	});

	const noNeedToAdd: string[] = [];
	const noNeedToAddIds: string[] = [];

	existingTasks.data.items?.forEach((item) => {
		noNeedToAdd.push(item.title!);
		noNeedToAddIds.push(item.id!);
	});

	await Promise.all(
		deadlines.map(async (course) => {
			// const color = stringToColor(deadline.course);
			await Promise.all(
				course.exerciseDeadlines.map(async (deadline) => {
					for (let a of deadline.deadlines) {
						if (a.endTime) console.log(chalk.blue(a.endTime));
						// if (a.endTime === undefined) {
						// 	console.warn(
						// 		chalk.red(
						// 			"No end time for",
						// 			a.name,
						// 			course.course
						// 		)
						// 	);
						// 	return;
						// }
						// if (a.endTime && +a.endTime < +new Date()) {
						// 	console.log(
						// 		chalk.yellow("Expired deadline: ", a.endTime)
						// 	);
						// 	return;
						// }
						const taskTitle = `${course.course} - ${a.name}`;
						if (noNeedToAdd.includes(taskTitle)) {
							console.log(
								chalk.blueBright(
									`Task ${taskTitle} exists, skipping`
								)
							);
							return;
						} else {
							console.log(
								chalk.green(`Adding ${taskTitle}`),
								chalk.yellow(moment(a.endTime).toISOString())
							);

							await tasks.tasks.insert({
								tasklist: tasklistId,
								requestBody: {
									title: taskTitle,
									notes: `Section: ${deadline.mainName}\n\nURL: ${a.url}`,
									due: a.endTime
										? moment(a.endTime).toISOString()
										: null,
									status:
										a.endTime &&
										moment(a.endTime).isAfter(moment())
											? "needsAction"
											: "completed",
								},
							});
						}
					}
				})
			);
		})
	);
};

main().catch((err) => {
	console.error(chalk.red("Program exited with an error"));
	console.error(err);
});
