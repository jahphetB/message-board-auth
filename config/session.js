const session = require("express-session");
const { createSessionStore } = require("./sessionStore");

function createSessionMiddleware(secret) {
	if (typeof secret !== "string" || secret.length < 32) {
		throw new Error("SESSION_SECRET must be configured with at least 32 characters.");
	}

	return session({
		store: createSessionStore(),
		secret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			sameSite: "lax",
			secure: "auto",
			maxAge: 24 * 60 * 60 * 1000
		}
	});
}

module.exports = { createSessionMiddleware };
