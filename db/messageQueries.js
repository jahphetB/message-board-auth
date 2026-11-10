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

module.exports = { getAllMessages, getMessageById };
