#!/bin/bash

# Script to verify that no complete solution libraries are used
# This proves all features are custom-built

echo "=========================================="
echo "Library Verification Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of forbidden complete-solution libraries
FORBIDDEN_LIBS=(
    "passport"
    "socket.io"
    "phaser"
    "matter.js"
    "sequelize"
    "typeorm"
    "prisma"
    "react"
    "vue"
    "angular"
    "i18next"
    "react-i18next"
    "express-session"
    "jsonwebtoken"
    "auth0"
    "firebase"
    "supabase"
)

# Check package.json files
echo "📦 Checking package.json files..."
echo ""

FOUND_FORBIDDEN=false

for lib in "${FORBIDDEN_LIBS[@]}"; do
    if grep -qi "$lib" backend/package.json frontend/package.json 2>/dev/null; then
        echo -e "${RED}❌ FOUND: $lib${NC}"
        FOUND_FORBIDDEN=true
    fi
done

if [ "$FOUND_FORBIDDEN" = false ]; then
    echo -e "${GREEN}✅ No forbidden libraries in package.json${NC}"
fi

echo ""
echo "🔍 Checking source code for imports..."
echo ""

FOUND_IN_CODE=false

for lib in "${FORBIDDEN_LIBS[@]}"; do
    if grep -r -i "import.*$lib\|require.*$lib" backend/src frontend/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v ".md" > /dev/null; then
        echo -e "${RED}❌ FOUND in code: $lib${NC}"
        grep -r -i "import.*$lib\|require.*$lib" backend/src frontend/src --include="*.ts" --include="*.js" 2>/dev/null | head -3
        FOUND_IN_CODE=true
    fi
done

if [ "$FOUND_IN_CODE" = false ]; then
    echo -e "${GREEN}✅ No forbidden libraries imported in source code${NC}"
fi

echo ""
echo "📊 Dependency Analysis..."
echo ""

echo "Backend dependencies:"
cat backend/package.json | grep -A 20 '"dependencies"' | grep -E '"[^"]+":' | sed 's/^/  - /'

echo ""
echo "Frontend dependencies:"
cat frontend/package.json | grep -A 10 '"dependencies"' | grep -E '"[^"]+":' | sed 's/^/  - /'

echo ""
echo "=========================================="
if [ "$FOUND_FORBIDDEN" = false ] && [ "$FOUND_IN_CODE" = false ]; then
    echo -e "${GREEN}✅ VERIFICATION PASSED${NC}"
    echo -e "${GREEN}All features are custom-built!${NC}"
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo -e "${RED}Complete solution libraries detected!${NC}"
    exit 1
fi

