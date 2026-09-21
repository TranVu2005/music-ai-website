# Multi-stage Dockerfile cho [STACK] (Node.js / TypeScript)

# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg

# Stage 2: Dependencies
FROM base AS dependencies
WORKDIR /app
# TODO: Copy package.json và pnpm-lock.yaml / package-lock.json
# COPY package*.json ./
# RUN npm ci

# Stage 3: Build
FROM dependencies AS builder
WORKDIR /app
# TODO: Copy mã nguồn và chạy lệnh build
# COPY . .
# RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# TODO: Cấu hình non-root user và copy artifacts từ builder
# USER node
# EXPOSE 3000 5000
# CMD ["node", "dist/backend/server.js"]
