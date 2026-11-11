const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const express = require("express");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const { createSessionMiddleware } = require("../config/session");
const passport = require("../config/passport");

test("Passport checks passwords and restores fresh account data from its session", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;

	try {
		await client.query("BEGIN");
		const username = `Test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
		const hash = await database.withPool(client, () => passwords.hashPassword("a test password"));
		const user = await database.withPool(client, () => users.createUser({
			firstName: "Test", lastName: "User", username, passwordHash: hash
		}));

		const app = express();
		app.use(express.urlencoded({ extended: true }));
		app.use(createSessionMiddleware("test-only-secret-".repeat(4)));
		app.use(passport.initialize());
		app.use(passport.session());
		app.post("/login", passport.authenticate("local"), (req, res) => res.sendStatus(204));
		app.get("/me", (req, res) => res.json({ user: req.user || null }));
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const login = (name, password) => fetch(`${base}/login`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ username: name, password })
		});

		assert.equal((await login(username, "wrong password")).status, 401);
		assert.equal((await login(`missing_${username}`, "a test password")).status, 401);
		assert.equal((await login(username, "x".repeat(73))).status, 401);
		const success = await login(` ${username.toUpperCase()} `, "a test password");
		assert.equal(success.status, 204);
		const cookie = success.headers.get("set-cookie").split(";")[0];
		const { rows } = await client.query("SELECT sess FROM session WHERE sess->'passport'->>'user' = $1", [String(user.id)]);
		assert.equal(rows.length, 1);
		assert.equal(rows[0].sess.passport.user, user.id);
		assert.equal(JSON.stringify(rows[0].sess).includes(hash), false);

		await client.query("UPDATE users SET is_member = true WHERE id = $1", [user.id]);
		const response = await fetch(`${base}/me`, { headers: { cookie } });
		const restored = (await response.json()).user;
		assert.equal(restored.id, user.id);
		assert.equal(restored.is_member, true);
		assert.equal(Object.hasOwn(restored, "password_hash"), false);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
