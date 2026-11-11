const database = require("./pool");

async function getAllMessages(includeDetails = false) {
	const query = includeDetails
		? `SELECT messages.id, messages.title, messages.text, messages.created_at,
			users.first_name, users.last_name
		   FROM messages JOIN users ON messages.user_id = users.id
		   ORDER BY messages.created_at, messages.id`
		: "SELECT id, title, text FROM messages ORDER BY created_at, id";
	const { rows } = await database.query(query);

	return rows;
}

async function getMessageById(id, includeDetails = false) {
	const query = includeDetails
		? `SELECT messages.id, messages.title, messages.text, messages.created_at,
			users.first_name, users.last_name
		   FROM messages JOIN users ON messages.user_id = users.id
		   WHERE messages.id = $1`
		: "SELECT id, title, text FROM messages WHERE id = $1";
	const { rows } = await database.query(query, [id]);

	return rows[0];
}

async function createMessage(userId, title, text) {
	await database.query(
		"INSERT INTO messages (user_id, title, text) VALUES ($1, $2, $3)",
		[userId, title, text]
	);
}

async function deleteMessage(id) {
	const { rowCount } = await database.query("DELETE FROM messages WHERE id = $1", [id]);
	return rowCount > 0;
}

module.exports = { getAllMessages, getMessageById, createMessage, deleteMessage };
