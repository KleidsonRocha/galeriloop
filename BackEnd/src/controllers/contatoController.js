const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarContato = async (req, res) => {
  const { email, mensagem } = req.body;
  if (!email || !mensagem) {
    return res.status(400).json({ message: 'Email e mensagem são obrigatórios.' });
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Vai para o email do Galeriloop
      subject: 'Contato via Galeriloop',
      html: `
        <div style="background:#1e3653;padding:24px;border-radius:12px;color:#fff;max-width:480px;margin:0 auto;">
          <h2 style="margin-top:0;">Novo contato via site</h2>
          <p><b>Email:</b> ${email}</p>
          <p><b>Mensagem:</b></p>
          <div style="background:#ecebe7;color:#1e3653;padding:16px;border-radius:8px;">${mensagem.replace(/\n/g,'<br>')}</div>
        </div>
      `
    });
    res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao enviar contato:', error);
    res.status(500).json({ message: 'Erro ao enviar mensagem.' });
  }
};

module.exports = { enviarContato };
