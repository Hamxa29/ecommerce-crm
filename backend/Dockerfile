FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy 2>&1 || echo 'Migration warning - continuing'; node src/scripts/seedAdmin.js 2>&1 || echo 'Seed warning - continuing'; node server.js"]
