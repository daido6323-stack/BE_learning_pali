# ── Stage 1: Build / Install Dependencies ───────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

# Install openssl for Prisma compatibility
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

# Install openssl on runner too
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY . .

# Ensure uploads directory exists and is writable
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8081

CMD ["node", "server.js"]
