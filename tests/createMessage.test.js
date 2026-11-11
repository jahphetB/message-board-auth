const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const app = require("../app");

test("a signed-in nonmember creates a validated message as themselves", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;
	try {
		await client.query("BEGIN");
		const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
		const password = "test message password";
		const passwordHash = await database.withPool(client, () => passwords.hashPassword(password));
		const user = await database.withPool(client, () => users.createUser({ firstName: "Test", lastName: "User", username: `User_${suffix}`, passwordHash }));
		const other = await database.withPool(client, () => users.createUser({ firstName: "Other", lastName: "User", username: `Other_${suffix}`, passwordHash }));
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const post = (path, cookie, data) => fetch(base + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie }, body: new URLSearchParams(data) });

		const loginPage = await fetch(`${base}/log-in`);
		const visitorCookie = loginPage.headers.get("set-cookie").split(";")[0];
		const visitorToken = (await loginPage.text()).match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		assert.equal((await post("/new", visitorCookie, { _csrf: visitorToken, title: "Test", text: "Test" })).status, 401);
		const login = await post("/log-in", visitorCookie, { username: user.username, password, _csrf: visitorToken });
		const cookie = login.headers.get("set-cookie").split(";")[0];
		const page = await fetch(`${base}/`, { headers: { cookie } });
		assert.match(await page.text(), /href="\/new"/);
		const form = await fetch(`${base}/new`, { headers: { cookie } });
		const token = (await form.text()).match(/name="_csrf" value="([a-f0-9]{64})"/)[1];

		assert.equal((await post("/new", cookie, { title: "Title", text: "Text" })).status, 403);
		assert.equal((await post("/new", cookie, { _csrf: token, title: " ", text: "text" })).status, 400);
		assert.equal((await post("/new", cookie, { _csrf: token, title: "a".repeat(121), text: "text" })).status, 400);
		assert.equal((await post("/new", cookie, { _csrf: token, title: "title", text: "a".repeat(2001) })).status, 400);
		const created = await post("/new", cookie, { _csrf: token, title: " A <title> ", text: " Hello <script> ", userId: other.id, author: "forged" });
		assert.equal(created.status, 302);
		const { rows } = await client.query("SELECT user_id, title, text FROM messages WHERE user_id = $1", [user.id]);
		assert.equal(rows.length, 1);
		assert.deepEqual(rows[0], { user_id: user.id, title: "A <title>", text: "Hello <script>" });
		assert.equal((await client.query("SELECT id FROM messages WHERE user_id = $1", [other.id])).rowCount, 0);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
