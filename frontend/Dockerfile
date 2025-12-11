# syntax=docker/dockerfile:1.6
# Simple single-stage image for building and running the backend
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
ARG CACHEBUST=1
RUN  apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/* \
    && echo "CACHEBUST=${CACHEBUST}" > /dev/null
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci

# Copy frontend sources
# Adjust if your files live elsewhere
COPY index.html ./
COPY vite.config.* ./
COPY tsconfig*.json ./
COPY src ./src


ENV VITE_PORT=5173
EXPOSE 5173

# Start compiled server
ENTRYPOINT ["tini", "--"]
# Listen on all interfaces so the host can reach Vite from Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
