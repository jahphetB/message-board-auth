const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");

test("user queries create and find accounts with case-insensitive usernames", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();

	try {
		await client.query("BEGIN");
		await database.withPool(client, async () => {
			const username = `Test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
			const passwordHash = await passwords.hashPassword("test password");
			const user = await users.createUser({
				firstName: "Ana María",
				lastName: "O'Connor",
				username,
				passwordHash
			});

			assert.equal(user.is_member, false);
			assert.equal(user.is_admin, false);
			assert.equal(Object.hasOwn(user, "password_hash"), false);

			const login = await users.findUserForLogin(username.toUpperCase());
			assert.equal(login.id, user.id);
			assert.equal(await passwords.comparePassword("test password", login.password_hash), true);

			const found = await users.findUserById(user.id);
			assert.equal(found.first_name, "Ana María");
			assert.equal(found.last_name, "O'Connor");
			assert.equal(Object.hasOwn(found, "password_hash"), false);
			assert.equal(await users.findUserById(0), null);
			assert.equal(await users.findUserForLogin(`missing_${username}`), null);

			await client.query("SAVEPOINT before_duplicate");
			await assert.rejects(
				users.createUser({ firstName: "Other", lastName: "User", username: username.toLowerCase(), passwordHash }),
				(error) => error.code === "23505"
			);
			await client.query("ROLLBACK TO SAVEPOINT before_duplicate");
		});
	} finally {
		await client.query("ROLLBACK");
		await client.end();
	}
});
