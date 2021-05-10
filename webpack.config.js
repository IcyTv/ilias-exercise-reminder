const path = require("path");
// const web = require("webpack");
const nodeExternals = require("webpack-node-externals");
const Dotenv = require("dotenv-webpack");
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = {
	mode: "production",
	entry: {
		cli: path.resolve(__dirname, "src/index.ts"),
	},
	externals: [nodeExternals()],
	target: "node",
	node: {
		__dirname: false,
		__filename: false,
	},
	plugins: [
		new Dotenv(),
		new ProgressBarPlugin(),
	],

	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /(node_modules)/,
				use: {
					loader: "babel-loader",
				},
			},
			{
				test: /\.node$/,
				loader: "node-loader",
				options: {
					name: "native.node",
				},
			},
		],
	},
	resolve: {
		extensions: [".js", ".ts"],
	},

	output: {
		path: path.resolve(__dirname, "dist"),
	},

	optimization: {
		usedExports: true,
		moduleIds: "deterministic",
		nodeEnv: "production",
		mangleWasmImports: true,
		providedExports: true,
		concatenateModules: true,
		mangleExports: "deterministic",
		innerGraph: true,
	},
};
