// Router
const router = require("express").Router();
// Sequelize
const Sequelize = require("sequelize");
const { DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT } = process.env;
const sequelize = new Sequelize(`mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
// Middlewares
const { validate_token, is_admin } = require("../middlewares");
// Services & Utils
const { filter_empty_props, get_by_param } = require("../services");

router.get("/", validate_token, async (req, res, next) => {
	const products = await get_by_param("products", "is_disabled", false, true);
	res.status(200).json(products);
});
router.post("/", validate_token, is_admin, async (req, res, next) => {
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
router.get("/:id", validate_token, async (req, res, next) => {
	const product_id = req.params.id;
	const product_found = await get_by_param("products", "product_id", product_id);
	product_found ? res.status(200).json(product_found) : res.status(404).json("No product matches the ID provided");
});
router.put("/:id", validate_token, is_admin, async (req, res, next) => {
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
router.delete("/:id", validate_token, is_admin, async (req, res, next) => {
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

module.exports = router;
