# =============================================================================
# Backend Dockerfile — Multi-Stage Build
#
# Stage 1 (builder): Compile TypeScript to JavaScript
# Stage 2 (runner):  Copy only compiled JS + production dependencies
#
# Multi-stage keeps the final image small by excluding TypeScript compiler,
# dev dependencies, and source files from the production image.
#
# Render-ready:
#   - Listens on $PORT (Render injects this; config falls back to 4000 locally).
#   - No HEALTHCHECK directive — Render ignores it and uses its own
#     "Health Check Path" (/api/health) configured in the dashboard/render.yaml.
#   - Runs as non-root for security.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better Docker layer caching.
# If package.json hasn't changed, Docker reuses the cached npm install layer
# even if source code has changed — saving minutes on rebuilds.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies like typescript)
# because we need them to compile TypeScript.
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript → JavaScript into the dist/ directory.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Runner (Production)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set NODE_ENV so Express enables optimizations and npm ci skips devDeps.
ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Install only production dependencies (--omit=dev).
# Excludes typescript, jest, ts-jest, etc. from the final image.
RUN npm ci --omit=dev

# Copy compiled JavaScript from the builder stage.
COPY --from=builder /app/dist ./dist

# Run as non-root user for security.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
USER appuser

# Documentary only — Render maps its external port to whatever $PORT is set to.
EXPOSE 4000

# Start the server. config/index.ts reads process.env.PORT automatically,
# so the app binds to whatever port Render assigns.
CMD ["node", "dist/index.js"]
