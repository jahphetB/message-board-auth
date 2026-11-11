const test = require("node:test");
const assert = require("node:assert/strict");
const { validationResult } = require("express-validator");
const { passwordValidators } = require("../validators/authValidators");

async function validate(password, confirmPassword) {
	const req = { body: { password, confirmPassword } };
	for (const validator of passwordValidators()) {
		await validator.run(req);
	}
	return { body: req.body, errors: validationResult(req).array() };
}

test("accepts matching passwords at the character and byte boundaries", async () => {
	for (const password of ["a".repeat(12), "é".repeat(36), " a long passphrase "]) {
		const result = await validate(password, password);
		assert.equal(result.errors.length, 0);
		assert.equal(result.body.password, password);
	}
});

test("rejects invalid password lengths and inputs without exposing values", async () => {
	for (const password of ["a".repeat(11), " ".repeat(12), "é".repeat(37), "validpassword\0", "validpassword\uD800", 123, ["secret"]]) {
		const result = await validate(password, password);
		assert.ok(result.errors.some((error) => error.path === "password"));
		assert.ok(result.errors.every((error) => !Object.hasOwn(error, "value")));
	}
});

test("confirmation must match exactly and its value is hidden in errors", async () => {
	for (const confirmation of ["a long password", " a long password ", "", undefined, ["a long password"]]) {
		const result = await validate(" a long password", confirmation);
		assert.ok(result.errors.some((error) => error.path === "confirmPassword"));
		assert.ok(result.errors.every((error) => !Object.hasOwn(error, "value")));
	}
});
