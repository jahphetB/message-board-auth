const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const passwords = require("../services/passwordService");
const app = require("../app");

test("sign-up validates input, enforces CSRF, and stores a bcrypt hash", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;

	try {
		await client.query("BEGIN");
		// Keep a failed insert from aborting the test's outer rollback transaction.
		const scopedDatabase = {
			async query(text, values) {
				if (!text.startsWith("INSERT INTO users")) return client.query(text, values);
				await client.query("SAVEPOINT signup_insert");
				try {
					const result = await client.query(text, values);
					await client.query("RELEASE SAVEPOINT signup_insert");
					return result;
				} catch (error) {
					await client.query("ROLLBACK TO SAVEPOINT signup_insert");
					await client.query("RELEASE SAVEPOINT signup_insert");
					throw error;
				}
			}
		};
		server = http.createServer((req, res) => database.withPool(scopedDatabase, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const form = await fetch(`${base}/sign-up`);
		const html = await form.text();
		const cookie = form.headers.get("set-cookie").split(";")[0];
		const token = html.match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		assert.equal(form.status, 200);
		assert.equal(form.headers.get("cache-control"), "no-store");
		assert.doesNotMatch(html, /name="(?:is_admin|is_member)"/);

		const username = `User_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
		const fields = { firstName: " Ana ", lastName: " Lee ", username, password: "test12", confirmPassword: "test12" };
		const post = (data, sessionCookie = cookie) => fetch(`${base}/sign-up`, {
			method: "POST", redirect: "manual",
			headers: { "content-type": "application/x-www-form-urlencoded", cookie: sessionCookie },
			body: new URLSearchParams(data)
		});

		assert.equal((await post(fields)).status, 403);
		assert.equal((await post({ ...fields, _csrf: "a".repeat(64) })).status, 403);
		assert.equal((await post({ ...fields, _csrf: token }, "")).status, 403);

		const invalid = await post({ ...fields, confirmPassword: "different password", _csrf: token });
		const invalidHtml = await invalid.text();
		assert.equal(invalid.status, 400);
		assert.match(invalidHtml, /Passwords must match/);
		assert.doesNotMatch(invalidHtml, /test12|different password/);

		const success = await post({ ...fields, _csrf: token });
		assert.equal(success.status, 302);
		assert.equal(success.headers.get("location"), "/?signedUp=1");
		const { rows } = await client.query("SELECT first_name, last_name, password_hash, is_member, is_admin FROM users WHERE username = $1", [username]);
		assert.equal(rows.length, 1);
		assert.equal(rows[0].first_name, "Ana");
		assert.equal(rows[0].last_name, "Lee");
		assert.equal(rows[0].is_member, false);
		assert.equal(rows[0].is_admin, false);
		assert.match(rows[0].password_hash, /^\$2a\$12\$/);
		assert.equal(await database.withPool(client, () => passwords.comparePassword(fields.password, rows[0].password_hash)), true);

		const removedRoute = await fetch(`${base}/new`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", cookie }, body: new URLSearchParams({ _csrf: token }) });
		assert.equal(removedRoute.status, 401);

		const duplicate = await post({ ...fields, username: username.toLowerCase(), _csrf: token });
		assert.equal(duplicate.status, 409);
		assert.match(await duplicate.text(), /Username is already in use/);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
