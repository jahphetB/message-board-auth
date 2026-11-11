const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const app = require("../app");

test("login renews the session and logout requires CSRF and ends it", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;
	try {
		await client.query("BEGIN");
		const username = `User_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
		const password = "test login password";
		await database.withPool(client, async () => {
			const passwordHash = await passwords.hashPassword(password);
			await users.createUser({ firstName: "Test", lastName: "User", username, passwordHash });
		});
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const form = await fetch(`${base}/log-in`);
		const formHtml = await form.text();
		const visitorCookie = form.headers.get("set-cookie").split(";")[0];
		const token = formHtml.match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		const post = (path, cookie, data) => fetch(base + path, {
			method: "POST", redirect: "manual",
			headers: { "content-type": "application/x-www-form-urlencoded", cookie },
			body: new URLSearchParams(data)
		});

		assert.equal((await post("/log-in", visitorCookie, { username, password })).status, 403);
		const failed = await post("/log-in", visitorCookie, { username, password: "wrong", _csrf: token });
		assert.equal(failed.status, 302);
		assert.equal(failed.headers.get("location"), "/log-in?failed=1");
		const success = await post("/log-in", visitorCookie, { username: username.toUpperCase(), password, _csrf: token });
		assert.equal(success.status, 302);
		const loggedInCookie = success.headers.get("set-cookie").split(";")[0];
		assert.notEqual(loggedInCookie, visitorCookie);

		const page = await fetch(`${base}/`, { headers: { cookie: loggedInCookie } });
		const html = await page.text();
		assert.match(html, /Signed in as/);
		assert.match(html, /action="\/log-out"/);
		assert.doesNotMatch(html, /href="\/sign-up"|href="\/log-in"/);
		const logoutToken = html.match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		assert.notEqual(logoutToken, token);
		assert.equal((await post("/log-out", loggedInCookie, {})).status, 403);
		assert.equal((await post("/log-out", loggedInCookie, { _csrf: token })).status, 403);
		const logout = await post("/log-out", loggedInCookie, { _csrf: logoutToken });
		assert.equal(logout.status, 302);
		const after = await fetch(`${base}/`, { headers: { cookie: loggedInCookie } });
		assert.doesNotMatch(await after.text(), /Signed in as/);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
