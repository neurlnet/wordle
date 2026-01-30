#!/bin/bash

# Discord Wordle - Installation and Setup Verification Script

echo "🎮 Discord Wordle Activity - Setup Verification"
echo "================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check file existence
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description - NOT FOUND at $file"
        ((CHECKS_FAILED++))
    fi
}

# Function to check directory existence
check_dir() {
    local dir=$1
    local description=$2
    
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description - NOT FOUND at $dir"
        ((CHECKS_FAILED++))
    fi
}

echo "${BLUE}Checking Project Structure...${NC}"
echo ""

# Root files
check_file ".env" "Environment variables (.env)"
check_file "package.json" "Root package.json"
check_file "Dockerfile" "Dockerfile"
check_file "docker-compose.yml" "docker-compose.yml"
check_file ".dockerignore" ".dockerignore"
check_file ".gitignore" ".gitignore"
check_file "valid-words.txt" "Valid words list"

echo ""
echo "${BLUE}Checking Documentation...${NC}"
echo ""

check_file "README.md" "Main README"
check_file "QUICKSTART.md" "Quick Start Guide"
check_file "SETUP_COMPLETE.md" "Setup Summary"

echo ""
echo "${BLUE}Checking Client Files...${NC}"
echo ""

check_dir "client" "Client directory"
check_file "client/package.json" "Client package.json"
check_file "client/index.html" "Client index.html"
check_file "client/main.js" "Client main.js (Game Logic)"
check_file "client/style.css" "Client style.css"
check_file "client/vite.config.js" "Client Vite config"

echo ""
echo "${BLUE}Checking Server Files...${NC}"
echo ""

check_dir "server" "Server directory"
check_file "server/package.json" "Server package.json"
check_file "server/server.js" "Server server.js"

echo ""
echo "${BLUE}Checking Reference Structure...${NC}"
echo ""

check_dir "getting-started-activity-main" "Reference template (getting-started-activity)"
check_file "getting-started-activity-main/example.env" "Reference example.env"

echo ""
echo "================================================"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Project structure is complete.${NC}"
else
    echo -e "${RED}✗ Some checks failed. Please verify the setup.${NC}"
fi

echo ""
echo "Summary: $CHECKS_PASSED passed, $CHECKS_FAILED failed"
echo ""

# Installation instructions
echo "${BLUE}Next Steps:${NC}"
echo ""
echo "1. ${YELLOW}Read the guides:${NC}"
echo "   - QUICKSTART.md (recommended first)"
echo "   - README.md (detailed docs)"
echo "   - SETUP_COMPLETE.md (technical overview)"
echo ""
echo "2. ${YELLOW}Install dependencies:${NC}"
echo "   npm install"
echo "   npm --prefix client install"
echo "   npm --prefix server install"
echo ""
echo "3. ${YELLOW}Start development:${NC}"
echo "   npm run dev"
echo "   (or: bash start.sh)"
echo ""
echo "4. ${YELLOW}Set up Discord tunnel:${NC}"
echo "   cloudflared tunnel --url http://localhost:5173"
echo ""
echo "5. ${YELLOW}Configure Discord Developer Portal:${NC}"
echo "   - Go to Activities → URL Mappings"
echo "   - Add mapping: / → [your-public-url]"
echo ""
echo "6. ${YELLOW}Test in Discord:${NC}"
echo "   - Enable Developer Mode in Discord"
echo "   - Open App Launcher in any channel/DM"
echo "   - Find and launch your Wordle activity"
echo ""
echo "================================================"
echo ""
echo -e "${GREEN}Setup is ready! Follow QUICKSTART.md to begin.${NC}"
