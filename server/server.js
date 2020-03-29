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
	const products = await sequelize.query("SELECT * FROM products", {
		type: QueryTypes.SELECT
	});
	res.status(200).json(products);
});
server.post("/v1/products", validateToken, isAdmin, async (req, res) => {
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
server.get("/v1/products/:id", validateToken, async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParam("products", "productID", productId);
	productFound ? res.status(200).json(productFound) : res.status(404).send("No product matches the ID provided");
});
server.put("/v1/products/:id", validateToken, isAdmin, async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParam("products", "productID", productId);
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
// cambiar por disable en tabla (Agregar a query de creación)
// Hacer endpoint enable product
server.delete("/v1/products/:id", validateToken, isAdmin, async (req, res) => {
	const productId = req.params.id;
	const productFound = await getByParam("products", "productID", productId);
	if (productFound) {
		const deleteRow = await sequelize.query("DELETE FROM products WHERE productID = :id", {
			replacements: { id: productId }
		});
		res.status(200).send(`Product with id ${productId} was deleted correctly`);
	} else {
		res.status(404).send("No product matches the ID provided");
	}
});

// USERS
server.get("/v1/users", validateToken, isAdmin, async (req, res) => {
	const users = await sequelize.query("SELECT * FROM users", {
		type: QueryTypes.SELECT
	});
	const filteredUsers = users.map(user => {
		delete user.pass;
		return user;
	});
	res.status(200).json(filteredUsers);
});
server.post("/v1/users", async (req, res) => {
	const { username, password, email, deliveryAddress, fullName, phone } = req.body;
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
			"INSERT INTO users (user, pass, fullName, mail, phone, deliveryAddress) VALUES (:username, :password, :fullName, :email, :phone, :deliveryAddress)",
			{ replacements: { username, password, fullName, email, phone, deliveryAddress } }
		);
		res.status(200).json("User correctly added to database");
	} else {
		res.status(400).send("Error validating input data");
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
				id: foundUser.userID,
				isAdmin: foundUser.isAdmin,
				isDisabled: foundUser.disabled
			});
			res.status(200).json(token);
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.get("/v1/users/active", validateToken, async (req, res) => {
	const token = req.tokenInfo;
	const userID = token.id;
	try {
		const foundUser = await getByParam("users", "userID", userID);
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
		const userID = foundUser.userID;
		if (foundUser) {
			const { user, fullName, mail, phone, deliveryAddress } = req.body;
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
				`UPDATE users SET user = :user, fullName = :fullName, mail = :mail, phone = :phone, deliveryAddress = :deliveryAddress WHERE userID = :userID`,
				{
					replacements: {
						user: updatedUser.user,
						fullName: updatedUser.fullName,
						mail: updatedUser.mail,
						phone: updatedUser.phone,
						deliveryAddress: updatedUser.deliveryAddress,
						userID: userID
					}
				}
			);
			res.status(200).send(`User was modified correctly`);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		res.status(500).json(error);
	}
});
server.delete("/v1/users/active", validateToken, async (req, res) => {
	const token = req.tokenInfo;
	const userID = token.id;
	const update = await sequelize.query(`UPDATE users SET disabled = true WHERE userID = :userID`, {
		replacements: {
			userID: userID
		}
	});
	res.status(200).json("User account disabled");
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
		const userID = foundUser.userID;
		if (foundUser) {
			const { user, pass, fullName, mail, phone, deliveryAddress } = req.body;
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
			const filteredProps = filterEmptyProps({ user, pass, fullName, mail, phone, deliveryAddress });
			// Creates new object applying only the filtered Props over the previous ones
			const updatedUser = { ...foundUser, ...filteredProps };
			const update = await sequelize.query(
				`UPDATE users SET user = :user, pass = :pass, fullName = :fullName, mail = :mail, phone = :phone, deliveryAddress = :deliveryAddress WHERE userID = :userID`,
				{
					replacements: {
						user: updatedUser.user,
						pass: updatedUser.pass,
						fullName: updatedUser.fullName,
						mail: updatedUser.mail,
						phone: updatedUser.phone,
						deliveryAddress: updatedUser.deliveryAddress,
						userID: userID
					}
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
// cambiar por disable en tabla (Agregar a query de creación)
// Hacer endpoint enable user
server.delete("/v1/users/:username", validateToken, isAdmin, async (req, res) => {
	const username = req.params.username;
	try {
		const foundUser = await getByParam("users", "user", username);
		const userID = foundUser.userID;
		if (foundUser) {
			const deleteUser = await sequelize.query("DELETE FROM users WHERE userID = :userID", {
				replacements: {
					userID: userID
				}
			});
			res.status(200).send(`User ${username} was deleted correctly`);
		} else {
			res.status(404).json("User not found");
		}
	} catch (error) {
		console.log(error);
		res.status(500).json(error);
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
		const foundUser = await getByParam("users", "userID", verification.id);
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
	Object.keys(inputObject).forEach(key => !inputObject[key] && delete inputObject[key]);
	return inputObject;
}
async function getByParam(table = "", tableParam = "", inputParam = "") {
	const searchResult = await sequelize.query(`SELECT * FROM ${table} WHERE ${tableParam} = :replacementParam`, {
		replacements: { replacementParam: inputParam },
		type: QueryTypes.SELECT
	});
	return !!searchResult.length ? searchResult[0] : false;
}

// Generic error detection
server.use((err, req, res, next) => {
	if (!err) return next();
	console.log("An error has occurred", err);
	res.status(500).send("Error");
});
