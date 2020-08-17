const router = require("express").Router();

router.post("/demo", (req, res) => {
	res.send("Users demo!");
});

module.exports = router;
