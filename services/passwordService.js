const passwordQueries = require("../db/passwordQueries");

function validatePasswordInput(password) {
	if (typeof password !== "string") {
		throw new TypeError("Password must be a string.");
	}

	if (Buffer.byteLength(password, "utf8") > 72) {
		throw new RangeError("Password must be at most 72 UTF-8 bytes.");
	}

	if (password.includes("\0")) {
		throw new TypeError("Password cannot contain a null character.");
	}

	if (!password.isWellFormed()) {
		throw new TypeError("Password must contain valid Unicode text.");
	}
}

async function hashPassword(password) {
	validatePasswordInput(password);
	return passwordQueries.hashPassword(password);
}

async function comparePassword(password, hash) {
	validatePasswordInput(password);
	return passwordQueries.comparePassword(password, hash);
}

module.exports = { hashPassword, comparePassword };
