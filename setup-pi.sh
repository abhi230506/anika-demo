#!/bin/bash

# AI Tamagotchi - Raspberry Pi 5 Setup Script
# This script helps set up the environment for running on Raspberry Pi 5

set -e

echo "🚀 AI Tamagotchi - Raspberry Pi 5 Setup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js 18+ first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "Please upgrade Node.js:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
else
    echo "✅ pnpm $(pnpm -v) is installed"
fi

# Install dependencies
echo ""
echo "📦 Installing project dependencies..."
pnpm install

# Check for .env.local
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  .env.local file not found!"
    echo "Creating template .env.local file..."
    cat > .env.local << EOF
# OpenAI API Key (required for chat functionality)
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Key (required for TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here

# Optional: Set Node environment
NODE_ENV=production
EOF
    echo "✅ Created .env.local template"
    echo "⚠️  Please edit .env.local and add your API keys!"
else
    echo "✅ .env.local file exists"
fi

# Check system resources
echo ""
echo "💻 System Information:"
echo "  CPU: $(nproc) cores"
echo "  RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "  Architecture: $(uname -m)"

# Check if swap is configured
SWAP_SIZE=$(free -h | awk '/^Swap:/ {print $2}')
if [ "$SWAP_SIZE" = "0B" ] || [ "$SWAP_SIZE" = "" ]; then
    echo ""
    echo "⚠️  No swap space detected!"
    echo "For better performance (especially with 4GB RAM), consider adding swap:"
    echo "  sudo fallocate -l 2G /swapfile"
    echo "  sudo chmod 600 /swapfile"
    echo "  sudo mkswap /swapfile"
    echo "  sudo swapon /swapfile"
    echo "  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local and add your API keys"
echo "  2. Build the project: pnpm run build:pi"
echo "  3. Start the server: pnpm run start:prod"
echo ""
echo "For more information, see README.md"

