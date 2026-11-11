function requireAdmin(req, res, next) {
	if (req.isAuthenticated() && req.user.is_admin) return next();
	return res.status(403).send("Admin access required.");
}

module.exports = requireAdmin;
