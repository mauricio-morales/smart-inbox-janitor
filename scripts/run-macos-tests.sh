#!/bin/bash
# Script to run macOS platform-specific tests locally
# Note: This must run on an actual macOS machine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍎 Running macOS Platform Tests${NC}"
echo "====================================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ macOS tests can only run on macOS machines${NC}"
    echo -e "${YELLOW}💡 Alternatives for testing macOS functionality:${NC}"
    echo "   1. Use GitHub Actions macOS runners in CI/CD"
    echo "   2. Use macOS VM on Apple hardware (requires macOS host)"
    echo "   3. Mock keychain operations for cross-platform testing"
    exit 1
fi

# Check if Keychain Services are available
echo -e "${YELLOW}🔐 Checking macOS Keychain availability...${NC}"
if ! security list-keychains &>/dev/null; then
    echo -e "${RED}❌ macOS Keychain Services not available${NC}"
    exit 1
fi

# Create results directories
mkdir -p TestResults/macOS
mkdir -p coverage/macOS

echo -e "${YELLOW}🧪 Running macOS-specific integration tests...${NC}"
echo "Testing Keychain Services integration..."

# Run macOS-specific tests
if dotnet test --configuration Release \
    --filter "Category=Integration&Platform=macOS" \
    --verbosity normal \
    --logger "console;verbosity=detailed" \
    --collect:"XPlat Code Coverage" \
    --results-directory ./TestResults/macOS; then
    
    echo -e "${GREEN}✅ macOS platform tests passed!${NC}"
    
    # Show test results if available
    if [ -d "TestResults/macOS" ] && [ "$(ls -A TestResults/macOS)" ]; then
        echo -e "${BLUE}📊 Test Results Summary:${NC}"
        find TestResults/macOS -name "*.trx" -exec echo "  📄 {}" \;
    fi
    
    # Show coverage if available
    if [ -d "coverage/macOS" ] && [ "$(ls -A coverage/macOS)" ]; then
        echo -e "${BLUE}📈 Coverage Reports:${NC}"
        find coverage/macOS -name "*.xml" -exec echo "  📊 {}" \;
    fi
    
    exit 0
else
    echo -e "${RED}❌ macOS platform tests failed${NC}"
    exit 1
fi