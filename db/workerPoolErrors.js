function isExpectedPoolCloseError(pool, error) {
	// Temporary pg-cloudflare 1.4.1 workaround: node-postgres issue #3805.
	return pool.ending === true && error?.message === "This socket has been closed.";
}

module.exports = { isExpectedPoolCloseError };
