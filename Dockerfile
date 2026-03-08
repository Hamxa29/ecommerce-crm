FROM node:20-alpine

# Prisma needs openssl on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .

RUN npx prisma generate

# Prune dev deps after generate (keeps prisma client, removes prisma CLI + nodemon)
RUN npm prune --production

EXPOSE 3001

CMD ["node", "server.js"]
