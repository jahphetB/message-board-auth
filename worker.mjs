import { Pool } from "pg";
import { httpServerHandler } from "cloudflare:node";

import createApp from "./createApp.js";
import database from "./db/pool.js";
import poolErrors from "./db/workerPoolErrors.js";
import views from "./generated/views.js";

const app = createApp((app) => {
	app.use((req, res, next) => {
		res.render = (name, data = {}) => {
			const render = views[name];

			if (!render) {
				throw new Error(`Unknown view: ${name}`);
			}

			return res.type("html").send(render({
				...res.locals,
				...data
			}));
		};

		next();
	});
});

app.listen(3000);

const handler = httpServerHandler({ port: 3000 });

export default {
	async fetch(request, env, ctx) {
		const pool = new Pool({
			connectionString: env.DATABASE_URL,
			max: 1,
			idleTimeoutMillis: 0
		});

		pool.on("error", (error) => {
			if (poolErrors.isExpectedPoolCloseError(pool, error)) {
				return;
			}

			console.error("Database connection error.");
		});

		try {
			return await database.withPool(pool, () => {
				return handler.fetch(request, env, ctx);
			});
		} finally {
			ctx.waitUntil(pool.end());
		}
	}
};
