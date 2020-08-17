// Router
const router = require("express").Router();
// Sequelize
const Sequelize = require("sequelize");
const { QueryTypes } = require("sequelize");
const { DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT } = process.env;
const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Custom Modules
const utils = require("../utils");
// Middlewares
const { validate_token, is_admin } = require("../middlewares");
// Services & Utils
const { get_by_param, filter_sensitive_data } = require("../services");

router.get("/", validate_token, async (req, res, next) => {
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
router.post("/", validate_token, async (req, res, next) => {
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
router.get("/:id", validate_token, is_admin, async (req, res, next) => {
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
router.put("/:id", validate_token, is_admin, async (req, res, next) => {
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
router.delete("/:id", validate_token, is_admin, async (req, res, next) => {
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

module.exports = router;
