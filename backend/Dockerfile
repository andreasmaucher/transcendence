d# Simple single-stage image for building and running the backend
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN  apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/* && npm ci

# Copy sources and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Expose backend port
EXPOSE 4000

# Default environment (can be overridden at runtime)
ENV PORT=4000 HOST=0.0.0.0

# Start compiled server
ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/index.js"]