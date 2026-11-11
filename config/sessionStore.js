const session = require("express-session");
const PgStore = require("connect-pg-simple")(session);
const database = require("../db/pool");

function createSessionStore() {
	return new PgStore({
		pool: database,
		pruneSessionInterval: false
	});
}

module.exports = { createSessionStore };
