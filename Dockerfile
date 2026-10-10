# ====================================================================
# EY Enterprise CloudOps Dashboard - Production Multi-Stage Dockerfile
# Follows CIS Docker Benchmarks & Enterprise Security Standards
# ====================================================================

# STAGE 1: Dependency Installation & Clean Cache
FROM node:22-alpine AS dependencies
WORKDIR /app

# Install dependencies needed for production only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# STAGE 2: Hardened Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    GIT_COMMIT_SHA=ghcr-release

# Copy node modules from dependency stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Enterprise Security: Run as non-privileged user (node)
# Avoids root privilege escalation inside container clusters
USER node

# Expose standard container port
EXPOSE 3000

# Container Liveness & Readiness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "src/server.js"]
