const fs = require("node:fs/promises");
const path = require("node:path");
const database = require("../db/pool");

async function setupDatabase() {
	try {
		const schemaPath = path.join(__dirname, "../db/migrations/001_initial_schema.sql");
		const schema = await fs.readFile(schemaPath, "utf8");

		await database.query(schema);

		const { rows } = await database.query(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ($1, $2) ORDER BY table_name",
			["users", "messages"]
		);

		console.log("Created tables:", rows.map((row) => row.table_name).join(", "));
	} catch (error) {
		console.error("Database setup failed:", error.code || error.name);
		process.exitCode = 1;
	} finally {
		await database.end();
	}
}

setupDatabase();
