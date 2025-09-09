#!/bin/bash

# Setup script to install git hooks for all developers
# This configures git to use the shared hooks from .githooks/

echo "Setting up git hooks..."

# Configure git to use the .githooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks configured successfully!"
echo "The pre-commit hook will now run dotnet format before every commit."
echo ""
echo "To disable temporarily: git commit --no-verify"
echo "To re-enable after disabling: Run this script again"