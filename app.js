const express = require("express");
const path = require("node:path");
const createApp = require("./createApp");

const app = createApp((app) => {
	app.set("views", path.join(__dirname, "views"));
	app.set("view engine", "ejs");
	app.use(express.static(path.join(__dirname, "public")));
});

module.exports = app;
