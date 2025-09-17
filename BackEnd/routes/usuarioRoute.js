const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verificarToken = require('../util/TokenVerifier'); 

const transporter = nodemailer.createTransport({
  service: 'Gmail',           
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


router.post('/cadastro', async (req, res) => {
  let connection;
  try {
    connection = await req.pool.getConnection();

    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
    }

    const [usuarios] = await connection.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length > 0) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }

    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    await connection.execute('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senhaHash]);

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    res.status(500).json({ message: 'Erro ao cadastrar usuário', error: error.message });
  } finally {
    if (connection) connection.release(); // Liberar a conexão no bloco finally
  }
});

router.post('/login', async (req, res) => {
  let connection;
  try {
    connection = await req.pool.getConnection();

    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
    }

    const [usuarios] = await connection.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length === 0) {
      return res.status(401).json({ message: 'Email ou senha incorretos.' });
    }

    const usuario = usuarios[0];

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Email ou senha incorretos.' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email, perfil: usuario.perfil }, process.env.JWT_SECRET, {
      expiresIn: '1h' // Expira em 1 hora
    });

    res.json({ message: 'Login realizado com sucesso!', token: token });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login', error: error.message });
  } finally {
    if (connection) connection.release(); // Liberar a conexão no bloco finally
  }
});

router.put('/updateUsuario', verificarToken, async (req, res) => {
  let connection;
  try {
    connection = await req.pool.getConnection();

    const { email, senhaAtual, novaSenha, tamanhoFotos } = req.body;
    const usuarioId = req.usuario.id;

    if (!email || !senhaAtual) {
      return res.status(400).json({ message: 'Email e senha atual são obrigatórios.' });
    }

    // Verificar usuário e senha
    const [usuarios] = await connection.execute('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    
    const usuario = usuarios[0];
    
    // Verificar se o email corresponde
    if (usuario.email !== email) {
      return res.status(403).json({ message: 'Não é permitido alterar configurações de outro usuário.' });
    }

    // Verificar senha com bcrypt
    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Senha atual incorreta.' });
    }

    // Gerar hash para nova senha (se for alterar)
    let novaSenhaProcessada = '';
    if (novaSenha && novaSenha !== '') {
      const saltRounds = 10;
      novaSenhaProcessada = await bcrypt.hash(novaSenha, saltRounds);
    }

    // Chamar a procedure com o ID do usuário já verificado
    await connection.execute(
      'CALL UpdateUsuario(?, ?, ?, @error_message, @success)',
      [
        usuarioId, 
        novaSenhaProcessada || '',
        tamanhoFotos ? JSON.stringify(tamanhoFotos) : null
      ]
    );

    // Verificar o resultado da procedure
    const [procedureResult] = await connection.execute('SELECT @error_message, @success');
    
    if (procedureResult[0]['@success'] !== 1) {
      return res.status(400).json({ 
        message: procedureResult[0]['@error_message'] || 'Erro ao atualizar configurações.' 
      });
    }
    
    // Se precisa atualizar o email do usuário (caso não esteja na procedure)
    if (email !== usuario.email) {
      await connection.execute('UPDATE usuarios SET email = ? WHERE id = ?', [email, usuarioId]);
    }
    
    res.json({ 
      message: 'Configurações atualizadas com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ message: 'Erro ao atualizar configurações', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/auth', verificarToken, (req, res) => {
  res.json({
    message: 'Acesso concedido ao perfil!',
    usuario: req.usuario
  });
});

router.post('/recover-password', async (req, res) => {
  const { email } = req.body;


  let connection;
  try {
    connection = await req.pool.getConnection();

    // 1. Consulta se o e-mail existe
    const [rows] = await connection.query(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );

    // 2. Só envia o e-mail se o usuário existe
    if (rows.length > 0) {

      
      await transporter.sendMail({
        from: '"Galeriloop" <galeriloop@gmail.com>',
        to: email,
        subject: 'Recuperação de conta — Galeriloop',
        html: `
        <div style="max-width: 480px; margin: 0 auto; background: #e3e2de; border-radius: 12px; box-shadow: 0 2px 8px rgba(30,54,83,0.07); font-family: 'Inconsolata', 'Helvetica Neue', Arial, sans-serif; overflow: hidden;">
          <div style="background: #1e3653; color: white; padding: 36px 24px 24px 24px; text-align: center;">
            <h1 style="margin: 0 0 12px 0; font-weight: 800; font-size: 2.4rem; letter-spacing: 0.07em;">GALERILOOP</h1>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 400;">Solicitação de Recuperação de Conta</h2>
          </div>
          <div style="padding: 24px; text-align: center; color: #1e3653;">
            <p style="font-size: 1.05rem;">
              Olá,<br>
              Recebemos uma solicitação de recuperação de conta para o e-mail <b>${email}</b>.
            </p>
            <p style="font-size: 1rem; margin: 30px 0 18px 0; color: #45516d;">
              <b>Em até 24 horas, nosso time técnico entrará em contato com você, via e-mail, para orientar sobre os próximos passos de recuperação/alteração de senha.</b>
            </p>
            <p style="font-size: 0.98rem;">
              <b style="color: #e0195a">Atenção:</b> Se você não pediu essa recuperação, apenas ignore esta mensagem.
            </p>
            <div style="margin-top:30px; margin-bottom:12px;">
              <span style="display:inline-block; background: #1e3653; color:#e3e2de; padding:12px 30px; border-radius:8px; font-weight:700; font-size:1rem;">Equipe Galeriloop</span>
            </div>
          </div>
          <div style="background: #1e3653; color: #e3e2de; text-align: center; padding: 16px 0 12px 0; font-size: 0.95rem;">
            &copy; ${new Date().getFullYear()} Galeriloop<br>
            <span style="color: #e3e2de;">Estamos aqui para ajudar!</span>
          </div>
        </div>
      `,
      });
    }
    if (connection) connection.release();

    // Sempre responde igual
    return res.status(200).json({
      message:
        'Se o e-mail estiver cadastrado em nosso sistema, enviaremos instruções para recuperação nos próximos instantes.',
    });
  } catch (err) {
    if (connection) connection.release();
    console.error(err);
    return res.status(200).json({
      message:
        'Se o e-mail estiver cadastrado em nosso sistema, enviaremos instruções para recuperação nos próximos instantes.',
    });
  } finally {
    if (connection) connection.release(); 
  }
});

// VERSÃO 1: Busca dados Pix do banco
router.get('/pix-config', verificarToken, async (req, res) => {
  let connection;
  try {
    connection = await req.pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT chave_pix, nome_empresa, cidade FROM usuarios WHERE id = ?', 
      [req.usuario.id],
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar dados Pix', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Atualiza dados Pix do usuário autenticado
router.put('/pix-config', verificarToken, async (req, res) => {
  const { chave_pix, nome_empresa, cidade } = req.body;
  if (!chave_pix || !nome_empresa || !cidade) {
    return res.status(400).json({ message: 'Todos os campos do Pix são obrigatórios.' });
  }
  let connection;
  try {
    connection = await req.pool.getConnection();
    await connection.execute(
      'UPDATE usuarios SET chave_pix = ?, nome_empresa = ?, cidade = ? WHERE id = ?',
      [chave_pix, nome_empresa, cidade, req.usuario.id]
    );
    res.json({ message: 'Dados Pix atualizados com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar dados Pix', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

/* VERSÃO 2: Dados Pix fixos para teste
router.get('/pix-config', verificarToken, (req, res) => {
  console.log("entrou na rota pix-config");
  res.json({
    chave_pix: 'matheuswastchuk@gmail.com',
    nome_empresa: 'Galeriloop',

    cidade: 'ERECHIM'
  });
});*/

module.exports = router;