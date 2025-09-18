# --- Etapa 1: Construção (Build) da Aplicação Frontend ---
FROM node:20-alpine as builder

WORKDIR /app

# EXPLICITAMENTE define a variável de ambiente VITE_API_URL para o processo de build.
# Isso garante que o Vite use este valor durante 'npm run build', independentemente de
# como o arquivo .env é lido ou não dentro do container.
ENV VITE_API_URL=https://backend.clayforgestudio.com.br

COPY package.json package-lock.json ./

RUN npm install

# Copia todo o restante do código da aplicação, incluindo .env, src, public, vite.config.js etc.
# O arquivo .env será copiado, mas o ENV VITE_API_URL acima irá garantir que o valor seja usado no build.
COPY . .

# Constrói a aplicação.
# O Vite usará o VITE_API_URL definido acima e o 'base' configurado no vite.config.js.
RUN npm run build

# --- Etapa 2: Servir a Aplicação Construída com Nginx ---
FROM nginx:alpine

# Remove a configuração padrão do Nginx que não é otimizada para SPAs
RUN rm /etc/nginx/conf.d/default.conf

# Cria a configuração personalizada do Nginx para o container.
# Este arquivo é essencial para o roteamento de SPAs (Single Page Applications)
# Ele deve estar no mesmo diretório do Dockerfile.
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos da aplicação construída do estágio 'builder' para o diretório de serviço do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html
# ATENÇÃO: O Vite geralmente gera os arquivos na pasta 'dist', não 'build'.
# Verifique a saída do seu 'npm run build' para confirmar se é 'dist' ou 'build'.

# Expõe a porta 80, que é a porta padrão que o Nginx usa dentro do container
EXPOSE 80

# Comando para iniciar o Nginx quando o container for executado
CMD ["nginx", "-g", "daemon off;"]