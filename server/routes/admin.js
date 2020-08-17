// Router
const router = require("express").Router();
// Sequelize
const Sequelize = require("sequelize");
const { DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT } = process.env;
const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Services & Utils
const { get_by_param } = require("../services/index");

router.post("/v1/admin", async (req, res, next) => {
	const { username, password, email, delivery_address, full_name, phone } = req.body;
	try {
		const existing_username = await get_by_param("users", "username", username);
		const existing_email = await get_by_param("users", "email", email);
		if (existing_username) {
			res.status(409).json("Username already exists, please pick another");
			return;
		}
		if (existing_email) {
			res.status(409).json("Email already exists, please pick another");
			return;
		}
		if (username && password && email && delivery_address && full_name && phone) {
			const insert = await sequelize.query(
				"INSERT INTO users (username, password, full_name, email, phone, delivery_address, is_admin) VALUES (:username, :password, :full_name, :email, :phone, :delivery_address, TRUE)",
				{ replacements: { username, password, full_name, email, phone, delivery_address } }
			);
			res.status(200).json("Admin User correctly added to database");
		} else {
			res.status(400).json("Error validating input data");
		}
	} catch (error) {
		next(new Error(error));
	}
});

module.exports = router;
