const messages = require("../db/messageQueries");
const { getCsrfToken } = require("../middleware/csrf");
const { validationResult } = require("express-validator");

async function getMessages(req, res) {
	const allMessages = await messages.getAllMessages();
	if (req.user) res.set("Cache-Control", "no-store");

	res.render("index", {
		title: "Members Only",
		messages: allMessages,
		signedUp: req.query.signedUp === "1",
		user: req.user || null,
		csrfToken: req.user ? getCsrfToken(req) : null
	});
}

async function getMessage(req, res) {
	const { messageId } = req.params;
	const id = Number(messageId);

	if (!/^[1-9]\d*$/.test(messageId) || !Number.isSafeInteger(id) || id > 2147483647) {
		return res.status(404).send("Message not found");
	}

	const message = await messages.getMessageById(id);

	if (!message) {
		return res.status(404).send("Message not found");
	}

	res.render("message", {
		title: "Message Details",
		message
	});
}

function renderNewMessage(req, res, errors = [], status = 200) {
	const values = {};
	for (const field of ["title", "text"]) {
		values[field] = typeof req.body?.[field] === "string" ? req.body[field] : "";
	}
	res.set("Cache-Control", "no-store");
	return res.status(status).render("new-message", {
		title: "New message", csrfToken: getCsrfToken(req), errors, values
	});
}

function getNewMessage(req, res) {
	return renderNewMessage(req, res);
}

async function createMessage(req, res) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return renderNewMessage(req, res, errors.array().map((error) => error.msg), 400);
	}
	await messages.createMessage(req.user.id, req.body.title, req.body.text);
	return res.redirect("/");
}

module.exports = { getMessages, getMessage, getNewMessage, createMessage };
