const fs = require("node:fs/promises");
const path = require("node:path");
const database = require("../db/pool");

const migrations = ["001_initial_schema.sql", "002_enable_pgcrypto.sql", "003_session_table.sql"];

async function setupDatabase(connection = database) {
	const files = await Promise.all(migrations.map((name) =>
		fs.readFile(path.join(__dirname, "../db/migrations", name), "utf8")
	));

	const existing = await connection.query(
		`SELECT c.relname FROM pg_class c
		 JOIN pg_namespace n ON n.oid = c.relnamespace
		 WHERE n.nspname = current_schema() AND c.relname = ANY($1::text[])`,
		[["users", "messages", "session"]]
	);
	if (existing.rows.length) {
		const error = new Error("Application tables already exist; setup requires an empty schema.");
		error.code = "SCHEMA_NOT_EMPTY";
		throw error;
	}

	const extension = await connection.query("SELECT name FROM pg_available_extensions WHERE name = $1", ["pgcrypto"]);
	if (!extension.rows.length) {
		const error = new Error("The pgcrypto extension is not available.");
		error.code = "PGCRYPTO_UNAVAILABLE";
		throw error;
	}

	for (const sql of files) await connection.query(sql);
	return ["users", "messages", "session"];
}

if (require.main === module) {
	(async () => {
		try {
			const tables = await setupDatabase();
			console.log("Created tables:", tables.join(", "));
		} catch (error) {
			console.error("Database setup failed:", error.code || error.name);
			process.exitCode = 1;
		} finally {
			await database.end();
		}
	})();
}

module.exports = { setupDatabase };
