const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const app = require("../app");

test("club and admin passcodes update only the authenticated user", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;
	try {
		await client.query("BEGIN");
		const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
		const password = "test membership password";
		const passwordHash = await database.withPool(client, () => passwords.hashPassword(password));
		const account = await database.withPool(client, () => users.createUser({ firstName: "Test", lastName: "User", username: `User_${suffix}`, passwordHash }));
		const other = await database.withPool(client, () => users.createUser({ firstName: "Other", lastName: "User", username: `Other_${suffix}`, passwordHash }));
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const post = (path, cookie, data) => fetch(base + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie }, body: new URLSearchParams(data) });

		assert.equal((await fetch(`${base}/join-club`, { redirect: "manual" })).status, 302);
		assert.equal((await fetch(`${base}/become-admin`, { redirect: "manual" })).status, 302);
		const loginPage = await fetch(`${base}/log-in`);
		const loginCookie = loginPage.headers.get("set-cookie").split(";")[0];
		const loginToken = (await loginPage.text()).match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		const login = await post("/log-in", loginCookie, { username: account.username, password, _csrf: loginToken });
		assert.equal(login.status, 302);
		const cookie = login.headers.get("set-cookie").split(";")[0];
		const form = await fetch(`${base}/join-club`, { headers: { cookie } });
		const token = (await form.text()).match(/name="_csrf" value="([a-f0-9]{64})"/)[1];

		assert.equal((await post("/join-club", cookie, { passcode: process.env.CLUB_PASSCODE })).status, 403);
		assert.equal((await post("/join-club", cookie, { _csrf: token, passcode: "incorrect" })).status, 400);
		assert.equal((await post("/become-admin", cookie, { _csrf: token, passcode: process.env.CLUB_PASSCODE })).status, 400);
		let found = await database.withPool(client, () => users.findUserById(account.id));
		assert.equal(found.is_member, false);
		assert.equal(found.is_admin, false);

		assert.equal((await post("/join-club", cookie, { _csrf: token, passcode: process.env.CLUB_PASSCODE, userId: other.id })).status, 302);
		found = await database.withPool(client, () => users.findUserById(account.id));
		assert.equal(found.is_member, true);
		assert.equal(found.is_admin, false);
		assert.equal((await post("/become-admin", cookie, { _csrf: token, passcode: process.env.ADMIN_PASSCODE, userId: other.id })).status, 302);
		found = await database.withPool(client, () => users.findUserById(account.id));
		assert.equal(found.is_admin, true);
		const untouched = await database.withPool(client, () => users.findUserById(other.id));
		assert.equal(untouched.is_member, false);
		assert.equal(untouched.is_admin, false);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
