const express = require('express');
const router = express.Router();
const { enviarContato } = require('../src/controllers/contatoController');

router.post('/', enviarContato);

module.exports = router;
