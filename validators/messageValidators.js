const { body } = require("express-validator");

function messageField(field, label, maximum) {
	return body(field)
		.isString().withMessage(`${label} must be text.`)
		.bail()
		.trim()
		.custom((value) => {
			const length = Array.from(value).length;
			return length >= 1 && length <= maximum && !value.includes("\0") && value.isWellFormed();
		}).withMessage(`${label} must be 1 to ${maximum} characters of valid text.`);
}

function messageValidators() {
	return [messageField("title", "Title", 120), messageField("text", "Message", 2000)];
}

module.exports = { messageValidators };
