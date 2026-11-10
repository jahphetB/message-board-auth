const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { hashPassword, comparePassword } = require("../services/passwordService");

test("hashes passwords with bcrypt and compares the exact input", async () => {
	const password = " a password with spaces ";
	const hash = await hashPassword(password);

	assert.equal(bcrypt.getRounds(hash), 12);
	assert.equal(await comparePassword(password, hash), true);
	assert.equal(await comparePassword(password.trim(), hash), false);
});

test("rejects passwords over 72 UTF-8 bytes without truncating them", async () => {
	const password = "é".repeat(37);

	await assert.rejects(hashPassword(password), RangeError);
	await assert.rejects(comparePassword(password, "unused"), RangeError);
});

test("accepts a password at the 72-byte limit", async () => {
	const password = "é".repeat(36);
	const hash = await hashPassword(password);

	assert.equal(await comparePassword(password, hash), true);
});
