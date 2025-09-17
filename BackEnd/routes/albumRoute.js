const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificarToken = require('../util/TokenVerifier');
const { encryptId, decryptId } = require('../util/CryptoUtils');
const crypto = require('crypto');
const upload = multer({ storage: multer.memoryStorage() });
const imageUtils = require('../util/imageUtils');

router.post('/createAlbum', verificarToken, upload.single('marca_dagua'), async (req, res) => {
    const { albumName, subgroups, valorDigital, valorFisica } = req.body;
    const position = req.body.position !== 'desativado' ? req.body.position : 'desativado';
    const { buffer, mimetype } = req.file || { buffer: null, mimetype: null };
    const adminId = req.usuario.id;
    let connection;

    try {
        connection = await req.pool.getConnection();

        await connection.execute(
            'CALL CreateAlbum(?, ?, ?, ?, ?, ?, ?, @album_id, @error_message)',
            [albumName, adminId, buffer, mimetype, position, valorDigital, valorFisica]
        );

        const [selectResult] = await connection.execute('SELECT @album_id AS album_id, @error_message AS error_message');
        const albumId = selectResult[0].album_id;
        const errorMessage = selectResult[0].error_message;

        if (!errorMessage) {
            console.log('Álbum criado com ID:', albumId);

            if (subgroups.length > 0) {
                await connection.execute(
                    'CALL CreateSubAlbum(?, ?)',
                    [albumId, subgroups]
                );
            }

            return res.status(201).json({ message: 'Álbum criado com sucesso e subgrupos adicionados!', albumId: albumId });
        } else {
            console.log('Erro ao criar álbum:', errorMessage);
            return res.status(400).json({ message: errorMessage });
        }

    } catch (err) {
        console.error('Erro ao criar álbum:', err);
        return res.status(500).json({ message: 'Erro ao criar álbum.' });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/getAlbums', verificarToken, async (req, res) => {
    let connection;
    try {
        connection = await req.pool.getConnection();
        const [albums] = await connection.execute('SELECT * FROM albuns WHERE admin_id = ?', [req.usuario.id]);

        const secret = process.env.JWT_SECRET;
        albums.forEach(album => {
            album.id = encryptId(album.id, secret);
        });

        res.status(200).json(albums);
    } catch (err) {
        console.error('Erro ao buscar álbuns:', err);
        res.status(500).json({ message: 'Erro ao buscar álbuns.' });
    } finally {
        if (connection) connection.release();
    }
});

router.delete('/deleteAlbum/:id', verificarToken, async (req, res) => {
    let connection;
    try {

        const albumId = req.params.id;
        const userId = req.usuario.id;
        
        const id = decryptId(albumId, process.env.JWT_SECRET);
        console.log('albumId:', id);
        console.log('userId:', userId);
        
        connection = await req.pool.getConnection();
        
        // Executar a stored procedure para excluir o álbum
        await connection.query('CALL DeleteAlbum(?, ?, @error_message)', [id, userId]);
        
        // Obter a mensagem de erro (se houver)
        const [errorRows] = await connection.query('SELECT @error_message AS errorMessage');
        const errorMessage = errorRows[0].errorMessage;
        
        // Verificar se houve erro na execução da stored procedure
        if (errorMessage && errorMessage.length > 0) {
            console.log('Erro ao excluir álbum:', errorMessage);
            
            return res.status(400).json({ success: false, message: errorMessage });
        }
       
        // Responder com sucesso
        res.status(200).json({ 
            success: true, 
            message: 'Álbum excluído com sucesso!' 
        });
        
    } catch (err) {
        console.error('Erro ao excluir álbum:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao excluir álbum.', 
            error: err.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/toggleFavorite', verificarToken, async (req, res) => {
    const { albumId, favoritado } = req.body;
    const adminId = req.usuario.id;
    let connection;
    let status = '';

    const id = decryptId(albumId, process.env.JWT_SECRET);

    try {
        connection = await req.pool.getConnection();
        const [results] = await connection.execute(
            'CALL ToggleFavorite(?, ?, ?, @p_status)',
            [id, adminId, favoritado]
        );

        // Obtenha o valor do parâmetro de saída
        const [statusResult] = await connection.query('SELECT @p_status AS status');
        status = statusResult[0].status;

        res.status(200).json({ message: status });
    } catch (err) {
        console.error('Erro ao favoritar álbum:', err);
        res.status(500).json({ message: 'Erro ao favoritar álbum.' });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/getAlbum/:id', verificarToken, async (req, res) => {
    const albumId = req.params.id;
    const adminId = req.usuario.id;
    let connection;

    const id = decryptId(albumId, process.env.JWT_SECRET);

    try {
        connection = await req.pool.getConnection();

        // Consulta para obter o álbum
        const [album] = await connection.execute(
            'SELECT * FROM albuns WHERE id = ? AND admin_id = ?',
            [id, adminId]
        );

        if (album.length === 0) {
            return res.status(404).json({ message: 'Álbum não encontrado.' });
        }

        // Consulta para obter os subálbuns relacionados
        const [subalbuns] = await connection.execute(
            'SELECT * FROM subalbuns WHERE album_id = ?',
            [id]
        );

        // Retorna um objeto com o álbum e seus subálbuns
        res.status(200).json({
            album: album[0],
            subalbuns: subalbuns
        });
    } catch (err) {
        console.error('Erro ao buscar álbum:', err);
        res.status(500).json({ message: 'Erro ao buscar álbum.' });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/createSubAlbum', verificarToken, async (req, res) => {
    const { albumId, subgroupName } = req.body;
    let connection;

    const id = decryptId(albumId, process.env.JWT_SECRET);

    try {
        connection = await req.pool.getConnection();
        await connection.execute(
            'CALL CreateSubAlbum(?, ?)',
            [id, subgroupName]
        );
        res.status(201).json({ message: 'Subgrupo criado com sucesso!' });
    } catch (err) {
        console.error('Erro ao criar subgrupo:', err);
        res.status(500).json({ message: 'Erro ao criar subgrupo.' });
    } finally {
        if (connection) connection.release();
    }
});

router.get('getSubAlbums', verificarToken, async (req, res) => {
    const { albumId } = req.body;
    let connection;

    try {
        connection = await req.pool.getConnection();
        const [subAlbums] = await connection.execute('SELECT * FROM subalbuns WHERE album_id = ?', [albumId]);
        res.status(200).json(subAlbums);
    } catch (err) {
        console.error('Erro ao buscar subálbuns:', err);
        res.status(500).json({ message: 'Erro ao buscar subálbuns.' });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/updateSubAlbum', verificarToken, async (req, res) => {
    const { subAlbumId, subgroupName } = req.body;
    let connection;

    try {
        connection = await req.pool.getConnection();
        await connection.execute(
            'CALL UpdateSubAlbum(?, ?)',
            [subAlbumId, subgroupName]
        );
        res.status(200).json({ message: 'Subgrupo atualizado com sucesso!' });
    } catch (err) {
        console.error('Erro ao atualizar subgrupo:', err);
        res.status(500).json({ message: 'Erro ao atualizar subgrupo.' });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/generateShareLink', verificarToken, async (req, res) => {
    const { albumId, isSubalbum } = req.body;
    const adminId = req.usuario.id;
    let connection;
  
    try {
      connection = await req.pool.getConnection();
      
      // Descriptografar o ID do álbum se for um álbum principal
      let id = albumId;
      if (!isSubalbum) {
        id = decryptId(albumId, process.env.JWT_SECRET);
      }
  
      // Verificar se o álbum/subálbum pertence ao usuário
      if (isSubalbum) {
        const [rows] = await connection.execute(`
          SELECT sa.id 
          FROM subalbuns sa 
          JOIN albuns a ON sa.album_id = a.id 
          WHERE sa.id = ? AND a.admin_id = ?
        `, [id, adminId]);
        
        if (rows.length === 0) {
          return res.status(403).json({ message: 'Você não tem permissão para compartilhar este subálbum.' });
        }
      } else {
        const [rows] = await connection.execute(`
          SELECT id 
          FROM albuns 
          WHERE id = ? AND admin_id = ?
        `, [id, adminId]);
        
        if (rows.length === 0) {
          return res.status(403).json({ message: 'Você não tem permissão para compartilhar este álbum.' });
        }
      }
  
      // NOVO: Verificar se já existe um link válido para este álbum/subálbum
      const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [existingLinks] = await connection.execute(`
        SELECT token, url, expira_em 
        FROM links_temporarios 
        WHERE tipo_alvo = ? AND alvo_id = ? AND expira_em > ?
        ORDER BY expira_em DESC
        LIMIT 1
      `, [
        isSubalbum ? 'subalbum' : 'album', 
        id, 
        agora
      ]);
      
      // Se existir um link válido, retorne-o
      if (existingLinks.length > 0) {
        return res.status(200).json({ 
          shareLink: existingLinks[0].url,
          expiresAt: existingLinks[0].expira_em,
          message: 'Link de acesso existente recuperado com sucesso'
        });
      }
  
      // Caso não exista um link válido, crie um novo
      const token = crypto.randomBytes(16).toString('hex');
      
      // Calcular data de expiração (7 dias a partir de agora)
      const dataExpiracao = new Date();
      dataExpiracao.setDate(dataExpiracao.getDate() + 7);
      
      // Construir URL base para o link
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const shareUrl = `${baseUrl}/shared/${token}`;
      
      // Inserir o registro na tabela links_temporarios
      await connection.execute(`
        INSERT INTO links_temporarios (token, tipo_alvo, alvo_id, url, expira_em) 
        VALUES (?, ?, ?, ?, ?)
      `, [
        token, 
        isSubalbum ? 'subalbum' : 'album', 
        id, 
        shareUrl, 
        dataExpiracao.toISOString().slice(0, 19).replace('T', ' ')
      ]);
  
      res.status(201).json({ 
        shareLink: shareUrl,
        expiresAt: dataExpiracao,
        message: 'Novo link de acesso gerado com sucesso'
      });
    } catch (err) {
      console.error('Erro ao gerar link de compartilhamento:', err);
      res.status(500).json({ message: 'Erro ao gerar link de compartilhamento.' });
    } finally {
      if (connection) connection.release();
    }
});

router.get('/analises', verificarToken, async (req, res) => {
    let connection;
  
    try {
      connection = await req.pool.getConnection();
  
      // 1. Quantidade de links por tipo_alvo
      const [porTipoAlvo] = await connection.query(`
        SELECT tipo_alvo, COUNT(*) as quantidade
        FROM links_temporarios
        GROUP BY tipo_alvo
      `);
  
      // 2. Distribuição por data de expiração
      const [porExpiracao] = await connection.query(`
        SELECT DATE(expira_em) as data, COUNT(*) as quantidade
        FROM links_temporarios
        GROUP BY DATE(expira_em)
        ORDER BY data ASC
      `); 
  
      // 3. Links ativos vs expirados
      const now = new Date().toISOString().slice(0,19).replace('T', ' ');
      const [[{ativos}]] = await connection.query(`
        SELECT COUNT(*) as ativos
        FROM links_temporarios
        WHERE expira_em > ?
      `, [now]);
      const [[{expirados}]] = await connection.query(`
        SELECT COUNT(*) as expirados
        FROM links_temporarios
        WHERE expira_em <= ?
      `, [now]);
  
      // 4. Top 10 alvos mais frequentes
      const [topAlvos] = await connection.query(`
        SELECT alvo_id, COUNT(*) as quantidade
        FROM links_temporarios
        GROUP BY alvo_id
        ORDER BY quantidade DESC
        LIMIT 10
      `);
  
      res.json({
        porTipoAlvo,
        porExpiracao,
        ativos,
        expirados,
        topAlvos
      });
  
    } catch (err) {
      console.error('Erro ao gerar análises:', err);
      res.status(500).json({ message: 'Erro ao gerar análises.' });
    } finally {
      if (connection) connection.release();
    }
});




module.exports = router;