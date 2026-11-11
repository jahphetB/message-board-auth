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

module.exports = { accountDetailsValidators };
