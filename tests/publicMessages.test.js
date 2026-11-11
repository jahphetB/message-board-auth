const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const app = require("../app");

test("compiled Worker views escape message text and omit author information", () => {
	const views = require("../generated/views");
	const message = { id: 1, title: "A <title>", text: "Hello <script>alert(1)</script>", user: "PrivateAuthorMarker" };

	for (const html of [
		views.index({ title: "Members Only", messages: [message] }),
		views.message({ title: "Message Details", message })
	]) {
		assert.match(html, /A &lt;title&gt;/);
		assert.match(html, /Hello &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
		assert.doesNotMatch(html, /PrivateAuthorMarker|<script>alert/);
	}
});

test("visitors can read escaped messages without author details or write access", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;

	try {
		await client.query("BEGIN");
		const username = `test_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
		const user = await client.query(
			"INSERT INTO users (first_name, last_name, username, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
			["PrivateAuthorMarker", "Hidden", username, "test-hash"]
		);
		const message = await client.query(
			"INSERT INTO messages (user_id, title, text, created_at) VALUES ($1, $2, $3, $4) RETURNING id",
			[user.rows[0].id, "A <title>", "Hello <script>alert(1)</script>", "2001-02-03T04:05:06Z"]
		);
		const id = message.rows[0].id;

		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;

		for (const path of ["/", `/messages/${id}`]) {
			const response = await fetch(base + path);
			const html = await response.text();
			assert.equal(response.status, 200);
			assert.match(html, /A &lt;title&gt;/);
			assert.match(html, /Hello &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
			assert.doesNotMatch(html, /PrivateAuthorMarker|2001-02-03|<script>alert/);
			assert.doesNotMatch(html, /href="\/new"|message-delete|message-edit/);
		}

		for (const [method, path] of [
			["GET", `/messages/${id}/edit`],
			["GET", "/messages/invalid"]
		]) {
			const response = await fetch(base + path, { method });
			assert.equal(response.status, 404, `${method} ${path}`);
		}
		assert.equal((await fetch(`${base}/new`, { redirect: "manual" })).status, 302);
		for (const path of ["/new", `/messages/${id}/edit`, `/messages/${id}/delete`]) {
			const response = await fetch(base + path, { method: "POST" });
			assert.equal(response.status, 403);
		}
	} finally {
		if (server) {
			await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		}
		await client.query("ROLLBACK");
		await client.end();
	}
});
