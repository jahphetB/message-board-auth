const { Passport } = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");

const passport = new Passport();
const failure = { message: "Incorrect username or password." };

passport.use(new LocalStrategy(async (username, password, done) => {
	try {
		if (
			typeof username !== "string" ||
			typeof password !== "string" ||
			!/^[A-Za-z0-9_]{3,30}$/.test(username.trim()) ||
			Buffer.byteLength(password, "utf8") > 72 ||
			password.includes("\0") ||
			!password.isWellFormed()
		) {
			return done(null, false, failure);
		}

		const user = await users.findUserForLogin(username.trim());
		if (!user || !(await passwords.comparePassword(password, user.password_hash))) {
			return done(null, false, failure);
		}

		return done(null, { id: user.id, username: user.username });
	} catch (error) {
		return done(error);
	}
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
	try {
		const user = await users.findUserById(id);
		return done(null, user || false);
	} catch (error) {
		return done(error);
	}
});

module.exports = passport;
