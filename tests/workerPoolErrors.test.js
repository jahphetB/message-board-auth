const test = require("node:test");
const assert = require("node:assert/strict");
const { isExpectedPoolCloseError } = require("../db/workerPoolErrors");

test("only the known socket-close error during pool shutdown is expected", () => {
	const closedSocket = new Error("This socket has been closed.");
	assert.equal(isExpectedPoolCloseError({ ending: true }, closedSocket), true);
	assert.equal(isExpectedPoolCloseError({ ending: false }, closedSocket), false);
	assert.equal(isExpectedPoolCloseError({ ending: true }, new Error("Connection lost")), false);
});
