# --- Etapa 1: Construção (Build) da Aplicação Frontend ---
FROM node:20-alpine as builder

WORKDIR /app

# Esta linha AGORA FAZ TODO O SENTIDO e está CORRETA para seu requisito.
# Ela embutirá o URL absoluto do backend no build do frontend.
ENV VITE_API_URL=https://backend.clayforgestudio.com.br

COPY package.json package-lock.json ./

RUN npm install

# Copia todo o restante do código da aplicação, incluindo .env, src, public, vite.config.js etc.
COPY . .

# Constrói a aplicação.
RUN npm run build

# --- Etapa 2: Servir a Aplicação Construída com Nginx ---
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

# Cria a configuração personalizada do Nginx para o container.
# Este arquivo é essencial para o roteamento de SPAs (Single Page Applications)
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos da aplicação construída do estágio 'builder' para o diretório de serviço do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]