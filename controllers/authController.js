const { validationResult } = require("express-validator");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const { getCsrfToken } = require("../middleware/csrf");

function renderSignUp(req, res, errors = [], status = 200) {
	const values = {};
	for (const field of ["firstName", "lastName", "username"]) {
		values[field] = typeof req.body?.[field] === "string" ? req.body[field] : "";
	}
	res.set("Cache-Control", "no-store");
	return res.status(status).render("sign-up", {
		title: "Sign up",
		csrfToken: getCsrfToken(req),
		errors,
		values
	});
}

function getSignUp(req, res) {
	return renderSignUp(req, res);
}

function getLogIn(req, res) {
	res.set("Cache-Control", "no-store");
	return res.render("log-in", {
		title: "Log in",
		csrfToken: getCsrfToken(req),
		loginFailed: req.query.failed === "1"
	});
}

function logOut(req, res, next) {
	req.logout((error) => {
		if (error) return next(error);
		req.session.destroy((destroyError) => {
			if (destroyError) return next(destroyError);
			res.clearCookie("connect.sid", { path: "/" });
			return res.redirect("/");
		});
	});
}

async function signUp(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return renderSignUp(req, res, errors.array().map((error) => error.msg), 400);
	}

	const { firstName, lastName, username, password } = req.body;
	try {
		const passwordHash = await passwords.hashPassword(password);
		await users.createUser({ firstName, lastName, username, passwordHash });
		return res.redirect("/?signedUp=1");
	} catch (error) {
		if (error.code === "23505" && error.constraint === "users_username_lower_unique") {
			return renderSignUp(req, res, ["Username is already in use."], 409);
		}
		throw error;
	}
}

module.exports = { getSignUp, signUp, getLogIn, logOut };
