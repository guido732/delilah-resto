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
// const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Routes
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const productRoutes = require("./routes/product");
const orderRoutes = require("./routes/order");

// Server Setup
server.use(express.json());
server.listen(port, () => {
	const date = new Date();
	console.log(`Delilah Resto - Server Started ${date} on port ${port}`);
});

// Route Middlewares
server.use("/v1/users", userRoutes);
server.use("/v1/admin", adminRoutes);
server.use("/v1/products", productRoutes);
server.use("/v1/orders", orderRoutes);

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
