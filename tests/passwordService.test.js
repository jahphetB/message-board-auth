const test = require("node:test");
const assert = require("node:assert/strict");
const database = require("../db/pool");
const { hashPassword, comparePassword } = require("../services/passwordService");

test.after(async () => database.end());

test("hashes passwords with bcrypt and compares the exact input", async () => {
	const password = " a password with spaces ";
	const hash = await hashPassword(password);

	assert.match(hash, /^\$2a\$12\$/);
	assert.equal(await comparePassword(password, hash), true);
	assert.equal(await comparePassword(password.trim(), hash), false);
});

test("rejects null characters which PostgreSQL text cannot store", async () => {
	await assert.rejects(hashPassword("test\0password"), TypeError);
});

test("rejects malformed Unicode rather than changing the password", async () => {
	await assert.rejects(hashPassword("testpassword\uD800"), TypeError);
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
