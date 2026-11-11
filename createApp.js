const express = require("express");
const indexRouter = require("./routes/indexRouter");
const { createSessionMiddleware } = require("./config/session");
const passport = require("./config/passport");

function createApp(configureRuntime) {
	const app = express();

	configureRuntime(app);
	app.use(express.urlencoded({ extended: true }));
	app.use(createSessionMiddleware(process.env.SESSION_SECRET));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use("/", indexRouter);

	app.use((err, req, res, next) => {
		console.error(err);
		res.status(500).send("Something went wrong. Please try again.");
	});

	return app;
}

module.exports = createApp;
