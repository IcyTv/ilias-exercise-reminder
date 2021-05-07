import caxa from "caxa";
import fs from "fs";

const build = async () => {
	if (!fs.existsSync("dist")) {
		throw new Error(
			"Source was not built. Please run yarn build or yarn build:src first"
		);
	}

	const ending = process.platform === "win32" ? ".exe" : ".elf";

	console.log(
		"Building application, version",
		process.env.VERSION || "undefined",
		"for",
		process.platform,
		"with ending",
		ending,
		"\n\nFilename will be: ",
		`dist/ilias-exercise-reminder-${
			process.env.VERSION || "undefined"
		}${ending}`
	);

	await caxa({
		directory: "dist",
		command: ["{{caxa}}/node_modules/.bin/node", "dist/cli.js"],
		output: `dist/ilias-exercise-reminder-${
			process.env.VERSION || "undefined"
		}${ending}`,
	});

	console.log("Done building! :)");
};

build().catch((err) => {
	console.error("Build failed");
	console.error(err);
});
