// ##############################################
// ####### Delilah Resto - NodeJs Server  #######
// ##############################################

// Express
const express = require("express");
const server = express();
// JWT
const jwt = require("jsonwebtoken");
// Custom Modules
const utils = require("./utils");
// DB setup/connection
const Sequelize = require("sequelize");
const { QueryTypes } = require("sequelize");
// Development Environment
if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}
const { DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT } = process.env;
const port = process.env.PORT || 3000;
// Sequelize Initialization
const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Routes
const userRoutes = require("./routes/user");
const productRoutes = require("./routes/product");
const orderRoutes = require("./routes/order");
// Route Middlewares
server.use("/v1/users", userRoutes);
server.use("/v1/products", productRoutes);
server.use("/v1/orders", orderRoutes);

// Server Setup
server.use(express.json());
server.listen(port, () => {
	const date = new Date();
	console.log(`Delilah Resto - Server Started ${date} on port ${port}`);
});

// USERS
server.post("/v1/users", async (req, res, next) => {
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
server.post("/v1/admin", async (req, res, next) => {
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
server.get("/v1/users/login", async (req, res, next) => {
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
server.get("/v1/users", validate_token, async (req, res, next) => {
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
server.put("/v1/users", validate_token, async (req, res, next) => {
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
server.delete("/v1/users", validate_token, async (req, res, next) => {
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
server.get("/v1/users/:username", validate_token, is_admin, async (req, res, next) => {
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
server.put("/v1/users/:username", validate_token, is_admin, async (req, res, next) => {
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
server.delete("/v1/users/:username", validate_token, is_admin, async (req, res, next) => {
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

// PRODUCTS
server.get("/v1/products", validate_token, async (req, res, next) => {
	const products = await get_by_param("products", "is_disabled", false, true);
	res.status(200).json(products);
});
server.post("/v1/products", validate_token, is_admin, async (req, res, next) => {
	const { name, price, img_url, description } = req.body;
	try {
		if (name && price && img_url && description) {
			const insert = await sequelize.query(
				"INSERT INTO products (name, price, img_url, description) VALUES (:name, :price, :img_url, :description)",
				{ replacements: { name, price, img_url, description } }
			);
			console.log("Product Added to database", insert);
			res.status(200).json(insert);
		} else {
			res.status(400).json("Error validating input data");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.get("/v1/products/:id", validate_token, async (req, res, next) => {
	const product_id = req.params.id;
	const product_found = await get_by_param("products", "product_id", product_id);
	product_found ? res.status(200).json(product_found) : res.status(404).json("No product matches the ID provided");
});
server.put("/v1/products/:id", validate_token, is_admin, async (req, res, next) => {
	const product_id = req.params.id;
	try {
		const product_found = await get_by_param("products", "product_id", product_id);
		if (product_found) {
			const { name, price, img_url, description, is_disabled } = req.body;
			// Filters "", null or undefined props and puts remaining into new object
			const filtered_props = filter_empty_props({ name, price, img_url, description, is_disabled });
			// Creates new object applying only the filtered Props over the previous ones
			const updatedProduct = { ...product_found, ...filtered_props };
			const update = await sequelize.query(
				"UPDATE products SET name = :name, price = :price, img_url = :img_url, description = :description, is_disabled = :is_disabled WHERE product_id = :product_id",
				{
					replacements: {
						product_id: product_id,
						name: updatedProduct.name,
						price: updatedProduct.price,
						img_url: updatedProduct.img_url,
						description: updatedProduct.description,
						is_disabled: updatedProduct.is_disabled,
					},
				}
			);
			res.status(200).json(`Product with id ${product_id} modified correctly`);
		} else {
			res.status(404).json("No product matches the ID provided");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.delete("/v1/products/:id", validate_token, is_admin, async (req, res, next) => {
	const product_id = req.params.id;
	try {
		const product_found = await get_by_param("products", "product_id", product_id);
		if (product_found) {
			const update = await sequelize.query("UPDATE products SET is_disabled = true WHERE product_id = :product_id", {
				replacements: {
					product_id: product_id,
				},
			});
			res.status(200).json(`Product with id ${product_id} was disabled correctly`);
		} else {
			res.status(404).json("No product matches the ID provided");
		}
	} catch (error) {
		next(new Error(error));
	}
});

// Orders
server.get("/v1/orders", validate_token, async (req, res, next) => {
	try {
		// Gets a list of all orders only if it's admin, otherwise gets only results that match the user's ID
		let orders = [];
		if (req.token_info.is_admin) {
			orders = await sequelize.query(
				"SELECT * FROM orders INNER JOIN users ON orders.user_id = users.user_id ORDER BY date DESC;",
				{
					type: QueryTypes.SELECT,
				}
			);
		} else {
			const user_id = req.token_info.user_id;
			orders = await sequelize.query(
				"SELECT * FROM orders INNER JOIN users ON orders.user_id = users.user_id WHERE users.user_id = :user_id ORDER BY date DESC;",
				{
					replacements: { user_id: user_id },
					type: QueryTypes.SELECT,
				}
			);
		}

		// Adds the product list  details to each order
		const detailed_orders = await Promise.all(
			orders.map(async (order) => {
				const order_products = await sequelize.query(
					"SELECT * FROM orders_products INNER JOIN products WHERE order_id = :order_id AND orders_products.product_id = products.product_id",
					{
						replacements: { order_id: order.order_id },
						type: QueryTypes.SELECT,
					}
				);
				order.products = order_products;
				return order;
			})
		);

		if (!!detailed_orders.length) {
			const filtered_orders = filter_sensitive_data(orders, ["password", "is_admin", "is_disabled"]);
			res.status(200).json(filtered_orders);
		} else {
			res.status(404).json("Search didn't bring any results");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.post("/v1/orders", validate_token, async (req, res, next) => {
	const user_id = req.token_info.user_id;
	const { data, payment_method } = req.body;
	try {
		const get_order_details = await Promise.all(
			data.map((product) => get_by_param("products", "product_id", product.product_id))
		);

		if (get_order_details.some((product) => product.is_disabled)) {
			res.status(403).json("Some of the products selected are disabled or no longer available");
		} else if (get_order_details.every((product) => !!product === true)) {
			const orderData = async () => {
				let total = 0;
				let description = "";
				get_order_details.forEach((product, index) => {
					total += product.price * data[index].amount;
					description += `${data[index].amount}x ${product.name}, `;
				});
				description = description.substring(0, description.length - 2);
				return [total, description];
			};

			const [total, description] = await orderData();
			const order = await sequelize.query(
				"INSERT INTO orders (status, date, description, payment_method, total, user_id) VALUES (:status, :date, :description, :payment_method, :total, :user_id)",
				{
					replacements: {
						status: "new",
						date: new Date(),
						description,
						payment_method: payment_method,
						total,
						user_id,
					},
				}
			);

			data.forEach(async (product) => {
				const order_products = await sequelize.query(
					"INSERT INTO orders_products (order_id, product_id, product_amount) VALUES (:order_id, :product_id, :product_amount)",
					{ replacements: { order_id: order[0], product_id: product.product_id, product_amount: product.amount } }
				);
			});

			console.log(`Order ${order[0]} was created`);
			res.status(200).json("Order created successfully");
		} else {
			res.status(400).json("Error validating input data");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.get("/v1/orders/:id", validate_token, is_admin, async (req, res, next) => {
	const order_id = req.params.id;
	try {
		const order = await sequelize.query(
			"SELECT * FROM orders INNER JOIN users ON orders.user_id = users.user_id WHERE orders.order_id = :order_id;",
			{
				replacements: { order_id: order_id },
				type: QueryTypes.SELECT,
			}
		);
		if (!!order.length) {
			// Adds the product list details to the order
			order[0].products = await sequelize.query(
				"SELECT * FROM orders_products INNER JOIN products WHERE order_id = :order_id AND orders_products.product_id = products.product_id",
				{
					replacements: { order_id: order[0].order_id },
					type: QueryTypes.SELECT,
				}
			);
			delete order[0].password;
			delete order[0].is_admin;
			delete order[0].is_disabled;
			res.status(200).json(order);
		} else {
			res.status(404).json("Search didn't bring any results");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.put("/v1/orders/:id", validate_token, is_admin, async (req, res, next) => {
	const order_id = req.params.id;
	const { order_status } = req.body;
	try {
		const order = await sequelize.query("SELECT * FROM orders WHERE order_id = :order_id;", {
			replacements: { order_id: order_id },
			type: QueryTypes.SELECT,
		});

		if (!!order.length) {
			if (utils.valid_order_status.includes(order_status)) {
				const update = await sequelize.query("UPDATE orders SET status = :status WHERE order_id = :order_id", {
					replacements: {
						order_id: order_id,
						status: order_status,
					},
				});
				res.status(200).json(`Order ${order_id} status was modified correctly`);
			} else {
				res.status(403).json("The state given for the product is not valid");
			}
		} else {
			res.status(404).json("Search didn't bring any results");
		}
	} catch (error) {
		next(new Error(error));
	}
});
server.delete("/v1/orders/:id", validate_token, is_admin, async (req, res, next) => {
	const order_id = req.params.id;
	try {
		const order_found = await get_by_param("orders", "order_id", order_id);
		if (order_found) {
			const update = await sequelize.query("UPDATE orders SET is_disabled = true WHERE order_id = :order_id", {
				replacements: {
					order_id: order_id,
				},
			});
			res.status(200).json(`Order with id ${order_id} was disabled correctly`);
		} else {
			res.status(404).json("No order matches the ID provided");
		}
	} catch (error) {
		next(new Error(error));
	}
});

// Test Endpoints
server.get("/v1/validate-token", validate_token, async (req, res, next) => {
	res.status(200).json("Valid Token, carry on");
});

// Functions & Middlewares
function generate_token(info) {
	return jwt.sign(info, JWT_SECRET, { expiresIn: "1h" });
}
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
function filter_empty_props(inputObject) {
	Object.keys(inputObject).forEach((key) => !inputObject[key] && delete inputObject[key]);
	return inputObject;
}
async function get_by_param(table, tableParam = "TRUE", inputParam = "TRUE", all = false) {
	const searchResults = await sequelize.query(`SELECT * FROM ${table} WHERE ${tableParam} = :replacementParam`, {
		replacements: { replacementParam: inputParam },
		type: QueryTypes.SELECT,
	});
	return !!searchResults.length ? (all ? searchResults : searchResults[0]) : false;
}
function compare_same_user_id(baseUserId, found_userId) {
	if (found_userId && baseUserId !== found_userId) {
		console.log("Base User ID:", baseUserId, "Found User ID:", found_userId);
		console.log("Different username, same data");
		return true;
	} else {
		return false;
	}
}
function filter_sensitive_data(userArray, filters) {
	return userArray.map((user) => {
		filters.forEach((filter) => delete user[filter]);
		return user;
	});
}

// Generic error detection
server.use((err, req, res, next) => {
	if (!err) return next();
	console.log("An error has occurred", err);
	res.status(500).json(err.message);
	throw err;
});
