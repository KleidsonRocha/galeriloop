# Use uma imagem base Node.js
FROM node:20-alpine

# Defina o diretório de trabalho dentro do container
WORKDIR /app

# Instale o git
RUN apk update && apk add git

# Clone o repositório GitHub
ARG GITHUB_TOKEN
RUN git clone https://${GITHUB_TOKEN}@github.com/uri-erechim/teams-2023-webleza.git .

# Navegue para a pasta BackEnd (se necessário)
WORKDIR /app/BackEnd

# Copie o arquivo .env para o diretório de trabalho
COPY BackEnd/.env .

# Instale as dependências
RUN npm install

# Exponha a porta que o servidor Node.js está usando
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]