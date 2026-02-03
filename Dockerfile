# ===============================
# Base
# ===============================
FROM node:20-alpine AS base
WORKDIR /app

# ===============================
# Dependencies
# ===============================
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ===============================
# Build
# ===============================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ===============================
# Runner
# ===============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["npm", "start"]
