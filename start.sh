#!/bin/bash

# Discord Wordle - Development Startup Script

echo "🎮 Starting Discord Wordle Activity Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "${YELLOW}Installing client dependencies...${NC}"
    npm --prefix client install
fi

if [ ! -d "server/node_modules" ]; then
    echo "${YELLOW}Installing server dependencies...${NC}"
    npm --prefix server install
fi

echo ""
echo "${GREEN}✓ All dependencies installed${NC}"
echo ""
echo "${BLUE}Starting servers...${NC}"
echo ""
echo "${YELLOW}Client will run at: http://localhost:5173${NC}"
echo "${YELLOW}Server will run at: http://localhost:3001${NC}"
echo ""
echo "${YELLOW}⚠️  To use with Discord, you MUST expose this to the internet:${NC}"
echo "   cloudflared tunnel --url http://localhost:5173"
echo "   Then add the public URL to Discord Developer Portal → Activities → URL Mappings"
echo ""

# Start development servers
npm run dev
