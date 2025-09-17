# Use uma imagem base Node.js
FROM node:20-alpine

# Defina o diretório de trabalho dentro do container
WORKDIR /app

# Instale o git (necessário para o git clone)
RUN apk update && apk add git

# Clone o repositório GitHub público
RUN git clone https://github.com/KleidsonRocha/galeriloop.git .

# Navegue para a pasta BackEnd dentro do repositório clonado
WORKDIR /app/BackEnd

# Copie o arquivo .env para o diretório de trabalho atual (/app/BackEnd).
# ATENÇÃO: Este comando espera que o seu arquivo .env esteja na pasta local
# 'galeriloop/BackEnd/' no momento em que você executar 'docker build'.
# Se o seu .env já está no repositório e não é sensível, você pode remover esta linha.
COPY BackEnd/.env .

# Instale as dependências da aplicação BackEnd
RUN npm install

# Exponha a porta que o servidor Node.js está usando
EXPOSE 3000

# Comando para iniciar o servidor Node.js
CMD ["node", "server.js"]