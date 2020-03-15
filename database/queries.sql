-- Table Creation
CREATE TABLE users (
  userID INT PRIMARY KEY AUTO_INCREMENT,
  user VARCHAR (60) NOT NULL,
  pass VARCHAR (60) NOT NULL,
  fullName VARCHAR(60) NOT NULL,
  mail VARCHAR(60) NOT NULL,
  phone INT NOT NULL,
  deliveryAddress VARCHAR (60) NOT NULL,
  isAdmin BOOLEAN
);

CREATE TABLE orders (
  orderID INT PRIMARY KEY AUTO_INCREMENT,
  STATUS VARCHAR(60) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(150) NOT NULL,
  paymentMethod VARCHAR (60) NOT NULL,
  total FLOAT NOT NULL,
  userID INT NOT NULL,
  FOREIGN KEY(userID) REFERENCES users(userID)
);

CREATE TABLE products (
  productID INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR (60) NOT NULL,
  price FLOAT NOT NULL,
  imgUrl VARCHAR(200) NOT NULL,
  description VARCHAR(150) NOT NULL
);

CREATE TABLE orders_products (
  orderProdID INT PRIMARY KEY AUTO_INCREMENT,
  orderID INT,
  productID INT,
  FOREIGN KEY(orderID) REFERENCES orders(orderID),
  FOREIGN KEY(productID) REFERENCES products(productID)
);

-- Populate users table
INSERT INTO
  users
VALUES
  (
    NULL,
    "guidotorres",
    "guido123",
    "Guido Torres",
    "guido732@gmail.com",
    1122223333,
    "Calle Falsa 123",
    TRUE
  );

INSERT INTO
  users
VALUES
  (
    NULL,
    "Bret",
    "Bret123123",
    "Leanne Graham",
    "Sincere@april.biz",
    1199998888,
    "Kulas Light Apt.556",
    FALSE
  );

INSERT INTO
  users
VALUES
  (
    NULL,
    "antonette",
    "annie987",
    "Ervin Howell",
    "Shanna@melissa.tv",
    0106926593,
    "Victor Plains Suite 879",
    FALSE
  );

-- Populate products table
INSERT INTO
  products
VALUES
  (
    NULL,
    "Hamburguesa Doble con Cheddar y papas",
    360,
    "https://via.placeholder.com/732",
    "Dos medallones de carne con cheddar y bacon entre 2 panes Brioche y con una porción de papas fritas"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Ensalada César con pollo",
    300,
    "https://via.placeholder.com/237",
    "Ensalada de lechuga romana con salsa césar, crutones tostados, pollo a la plancha y queso parmesano"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Ensalada César sin pollo",
    265,
    "https://via.placeholder.com/200",
    "Ensalada de lechuga romana con salsa césar, crutones tostados y queso parmesano"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Coca cola 600ml",
    60,
    "https://via.placeholder.com/666",
    "Botella de Coca-Cola 600ml no retornable"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Pizza grande de muzzarella",
    400,
    "https://via.placeholder.com/444",
    "Pizza grande de muzzarella de 8 porciones"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Pizza grande de jamón y ananá",
    450,
    "https://via.placeholder.com/999",
    "Pizza grande de jamón y ananá de 8 porciones"
  );

INSERT INTO
  products
VALUES
  (
    NULL,
    "Sánguche completo de milanesa a caballo con fritas",
    450,
    "https://via.placeholder.com/888",
    "Sánguche de pan frances con miilanesa suprema o ternera frita, huevo frito, lechuga, tomate y porción de papas fritas"
  );