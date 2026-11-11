const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { setupDatabase } = require("../scripts/setup-db");

test("fresh setup applies all migrations and refuses an existing schema", async (t) => {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	const schema = `setup_test_${randomUUID().replaceAll("-", "")}`;
	let created = false;

	try {
		const installed = await client.query("SELECT extname FROM pg_extension WHERE extname = $1", ["pgcrypto"]);
		if (!installed.rowCount) {
			t.skip("pgcrypto must already be installed outside the temporary schema");
			return;
		}
		await client.query(`CREATE SCHEMA "${schema}"`);
		created = true;
		await client.query(`SET search_path TO "${schema}", public`);
		assert.deepEqual(await setupDatabase(client), ["users", "messages", "session"]);

		const { rows } = await client.query(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
			[schema]
		);
		assert.deepEqual(rows.map((row) => row.table_name), ["messages", "session", "users"]);
		const extension = await client.query("SELECT extname FROM pg_extension WHERE extname = $1", ["pgcrypto"]);
		assert.equal(extension.rowCount, 1);
		await assert.rejects(setupDatabase(client), (error) => error.code === "SCHEMA_NOT_EMPTY");
		assert.equal((await client.query("SELECT COUNT(*)::int AS count FROM users")).rows[0].count, 0);
	} finally {
		if (created) {
			await client.query("SET search_path TO public");
			await client.query(`DROP SCHEMA "${schema}" CASCADE`);
		}
		await client.end();
	}
});
