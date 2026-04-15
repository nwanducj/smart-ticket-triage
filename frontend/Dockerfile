# =============================================================================
# Frontend Dockerfile — Multi-Stage Build
#
# Stage 1 (builder): Install dependencies and build the Next.js app
# Stage 2 (runner):  Copy the standalone output for minimal image size
#
# Uses Next.js "standalone" output mode which bundles all server dependencies
# into a self-contained folder — no need for the full node_modules directory.
#
# Render-ready:
#   - NEXT_PUBLIC_API_URL is a build ARG. Next.js bakes NEXT_PUBLIC_* vars
#     into the client bundle AT BUILD TIME, so it MUST be passed to the build
#     (via `docker build --build-arg` or Render's "Docker Build Environment
#     Variables"). Runtime env vars don't reach the browser bundle.
#   - The standalone server reads $PORT at runtime — Render injects it.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time value for the public API URL. Override in Render:
#   Service → Environment → add NEXT_PUBLIC_API_URL as a
#   "Docker Build Argument" (NOT a plain env var — build args only).
# Default is the local-dev value so local `docker build` still works.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build the Next.js application. The NEXT_PUBLIC_API_URL env above is
# captured here and baked into the static chunks served to the browser.
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Runner (Production)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Run as non-root user for security.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

# Copy the standalone server from the builder.
# Next.js standalone output includes a minimal Node server and all required
# dependencies — no need for the full node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Documentary only — Render maps its external port to whatever $PORT is set to.
EXPOSE 3000

# Bind to 0.0.0.0 so the container is reachable from outside.
# PORT is read by Next.js' standalone server — Render injects it at runtime.
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
