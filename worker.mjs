import express from "express";
import { Pool } from "pg";
import { httpServerHandler } from "cloudflare:node";

import database from "./db/pool.js";
import indexRouter from "./routes/indexRouter.js";
import views from "./generated/views.js";

const app = express();

app.use(express.urlencoded({ extended: true }));

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

app.use("/", indexRouter);

app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).send("Something went wrong. Please try again.");
});

app.listen(3000);

const handler = httpServerHandler({ port: 3000 });

export default {
	async fetch(request, env, ctx) {
		const pool = new Pool({
			connectionString: env.DATABASE_URL,
			max: 1
		});

		pool.on("error", () => {
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
