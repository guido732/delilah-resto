// ##############################################
// ####### Delilah Resto - NodeJs Server  #######
// ##############################################

// Imports
// Express
const express = require("express");
const server = express();
// Middlewares
const bp = require("body-parser");
// JWT
const jwt = require("jsonwebtoken");
const signature = require("./jwt");
// DB setup/connection
const { conf_db_host, conf_db_name, conf_user, conf_password, conf_port } = require("../database/db_connection_data");
const Sequelize = require("sequelize");
const { QueryTypes } = require("sequelize");
const sequelize = new Sequelize(`mysql://${conf_user}:${conf_password}@${conf_db_host}:${conf_port}/${conf_db_name}`);

// Server Setup
server.use(bp.json());
server.listen("3000", () => {
	const date = new Date();
	console.log(`Delilah Resto - Server Started ${date}`);
});

// PRODUCTS
server.get("/v1/products", validateToken, async (req, res) => {
	const products = await sequelize.query("SELECT * FROM products WHERE disabled = FALSE", {
		type: QueryTypes.SELECT,
	});
	res.status(200).json(products);
});
server.post("/v1/products", validateToken, isAdmin, async (req, res) => {
	const { name, price, imgUrl, description } = req.body;
	if (name && price && imgUrl && description) {
		const insert = await sequelize.query(
			"INSERT INTO products (name, price, img_url, description) VALUES (:name, :price, :imgUrl, :description)",
			{ replacements: { name, price, imgUrl, description } }
		);
		console.log("Product Added to database", insert);
		res.status(200).json(insert);
	} else {
		res.status(400).send("Error validating input data");
	}
});
server.get("/v1/products/:id", validateToken, async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParam("products", "product_id", productId);
	productFound ? res.status(200).json(productFound) : res.status(404).send("No product matches the ID provided");
});
server.put("/v1/products/:id", validateToken, isAdmin, async (req, res) => {
	const productId = req.params.id;
	try {
		const productFound = await getByParam("products", "product_id", productId);
		if (productFound) {
			const { name, price, imgUrl, description, disabled } = req.body;
			// Filters "", null or undefined props and puts remaining into new object
			const filteredProps = filterEmptyProps({ name, price, imgUrl, description, disabled });
			// Creates new object applying only the filtered Props over the previous ones
			const updatedProduct = { ...productFound, ...filteredProps };
			const update = await sequelize.query(
				"UPDATE products SET name = :name, price = :price, img_url = :imgUrl, description = :description, disabled = :disabled WHERE product_id = :id",
				{
					replacements: {
						id: productId,
						name: updatedProduct.name,
						price: updatedProduct.price,
						imgUrl: updatedProduct.img_url,
						description: updatedProduct.description,
						disabled: updatedProduct.disabled,
					},
				}
			);
			res.status(200).send(`Product with id ${productId} modified correctly`);
		} else {
			res.status(404).send("No product matches the ID provided");
		}
	} catch (error) {
		res.status(500).send("An error has ocurred");
	}
});
server.delete("/v1/products/:id", validateToken, isAdmin, async (req, res) => {
	const productId = req.params.id;
	try {
		const productFound = await getByParam("products", "product_id", productId);
		if (productFound) {
			const update = await sequelize.query("UPDATE products SET disabled = true WHERE product_id = :id", {
				replacements: {
					id: productId,
				},
			});
			res.status(200).send(`Product with id ${productId} was disabled correctly`);
		}
	} catch (error) {
		res.status(404).send("No product matches the ID provided");
	}
});

// USERS
server.get("/v1/users", validateToken, isAdmin, async (req, res) => {
	try {
		const users = await sequelize.query("SELECT * FROM users", {
			type: QueryTypes.SELECT,
		});
		const filteredUsers = users.map((user) => {
			delete user.pass;
			return user;
		});
		res.status(200).json(filteredUsers);
	} catch (error) {
		res.status(500).send("An error has ocurred");
	}
});
server.post("/v1/users", async (req, res) => {
	const { username, password, email, deliveryAddress, fullName, phone } = req.body;
	try {
		const existingUsername = await getByParam("users", "user", username);
		const existingEmail = await getByParam("users", "mail", email);
		if (existingUsername) {
			res.status(409).json("Username already exists, please pick another");
			return;
		}
		if (existingEmail) {
			res.status(409).json("Email already exists, please pick another");
			return;
		}
		if ((username && password && email && deliveryAddress, fullName, phone)) {
			const insert = await sequelize.query(
				"INSERT INTO users (user, pass, full_name, mail, phone, delivery_address) VALUES (:username, :password, :fullName, :email, :phone, :deliveryAddress)",
				{ replacements: { username, password, fullName, email, phone, deliveryAddress } }
			);
			res.status(200).json("User correctly added to database");
		} else {
			res.status(400).send("Error validating input data");
		}
	} catch (error) {
		res.status(500).send("An error has ocurred");
	}
});
server.get("/v1/users/login", async (req, res) => {
	const { user, pass } = req.body;
	try {
		const foundUser = await getByParam("users", "user", user);
		if (foundUser.pass !== pass) {
			res.status(400).send("Invalid username/password supplied");
		} else if (foundUser.disabled) {
			res.status(401).send("Invalid request, user account is disabled");
		} else {
			const token = generateToken({
				user: foundUser.user,
				id: foundUser.user_id,
				isAdmin: foundUser.is_admin,
				isDisabled: foundUser.disabled,
			});
			res.status(200).json(token);
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.get("/v1/users/active", validateToken, async (req, res) => {
	const token = req.tokenInfo;
	const userId = token.id;
	try {
		const foundUser = await getByParam("users", "user_id", userId);
		if (foundUser) {
			const { user, fullName, mail, phone, deliveryAddress } = foundUser;
			const userData = { user, fullName, mail, phone, deliveryAddress };
			res.status(200).json(userData);
		} else {
			res.status(404).json("User not found");
		}
	} catch (e) {
		res.status(500).json(error);
	}
});
// Chequear que no exista otro usuario con esos datos (validar si el active user/id no matchea con otro más)
server.put("/v1/users/active", validateToken, async (req, res) => {
	const token = req.tokenInfo;
	const username = token.user;
	try {
		const foundUser = await getByParam("users", "user", username);
		const userId = foundUser.user_id;
		if (foundUser) {
			const { user, fullName, mail, phone, deliveryAddress } = req.body;
			// Validate if requested name & email already exist for any other user than this one
			const existingUsername = await getByParam("users", "user", user);
			const existingEmail = await getByParam("users", "mail", mail);
			if (existingUsername) {
				res.status(409).json("Username already exists, please pick another");
				return;
			}
			if (existingEmail) {
				res.status(409).json("Email already exists, please pick another");
				return;
			}
			// Filters "", null or undefined props and puts remaining into new object
			const filteredProps = filterEmptyProps({ user, fullName, mail, phone, deliveryAddress });
			// Creates new object applying only the filtered Props over the previous ones
			const updatedUser = { ...foundUser, ...filteredProps };
			const update = await sequelize.query(
				"UPDATE users SET user = :user, full_name = :fullName, mail = :mail, phone = :phone, delivery_address = :deliveryAddress WHERE user_id = :userId",
				{
					replacements: {
						user: updatedUser.user,
						fullName: updatedUser.full_name,
						mail: updatedUser.mail,
						phone: updatedUser.phone,
						deliveryAddress: updatedUser.delivery_address,
						userId: userId,
					},
				}
			);
			res.status(200).send("User was modified correctly");
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.delete("/v1/users/active", validateToken, async (req, res) => {
	const token = req.tokenInfo;
	const userId = token.id;
	try {
		const update = await sequelize.query("UPDATE users SET disabled = true WHERE user_id = :userId", {
			replacements: {
				userId: userId,
			},
		});
		res.status(200).json("User account disabled");
	} catch (error) {
		res.status(500).json(error);
	}
});
server.get("/v1/users/:username", validateToken, isAdmin, async (req, res) => {
	const username = req.params.username;
	try {
		const foundUser = await getByParam("users", "user", username);
		if (foundUser) {
			res.status(200).json(foundUser);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.put("/v1/users/:username", validateToken, isAdmin, async (req, res) => {
	const username = req.params.username;
	try {
		const foundUser = await getByParam("users", "user", username);
		const userId = foundUser.user_id;
		if (foundUser) {
			const { user, pass, fullName, mail, phone, deliveryAddress, disabled } = req.body;
			const existingUsername = await getByParam("users", "user", user);
			const existingEmail = await getByParam("users", "mail", mail);
			if (existingUsername) {
				res.status(409).json("Username already exists, please pick another");
				return;
			}
			if (existingEmail) {
				res.status(409).json("Email already exists, please pick another");
				return;
			}
			// Filters "", null or undefined props and puts remaining into new object
			const filteredProps = filterEmptyProps({ user, pass, fullName, mail, phone, deliveryAddress, disabled });
			// Creates new object applying only the filtered Props over the previous ones
			const updatedUser = { ...foundUser, ...filteredProps };
			const update = await sequelize.query(
				`UPDATE users SET user = :user, pass = :pass, full_name = :fullName, mail = :mail, phone = :phone, delivery_address = :deliveryAddress, disabled = :disabled WHERE user_id = :userId`,
				{
					replacements: {
						user: updatedUser.user,
						pass: updatedUser.pass,
						fullName: updatedUser.fullName,
						mail: updatedUser.mail,
						phone: updatedUser.phone,
						deliveryAddress: updatedUser.deliveryAddress,
						userId: userId,
						disabled: updatedUser.disabled,
					},
				}
			);
			res.status(200).send(`User ${username} was modified correctly`);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.delete("/v1/users/:username", validateToken, isAdmin, async (req, res) => {
	const username = req.params.username;
	try {
		const foundUser = await getByParam("users", "user", username);
		const userId = foundUser.user_id;
		if (foundUser) {
			const update = await sequelize.query("UPDATE users SET disabled = true WHERE user_id = :userId", {
				replacements: {
					userId: userId,
				},
			});
			res.status(200).send(`User ${username} was disabled correctly`);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		res.status(500).json(error);
	}
});

// Orders
// TODO: Review why orders can't be logged
server.get("/v1/orders", validateToken, isAdmin, async (req, res) => {
	try {
		// Gets a list of all orders
		const orders = await sequelize.query(
			"SELECT * FROM orders INNER JOIN users ON orders.user_id = users.user_id ORDER BY date DESC;",
			{
				type: QueryTypes.SELECT,
			}
		);
		// Adds the product list  details to each order
		const detailedOrders = await Promise.all(
			orders.map(async (order) => {
				const orderProducts = await sequelize.query(
					"SELECT * FROM orders_products INNER JOIN products WHERE order_id = :id AND orders_products.product_id = products.product_id",
					{
						replacements: { id: order.order_id },
						type: QueryTypes.SELECT,
					}
				);
				order.products = orderProducts;
				return order;
			})
		);
		if (!!detailedOrders.length) {
			const filteredOrders = orders.map((user) => {
				delete user.pass;
				delete user.is_admin;
				delete user.disabled;
				return user;
			});
			res.status(200).json(filteredOrders);
		} else {
			res.status(404).send("Search didn't bring any results");
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(error);
	}
});
server.post("/v1/orders", validateToken, async (req, res) => {
	const userId = req.tokenInfo.id;
	const { data, paymentMethod } = req.body;
	try {
		const getOrderDetails = await Promise.all(
			data.map((product) => getByParam("products", "product_id", product.productId))
		);
		if (getOrderDetails.some((product) => product.disabled)) {
			res.status(403).json("Some of the products selected is disabled or no longer available");
		} else if (getOrderDetails.every((product) => !!product === true)) {
			const orderData = async () => {
				let total = 0;
				let description = "";
				getOrderDetails.forEach((product, index) => {
					total += product.price * data[index].amount;
					description += `${data[index].amount}x ${product.name}, `;
				});
				description = description.substring(0, description.length - 2);
				return [total, description];
			};
			const [total, description] = await orderData();
			const order = await sequelize.query(
				"INSERT INTO orders (status, date, description, payment_method, total, user_id) VALUES (:status, :date, :description, :paymentMethod, :total, :userId)",
				{ replacements: { status: "new", date: new Date(), description, paymentMethod, total, userId } }
			);
			data.forEach(async (product) => {
				const order_products = await sequelize.query(
					"INSERT INTO orders_products (order_id, product_id, product_amount) VALUES (:orderID, :productID, :productAmount)",
					{ replacements: { orderID: order[0], productID: product.productId, productAmount: product.amount } }
				);
			});
			console.log(`Order ${order[0]} was created`);
			res.status(200).json("Order created successfully");
		} else {
			res.status(401).send("Invalid request, data provided is invalid");
		}
	} catch (error) {
		console.log(error);

		res.status(500).send(error);
	}
});
server.get("/v1/orders/:id", validateToken, isAdmin, async (req, res) => {
	try {
		const id = req.params.id;
		const order = await sequelize.query(
			"SELECT * FROM orders INNER JOIN users ON orders.user_id = users.user_id WHERE orders.order_id = :id;",
			{
				replacements: { id: id },
				type: QueryTypes.SELECT,
			}
		);
		if (!order.length) {
			res.status(404).send("Search didn't bring any results");
		} else {
			// Adds the product list details to the order
			order[0].products = await sequelize.query(
				"SELECT * FROM orders_products INNER JOIN products WHERE order_id = :id AND orders_products.product_id = products.product_id",
				{
					replacements: { id: order[0].order_id },
					type: QueryTypes.SELECT,
				}
			);
			delete order[0].pass;
			delete order[0].is_admin;
			delete order[0].disabled;
			res.status(200).json(order);
		}
	} catch (error) {
		res.status(500).send(error);
	}
});

// Test Endpoints
server.get("/v1/validate-token", validateToken, async (req, res) => {
	res.status(200).send("Valid Token, carry on");
});

// Functions & Middlewares
// TODO modificar dónde se envía/recibe token
// Modificar en endpoints de postman también
function generateToken(info) {
	return jwt.sign(info, signature, { expiresIn: "1h" });
}
async function validateToken(req, res, next) {
	const token = req.headers.authorization.split(" ")[1];
	try {
		const verification = jwt.verify(token, signature);
		const foundUser = await getByParam("users", "user_id", verification.id);
		const isDisabled = !!foundUser.disabled;
		if (isDisabled) {
			res.status(401).send("Invalid request, user account is disabled");
		} else {
			req.tokenInfo = verification;
			next();
		}
	} catch (e) {
		res.status(401).json("Invalid Token");
	}
}
function isAdmin(req, res, next) {
	req.tokenInfo.isAdmin ? next() : res.status(401).json("Operation forbidden, not an admin");
}
function filterEmptyProps(inputObject) {
	Object.keys(inputObject).forEach((key) => !inputObject[key] && delete inputObject[key]);
	return inputObject;
}
async function getByParam(table = "", tableParam = "", inputParam = "") {
	const searchResult = await sequelize.query(`SELECT * FROM ${table} WHERE ${tableParam} = :replacementParam`, {
		replacements: { replacementParam: inputParam },
		type: QueryTypes.SELECT,
	});
	return !!searchResult.length ? searchResult[0] : false;
}
function getOrderDetails(orderId) {
	return true;
}

// Generic error detection
server.use((err, req, res, next) => {
	if (!err) return next();
	console.log("An error has occurred", err);
	res.status(500).send("Error");
});
