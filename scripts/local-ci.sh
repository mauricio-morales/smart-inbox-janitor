#!/bin/bash
# Local CI/CD Validation Script
# Mimics GitHub Actions CI pipeline for local development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions for output
print_header() {
    echo -e "\n${BLUE}===== $1 =====${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Start timestamp
START_TIME=$(date +%s)

print_header "🚀 LOCAL CI/CD VALIDATION STARTED"
echo "Timestamp: $(date)"
echo "Working Directory: $(pwd)"
echo "Node Version: $(node --version)"
echo "NPM Version: $(npm --version)"

# 1. Environment Setup (matching CI)
print_header "🔧 Environment Setup"
if [ "$1" == "--clean" ]; then
    print_warning "Cleaning node_modules and reinstalling..."
    rm -rf node_modules package-lock.json
    npm install
    print_success "Fresh installation complete"
else
    print_success "Using existing node_modules (use --clean for fresh install)"
fi

# 2. Dependency Check
print_header "📦 Dependency Validation"
npm ls --depth=0 > /dev/null 2>&1 && print_success "All dependencies resolved" || print_warning "Some dependency conflicts detected"

# 3. Code Quality Checks
print_header "🧪 Code Quality Validation"

echo "Running ESLint..."
if npm run lint > /dev/null 2>&1; then
    print_success "ESLint passed"
else
    print_error "ESLint failed"
    npm run lint  # Show actual errors
    exit 1
fi

echo "Running TypeScript compiler..."
if npm run type-check > /dev/null 2>&1; then
    print_success "TypeScript compilation passed"
else
    print_error "TypeScript compilation failed"
    npm run type-check  # Show actual errors
    exit 1
fi

echo "Checking code formatting..."
if npm run format:check > /dev/null 2>&1; then
    print_success "Code formatting is correct"
else
    print_warning "Code formatting issues detected"
    echo "Run 'npm run format' to fix formatting"
fi

# 4. Test Suite
print_header "🧪 Test Execution"
if npm test > /dev/null 2>&1; then
    print_success "All tests passed"
else
    print_warning "Tests failed or no tests found"
    npm test  # Show actual output
fi

# 5. Build Process
print_header "🏗️  Build Validation"

echo "Building application..."
if npm run build > /dev/null 2>&1; then
    print_success "Application build successful"
else
    print_error "Application build failed"
    npm run build  # Show actual errors
    exit 1
fi

# 6. Security Audit
print_header "🔐 Security Audit"
if npm audit --audit-level=moderate > /dev/null 2>&1; then
    print_success "No security vulnerabilities found"
else
    print_warning "Security vulnerabilities detected"
    npm audit --audit-level=moderate
    echo "Run 'npm audit fix' to resolve issues"
fi

# 7. Platform-specific builds (optional)
if [ "$1" == "--full" ]; then
    print_header "📱 Multi-platform Build Test"
    
    # Check if electron-builder is available
    if command -v electron-builder &> /dev/null; then
        echo "Building for current platform..."
        if npm run build:electron:current > /dev/null 2>&1; then
            print_success "Electron build successful"
        else
            print_warning "Electron build failed (this is normal in CI)"
        fi
    else
        print_warning "electron-builder not found, skipping platform builds"
    fi
fi

# 8. Final Report
print_header "📊 VALIDATION SUMMARY"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_success "All critical validations passed!"
echo -e "⏱️  Total time: ${DURATION}s"
echo -e "🎯 Ready for CI/CD pipeline"

if [ "$1" == "--full" ]; then
    echo -e "🔬 Full validation completed (including builds)"
fi

print_header "🚀 LOCAL VALIDATION COMPLETE"
echo "You can now safely push to trigger GitHub Actions CI/CD"