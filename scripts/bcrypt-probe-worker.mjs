import passwordService from "../services/passwordService.js";

const testPassword = "probe-password";
const testHash = "$2b$12$nw2BLOLFXfQ07V6JsXQULuAytxIJ8c4612ch9dtDFLfu/oiZs.Z5S";

export default {
	async fetch(request, env) {
		if (!env.PROBE_TOKEN || request.headers.get("Authorization") !== `Bearer ${env.PROBE_TOKEN}`) {
			return new Response("Not found", { status: 404 });
		}

		const operation = new URL(request.url).pathname;

		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		if (operation === "/hash") {
			const hash = await passwordService.hashPassword(testPassword);
			return Response.json({ operation: "hash", validHash: /^\$2[aby]\$12\$/.test(hash) });
		}

		if (operation === "/compare") {
			const matches = await passwordService.comparePassword(testPassword, testHash);
			return Response.json({ operation: "compare", matches });
		}

		if (operation === "/compare-wrong") {
			const matches = await passwordService.comparePassword("incorrect", testHash);
			return Response.json({ operation: "compare-wrong", matches });
		}

		return new Response("Not found", { status: 404 });
	}
};
