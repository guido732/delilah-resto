// Router
const router = require("express").Router();
// Sequelize
const Sequelize = require("sequelize");
const { DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT } = process.env;
const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Middlewares
const { validate_token, is_admin } = require("../middlewares");
// Services & Utils
const {
	generate_token,
	filter_empty_props,
	get_by_param,
	compare_same_user_id,
	filter_sensitive_data,
} = require("../services");

router.post("/", async (req, res, next) => {
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
				"INSERT INTO users (username, password, full_name, email, phone, delivery_address) VALUES (:username, :password, :full_name, :email, :phone, :delivery_address)",
				{ replacements: { username, password, full_name, email, phone, delivery_address } }
			);
			res.status(200).json("User correctly added to database");
		} else {
			res.status(400).json("Error validating input data");
		}
	} catch (error) {
		console.log(error);
		next(new Error(error));
	}
});
router.get("/login", async (req, res, next) => {
	const { username, email, password } = req.body;
	try {
		const found_username = await get_by_param("users", "username", username);
		const found_email = await get_by_param("users", "email", email);
		if (found_username.is_disabled || found_email.is_disabled) {
			res.status(401).json("Invalid request, user account is disabled");
		} else if (found_username.password === password) {
			const token = generate_token({
				username: found_username.username,
				user_id: found_username.user_id,
				is_admin: found_username.is_admin,
				isDisabled: found_username.is_disabled,
			});
			res.status(200).json(token);
		} else if (found_email.password === password) {
			const token = generate_token({
				username: found_email.username,
				user_id: found_email.user_id,
				is_admin: found_email.is_admin,
				is_disabled: found_email.is_disabled,
			});
			res.status(200).json(token);
		} else {
			res.status(400).json("Invalid username/password supplied");
		}
	} catch (error) {
		next(new Error(error));
	}
});
router.get("/", validate_token, async (req, res, next) => {
	const user_id = req.token_info.user_id;
	const is_admin = req.token_info.is_admin;
	try {
		let filtered_users = [];
		if (is_admin) {
			const found_users = await get_by_param("users", true, true, true);
			filtered_users = found_users.map((user) => {
				delete user.password;
				return user;
			});
		} else {
			const found_user = await get_by_param("users", "user_id", user_id, true);
			filtered_users = found_user.map((user) => {
				delete user.password;
				return user;
			});
		}
		if (filtered_users.length) {
			res.status(200).json(filtered_users);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		next(new Error(error));
	}
});
router.put("/", validate_token, async (req, res, next) => {
	const token = req.token_info;
	const username = token.username;
	try {
		const found_user = await get_by_param("users", "username", username);
		const user_id = found_user.user_id;
		if (found_user) {
			const { username, full_name, email, phone, delivery_address } = req.body;

			// Validates if requested name & email already exist for any other user than this one
			const existing_username = await get_by_param("users", "username", username);
			const existing_email = await get_by_param("users", "email", email);

			if (compare_same_user_id(req.token_info.user_id, existing_username.user_id)) {
				res.status(409).json("User already exists, please pick another");
				return;
			}
			if (compare_same_user_id(req.token_info.user_id, existing_email.user_id)) {
				res.status(409).json("Email already exists, please pick another");
				return;
			}

			// Filters "", null or undefined props and puts remaining into new object
			const filtered_props = filter_empty_props({ username, full_name, email, phone, delivery_address });

			// Creates new object applying only the filtered Props over the previous ones
			const updated_user = { ...found_user, ...filtered_props };
			const update = await sequelize.query(
				"UPDATE users SET username = :username, full_name = :full_name, email = :email, phone = :phone, delivery_address = :delivery_address WHERE user_id = :user_id",
				{
					replacements: {
						username: updated_user.username,
						full_name: updated_user.full_name,
						email: updated_user.email,
						phone: updated_user.phone,
						delivery_address: updated_user.delivery_address,
						user_id: user_id,
					},
				}
			);
			res.status(200).json("User was modified correctly");
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		next(new Error(error));
	}
});
router.delete("/", validate_token, async (req, res, next) => {
	const token = req.token_info;
	const user_id = token.user_id;
	try {
		const update = await sequelize.query("UPDATE users SET is_disabled = true WHERE user_id = :user_id", {
			replacements: {
				user_id,
			},
		});
		res.status(200).json("User account disabled");
	} catch (error) {
		next(new Error(error));
	}
});
router.get("/:username", validate_token, is_admin, async (req, res, next) => {
	const username = req.params.username;
	try {
		let found_user = await get_by_param("users", "username", username, true);
		if (found_user.length) {
			filtered_user = filter_sensitive_data(found_user, ["password"]);
			res.status(200).json(filtered_user);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		next(new Error(error));
	}
});
router.put("/:username", validate_token, is_admin, async (req, res, next) => {
	const username = req.params.username;
	try {
		const found_user = await get_by_param("users", "username", username);
		const user_id = found_user.user_id;
		if (found_user) {
			const { username, password, full_name, email, phone, delivery_address, is_disabled } = req.body;
			// Finds all usernames/mails that match the param provided
			const existing_username = await get_by_param("users", "username", username, true);
			const existing_email = await get_by_param("users", "email", email, true);

			// Finds if any of the previously found IDs match the user-to-modify ID or if they belong to a different user
			const repeated_username =
				existing_username && existing_username.map((user) => compare_same_user_id(user_id, user.user_id));
			const repeated_email =
				existing_email && existing_email.map((user) => compare_same_user_id(user_id, user.user_id));

			// If said values don't match ID -> the user/email is taken by another user and can't be changed to that
			if (repeated_username && repeated_username.some((value) => value === true)) {
				res.status(409).json("Username already exists, please pick another");
				return;
			}
			if (repeated_email && repeated_email.some((value) => value === true)) {
				res.status(409).json("Email already exists, please pick another");
				return;
			}

			// Filters "", null or undefined props and puts remaining into new object
			const filtered_props = filter_empty_props({
				username,
				password,
				full_name,
				email,
				phone,
				delivery_address,
				is_disabled,
			});
			// Creates new object applying only the filtered Props over the previous ones
			const updatedUser = { ...found_user, ...filtered_props };
			const update = await sequelize.query(
				`UPDATE users SET username = :username, password = :password, full_name = :full_name, email = :email, phone = :phone, delivery_address = :delivery_address, is_disabled = :is_disabled WHERE user_id = :user_id`,
				{
					replacements: {
						username: updatedUser.username,
						password: updatedUser.password,
						full_name: updatedUser.full_name,
						email: updatedUser.email,
						phone: updatedUser.phone,
						delivery_address: updatedUser.delivery_address,
						user_id: user_id,
						is_disabled: updatedUser.is_disabled,
					},
				}
			);
			res.status(200).json(`User ${username} was modified correctly`);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		next(new Error(error));
	}
});
router.delete("/:username", validate_token, is_admin, async (req, res, next) => {
	const username = req.params.username;
	try {
		const found_user = await get_by_param("users", "username", username);
		const user_id = found_user.user_id;
		if (!found_user) {
			res.status(404).json("User not found");
			return;
		}
		const update = await sequelize.query("UPDATE users SET is_disabled = true WHERE user_id = :user_id", {
			replacements: {
				user_id: user_id,
			},
		});
		res.status(200).json(`User ${username} was disabled correctly`);
	} catch (error) {
		next(new Error(error));
	}
});

module.exports = router;
