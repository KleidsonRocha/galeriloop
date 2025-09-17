// util/CryptoUtils.js
const crypto = require('crypto');

// Função de criptografia
function encryptId(id, secret) {
    // Certifica que o secret tem o tamanho correto para aes-256-cbc (32 bytes)
    const secretBuffer = Buffer.from(secret, 'utf8');
    const key = crypto.createHash('sha256').update(secretBuffer).digest(); // Gera uma chave de 32 bytes

    const iv = crypto.randomBytes(16); // Gerar IV aleatório
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv); // Usar a chave gerada
    
    let encrypted = cipher.update(id.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Retornar o IV inicial e o texto criptografado juntos
    return `${iv.toString('hex')}:${encrypted}`;
}

// Função de descriptografia
function decryptId(encryptedId, secret) {
    if (!encryptedId || !secret || typeof encryptedId !== 'string' || !encryptedId.includes(':')) {
        console.error("Erro de descriptografia: encryptedId ou secret inválido/ausente.");
        return null;
    }
    try {
        const parts = encryptedId.split(':');
        if (parts.length !== 2) {
             console.error("Erro de descriptografia: encryptedId em formato incorreto. Esperado 'iv:encrypted'.");
             return null;
        }
        const [ivHex, encryptedHex] = parts;

        // Gerar a mesma chave para descriptografia
        const secretBuffer = Buffer.from(secret, 'utf8');
        const key = crypto.createHash('sha256').update(secretBuffer).digest(); // Gera a mesma chave de 32 bytes

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error("Falha na descriptografia:", error.message);
        return null; // Retorne null em caso de erro
    }
}

module.exports = { encryptId, decryptId };
