const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const app = express();
const usuarioRoute = require('./routes/usuarioRoute.js');
const fotoRoute = require('./routes/fotosRoute.js');
const albumRoute = require('./routes/albumRoute.js');
const orcamentosRoutes = require('./routes/orcamentoRoute.js');
const contatoRoute = require('./routes/contatoRoute.js');

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_DATABASE:", process.env.DB_DATABASE);
console.log("BE_PORT:", process.env.BE_PORT);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);

// Configuração CORS com opções específicas
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8081',
    'https://clayforgestudio.com.br',
    'https://www.clayforgestudio.com.br' 
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Habilita o envio de cookies em requisições cross-origin
};

app.use(cors(corsOptions));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10), // Converter para número
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const swaggerDocument = YAML.load('./backend-dev-doc.yaml');

app.use((req, res, next) => {
  req.pool = pool;
  next();
});


app.use('/usuarios', usuarioRoute);
app.use('/fotos', fotoRoute);
app.use('/album', albumRoute);
app.use('/orcamentos', orcamentosRoutes);
app.use('/contato', contatoRoute);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(process.env.BE_PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.BE_PORT}`);
});