import { Pool } from "pg";
import database from "../db/pool.js";
import sessionQueries from "../db/sessionQueries.js";
import poolErrors from "../db/workerPoolErrors.js";

export default {
	async fetch(request, env, ctx) {
		if (!env.PROBE_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.PROBE_TOKEN}`) {
			return new Response("Not found", { status: 404 });
		}
		const operation = new URL(request.url).pathname;
		if (request.method !== "POST" || !["/baseline", "/cleanup"].includes(operation)) {
			return new Response("Not found", { status: 404 });
		}

		const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, idleTimeoutMillis: 0 });
		pool.on("error", (error) => {
			if (!poolErrors.isExpectedPoolCloseError(pool, error)) console.error("Database connection error.");
		});
		let client;
		try {
			client = await pool.connect();
			await client.query("BEGIN");
			await client.query("CREATE TEMP TABLE session (sid text PRIMARY KEY, sess json NOT NULL, expire timestamp NOT NULL) ON COMMIT DROP");
			await client.query("INSERT INTO session SELECT 'expired-' || n, '{}'::json, NOW() - INTERVAL '1 hour' FROM generate_series(1, 52) AS n");
			await client.query("INSERT INTO session VALUES ('current', '{}'::json, NOW() - INTERVAL '1 hour'), ('active', '{}'::json, NOW() + INTERVAL '1 hour')");
			const deleted = operation === "/cleanup"
				? await database.withPool(client, () => sessionQueries.deleteExpiredSessions("current"))
				: 0;
			const result = await client.query("SELECT count(*)::int AS count FROM session");
			return Response.json({ operation: operation.slice(1), deleted, remaining: result.rows[0].count });
		} catch {
			return new Response("Probe failed", { status: 500 });
		} finally {
			if (client) {
				try { await client.query("ROLLBACK"); } finally { client.release(); }
			}
			ctx.waitUntil(pool.end());
		}
	}
};
