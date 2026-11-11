const { Router } = require("express");
const requireAuth = require("../middleware/requireAuth");
const membership = require("../controllers/membershipController");

const router = Router();

router.get("/join-club", requireAuth, membership.getClub);
router.post("/join-club", requireAuth, membership.joinClub);
router.get("/become-admin", requireAuth, membership.getAdmin);
router.post("/become-admin", requireAuth, membership.becomeAdmin);

module.exports = router;
