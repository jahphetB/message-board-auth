const { randomInt } = require("node:crypto");
const { deleteExpiredSessions } = require("../db/sessionQueries");

function createSessionCleanup({
	shouldRun = () => randomInt(100) === 0,
	cleanup = deleteExpiredSessions,
	reportFailure = () => console.error("Expired session cleanup failed.")
} = {}) {
	return async (req, res, next) => {
		if (!shouldRun()) return next();
		try {
			await cleanup(req.sessionID);
		} catch {
			reportFailure();
		}
		return next();
	};
}

module.exports = { createSessionCleanup };
