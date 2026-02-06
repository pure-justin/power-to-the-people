# Use Playwright's official image - must match package.json version
FROM mcr.microsoft.com/playwright:v1.48.2-focal

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server.js ./

# Cloud Run uses PORT env variable
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]
