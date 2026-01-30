# Multi-stage build for Discord Wordle Activity

# Stage 1: Build the client application
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client files
COPY client/package*.json ./
RUN npm install

COPY client/ .

# Build the client with Vite
RUN npm run build

# Stage 2: Runtime container
FROM node:20-alpine

WORKDIR /app

# Install global dependencies
RUN npm install -g concurrently

# Copy root package.json
COPY package.json package-lock.json* ./

# Copy environment file
COPY .env .env

# Copy server files and dependencies
COPY server/ ./server/
WORKDIR /app/server
RUN npm install

# Copy built client from stage 1
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist

# Copy valid words list to server directory
COPY valid-words.txt ./server/

# Expose ports
EXPOSE 5173

# Set working directory to root
WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Run both server and client
CMD ["npm", "run", "dev"]
