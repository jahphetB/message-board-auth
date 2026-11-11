function requireAuth(req, res, next) {
	if (req.isAuthenticated()) return next();
	if (req.method === "GET" || req.method === "HEAD") return res.redirect("/log-in");
	return res.status(401).send("Please log in.");
}

module.exports = requireAuth;
