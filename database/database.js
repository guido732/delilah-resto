const Sequelize = require("sequelize");
const sequelize = new Sequelize("mysql://root:@localhost:3306/delilah_resto");

// Async/Await Query Tester
(async () => {
	const fetch = await sequelize.query("SELECT * FROM demo", {
		type: sequelize.QueryTypes.SELECT,
	});
	console.log("---- SELECT * FROM demo -----");
	console.log(fetch);
})();

/* 
const select = await sequelize.query("SELECT * FROM tabla", {
  type: sequelize.QueryTypes.SELECT
});
console.log(select)

const selectVariable = await sequelize.query("SELECT * FROM tabla WHERE estado = ?", {
  replacements: ["activo"],
	type: sequelize.QueryTypes.SELECT
});
console.log(selectVariable)

const selectVariable2 = await sequelize.query("SELECT * FROM tabla WHERE estado = :estado", {
  replacements: { estado: "activo" },
	type: sequelize.QueryTypes.SELECT
});
console.log(selectVariable2)

const update = await sequelize.query("UPDATE tabla SET campo = 'nuevo_valor' WHERE id = ?", {
  replacements: [2]
});
console.log(update)

const deleteSomething = await sequelize.query("DELETE FROM razas WHERE id = ?", {
  replacements: [2]
});
console.log(deleteSomething)

const insert = await sequelize.query(
  "INSERT INTO personas (nombre, apellido, numero_pasaporte, edad) VALUES ( ?,?,?,?)",
	{ replacements: ["Matias", "Gimenez", "AB3332XX", 35] }
  );
console.log(insert)
 */
