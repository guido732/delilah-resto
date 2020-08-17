// Custom Modules
const utils = require("../utils");
const { QueryTypes } = require("sequelize");

const router = require("express").Router();

router.post("/demo", (req, res) => {
	res.send("Orders demo!");
});

module.exports = router;
