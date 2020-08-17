// Router
const router = require("express").Router();
// Middlewares
const { validate_token } = require("../middlewares");

router.get("/", validate_token, async (req, res, next) => {
	res.status(200).json("Valid Token, carry on");
});

module.exports = router;
