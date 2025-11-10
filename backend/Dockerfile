# syntax=docker/dockerfile:1.6
# ---------- Stage 1: Build Stage ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install the build tools for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files and install
COPY package*.json ./

# Keep a configurable (but defaulted) cache-busting arg so npm ci can be forced when needed.
ARG CACHEBUST=1
RUN echo "CACHEBUST=${CACHEBUST}" > /dev/null

RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# Copy the source code and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# ---------- Stage 2: Runtime Stage ----------
FROM node:20-bookworm-slim AS runtime

WORKDIR /app

# Install tini for graceful shutdowns
RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled JS and production dependencies only
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Ensure data folder exists for SQLite
RUN mkdir -p /app/data

# Default environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/database.sqlite

EXPOSE 4000

# Use tini as the init process
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]
