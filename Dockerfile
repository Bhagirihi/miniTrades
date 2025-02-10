# Use an official Node.js image as the base
FROM node:18-slim

# Install necessary dependencies for Puppeteer to run in Docker
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libnss3 \
    libxss1 \
    libasound2 \
    libx11-xcb1 \
    libgbm1 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create and set the working directory
WORKDIR /usr/src/app

# Install Puppeteer (this will install the necessary Chromium binaries)
COPY package.json package-lock.json ./
RUN npm install --production

# Copy the Puppeteer script into the container
COPY fetch-cookie.js .

# Command to run the script when the container starts
CMD ["node", "fetch-cookie.js"]
