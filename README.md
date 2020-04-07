# Backend "Delilah Restó", App de pedidos de comida

Trabajo #3 del curso de Desarrollo Web Full Stack de Acámica.

## Recursos y tecnologías utilizadas

- Node.js
- Nodemon
- Express
- JWT para autenticación via Token
- MySQL
- Sequelize
- Postman para manejo de endpoints y testing
- Swagger para documentación de API

El objetivo del trabajo es generar el backend de una app de pedidos de comida llamada Delilah Restó, generando la arquitectura, bases de datos relacionales, endpoints funcionales y documentación.

## Documentación de la API

Abrir el archivo `api-docs.yaml` y copiar su contenido en [Swagger](https://editor.swagger.io/) o importar el mismo desde las opciones

Se listarán los endpoints y métodos disponibles y la información necesaria para hacer uso de los mismos

## Instalación e inicializacion del proyecto

### 1 - Clonar proyecto

Clonar el repositorio desde el [siguiente link](https://github.com/guido732/delilah-resto).

Desde la consola con el siguiente link:

`git clone https://github.com/guido732/delilah-resto.git .`

### 2 - Instalación de dependencias

```
npm install
```

### 3 - Creando base de datos

- Abrir XAMPP y asegurarse que el puerto sobre el cual se está ejecutando es el `3306`
- Inicializar los servicios de Apache y MySQL
- Abrir el panel de control del servicio MySQL
- Generar una nueva base de datos llamada `delilah_resto` desde el panel de control
- Abrir el archivo en `/database/queries.sql` y dentro del `panel de control` de la base de datos ejecutar la serie de queries del archivo o importar el mismo.

### 4 - Iniciando el servidor

Abrir el archivo en `/server/server.js` desde node

`node server`

### 5 - Listo para usar!

Testear los endpoints provistos desde postman para poder hacer uso de la API y base de datos generadas

[Colección de Postman](https://documenter.getpostman.com/view/10237996/SzYdSbvb)

(Asegurarse de seleccionar el entorno de desarrollo `Delilah Restó` para poder acceder a las variables globales)

Project #3 from the Full Stack Web Development career in Acámica.

## Resources and technologies used:

- Node.js
- Nodemon
- Express
- JWT for Token Authentication
- MySQL
- Sequelize
- Postman for endpoint handling & testing
- Swagger for API documentation

The goal of the project was to generate the backend for a food app called "Delilah Resto", generating the architecture, relational databases, functional endpoints and documentation for the project.

## API Documentation

Open the `api-docs.yaml` file and copy it's content in [Swagger](https://editor.swagger.io/) or import it from the options panel.

A list of the available endpoints and methods will be listed with the necessary information to use the API

## Instalation and Project Initialization

### 1 - Clone Project

Clone the repository from the [link](https://github.com/guido732/delilah-resto).

You can also clone it from your terminal:

`git clone https://github.com/guido732/delilah-resto.git .`

### 2 - Install the required dependencies

```
npm install
```

### 3 - Creating the database

- Open XAMPP and make sure the port being used is number `3306`
- Start the Apache and MySQL services
- Open the Admin panel for the MySQL Service
- Create a new database called `delilah_resto` from the panel
- Open the file located in `/database/queries.sql` and from the `control panel` input via the SQL input section the content to create the tables and populate them with mock values

### 4 - Starting the server

From your node terminal open the file located in `/server/server.js`

`node server`

### 5 - It's ready to use!

You can now test the provided endpoints from the Postman collection to make use of the API and database connection

[Postman collection](https://documenter.getpostman.com/view/10237996/SzYdSbvb)

(Make sure the `Delilah Restó` enviroment is selected so you can access the enviroment variables)
