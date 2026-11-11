const { body } = require("express-validator");

function nameValidator(field, label) {
	return body(field)
		.isString().withMessage(`${label} must be text.`)
		.bail()
		.trim()
		.custom((value) => {
			const length = Array.from(value).length;
			return length >= 1 && length <= 100 && !value.includes("\0");
		}).withMessage(`${label} must be 1 to 100 characters and contain no null characters.`);
}

function usernameValidator() {
	return body("username")
		.isString().withMessage("Username must be text.")
		.bail()
		.trim()
		.matches(/^[A-Za-z0-9_]{3,30}$/)
		.withMessage("Username must be 3 to 30 ASCII letters, numbers, or underscores.");
}

function accountDetailsValidators() {
	return [
		nameValidator("firstName", "First name"),
		nameValidator("lastName", "Last name"),
		usernameValidator()
	];
}

function passwordValidators() {
	return [
		body("password")
			.isString().withMessage("Password must be text.")
			.bail()
			.custom((value) => value.trim().length > 0)
			.withMessage("Password is required.")
			.bail()
			.custom((value) => Array.from(value).length >= 12)
			.withMessage("Password must be at least 12 characters.")
			.bail()
			.custom((value) => Buffer.byteLength(value, "utf8") <= 72)
			.withMessage("Password must be at most 72 UTF-8 bytes.")
			.bail()
			.custom((value) => !value.includes("\0"))
			.withMessage("Password cannot contain a null character.")
			.bail()
			.custom((value) => value.isWellFormed())
			.withMessage("Password must contain valid Unicode text.")
			.hide(),
		body("confirmPassword")
			.isString().withMessage("Password confirmation must be text.")
			.bail()
			.custom((value, { req }) => value === req.body.password)
			.withMessage("Passwords must match.")
			.hide()
	];
}

module.exports = { accountDetailsValidators, passwordValidators };
