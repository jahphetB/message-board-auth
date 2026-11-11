const database = require("./pool");

async function getAllMessages() {
	const { rows } = await database.query(
		"SELECT id, title, text FROM messages ORDER BY created_at, id"
	);

	return rows;
}

async function getMessageById(id) {
	const { rows } = await database.query(
		"SELECT id, title, text FROM messages WHERE id = $1",
		[id]
	);

	return rows[0];
}

async function createMessage(userId, title, text) {
	await database.query(
		"INSERT INTO messages (user_id, title, text) VALUES ($1, $2, $3)",
		[userId, title, text]
	);
}

module.exports = { getAllMessages, getMessageById, createMessage };
