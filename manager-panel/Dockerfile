# 1. QURILISH BOSQICHI (Build stage)
FROM node:20-alpine AS build
WORKDIR /app

# Bog'liqliklarni yuklab olish
COPY package*.json ./
RUN npm install

# Kodni nusxalash va loyihani yig'ish (build)
COPY . .
RUN npm run build

# 2. ISHGA TUSHIRISH BOSQICHI (Production stage)
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx portini ochish
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
