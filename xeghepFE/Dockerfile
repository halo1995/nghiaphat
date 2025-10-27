# Giai đoạn build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Bỏ qua bước kiểm tra TypeScript và chỉ chạy vite build
RUN npx vite build

# Giai đoạn phục vụ
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
