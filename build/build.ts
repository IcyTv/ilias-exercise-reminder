import caxa from "caxa";
import fs from "fs";

const build = async () => {
	if (!fs.existsSync("dist")) {
		throw new Error(
			"Source was not built. Please run yarn build or yarn build:src first"
		);
	}

	console.log("Building application");

	const ending = process.platform === "win32" ? ".exe" : "";

	await caxa({
		directory: "dist",
		command: ["{{caxa}}/node_modules/.bin/node", "dist/cli.js"],
		output: `ilias-exercise-reminder-${
			process.env.VERSION || "undefined"
		}${ending}`,
	});

	console.log("Done building! :)");
};

build().catch((err) => {
	console.error("Build failed");
	console.error(err);
});
