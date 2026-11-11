const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const users = require("../db/userQueries");
const passwords = require("../services/passwordService");
const app = require("../app");

test("message details and deletion respect all four permission levels", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;
	try {
		await client.query("BEGIN");
		const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
		const password = "test access password";
		const passwordHash = await database.withPool(client, () => passwords.hashPassword(password));
		const makeUser = (prefix, firstName) => database.withPool(client, () => users.createUser({ firstName, lastName: "Marker", username: `${prefix}_${suffix}`, passwordHash }));
		const nonmember = await makeUser("User", "PrivateAuthor");
		const member = await makeUser("Member", "Member");
		const admin = await makeUser("Admin", "Admin");
		await database.withPool(client, () => users.grantMembership(member.id));
		await database.withPool(client, () => users.grantAdmin(admin.id));
		const inserted = await client.query("INSERT INTO messages (user_id, title, text, created_at) VALUES ($1, $2, $3, $4) RETURNING id", [nonmember.id, "Public title", "Public text", "2001-02-03T04:05:06Z"]);
		const id = inserted.rows[0].id;
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;
		const tokenFrom = (html) => html.match(/name="_csrf" value="([a-f0-9]{64})"/)[1];
		const post = (path, cookie, data) => fetch(base + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie }, body: new URLSearchParams(data) });
		async function login(user) {
			const page = await fetch(`${base}/log-in`);
			const cookie = page.headers.get("set-cookie").split(";")[0];
			const token = tokenFrom(await page.text());
			const response = await post("/log-in", cookie, { username: user.username, password, _csrf: token });
			assert.equal(response.status, 302);
			return response.headers.get("set-cookie").split(";")[0];
		}

		const guestPage = await fetch(`${base}/log-in`);
		const guestCookie = guestPage.headers.get("set-cookie").split(";")[0];
		const guestToken = tokenFrom(await guestPage.text());
		const accounts = [
			{ cookie: guestCookie, details: false, admin: false, token: guestToken },
			{ cookie: await login(nonmember), details: false, admin: false },
			{ cookie: await login(member), details: true, admin: false },
			{ cookie: await login(admin), details: true, admin: true }
		];

		for (const account of accounts) {
			for (const path of ["/", `/messages/${id}`]) {
				const response = await fetch(base + path, { headers: { cookie: account.cookie } });
				const html = await response.text();
				assert.equal(response.status, 200);
				assert.match(html, /Public title/);
				assert.match(html, /Public text/);
				assert.equal(html.includes("PrivateAuthor Marker"), account.details);
				assert.equal(html.includes("2001-02-03T04:05:06.000Z"), account.details);
				assert.equal(html.includes(`action="/messages/${id}/delete"`), account.admin);
				if (path === "/" && !account.token) account.token = tokenFrom(html);
			}
			if (!account.admin) {
				assert.equal((await post(`/messages/${id}/delete`, account.cookie, { _csrf: account.token })).status, 403);
			}
		}

		const adminSession = accounts[3];
		assert.equal((await post(`/messages/${id}/delete`, adminSession.cookie, {})).status, 403);
		assert.equal((await post(`/messages/${id}/delete`, adminSession.cookie, { _csrf: adminSession.token })).status, 302);
		assert.equal((await client.query("SELECT id FROM messages WHERE id = $1", [id])).rowCount, 0);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
