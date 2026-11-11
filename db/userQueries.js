const database = require("./pool");

async function createUser({ firstName, lastName, username, passwordHash }) {
	const { rows } = await database.query(
		`INSERT INTO users (first_name, last_name, username, password_hash)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, first_name, last_name, username, is_member, is_admin`,
		[firstName, lastName, username, passwordHash]
	);

	return rows[0];
}

async function findUserForLogin(username) {
	const { rows } = await database.query(
		`SELECT id, username, password_hash
		 FROM users
		 WHERE lower(username) = lower($1)`,
		[username]
	);

	return rows[0] ?? null;
}

async function findUserById(id) {
	const { rows } = await database.query(
		`SELECT id, first_name, last_name, username, is_member, is_admin
		 FROM users
		 WHERE id = $1`,
		[id]
	);

	return rows[0] ?? null;
}

async function grantMembership(id) {
	const { rowCount } = await database.query("UPDATE users SET is_member = true WHERE id = $1", [id]);
	return rowCount > 0;
}

async function grantAdmin(id) {
	const { rowCount } = await database.query("UPDATE users SET is_admin = true WHERE id = $1", [id]);
	return rowCount > 0;
}

module.exports = { createUser, findUserForLogin, findUserById, grantMembership, grantAdmin };
