const database = require("./pool");

async function hashPassword(password) {
	const { rows } = await database.query(
		"SELECT crypt($1, gen_salt('bf', 12)) AS password_hash",
		[password]
	);

	return rows[0].password_hash;
}

async function comparePassword(password, hash) {
	const { rows } = await database.query(
		"SELECT crypt($1, $2) = $2 AS matches",
		[password, hash]
	);

	return rows[0].matches;
}

module.exports = { hashPassword, comparePassword };
