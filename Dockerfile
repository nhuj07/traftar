FROM node:20-bullseye-slim

# Install Chromium, Tor, and necessary libraries
RUN apt-get update && apt-get install -y \
    chromium \
    tor \
    curl \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy configuration and code
COPY package*.json ./
RUN npm install
COPY . .

# Set permissions for entrypoint
RUN chmod +x entrypoint.sh

# Environment variables
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CONCURRENT_AGENTS=5
ENV VISIT_DURATION_MS=30000

# Execute
ENTRYPOINT ["./entrypoint.sh"]
