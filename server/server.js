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
	const productId = req.headers.id;
	console.log(productId);

	// const product = await sequelize.query("SELECT * FROM products", {
	// 	type: sequelize.QueryTypes.SELECT
	// });
	// res.status(200).json(products);
});
