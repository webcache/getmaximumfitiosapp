#!/bin/sh

# ci_post_clone.sh
# This script runs immediately after the repository is cloned in Xcode Cloud
# It's the earliest point where you can set up the environment

set -e

echo "🔧 Starting Xcode Cloud post-clone setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Set up Node.js environment
echo "📦 Setting up Node.js environment..."
export NODE_VERSION="20.19.2"

# Install Node.js if not available
if ! command -v node &> /dev/null; then
    echo "Installing Node.js $NODE_VERSION..."
    # Xcode Cloud uses macOS, so we can use the system Node.js or install via nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
fi

# Verify Node.js version
node --version
npm --version

# Install dependencies early
echo "📦 Installing npm dependencies..."
npm install

echo "✅ Xcode Cloud post-clone setup completed"
