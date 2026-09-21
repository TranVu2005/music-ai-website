# Multi-stage Dockerfile for Next.js Monolith application

# Stage 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat ffmpeg openssl

# Stage 2: Dependencies
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
COPY src/db ./src/db/
RUN npm ci

# Stage 3: Build
FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Configure non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets and standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure Prisma query engine and schema files are present in standalone output
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
