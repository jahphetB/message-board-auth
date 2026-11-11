const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const viewsDirectory = path.join(__dirname, "../views");
const outputDirectory = path.join(__dirname, "../generated");

const templates = ["index", "message", "sign-up", "log-in"];

const compiledViews = templates.map((name) => {
	const source = fs.readFileSync(
		path.join(viewsDirectory, `${name}.ejs`),
		"utf8"
	);

	const render = ejs.compile(source, {
		client: true,
		compileDebug: false,
		strict: true,
		_with: false,
		destructuredLocals: ["title", "messages", "message", "signedUp", "csrfToken", "errors", "values", "user", "loginFailed"]
	});

	return `${JSON.stringify(name)}: ${render.toString()}`;
});

fs.mkdirSync(outputDirectory, { recursive: true });

fs.writeFileSync(
	path.join(outputDirectory, "views.js"),
	`module.exports = {\n${compiledViews.join(",\n")}\n};\n`
);

console.log("Compiled index, message, sign-up, and log-in views.");
