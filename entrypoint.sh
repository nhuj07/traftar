#!/bin/bash

# Start Tor in the background
tor -f /app/torrc &

# Wait for Tor to be ready (look for "Bootstrapped 100%")
echo "Waiting for Tor to bootstrap..."
until curl -k --socks5-hostname 127.0.0.1:9050 -s https://check.torproject.org/ | grep -q "Congratulations"; do
  sleep 2
done

echo "Tor is ready! Starting Bot..."

# Start the Node.js bot
npm start
