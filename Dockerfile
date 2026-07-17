# ==========================================
# Phase 1: Build & Bundling
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install development dependencies for build compilation
RUN npm ci

# Copy full workspace files
COPY . .

# Run production compilation of frontend (Vite) and backend (esbuild to dist/server.cjs)
RUN npm run build

# ==========================================
# Phase 2: Lightweight Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production-only dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled bundles from builder phase
COPY --from=builder /app/dist ./dist

# Expose NodePilot standard container port
EXPOSE 3000

# Run self-contained CommonJS server
CMD ["node", "dist/server.cjs"]
