const test = require("node:test");
const assert = require("node:assert/strict");
const { validationResult } = require("express-validator");
const { accountDetailsValidators } = require("../validators/authValidators");

async function validate(input) {
	const req = { body: { ...input } };
	for (const validator of accountDetailsValidators()) {
		await validator.run(req);
	}
	return { body: req.body, errors: validationResult(req).array() };
}

test("trims valid names and usernames while preserving international characters", async () => {
	const result = await validate({ firstName: "  Ana María  ", lastName: "  O'Connor  ", username: "  Name_123  " });
	assert.deepEqual(result.errors, []);
	assert.deepEqual(result.body, { firstName: "Ana María", lastName: "O'Connor", username: "Name_123" });
});

test("rejects blank, non-text, overlong, and null-containing names", async () => {
	for (const firstName of [" ", 42, ["Ana"], "x".repeat(101), "A\0B", "❤\uFE0F".repeat(51)]) {
		const result = await validate({ firstName, lastName: "Lee", username: "valid_user" });
		assert.ok(result.errors.some((error) => error.path === "firstName"));
	}
	const valid = await validate({ firstName: "名".repeat(100), lastName: "Lee", username: "valid_user" });
	assert.equal(valid.errors.length, 0);
});

test("enforces username length and ASCII format without coercing other types", async () => {
	for (const username of ["ab", "a".repeat(31), "user-name", "usér", "   ", 123, ["valid_user"]]) {
		const result = await validate({ firstName: "Ana", lastName: "Lee", username });
		assert.ok(result.errors.some((error) => error.path === "username"));
	}
	for (const username of ["Ab_", "a".repeat(30)]) {
		const result = await validate({ firstName: "Ana", lastName: "Lee", username });
		assert.equal(result.errors.length, 0);
	}
});
