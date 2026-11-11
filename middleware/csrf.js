const { randomBytes, timingSafeEqual } = require("node:crypto");

function getCsrfToken(req) {
	if (!req.session.csrfToken) {
		req.session.csrfToken = randomBytes(32).toString("hex");
	}
	return req.session.csrfToken;
}

function requireCsrf(req, res, next) {
	if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

	const submitted = req.body?._csrf;
	const expected = req.session.csrfToken;
	if (typeof submitted !== "string" || typeof expected !== "string" ||
		!/^[a-f0-9]{64}$/.test(submitted) || !/^[a-f0-9]{64}$/.test(expected) ||
		!timingSafeEqual(Buffer.from(submitted, "hex"), Buffer.from(expected, "hex"))) {
		return res.status(403).send("Invalid or missing form token.");
	}

	next();
}

module.exports = { getCsrfToken, requireCsrf };
