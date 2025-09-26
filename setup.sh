#!/bin/bash

# Auto-setup script for inventory analyzer
# This will run all commands with automatic confirmation

set -e  # Exit on any error

echo "🚀 Setting up Inventory Analyzer..."

# Set environment variables to skip prompts
export DEBIAN_FRONTEND=noninteractive
export npm_config_yes=true
export CI=true

# Install dependencies with auto-confirm
echo "📦 Installing dependencies..."
npm install --yes

# Build project
echo "🏗️ Building project..."
npm run build

# Start development server
echo "🌟 Starting development server..."
npm run dev

echo "✅ Setup complete!"