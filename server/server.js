// Delilah Resto - NodeJs Server

const express = require("express");
const server = express();
const bp = require("body-parser");
const jwt = require("jsonwebtoken");

server.use(bp.json());

server.listen("3000", () => {
	console.log("Delilah Resto - Server Started");
});
