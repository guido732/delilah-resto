// ##############################################
// ####### Delilah Resto - NodeJs Server  #######
// ##############################################

// Express
const express = require("express");
const server = express();

// Development Environment
if (process.env.NODE_ENV !== "production") {
	require("dotenv").config();
}
const port = process.env.PORT || 3000;

// Routes
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const productRoutes = require("./routes/product");
const orderRoutes = require("./routes/order");
const testRoutes = require("./routes/test");

// Middleware Setup
server.use(express.json());
// Server load
server.listen(port, () => {
	const date = new Date();
	console.log(`Delilah Resto - Server Started ${date} on port ${port}`);
});

// Route Middlewares
server.use("/v1/users", userRoutes);
server.use("/v1/admin", adminRoutes);
server.use("/v1/products", productRoutes);
server.use("/v1/orders", orderRoutes);
server.use("/v1/validate-token", testRoutes);

// Generic error detection
server.use((err, req, res, next) => {
	if (!err) return next();
	console.log("An error has occurred", err);
	res.status(500).json(err.message);
	throw err;
});
