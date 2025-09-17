const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
      const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      
      req.usuario = verified;
      next();
  } catch (err) {
      res.status(400).json({ message: 'Token inválido.' });
  }
};

module.exports = verificarToken;