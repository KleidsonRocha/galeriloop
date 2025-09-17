const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificarToken = require('../util/TokenVerifier');
const CircuitBreaker = require('opossum');
const { encryptId, decryptId } = require('../util/CryptoUtils');
const { getAlbumPhotos } = require('../util/imageUtils');
const imageUtils = require('../util/imageUtils');


const upload = multer({ storage: multer.memoryStorage() });

// Opções do Circuit Breaker
const breakerOptions = {
  timeout: 10000,                // Tempo limite para considerar falha
  errorThresholdPercentage: 50, // Percentual de erros para abrir o circuito
  resetTimeout: 10000,          // Tempo para tentar fechar o circuito
  volumeThreshold: 3,           // Número mínimo de solicitações antes de aplicar a lógica
  rollingCountTimeout: 30000    // Janela de tempo para estatísticas
};

// Criar uma função adaptadora para o Circuit Breaker
async function getAlbumPhotosAdapter(pool, adminId, albumId, decryptFunction, jwtSecret) {
  return await getAlbumPhotos(pool, adminId, albumId, decryptFunction, jwtSecret);
}

async function uploadImage(req, originalname, buffer, mimetype, albumId, subalbumIds, fisica, digital, precoDigital, precoFisica) {
  let connection;
  try {
    connection = await req.pool.getConnection();

    // Inserir a imagem na tabela 'imagens'
    const [result] = await connection.execute(
      'INSERT INTO imagens (nome, dados, tipo_mime, album_id, fisica, digital, preco_fisica, preco_digital) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [originalname, buffer, mimetype, albumId, fisica, digital, precoDigital, precoFisica]
    );

    const imageId = result.insertId;

    // Associar a imagem aos subálbuns selecionados
    if (subalbumIds && subalbumIds.length > 0) {
      // Construir uma query com múltiplos INSERT
      const placeholders = subalbumIds.map(() => '(?, ?)').join(', ');
      const flatValues = [];

      // Criar um array plano com todos os valores
      subalbumIds.forEach(subalbumId => {
        flatValues.push(imageId, subalbumId);
      });

      await connection.execute(
        `INSERT INTO imagem_subalbum (imagem_id, subalbum_id) VALUES ${placeholders}`,
        flatValues
      );
    }

    return `Imagem salva com sucesso! ID: ${imageId}`;
  } catch (err) {
    console.error('Erro ao salvar a imagem no banco de dados:', err);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// Criar o Circuit Breaker para upload de imagens
const uploadBreaker = new CircuitBreaker(uploadImage, breakerOptions);

// Criar o Circuit Breaker para obtenção de fotos do álbum
const albumPhotosBreaker = new CircuitBreaker(getAlbumPhotosAdapter, breakerOptions);

// Configurar eventos para o breaker (opcional, mas útil para monitoramento)
albumPhotosBreaker.on('open', () => console.log('Circuit Breaker para getAlbumPhotos ABERTO - muitas falhas detectadas'));
albumPhotosBreaker.on('close', () => console.log('Circuit Breaker para getAlbumPhotos FECHADO - operação normal retomada'));
albumPhotosBreaker.on('halfOpen', () => console.log('Circuit Breaker para getAlbumPhotos MEIO-ABERTO - testando a operação'));
albumPhotosBreaker.on('fallback', () => console.log('Circuit Breaker para getAlbumPhotos - usando fallback'));



router.post('/upload', verificarToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      console.log('Erro: Nenhum arquivo enviado');
      return res.status(400).send('Nenhum arquivo enviado.');
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const { albumId, subalbumIds, fisica, digital, precoDigital, precoFisica } = req.body;
    const decryptedAlbumId = decryptId(albumId, process.env.JWT_SECRET);

    // Verificação do tamanho do arquivo
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (size > maxSize) {
      console.log('Erro: Arquivo muito grande', size);
      return res.status(400).send(`Arquivo muito grande. O tamanho máximo permitido é ${maxSize / (1024 * 1024)} MB.`);
    }

    // Processamento dos subálbuns
    let subalbumIdsArray = [];
    if (subalbumIds) {
      try {
        subalbumIdsArray = JSON.parse(subalbumIds).map(Number);
      } catch (parseError) {
        console.log('Erro ao fazer parse de subalbumIds:', parseError);
        console.log('Valor original de subalbumIds:', subalbumIds);
        return res.status(400).send('Formato inválido para IDs de subálbuns.');
      }
    }

    // Conversão de física e digital para booleanos
    const fisicaBool = fisica === 'true' || fisica === true;
    const digitalBool = digital === 'true' || digital === true;

    // Executar a operação
    const result = await uploadBreaker.fire(
      req,
      originalname,
      buffer,
      mimetype,
      decryptedAlbumId,
      subalbumIdsArray,
      fisicaBool,
      digitalBool,
      precoDigital,
      precoFisica
    );

    res.status(200).send(result);

  } catch (err) {
    console.error('Erro ao processar o upload:', err);
    res.status(500).send('Erro ao processar o upload: ' + (err.message || 'Erro desconhecido'));
  }
});

router.get('/getAlbumsPhotos', verificarToken, async (req, res) => {
  const adminId = req.usuario.id;
  const { albumId } = req.query;

  // Verificação para garantir que albumId foi fornecido
  if (!albumId) {
    return res.status(400).send('O parâmetro albumId é obrigatório');
  }

  try {
    // Usar o Circuit Breaker para executar a função
    const result = await albumPhotosBreaker.fire(
      req.pool, 
      adminId, 
      albumId, 
      decryptId, 
      process.env.JWT_SECRET
    );
    
    // Retornar o resultado
    if (typeof result.data === 'string') {
      return res.status(result.status).send(result.data);
    } else {
      return res.status(result.status).json(result.data);
    }
  } catch (err) {
    console.error('Erro ao processar requisição:', err);
    return res.status(500).send('Erro interno do servidor: ' + (err.message || 'Erro desconhecido'));
  }
});

router.delete('/delete/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const adminId = req.usuario.id;
  
  let connection;
  try {
    connection = await req.pool.getConnection();
    
    // Verificar se a imagem pertence a um álbum do usuário autenticado
    const [albumCheck] = await connection.execute(`
      SELECT i.id 
      FROM imagens i 
      JOIN albuns a ON i.album_id = a.id 
      WHERE i.id = ? AND a.admin_id = ?
    `, [id, adminId]);
    
    if (albumCheck.length === 0) {
      return res.status(403).send('Você não tem permissão para excluir esta imagem');
    }

    // Primeiro, remover as associações de subálbuns
    await connection.execute('DELETE FROM imagem_subalbum WHERE imagem_id = ?', [id]);
    
    // Em seguida, excluir a imagem
    const [result] = await connection.execute('DELETE FROM imagens WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).send('Imagem não encontrada');
    }
    
    res.status(200).send('Imagem excluída com sucesso');
  } catch (err) {
    console.error('Erro ao excluir imagem:', err);
    res.status(500).send('Erro ao excluir imagem: ' + (err.message || 'Erro desconhecido'));
  } finally {
    if (connection) connection.release();
  }
});

router.put('/update/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const adminId = req.usuario.id;
  const { fisica, digital, precoDigital, precoFisica } = req.body;
  
  let connection;
  try {
    connection = await req.pool.getConnection();
    
    // Verificar se a imagem pertence a um álbum do usuário autenticado
    const [albumCheck] = await connection.execute(`
      SELECT i.id 
      FROM imagens i 
      JOIN albuns a ON i.album_id = a.id 
      WHERE i.id = ? AND a.admin_id = ?
    `, [id, adminId]);
    
    if (albumCheck.length === 0) {
      return res.status(403).send('Você não tem permissão para atualizar esta imagem');
    }

    // Atualizar os dados da imagem
    const [result] = await connection.execute(`
      UPDATE imagens 
      SET fisica = ?, digital = ?, preco_digital = ?, preco_fisica = ? 
      WHERE id = ?
    `, [fisica, digital, precoDigital, precoFisica, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).send('Imagem não encontrada');
    }
    
    res.status(200).send('Imagem atualizada com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar imagem:', err);
    res.status(500).send('Erro ao atualizar imagem: ' + (err.message || 'Erro desconhecido'));
  } finally {
    if (connection) connection.release();
  }
});

router.get('/shared/:token', async (req, res) => {
  const { token } = req.params;
  let connection;

  try {
    connection = await req.pool.getConnection();

    // Buscar o link na tabela `links_temporarios`
    const [links] = await connection.execute(`
      SELECT id, tipo_alvo, alvo_id, expira_em 
      FROM links_temporarios 
      WHERE token = ?
    `, [token]);

    if (links.length === 0) {
      return res.status(404).json({ message: 'Link inválido ou expirado.' });
    }

    const link = links[0];

    // Verificar se o link não expirou
    const dataExpiracao = new Date(link.expira_em);
    const agora = new Date();

    if (dataExpiracao < agora) {
      return res.status(410).json({ message: 'Este link expirou.' });
    }
    
    // Usar a função de utilidade para obter e processar as fotos
    const result = await imageUtils.getFotosCompartilhamento(
      req.pool, 
      link.alvo_id, 
      link.tipo_alvo
    );

    // Se a função getFotosCompartilhamento já retorna o adminId dentro de result.data.dados
    if (result.data && result.data.dados && result.data.dados.admin_id) {
        return res.status(result.status).json(result.data); // Já inclui o admin_id
    } else {
        // Se não, precisamos buscar o admin_id separadamente
        let adminId = null;
        if (link.tipo_alvo === 'album') {
            const [albumOwner] = await connection.execute(
                'SELECT admin_id FROM albuns WHERE id = ?',
                [link.alvo_id]
            );
            if (albumOwner.length > 0) adminId = albumOwner[0].admin_id;
        } else if (link.tipo_alvo === 'subalbum') {
            const [subalbumParent] = await connection.execute(
                'SELECT a.admin_id FROM subalbuns sa JOIN albuns a ON sa.album_id = a.id WHERE sa.id = ?',
                [link.alvo_id]
            );
            if (subalbumParent.length > 0) adminId = subalbumParent[0].admin_id;
        }

        // Adicionar o adminId à resposta, se encontrado
        if (adminId !== null) {
            return res.status(result.status).json({ ...result.data, adminId: adminId });
        } else {
            // Se adminId não foi encontrado, retornar a resposta original de imageUtils
            // ou um erro se adminId for mandatório
            console.warn(`Admin ID não encontrado para ${link.tipo_alvo} ${link.alvo_id}`);
            return res.status(result.status).json(result.data);
        }
    }
    
  } catch (err) {
    console.error('Erro ao acessar link compartilhado:', err);
    res.status(500).json({ message: 'Erro ao acessar link compartilhado.' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/getImageSubalbums/:imageId', verificarToken, async (req, res) => {
  const { imageId } = req.params;
  let connection;

  try {
    connection = await req.pool.getConnection();
    
    // Buscar os subálbuns associados à imagem
    const [rows] = await connection.execute(`
      SELECT subalbum_id 
      FROM imagem_subalbum 
      WHERE imagem_id = ?
    `, [imageId]);
    
    // Extrair apenas os IDs dos subálbuns
    const subalbumIds = rows.map(row => row.subalbum_id);
    
    res.status(200).json(subalbumIds);
  } catch (error) {
    console.error('Erro ao buscar subálbuns da imagem:', error);
    res.status(500).json({ message: 'Erro ao buscar subálbuns da imagem' });
  } finally {
    if (connection) connection.release();
  }
});

router.put('/updatePhoto', verificarToken, async (req, res) => {
  const { imageId, fisica, digital, precoDigital, precoFisica, subalbumIds } = req.body;
  let connection;

  try {
    connection = await req.pool.getConnection();
    await connection.beginTransaction();
    
    // Atualizar informações básicas da foto
    await connection.execute(`
      UPDATE imagens 
      SET fisica = ?, 
          digital = ?, 
          preco_digital = ?, 
          preco_fisica = ? 
      WHERE id = ?
    `, [fisica, digital, precoDigital, precoFisica, imageId]);
    
    // Se subalbumIds foi fornecido, atualizar as associações
    if (subalbumIds) {
      // Primeiro, remover todas as associações existentes
      await connection.execute(`
        DELETE FROM imagem_subalbum 
        WHERE imagem_id = ?
      `, [imageId]);
      
      // Depois, inserir as novas associações
      if (subalbumIds.length > 0) {
        // Preparar os valores para inserção em massa
        const values = subalbumIds.map(subalbumId => [imageId, subalbumId]);
        
        // Criar string de placeholders para inserção em massa
        const placeholders = subalbumIds.map(() => '(?, ?)').join(', ');
        
        // Inserir as novas associações
        await connection.execute(`
          INSERT INTO imagem_subalbum (imagem_id, subalbum_id) 
          VALUES ${placeholders}
        `, values.flat());
      }
    }
    
    await connection.commit();
    res.status(200).json({ message: 'Imagem atualizada com sucesso!' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao atualizar imagem:', error);
    res.status(500).json({ message: 'Erro ao atualizar imagem' });
  } finally {
    if (connection) connection.release();
  }
});

router.put('/favoritePhoto', verificarToken, async (req, res) => {
  const { imageId } = req.body;
  let connection;

  console.log('Favoritando imagem com ID:', imageId);
  

  try {
    connection = await req.pool.getConnection();
    await connection.beginTransaction();

    // 1) Descobre o album_id da imagem
    const [rows] = await connection.execute(
      'SELECT album_id FROM imagens WHERE id = ?',
      [imageId]
    );

    if (rows.length === 0) {
      throw new Error('Imagem não encontrada');
    }

    const albumId = rows[0].album_id;

    // 2) Desfavorita todas as imagens deste álbum
    await connection.execute(
      'UPDATE imagens SET favoritado = FALSE WHERE album_id = ?',
      [albumId]
    );

    // 3) Favorita apenas a imagem desejada
    await connection.execute(
      'UPDATE imagens SET favoritado = TRUE WHERE id = ?',
      [imageId]
    );

    await connection.commit();
    res.status(200).json({ message: 'Imagem favoritada com sucesso!' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro ao favoritar imagem:', error);
    res.status(500).json({ message: 'Erro ao favoritar imagem' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/favoritePhoto/:albumId', async (req, res) => {
  const { albumId } = req.params;
  let connection;
  const decryptedAlbumId = decryptId(albumId, process.env.JWT_SECRET);

  try {
    connection = await req.pool.getConnection();

    // Busca a imagem favoritada do album especificado
    const [rows] = await connection.execute(
      'SELECT * FROM imagens WHERE album_id = ? AND favoritado = 1 LIMIT 1',
      [decryptedAlbumId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Nenhuma imagem favoritada encontrada para este álbum.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar imagem favoritada:', error);
    res.status(500).json({ message: 'Erro ao buscar imagem favoritada.' });
  } finally {
    if (connection) connection.release();
  }
});


module.exports = router;