import { Pool } from "pg";
import database from "../db/pool.js";
import passwordService from "../services/passwordService.js";

const testPassword = "probe-password";
const testHash = "$2a$12$nw2BLOLFXfQ07V6JsXQULuAytxIJ8c4612ch9dtDFLfu/oiZs.Z5S";

export default {
	async fetch(request, env, ctx) {
		if (!env.PROBE_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.PROBE_TOKEN}`) {
			return new Response("Not found", { status: 404 });
		}

		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });

		try {
			return await database.withPool(pool, async () => {
				const operation = new URL(request.url).pathname;

				if (operation === "/hash") {
					const hash = await passwordService.hashPassword(testPassword);
					return Response.json({ operation: "hash", validHash: /^\$2a\$12\$/.test(hash) });
				}

				if (operation === "/compare" || operation === "/compare-wrong") {
					const password = operation === "/compare" ? testPassword : "incorrect";
					const matches = await passwordService.comparePassword(password, testHash);
					return Response.json({ operation: operation.slice(1), matches });
				}

				if (operation === "/boundary") {
					const password = "é".repeat(36);
					const hash = await passwordService.hashPassword(password);
					const matches = await passwordService.comparePassword(password, hash);
					let rejected = false;

					try {
						await passwordService.hashPassword("é".repeat(37));
					} catch (error) {
						rejected = error instanceof RangeError;
					}

					return Response.json({ operation: "boundary", matches, rejected });
				}

				return new Response("Not found", { status: 404 });
			});
		} catch {
			return new Response("Probe failed", { status: 500 });
		} finally {
			ctx.waitUntil(pool.end());
		}
	}
};
