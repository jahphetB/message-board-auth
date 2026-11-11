const { timingSafeEqual } = require("node:crypto");
const users = require("../db/userQueries");
const { getCsrfToken } = require("../middleware/csrf");

function renderForm(req, res, title, action, error = "", status = 200) {
	res.set("Cache-Control", "no-store");
	return res.status(status).render("passcode", { title, action, error, csrfToken: getCsrfToken(req) });
}

function matchesPasscode(submitted, expected) {
	if (typeof submitted !== "string" || typeof expected !== "string" || !expected) return false;
	const actualBytes = Buffer.from(submitted, "utf8");
	const expectedBytes = Buffer.from(expected, "utf8");
	return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function getClub(req, res) {
	return renderForm(req, res, "Join the club", "/join-club");
}

function getAdmin(req, res) {
	return renderForm(req, res, "Become an admin", "/become-admin");
}

async function joinClub(req, res) {
	if (!process.env.CLUB_PASSCODE) return res.status(503).send("Club access is not configured.");
	if (!matchesPasscode(req.body.passcode, process.env.CLUB_PASSCODE)) {
		return renderForm(req, res, "Join the club", "/join-club", "Incorrect passcode.", 400);
	}
	if (!(await users.grantMembership(req.user.id))) return res.status(404).send("Account not found.");
	return res.redirect("/");
}

async function becomeAdmin(req, res) {
	if (!process.env.ADMIN_PASSCODE) return res.status(503).send("Admin access is not configured.");
	if (!matchesPasscode(req.body.passcode, process.env.ADMIN_PASSCODE)) {
		return renderForm(req, res, "Become an admin", "/become-admin", "Incorrect passcode.", 400);
	}
	if (!(await users.grantAdmin(req.user.id))) return res.status(404).send("Account not found.");
	return res.redirect("/");
}

module.exports = { getClub, getAdmin, joinClub, becomeAdmin };
