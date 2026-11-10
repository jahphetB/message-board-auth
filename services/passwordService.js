const bcrypt = require("bcryptjs");

// This starting cost must be checked against the deployed Workers runtime.
const BCRYPT_COST = 12;

function validatePasswordInput(password) {
	if (typeof password !== "string") {
		throw new TypeError("Password must be a string.");
	}

	if (bcrypt.truncates(password)) {
		throw new RangeError("Password must be at most 72 UTF-8 bytes.");
	}
}

async function hashPassword(password) {
	validatePasswordInput(password);
	return bcrypt.hash(password, BCRYPT_COST);
}

async function comparePassword(password, hash) {
	validatePasswordInput(password);
	return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };
