const { Router } = require("express");
const auth = require("../controllers/authController");
const { accountDetailsValidators, passwordValidators } = require("../validators/authValidators");
const passport = require("../config/passport");

const router = Router();

router.get("/sign-up", auth.getSignUp);
router.post("/sign-up", accountDetailsValidators(), passwordValidators(), auth.signUp);
router.get("/log-in", auth.getLogIn);
router.post("/log-in", passport.authenticate("local", {
	successRedirect: "/",
	failureRedirect: "/log-in?failed=1"
}));
router.post("/log-out", auth.logOut);

module.exports = router;
