# Production Dockerfile for Frontend

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production: serve static files with nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx will be configured via Caddy reverse proxy
# No need for custom nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
