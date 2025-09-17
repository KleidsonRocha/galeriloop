import { createStaticPix, hasError } from 'pix-utils';

export function gerarPayloadPix({ chave, nome, cidade, valor, descricao = 'Galeriloop' }) {
  const nomeLimpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 25);
  const cidadeLimpa = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().slice(0, 25);

  const pix = createStaticPix({
    merchantName: nomeLimpo,
    merchantCity: cidadeLimpa,
    pixKey: chave,
    infoAdicional: descricao,
    transactionAmount: Number(valor),
  });

  if (hasError(pix)) {
    throw new Error('Erro ao gerar payload Pix');
  }

  return pix.toBRCode();
}