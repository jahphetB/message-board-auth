const { Router } = require("express");
const messageController = require("../controllers/messageController");

const indexRouter = Router();

indexRouter.get("/", messageController.getMessages);
indexRouter.get("/messages/:messageId", messageController.getMessage);

module.exports = indexRouter;
