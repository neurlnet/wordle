# Multi-stage build for Discord Wordle Activity

# Stage 1: Build the client application
FROM node:20-alpine AS client-builder

# Build arguments for Vite environment variables
ARG VITE_DISCORD_CLIENT_ID
ARG VITE_REDIRECT_URI

ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
ENV VITE_REDIRECT_URI=$VITE_REDIRECT_URI

WORKDIR /app

# Copy environment file first (needed for Vite to access env vars during build)
COPY .env ./

# Copy client files
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install

COPY client/ .

# Build the client with Vite (env vars from ../.env are now available)
RUN npm run build

# Stage 2: Runtime container
FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

WORKDIR /app

# Copy environment file
COPY .env .env

# Set environment variables for production
ENV NODE_ENV=production
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_SECRET=$DISCORD_CLIENT_SECRET

# Copy server files and dependencies
COPY server/ ./server/
WORKDIR /app/server
RUN npm install

# Copy built client from stage 1
WORKDIR /app
COPY --from=client-builder /app/client/dist ./client/dist

# Copy valid words list to server directory
COPY valid-words.txt ./server/

# Expose only server port
EXPOSE 3001

# Set working directory to server
WORKDIR /app/server
WORKDIR /app/client
CMD ["npm","run","build"]
WORKDIR /app/server

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Run only the server
CMD ["npm", "start"]
