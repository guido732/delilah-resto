// Services & Utils
const { get_by_param } = require("../services");
// JWT
const jwt = require("jsonwebtoken");
// env
if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}
const JWT_SECRET = process.env.JWT_SECRET;

async function validate_token(req, res, next) {
	const token = req.headers.authorization.split(" ")[1];
	try {
		const verification = jwt.verify(token, JWT_SECRET);
		const found_user = await get_by_param("users", "user_id", verification.id);
		const isDisabled = !!found_user.is_disabled;
		if (isDisabled) {
			res.status(401).json("Unauthorized - User account is disabled");
		} else {
			req.token_info = verification;
			next();
		}
	} catch (e) {
		res.status(401).json("Unauthorized - Invalid Token");
	}
}
function is_admin(req, res, next) {
	req.token_info.is_admin ? next() : res.status(401).json("Unauthorized - Not an admin");
}

module.exports = { validate_token, is_admin };
