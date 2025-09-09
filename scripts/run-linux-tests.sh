#!/bin/bash
# Script to run Linux platform-specific tests using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐧 Running Linux Platform Tests in Docker${NC}"
echo "=================================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Create results directories
mkdir -p TestResults/Linux
mkdir -p coverage/Linux

# Build and run Linux tests
echo -e "${YELLOW}📦 Building Linux test container...${NC}"
docker-compose -f docker-compose.tests.yml build linux-tests

echo -e "${YELLOW}🧪 Running Linux-specific integration tests...${NC}"
if docker-compose -f docker-compose.tests.yml run --rm linux-tests; then
    echo -e "${GREEN}✅ Linux platform tests passed!${NC}"
    
    # Show test results if available
    if [ -d "TestResults/Linux" ] && [ "$(ls -A TestResults/Linux)" ]; then
        echo -e "${BLUE}📊 Test Results Summary:${NC}"
        find TestResults/Linux -name "*.trx" -exec echo "  📄 {}" \;
    fi
    
    exit 0
else
    echo -e "${RED}❌ Linux platform tests failed${NC}"
    exit 1
fi