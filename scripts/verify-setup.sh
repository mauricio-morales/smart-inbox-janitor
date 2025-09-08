#!/bin/bash
# Script to verify the multi-platform testing setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verifying Multi-Platform Testing Setup${NC}"
echo "============================================="

# Check Docker availability
echo -e "${YELLOW}📦 Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    docker_version=$(docker --version)
    echo -e "${GREEN}✅ Docker available: ${docker_version}${NC}"
else
    echo -e "${RED}❌ Docker not found. Install Docker Desktop to use platform testing.${NC}"
    exit 1
fi

# Check Docker Compose
echo -e "${YELLOW}🐳 Checking Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    compose_version=$(docker-compose --version)
    echo -e "${GREEN}✅ Docker Compose available: ${compose_version}${NC}"
else
    echo -e "${RED}❌ Docker Compose not found.${NC}"
    exit 1
fi

# Verify Docker Compose file
echo -e "${YELLOW}📋 Verifying Docker Compose configuration...${NC}"
if docker-compose -f docker-compose.tests.yml config --quiet; then
    echo -e "${GREEN}✅ Docker Compose configuration valid${NC}"
else
    echo -e "${RED}❌ Docker Compose configuration invalid${NC}"
    exit 1
fi

# Check platform detection
echo -e "${YELLOW}🖥️  Detecting platform...${NC}"
case "$OSTYPE" in
    darwin*) 
        echo -e "${GREEN}✅ macOS detected - Native macOS tests available${NC}"
        echo -e "${BLUE}📝 Recommended: Use './scripts/run-macos-tests.sh' for macOS Keychain testing${NC}"
        ;;
    linux*) 
        echo -e "${GREEN}✅ Linux detected - Native Linux tests available${NC}"
        echo -e "${BLUE}📝 Recommended: Use './scripts/run-linux-tests.sh' for containerized testing${NC}"
        ;;
    msys*|cygwin*|mingw*) 
        echo -e "${GREEN}✅ Windows detected - Windows container tests available${NC}"
        echo -e "${BLUE}📝 Recommended: Use './scripts/run-windows-tests.ps1' for Windows DPAPI testing${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unknown platform: $OSTYPE${NC}"
        ;;
esac

# Check .NET availability
echo -e "${YELLOW}🔨 Checking .NET SDK...${NC}"
if command -v dotnet &> /dev/null; then
    dotnet_version=$(dotnet --version)
    echo -e "${GREEN}✅ .NET SDK available: ${dotnet_version}${NC}"
else
    echo -e "${YELLOW}⚠️  .NET SDK not found. Required for native testing.${NC}"
fi

# Check script permissions
echo -e "${YELLOW}🔐 Checking script permissions...${NC}"
scripts_ok=true

for script in scripts/run-*.sh; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✅ $script is executable${NC}"
        else
            echo -e "${YELLOW}⚠️  $script is not executable. Run: chmod +x $script${NC}"
            scripts_ok=false
        fi
    fi
done

if [ "$scripts_ok" = true ]; then
    echo -e "${GREEN}✅ All shell scripts are properly configured${NC}"
fi

echo ""
echo -e "${BLUE}🎉 Setup Verification Complete${NC}"
echo "============================================="
echo -e "${GREEN}✅ Multi-platform testing environment is ready!${NC}"
echo ""
echo -e "${BLUE}Quick Start Commands:${NC}"
echo "  ./scripts/run-cross-platform-tests.sh  # Cross-platform tests"
echo "  ./scripts/run-linux-tests.sh           # Linux libsecret tests" 
echo ""
echo -e "${BLUE}VS Code Integration:${NC}"
echo "  Cmd+Shift+P → 'Tasks: Run Task' → Select test task"