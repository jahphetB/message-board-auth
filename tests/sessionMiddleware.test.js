const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const { Client } = require("pg");
const database = require("../db/pool");
const { createSessionMiddleware } = require("../config/session");

test("session middleware persists a signed cookie and destroys its session", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	let server;

	try {
		await client.query("BEGIN");
		const app = express();
		app.set("trust proxy", 1);
		app.use(createSessionMiddleware("test-only-secret-".repeat(4)));
		app.get("/read", (req, res) => res.json({ userId: req.session.userId ?? null }));
		app.post("/write", (req, res) => { req.session.userId = 123; res.sendStatus(204); });
		app.post("/destroy", (req, res, next) => req.session.destroy((error) => error ? next(error) : res.sendStatus(204)));
		server = http.createServer((req, res) => database.withPool(client, () => app(req, res)));
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const base = `http://127.0.0.1:${server.address().port}`;

		const visitor = await fetch(`${base}/read`);
		assert.equal(visitor.headers.get("set-cookie"), null);
		const written = await fetch(`${base}/write`, { method: "POST", headers: { "x-forwarded-proto": "https" } });
		const header = written.headers.get("set-cookie");
		assert.match(header, /HttpOnly/i);
		assert.match(header, /SameSite=Lax/i);
		assert.match(header, /Secure/i);
		const cookie = header.split(";")[0];
		const read = await fetch(`${base}/read`, { headers: { cookie } });
		assert.equal((await read.json()).userId, 123);
		const tampered = await fetch(`${base}/read`, { headers: { cookie: `${cookie}tampered` } });
		assert.equal((await tampered.json()).userId, null);
		await fetch(`${base}/destroy`, { method: "POST", headers: { cookie } });
		const after = await fetch(`${base}/read`, { headers: { cookie } });
		assert.equal((await after.json()).userId, null);
	} finally {
		if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
		await client.query("ROLLBACK");
		await client.end();
	}
});
