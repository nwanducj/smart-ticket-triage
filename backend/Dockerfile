# =============================================================================
# Backend Dockerfile — Multi-Stage Build
#
# Stage 1 (builder): Compile TypeScript to JavaScript
# Stage 2 (runner):  Copy only compiled JS + production dependencies
#
# Multi-stage keeps the final image small by excluding TypeScript compiler,
# dev dependencies, and source files from the production image.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Set working directory inside the container.
WORKDIR /app

# Copy package files first for better Docker layer caching.
# If package.json hasn't changed, Docker reuses the cached npm install layer
# even if source code has changed — saving minutes on rebuilds.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies like typescript, ts-jest)
# because we need them to compile TypeScript.
RUN npm ci

# Copy source code and TypeScript config.
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript → JavaScript into the dist/ directory.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Runner (Production)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Set working directory.
WORKDIR /app

# Set NODE_ENV to production so Express enables optimizations and
# npm ci skips devDependencies.
ENV NODE_ENV=production

# Copy package files for production dependency install.
COPY package.json package-lock.json ./

# Install only production dependencies (--omit=dev).
# This excludes typescript, jest, ts-jest, etc. from the final image.
RUN npm ci --omit=dev

# Copy compiled JavaScript from the builder stage.
COPY --from=builder /app/dist ./dist

# Copy seed script (needs ts-node to run, but we'll use the compiled version).
# The seed can be run via: docker exec backend node dist/seeds/seed.js
# (We'd need to compile seeds separately; for now, seed is run locally.)

# Run as non-root user for security.
# If the container is compromised, the attacker doesn't get root access.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
USER appuser

# Expose the port the server listens on.
EXPOSE 4000

# Health check — Docker uses this to determine if the container is healthy.
# The /api/health endpoint returns 200 when the server and database are up.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Start the server using the compiled JavaScript entry point.
CMD ["node", "dist/index.js"]
