const router = require("express").Router();

router.post("/demo", (req, res) => {
	res.send("Products demo!");
});

module.exports = router;
