const crypto = require('crypto');

// Função de criptografia
function encryptId(id, secret) {
    const iv = crypto.randomBytes(16); // Gerar IV aleatório
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret), iv);
    
    let encrypted = cipher.update(id.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Retornar o IV inicial e o texto criptografado juntos
    return `${iv.toString('hex')}:${encrypted}`;
}

// Função de descriptografia
function decryptId(encryptedId, secret) {
    const [iv, encrypted] = encryptedId.split(':'); // Separar IV e texto criptografado
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret), Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

module.exports = { encryptId, decryptId };
