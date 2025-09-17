const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const enviarOrcamento = async (req, res) => {
  let connection;
  try {
    connection = await req.pool.getConnection();
  const { cliente, itens, total, albumId, subalbumId, paymentType } = req.body;

    console.log('Parâmetros recebidos:', {
      cliente,
      itens,
      total,
      albumId,
      subalbumId,
      paymentType
    });

    // Buscar dados do álbum e do fotógrafo
    let query = `
      SELECT a.nome as album_nome, a.id as album_id, 
      s.nome as subalbum_nome, s.id as subalbum_id,
      u.email as fotografo_email, u.nome as fotografo_nome
      FROM albuns a
      LEFT JOIN subalbuns s ON s.id = ?
      JOIN usuarios u ON u.id = a.admin_id
      WHERE a.id = ?
    `;
    
    const [albumData] = await connection.execute(query, [subalbumId || null, albumId]);
    if (!albumData || albumData.length === 0) {
        throw new Error('Álbum não encontrado');
    }

    const album = albumData[0];

    // Formata os itens para o email
    const itensFormatados = itens.map(item => `
      <tr style="border-bottom: 1px solid #e3e2de;">
        <td style="padding: 12px; text-align: left;">${item.nome}</td>
        <td style="padding: 12px; text-align: center;">${item.tipo_midia === 'fisica' ? 'Física' : 'Digital'}</td>
        <td style="padding: 12px; text-align: center;">${item.quantidade}</td>
        <td style="padding: 12px; text-align: right;">R$ ${item.preco_unitario}</td>
        <td style="padding: 12px; text-align: right;">R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</td>
      </tr>
    `).join('');

    const albumInfo = album.subalbum_nome 
      ? `${album.album_nome} - ${album.subalbum_nome}`
      : album.album_nome;
        console.log(album);
    // Email para o cliente
    const mailOptionsCliente = {
      from: process.env.EMAIL_USER,
      to: cliente.email,
      subject: 'Orçamento Galeriloop',
      html: `
        <div style="max-width: 480px; margin: 0 auto; background: #e3e2de; border-radius: 12px; box-shadow: 0 2px 8px rgba(30,54,83,0.07); font-family: 'Inconsolata', 'Helvetica Neue', Arial, sans-serif; overflow: hidden;">
          <div style="background: #1e3653; color: white; padding: 36px 24px 24px 24px; text-align: center;">
            <h1 style="margin: 0 0 12px 0; font-weight: 800; font-size: 2.4rem; letter-spacing: 0.07em;">GALERILOOP</h1>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 400;">Orçamento Solicitado</h2>
          </div>
          <div style="padding: 24px; color: #1e3653;">
            <p style="font-size: 1.05rem;">
              Olá ${cliente.nome},<br>
              Segue abaixo o orçamento solicitado para o álbum <b>${albumInfo}</b>:
            </p>
            <div style="margin: 24px 0; background: white; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #1e3653; color: white;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: center;">Tipo</th>
                    <th style="padding: 12px; text-align: center;">Qtd</th>
                    <th style="padding: 12px; text-align: right;">Preço</th>
                    <th style="padding: 12px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itensFormatados}
                </tbody>
                <tfoot>
                  <tr style="background: #1e3653; color: white;">
                    <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">R$ ${total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p style="font-size: 1rem; margin: 30px 0 18px 0; color: #45516d;">
              O fotógrafo entrará em contato em breve para finalizar a negociação.
            </p>
            <div style="margin-top:30px; margin-bottom:12px; text-align: center;">
              <span style="display:inline-block; background: #1e3653; color:#e3e2de; padding:12px 30px; border-radius:8px; font-weight:700; font-size:1rem;">Equipe Galeriloop</span>
            </div>
          </div>
          <div style="background: #1e3653; color: #e3e2de; text-align: center; padding: 16px 0 12px 0; font-size: 0.95rem;">
            &copy; ${new Date().getFullYear()} Galeriloop<br>
            <span style="color: #e3e2de;">Estamos aqui para ajudar!</span>
          </div>
        </div>
      `
    };

    // Frase de acordo com o tipo de pagamento
    let paymentPhrase = '';
    const normalizedPaymentType = (paymentType || '').toLowerCase();
    if (normalizedPaymentType === 'pix') {
      paymentPhrase = 'O cliente decidiu realizar o pagamento por PIX, ao entrar em contato solicite o comprovante do envio.';
    } else if (normalizedPaymentType === 'presencial') {
      paymentPhrase = 'O cliente decidiu realizar o pagamento de maneira presencial na retirada das fotos, organize o mesmo ao entrar em contato.';
    }

    // Email para o fotógrafo
    const mailOptionsFotografo = {
      from: process.env.EMAIL_USER,
      to: album.fotografo_email,
      subject: 'Novo Orçamento Solicitado - Galeriloop',
      html: `
        <div style="max-width: 480px; margin: 0 auto; background: #e3e2de; border-radius: 12px; box-shadow: 0 2px 8px rgba(30,54,83,0.07); font-family: 'Inconsolata', 'Helvetica Neue', Arial, sans-serif; overflow: hidden;">
          <div style="background: #1e3653; color: white; padding: 36px 24px 24px 24px; text-align: center;">
            <h1 style="margin: 0 0 12px 0; font-weight: 800; font-size: 2.4rem; letter-spacing: 0.07em;">GALERILOOP</h1>
            <h2 style="margin: 0; font-size: 1.3rem; font-weight: 400;">Novo Orçamento Solicitado</h2>
          </div>
          <div style="padding: 24px; color: #1e3653;">
            <p style="font-size: 1.05rem;">
              Olá ${album.fotografo_nome},<br>
              Um novo orçamento foi solicitado para o álbum <b>${albumInfo}</b>.
            </p>
            <div style="margin: 24px 0; background: white; border-radius: 8px; padding: 16px;">
              <h3 style="margin: 0 0 16px 0; color: #1e3653;">Dados do Cliente:</h3>
              <p style="margin: 8px 0;"><b>Nome:</b> ${cliente.nome}</p>
              <p style="margin: 8px 0;"><b>Email:</b> ${cliente.email}</p>
            </div>
            <div style="margin: 24px 0; background: white; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #1e3653; color: white;">
                    <th style="padding: 12px; text-align: left;">Item</th>
                    <th style="padding: 12px; text-align: center;">Tipo</th>
                    <th style="padding: 12px; text-align: center;">Qtd</th>
                    <th style="padding: 12px; text-align: right;">Preço</th>
                    <th style="padding: 12px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itensFormatados}
                </tbody>
                <tfoot>
                  <tr style="background: #1e3653; color: white;">
                    <td colspan="4" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">R$ ${total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p style="font-size: 1rem; margin: 30px 0 18px 0; color: #45516d;">
              Por favor, entre em contato com o cliente para finalizar a negociação.
            </p>
            <p style="font-size: 1rem; margin: 18px 0 18px 0; color: #1e3653; font-weight: bold;">
              ${paymentPhrase}
            </p>
            <div style="margin-top:30px; margin-bottom:12px; text-align: center;">
              <span style="display:inline-block; background: #1e3653; color:#e3e2de; padding:12px 30px; border-radius:8px; font-weight:700; font-size:1rem;">Equipe Galeriloop</span>
            </div>
          </div>
          <div style="background: #1e3653; color: #e3e2de; text-align: center; padding: 16px 0 12px 0; font-size: 0.95rem;">
            &copy; ${new Date().getFullYear()} Galeriloop<br>
            <span style="color: #e3e2de;">Estamos aqui para ajudar!</span>
          </div>
        </div>
      `
    };

    // Envia os emails
    await Promise.all([
      transporter.sendMail(mailOptionsCliente),
      transporter.sendMail(mailOptionsFotografo)
    ]);

    res.status(200).json({ message: 'Orçamento enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar orçamento:', error);
    res.status(500).json({ message: 'Erro ao enviar orçamento' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  enviarOrcamento
}; 