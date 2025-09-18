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

// Lista de origens permitidas
const whitelist = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
  'https://clayforgestudio.com.br',
  'https://www.clayforgestudio.com.br' 
];

// Configuração CORS com uma função para a origem para depuração
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem 'origin' (como de Postman, curl ou alguns dispositivos móveis)
    if (!origin) {
      console.log(`[CORS DEBUG] Requisição sem Origin (permitida): ${origin}`);
      return callback(null, true);
    }
    // Verifica se a origem está na whitelist
    if (whitelist.indexOf(origin) !== -1) {
      console.log(`[CORS DEBUG] Origin Permitida: ${origin}`);
      callback(null, true);
    } else {
      console.error(`[CORS ERROR] Origin Bloqueada: ${origin}`);
      callback(new Error('Não permitido pela política CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Habilita o envio de cookies em requisições cross-origin
};

app.use(cors(corsOptions));
app.use(express.json());

// --- INÍCIO DO NOVO MIDDLEWARE DE LOG (PARA CONFIRMAR OS HEADERS DE SAÍDA) ---
app.use((req, res, next) => {
  // Apenas para rotas /orcamentos/enviar para focar na depuração
  if (req.originalUrl.startsWith('/orcamentos/enviar')) {
    const originalJson = res.json;
    res.json = function(...args) {
        console.log(`[CORS DEBUG - Express Response - Orçamentos] URL: ${req.originalUrl}`);
        console.log(`[CORS DEBUG - Express Response - Orçamentos] Origem da Requisição: ${req.headers.origin}`);
        console.log(`[CORS DEBUG - Express Response - Orçamentos] Cabeçalhos de Resposta ANTES de enviar JSON:`, res.getHeaders());
        originalJson.apply(res, args);
    };
    const originalSend = res.send; // Também intercepta .send() caso seja usado
    res.send = function(...args) {
         console.log(`[CORS DEBUG - Express Response - Orçamentos] URL: ${req.originalUrl}`);
         console.log(`[CORS DEBUG - Express Response - Orçamentos] Origem da Requisição: ${req.headers.origin}`);
         console.log(`[CORS DEBUG - Express Response - Orçamentos] Cabeçalhos de Resposta ANTES de enviar (não JSON):`, res.getHeaders());
        originalSend.apply(res, args);
    };
  }
  next();
});
// --- FIM DO NOVO MIDDLEWARE DE LOG ---


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