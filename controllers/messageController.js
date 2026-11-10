const messages = require("../db/messageQueries");

async function getMessages(req, res) {
	const allMessages = await messages.getAllMessages();

	res.render("index", {
		title: "Members Only",
		messages: allMessages
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

module.exports = { getMessages, getMessage };
