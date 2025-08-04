#!/bin/sh

# ci_post_clone.sh
# This script runs immediately after the repository is cloned in Xcode Cloud
# It's the earliest point where you can set up the environment

set -e

echo "🔧 Starting Xcode Cloud post-clone setup..."

# Ensure we're in the workspace directory
cd "$CI_WORKSPACE"

# Add common Node.js paths to PATH
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/v20.19.2/bin:$PATH"

# Set up Node.js environment
echo "📦 Setting up Node.js environment..."

# Check if Node.js is already available
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js already available: $(node --version)"
else
    echo "📦 Node.js not found, attempting installation..."
    
    # Try to install Node.js via nvm
    export NVM_DIR="$HOME/.nvm"
    
    # Install nvm if not present
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
        echo "📦 Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    fi
    
    # Load nvm and install Node.js
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
        echo "📦 Installing Node.js 20.19.2..."
        nvm install 20.19.2
        nvm use 20.19.2
        nvm alias default 20.19.2
        
        # Add to shell profile for persistence
        echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bash_profile
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bash_profile
        echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bash_profile
    fi
fi

# Verify Node.js and npm are available
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    echo "✅ Node.js: $(node --version)"
    echo "✅ npm: $(npm --version)"
    
    # Install dependencies early if Node.js is available
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "⚠️ Node.js/npm setup failed, will handle in pre-build script"
fi

echo "✅ Xcode Cloud post-clone setup completed"
