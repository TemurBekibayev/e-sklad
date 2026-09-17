# Multi-stage Dockerfile for KafePOS

# 1-Bosqich: Frontendni yig'ish (Client build)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 2-Bosqich: Asosiy server va ishga tushirish (Production server)
FROM node:20-alpine
WORKDIR /app

# SQLite va mahalliy kutubxonalar uchun zarur build paketlari
RUN apk add --no-cache python3 make g++ sqlite

# Server bog'liqliklari
COPY package*.json ./
RUN npm install --omit=dev

# Server kodlari
COPY server/ ./server/
COPY test_scenario.js ./

# Yig'ilgan frontend fayllarini ko'chirib olish
COPY --from=client-builder /app/client/dist ./client/dist

# Port
EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
