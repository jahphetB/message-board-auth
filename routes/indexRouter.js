const { Router } = require("express");
const messageController = require("../controllers/messageController");
const requireAuth = require("../middleware/requireAuth");
const requireAdmin = require("../middleware/requireAdmin");
const { messageValidators } = require("../validators/messageValidators");

const indexRouter = Router();

indexRouter.get("/", messageController.getMessages);
indexRouter.get("/new", requireAuth, messageController.getNewMessage);
indexRouter.post("/new", requireAuth, messageValidators(), messageController.createMessage);
indexRouter.get("/messages/:messageId", messageController.getMessage);
indexRouter.post("/messages/:messageId/delete", requireAdmin, messageController.deleteMessage);

module.exports = indexRouter;
