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

COPY BackEnd/.env .

# Instale as dependências da aplicação BackEnd
RUN npm install

# Exponha a porta que o servidor Node.js está usando
EXPOSE 3000

# Comando para iniciar o servidor Node.js
CMD ["node", "server.js"]