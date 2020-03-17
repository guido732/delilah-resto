// Delilah Resto - NodeJs Server

const express = require("express");
const server = express();
const bp = require("body-parser");
const jwt = require("jsonwebtoken");
const Sequelize = require("sequelize");
const sequelize = new Sequelize("mysql://root:@localhost:3306/delilah_resto");

server.use(bp.json());

server.listen("3000", () => {
	const date = new Date();
	console.log(`Delilah Resto - Server Started ${date}`);
});

server.get("/v1/products", async (req, res) => {
	const products = await sequelize.query("SELECT * FROM products", {
		type: sequelize.QueryTypes.SELECT
	});
	res.status(200).json(products);
});

server.post("/v1/products", async (req, res) => {
	const { name, price, imgUrl, description } = req.body;
	if (name && price && imgUrl && description) {
		const insert = await sequelize.query(
			"INSERT INTO products (name, price, imgUrl, description) VALUES (:name, :price, :imgUrl, :description)",
			{ replacements: { name, price, imgUrl, description } }
		);
		console.log("Product Added to database", insert);
		res.status(200).json(insert);
	} else {
		res.status(400).send("Error validating input data");
	}
});

server.get("/v1/products/:id", async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParm("products", "productID", productId);
	productFound ? res.status(200).json(productFound) : res.status(404).send("No product matches the ID provided");
});

server.put("/v1/products/:id", async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParm("products", "productID", productId);
	if (productFound) {
		const { name, price, imgUrl, description } = req.body;
		// Filters "", null or undefined props and puts remaining into new object
		const filteredProps = filterEmptyProps({ name, price, imgUrl, description });
		// Creates new object applying only the filtered Props over the previous ones
		const updatedProduct = { ...productFound, ...filteredProps };
		const update = await sequelize.query(
			`UPDATE products SET name = :name, price = :price, imgUrl = :imgUrl, description = :description WHERE productID = :id`,
			{
				replacements: {
					id: productId,
					name: updatedProduct.name,
					price: updatedProduct.price,
					imgUrl: updatedProduct.imgUrl,
					description: updatedProduct.description
				}
			}
		);
		res.status(200).send(`Product with id ${productId} modified correctly`);
	} else {
		res.status(404).send("No product matches the ID provided");
	}
});

server.delete("/v1/products/:id", async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParm("products", "productID", productId);
	if (productFound) {
		const deleteRow = await sequelize.query("DELETE FROM products WHERE productID = :id", {
			replacements: { id: productId }
		});
		res.status(200).send(`Product with id ${productId} was deleted correctly`);
	} else {
		res.status(404).send("No product matches the ID provided");
	}
});

server.post("/v1/users", async (req, res) => {
	const { username, password, email, deliveryAddress, fullName, phone } = req.body;
	const existingUsername = await getByParm("users", "user", username);
	const existingEmail = await getByParm("users", "mail", email);
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
			"INSERT INTO users (user, pass, fullName, mail, phone, deliveryAddress) VALUES (:username, :password, :email, :deliveryAddress, :fullName, :phone)",
			{ replacements: { username, password, email, deliveryAddress, fullName, phone } }
		);
		res.status(200).json("User correctly added to database");
	} else {
		res.status(400).send("Error validating input data");
	}
});

function filterEmptyProps(inputObject) {
	Object.keys(inputObject).forEach(key => !inputObject[key] && delete inputObject[key]);
	return inputObject;
}

async function getByParm(table, tableParam, inputParam) {
	const searchResult = await sequelize.query(`SELECT * FROM ${table} WHERE ${tableParam} = :replacementParam`, {
		replacements: { replacementParam: inputParam },
		type: sequelize.QueryTypes.SELECT
	});
	return !!searchResult.length ? searchResult[0] : false;
}

// Generic error detection
server.use((err, req, res, next) => {
	if (!err) return next();
	console.log("An error has occurred", err);
	res.status(500).send("Error");
});
