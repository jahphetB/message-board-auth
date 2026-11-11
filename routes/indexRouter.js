const { Router } = require("express");
const messageController = require("../controllers/messageController");
const requireAuth = require("../middleware/requireAuth");
const { messageValidators } = require("../validators/messageValidators");

const indexRouter = Router();

indexRouter.get("/", messageController.getMessages);
indexRouter.get("/new", requireAuth, messageController.getNewMessage);
indexRouter.post("/new", requireAuth, messageValidators(), messageController.createMessage);
indexRouter.get("/messages/:messageId", messageController.getMessage);

module.exports = indexRouter;
