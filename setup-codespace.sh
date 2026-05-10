#!/bin/bash

# Exit on error
set -e

# Ensure we are in the cloud-deployment directory
cd "$(dirname "$0")"

echo "=========================================="
echo "🚀 Setting up Codespace for Traffic Bot"
echo "=========================================="

# 1. Install System Dependencies
echo "📦 Installing system dependencies (requires sudo)..."
sudo apt-get update && sudo apt-get install -y tor chromium fonts-liberation libnss3 libxss1 libasound2t64 libatk-bridge2.0-0t64 libgtk-3-0t64 libgbm-dev

# 2. Install Node Dependencies
echo "📥 Installing Node.js dependencies..."
npm install

# 3. Start Tor in the background
echo "🌐 Starting Tor service..."
# Check if Tor is already running on port 9050
if lsof -Pi :9050 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Tor seems to be already running on port 9050."
else
    tor -f torrc &
fi

# Wait for Tor to be ready
echo "⏳ Waiting for Tor to bootstrap..."
until curl --socks5-hostname 127.0.0.1:9050 -s https://check.torproject.org/ | grep -q "Congratulations"; do
  echo "   Waiting for Tor circuit to be established..."
  sleep 5
done

echo "✅ Tor is ready!"

# 4. Run the Bot
echo "🤖 Starting the bot..."
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
npm start
