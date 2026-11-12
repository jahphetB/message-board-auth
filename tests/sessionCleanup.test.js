const test = require("node:test");
const assert = require("node:assert/strict");
const { Client } = require("pg");
const database = require("../db/pool");
const { deleteExpiredSessions } = require("../db/sessionQueries");
const { createSessionCleanup } = require("../middleware/sessionCleanup");

test("cleanup deletes bounded expired batches and preserves current and active sessions", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		await client.query("BEGIN");
		await client.query("CREATE TEMP TABLE session (sid text PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL) ON COMMIT DROP");
		await client.query("INSERT INTO session SELECT 'expired-' || n, '{}'::json, NOW() - INTERVAL '1 hour' FROM generate_series(1, 52) AS n");
		await client.query("INSERT INTO session VALUES ('current', '{}'::json, NOW() - INTERVAL '1 hour'), ('active', '{}'::json, NOW() + INTERVAL '1 hour')");
		assert.equal(await database.withPool(client, () => deleteExpiredSessions("current")), 50);
		let result = await client.query("SELECT sid FROM session ORDER BY sid");
		assert.equal(result.rows.length, 4);
		assert.ok(result.rows.some((row) => row.sid === "current"));
		assert.ok(result.rows.some((row) => row.sid === "active"));
		assert.equal(await database.withPool(client, () => deleteExpiredSessions("current")), 2);
		assert.equal(await database.withPool(client, () => deleteExpiredSessions(null)), 1);
		result = await client.query("SELECT sid FROM session");
		assert.deepEqual(result.rows.map((row) => row.sid), ["active"]);
	} finally {
		await client.query("ROLLBACK");
		await client.end();
	}
});

test("cleanup middleware skips unselected requests and continues after failures", async () => {
	let calls = 0;
	let reported = 0;
	let continued = 0;
	const cleanup = async () => { calls++; throw new Error("test failure"); };
	const next = () => { continued++; };
	await createSessionCleanup({ shouldRun: () => false, cleanup })({ sessionID: "current" }, {}, next);
	await createSessionCleanup({ shouldRun: () => true, cleanup, reportFailure: () => reported++ })({ sessionID: "current" }, {}, next);
	assert.equal(calls, 1);
	assert.equal(reported, 1);
	assert.equal(continued, 2);
});
