const database = require("./pool");

async function deleteExpiredSessions(currentSessionId) {
	const { rowCount } = await database.query(
		`DELETE FROM session
		 WHERE sid IN (
			 SELECT sid FROM session
			 WHERE expire < NOW() AND ($2::text IS NULL OR sid <> $2)
			 ORDER BY expire, sid
			 LIMIT $1 FOR UPDATE SKIP LOCKED
		 ) AND expire < NOW()`,
		[50, currentSessionId || null]
	);
	return rowCount;
}

module.exports = { deleteExpiredSessions };
