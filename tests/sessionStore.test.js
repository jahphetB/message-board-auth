const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const database = require("../db/pool");
const { createSessionStore } = require("../config/sessionStore");

function callStore(store, method, ...args) {
	return new Promise((resolve, reject) => {
		store[method](...args, (error, result) => error ? reject(error) : resolve(result));
	});
}

test("session store persists, expires, and deletes through the scoped database", async () => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	const store = createSessionStore();
	const sid = randomUUID();

	try {
		await client.query("BEGIN");
		await database.withPool(client, async () => {
			const session = { cookie: { expires: new Date(Date.now() + 60_000) }, userId: 123 };
			await callStore(store, "set", sid, session);
			const stored = await callStore(store, "get", sid);
			assert.equal(stored.userId, 123);
			await callStore(store, "touch", sid, session);

			await client.query("UPDATE session SET expire = NOW() - INTERVAL '1 hour' WHERE sid = $1", [sid]);
			assert.equal(await callStore(store, "get", sid), undefined);

			await callStore(store, "destroy", sid);
			const { rowCount } = await client.query("SELECT sid FROM session WHERE sid = $1", [sid]);
			assert.equal(rowCount, 0);
		});
	} finally {
		await client.query("ROLLBACK");
		await store.close();
		await client.end();
	}
});
