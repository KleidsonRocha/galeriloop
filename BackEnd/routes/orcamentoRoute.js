const express = require('express');
const router = express.Router();
const orcamentosController = require('../src/controllers/orcamentosController');

router.post('/enviar', orcamentosController.enviarOrcamento);

module.exports = router; 