const { Router } = require("express");
const auth = require("../controllers/authController");
const { accountDetailsValidators, passwordValidators } = require("../validators/authValidators");

const router = Router();

router.get("/sign-up", auth.getSignUp);
router.post("/sign-up", accountDetailsValidators(), passwordValidators(), auth.signUp);

module.exports = router;
