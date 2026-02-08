# Production Dockerfile for Frontend

FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production: minimal HTTP server
FROM node:24-alpine

WORKDIR /app

# Install serve package globally (lightweight static file server)
RUN npm install -g serve

# Copy built static files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Serve static files with SPA fallback
# -s: SPA mode (fallback to index.html)
# -l: listen port
CMD ["serve", "-s", "dist", "-l", "3000"]
