// util/imageUtils.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Processa as imagens sem marca d'água
 */
async function processImages(images) {
  console.log('Processando imagens sem marca d\'água');
  return images.map(image => ({
    ...image,
    // Garante que 'dados' seja uma string base64 se existir
    dados: image.dados ? (typeof image.dados === 'string' ? image.dados : Buffer.from(image.dados).toString('base64')) : null
  }));
}

/**
 * Obtém fotos de um álbum sem aplicação de marca d'água, com paginação.
 */
async function getAlbumPhotos(pool, adminId, encryptedAlbumId, decryptFunction, jwtSecret, limit = 10, offset = 0) {
  let connection;
  let decryptedAlbumId = null; 


  try {
    connection = await pool.getConnection();

    // --- VERIFICAÇÃO adminId ---
    if (adminId === undefined || adminId === null || adminId === '') {
      console.error('ERRO INTERNO: ID do administrador (adminId) é inválido ou ausente. adminId:', adminId);
      return { status: 401, data: 'Não autorizado: ID do administrador inválido ou ausente.' };
    }

    decryptedAlbumId = decryptFunction(encryptedAlbumId, jwtSecret);

    // --- VERIFICAÇÃO decryptedAlbumId ---
    if (decryptedAlbumId === undefined || decryptedAlbumId === null || decryptedAlbumId === '') {
      console.error('ERRO INTERNO: ID do álbum descriptografado é inválido. EncryptedAlbumId:', encryptedAlbumId, 'JWT_SECRET definido:', !!jwtSecret);
      return { status: 400, data: 'ID do álbum fornecido é inválido ou não pode ser descriptografado.' };
    }

    // Verificar se o álbum existe e pertence ao usuário
    const [albumRows] = await connection.execute(
      `SELECT id FROM PI_V.albuns WHERE admin_id = ? AND id = ?`,
      [Number(adminId), Number(decryptedAlbumId)]
    );

    if (albumRows.length === 0) {
      return { status: 404, data: 'Álbum não encontrado ou não pertence ao usuário logado.' };
    }

    // 1. Obter a contagem total de imagens para o álbum (sem paginação)
    const [totalCountRows] = await connection.execute(
      `SELECT COUNT(*) as total FROM PI_V.imagens WHERE album_id = ?`,
      [Number(decryptedAlbumId)]
    );
    const totalImages = totalCountRows[0].total;

    const numLimit = Number(limit); // Garante que é um número
    const numOffset = Number(offset); // Garante que é um número
    
    const [imageRows] = await connection.execute(
      `SELECT id, nome, dados, tipo_mime, fisica, digital, preco_fisica, preco_digital FROM PI_V.imagens WHERE album_id = ? ORDER BY id ASC LIMIT ${numLimit} OFFSET ${numOffset}`,
      [Number(decryptedAlbumId)] // Apenas o album_id como bind parameter
    );

    // Se não houver imagens na página atual, retornar array vazio
    if (imageRows.length === 0) {
      return { status: 200, data: { images: [], totalImages: totalImages } };
    }

    const processedImages = await processImages(imageRows);

    return { status: 200, data: { images: processedImages, totalImages: totalImages } };

  } catch (err) {
    console.error('Erro ao obter fotos do álbum com paginação:', err);
    console.error('Detalhes do erro no catch: adminId =', adminId, ', encryptedAlbumId =', encryptedAlbumId, ', decryptedAlbumId =', decryptedAlbumId);
    return {
      status: 500,
      data: 'Erro ao processar as imagens: ' + (err.message || 'Erro desconhecido')
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Processa fotos com marca d'água para compartilhamento
 * @param {Array} fotos - Array de objetos de fotos do banco de dados
 * @param {Object} albumInfo - Informações do álbum, incluindo configurações de marca d'água
 * @returns {Array} - Array de fotos processadas com marca d'água
 */
async function processarFotosComMarcaDagua(fotos, albumInfo) {
  // ... (código existente para processar fotos com marca d'água) ...
  const fotosProcessadas = [];
  let marcaDaguaProcessadaCache = null;
  let tentativaMarcaDagua = true;

  for (const foto of fotos) {
    try {
      let imagemBuffer;

      if (foto.dados) {
        if (typeof foto.dados === 'string') {
          imagemBuffer = Buffer.from(foto.dados, 'base64');
        } else if (foto.dados.type === 'Buffer' && Array.isArray(foto.dados.data)) {
          imagemBuffer = Buffer.from(foto.dados.data);
        } else if (Buffer.isBuffer(foto.dados)) {
          imagemBuffer = foto.dados;
        } else {
          imagemBuffer = Buffer.from(Object.values(foto.dados));
        }
      } else {
        const fotoCopia = { ...foto, dados: null };
        fotosProcessadas.push(fotoCopia);
        continue;
      }

      if (albumInfo.pos_marca_dagua === 'desativado') {
        console.log(`Marca d'água desativada para foto ${foto.id}`);
        const fotoCopia = { ...foto };
        fotoCopia.dados = (typeof foto.dados === 'string') ? foto.dados : Buffer.from(foto.dados).toString('base64');
        fotoCopia.tipo_mime = foto.tipo_mime || 'image/jpeg';
        fotosProcessadas.push(fotoCopia);
        continue;
      }

      let sharpInstance = sharp(imagemBuffer);
      const metadata = await sharpInstance.metadata();
      let inputParaComposite;

      if (albumInfo.marca_dagua && albumInfo.pos_marca_dagua !== 'desativado' && tentativaMarcaDagua) {
        try {
          let marcaDaguaResizedBuffer;

          if (marcaDaguaProcessadaCache) {
            marcaDaguaResizedBuffer = marcaDaguaProcessadaCache;
          } else {
            let marcaDaguaBufferOriginal;
            if (typeof albumInfo.marca_dagua === 'string') {
              marcaDaguaBufferOriginal = Buffer.from(albumInfo.marca_dagua, 'base64');
            } else if (albumInfo.marca_dagua.type === 'Buffer' && Array.isArray(albumInfo.marca_dagua.data)) {
              marcaDaguaBufferOriginal = Buffer.from(albumInfo.marca_dagua.data);
            } else if (Buffer.isBuffer(albumInfo.marca_dagua)) {
              marcaDaguaBufferOriginal = albumInfo.marca_dagua;
            } else if (albumInfo.marca_dagua && typeof albumInfo.marca_dagua === 'object') {
              marcaDaguaBufferOriginal = Buffer.from(Object.values(albumInfo.marca_dagua));
            } else {
              throw new Error("Formato de marca d'água inválido ou não reconhecido");
            }

            const validatedBuffer = await sharp(marcaDaguaBufferOriginal)
              .toBuffer()
              .catch(err => {
                console.error(`Marca d'água inválida: ${err.message}`);
                throw new Error(`Marca d'água inválida: ${err.message}`);
              });

            const marcaDaguaMetadataOriginal = await sharp(validatedBuffer).metadata();
            let marcaDaguaProcessada;
            if (marcaDaguaMetadataOriginal.hasAlpha) {
              marcaDaguaProcessada = await sharp(validatedBuffer).ensureAlpha().toFormat('png').toBuffer();
            } else {
              marcaDaguaProcessada = await sharp(validatedBuffer).ensureAlpha().toFormat('png').toBuffer();
            }
            marcaDaguaProcessadaCache = marcaDaguaProcessada;
            marcaDaguaResizedBuffer = marcaDaguaProcessada;
          }

          let marcaDaguaParaAplicar = marcaDaguaResizedBuffer;
          if (albumInfo.pos_marca_dagua === 'lateral') {
            const marcaDaguaHeight = Math.floor(metadata.height * 0.2);
            marcaDaguaParaAplicar = await sharp(marcaDaguaResizedBuffer)
              .resize({ height: marcaDaguaHeight, withoutEnlargement: true })
              .toBuffer();
          } else if (albumInfo.pos_marca_dagua === 'preencher') {
            const marcaDaguaWidth = Math.floor(metadata.width * 0.3);
            marcaDaguaParaAplicar = await sharp(marcaDaguaResizedBuffer)
              .resize({ width: marcaDaguaWidth, withoutEnlargement: true })
              .toBuffer();
          }
          const marcaDaguaAplicarMetadata = await sharp(marcaDaguaParaAplicar).metadata();
          if (marcaDaguaAplicarMetadata.width > metadata.width || marcaDaguaAplicarMetadata.height > metadata.height) {
            marcaDaguaParaAplicar = await sharp(marcaDaguaParaAplicar)
              .resize({
                width: metadata.width,
                height: metadata.height,
                fit: sharp.fit.inside,
                withoutEnlargement: true
              })
              .toBuffer();
          }

          inputParaComposite = marcaDaguaParaAplicar;

          if (albumInfo.pos_marca_dagua === 'lateral') {
            const marcaAplicarMeta = await sharp(inputParaComposite).metadata();
            const top = Math.floor(metadata.height - marcaAplicarMeta.height - 10);
            const left = 10;
            sharpInstance = sharpInstance.composite([{
              input: inputParaComposite,
              top: top < 0 ? 0 : top,
              left: left,
              blend: 'over',
            }]);
          } else if (albumInfo.pos_marca_dagua === 'preencher') {
            const marcaDaguaComposites = [];
            const marcaPreenchimentoMetadata = await sharp(inputParaComposite).metadata();
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 3; col++) {
                marcaDaguaComposites.push({
                  input: inputParaComposite,
                  top: Math.floor(row * metadata.height / 3 + (metadata.height / 6) - (marcaPreenchimentoMetadata.height / 2)),
                  left: Math.floor(col * metadata.width / 3 + (metadata.width / 6) - (marcaPreenchimentoMetadata.width / 2)),
                  blend: 'over',
                });
              }
            }
            sharpInstance = sharpInstance.composite(marcaDaguaComposites);
          } else {
             const marcaMetadata = await sharp(inputParaComposite).metadata();
             const top = Math.floor((metadata.height - marcaMetadata.height) / 2);
             const left = Math.floor((metadata.width - marcaMetadata.width) / 2);
             sharpInstance = sharpInstance.composite([{
                input: inputParaComposite,
                top: top < 0 ? 0 : top,
                left: left < 0 ? 0 : left,
                blend: 'over',
             }]);
          }

        } catch (marcaError) {
          console.error(`Erro ao processar marca d'água personalizada: ${marcaError.message}`);
          console.log(`Usando texto como marca d'água para imagem ${foto.id}`);
          tentativaMarcaDagua = false;

          const svgBuffer = Buffer.from(`
            <svg width="${metadata.width}" height="${metadata.height}">
              <style>
                .title { fill: rgba(255, 255, 255, 0.4); font-size: 24px; font-weight: bold; font-family: Arial, sans-serif; }
              </style>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="title" transform="rotate(-30, ${metadata.width / 2}, ${metadata.height / 2})">
                ${textoMarcaDagua}
              </text>
            </svg>
          `);
          inputParaComposite = svgBuffer;
           sharpInstance = sharpInstance.composite([{
            input: inputParaComposite,
            top: 0,
            left: 0,
          }]);
        }
      } else {
        console.log(`Usando texto para marca d'água para imagem ${foto.id}`);
        const svgBuffer = Buffer.from(`
          <svg width="${metadata.width}" height="${metadata.height}">
            <style>
              .title { fill: rgba(255, 255, 255, 0.4); font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;}
            </style>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" class="title" transform="rotate(-30, ${metadata.width / 2}, ${metadata.height / 2})">
              ${textoMarcaDagua}
            </text>
          </svg>
        `);
        inputParaComposite = svgBuffer;
        sharpInstance = sharpInstance.composite([{
          input: inputParaComposite,
          top: 0,
          left: 0,
        }]);
      }

      const imagemProcessada = await sharpInstance
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      const fotoCopia = { ...foto };
      fotoCopia.dados = imagemProcessada.toString('base64');
      fotoCopia.tipo_mime = 'image/jpeg';

      fotosProcessadas.push(fotoCopia);
    } catch (error) {
      console.error(`Erro ao processar imagem ${foto.id}:`, error);
      const fotoCopia = { ...foto };
      if (foto.dados) {
        fotoCopia.dados = (typeof foto.dados === 'string') ? 
          foto.dados : Buffer.from(foto.dados).toString('base64');
      }
      fotosProcessadas.push(fotoCopia);
    }
  }

  return fotosProcessadas;
}

/**
 * Obtém fotos de compartilhamento com marca d'água aplicada
 * @param {Object} pool - Pool de conexão do banco de dados
 * @param {number} alvoId - ID do álbum ou subálbum
 * @param {string} tipoAlvo - 'album' ou 'subalbum'
 * @returns {Promise<Object>} - Objeto com status e dados das fotos processadas
 */
async function getFotosCompartilhamento(pool, alvoId, tipoAlvo) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    if (tipoAlvo === 'album') {
      // Buscar informações do álbum
      const [album] = await connection.execute(`
        SELECT id, nome, marca_dagua, marca_dagua_tipo_mime, pos_marca_dagua, 
               favoritado, preco_fisica_padrao, preco_digital_padrao
        FROM albuns 
        WHERE id = ?
      `, [alvoId]);

      if (album.length === 0) {
        return { status: 404, data: { message: 'Álbum não encontrado.' } };
      }

      // Buscar as fotos do álbum
      const [fotos] = await connection.execute(`
        SELECT id, nome, dados, tipo_mime, fisica, digital, preco_fisica, preco_digital
        FROM imagens 
        WHERE album_id = ?
      `, [alvoId]);
      
      // Processar fotos com marca d'água
      const fotosProcessadas = await processarFotosComMarcaDagua(fotos, album[0]);

      return { 
        status: 200, 
        data: { 
          tipo: 'album',
          dados: album[0],
          fotos: fotosProcessadas
        }
      };
    } 
    else if (tipoAlvo === 'subalbum') {
      // Buscar informações do subálbum e do álbum pai (para a marca d'água)
      const [subalbum] = await connection.execute(`
        SELECT sa.id, sa.nome, sa.album_id, a.nome as album_nome,
               a.marca_dagua, a.marca_dagua_tipo_mime, a.pos_marca_dagua
        FROM subalbuns sa
        JOIN albuns a ON sa.album_id = a.id
        WHERE sa.id = ?
      `, [alvoId]);

      if (subalbum.length === 0) {
        return { status: 404, data: { message: 'Subálbum não encontrado.' } };
      }

      // Buscar as fotos do subálbum
      const [fotos] = await connection.execute(`
        SELECT i.id, i.nome, i.dados, i.tipo_mime, i.fisica, i.digital, 
               i.preco_fisica, i.preco_digital
        FROM imagens i
        JOIN imagem_subalbum isa ON i.id = isa.imagem_id
        WHERE isa.subalbum_id = ?
      `, [alvoId]);
      
      // Processar fotos com marca d'água
      const fotosProcessadas = await processarFotosComMarcaDagua(fotos, subalbum[0]);

      return { 
        status: 200, 
        data: { 
          tipo: 'subalbum',
          dados: subalbum[0],
          fotos: fotosProcessadas
        }
      };
    } 
    else {
      return { status: 400, data: { message: 'Tipo de alvo inválido.' } };
    }
  } catch (err) {
    console.error('Erro ao processar fotos para compartilhamento:', err);
    return { 
      status: 500, 
      data: { message: 'Erro ao processar fotos para compartilhamento: ' + (err.message || 'Erro desconhecido') }
    };
  } finally {
    if (connection) connection.release();
  }
}

module.exports = {
  processImages,
  getAlbumPhotos,
  processarFotosComMarcaDagua,
  getFotosCompartilhamento
};