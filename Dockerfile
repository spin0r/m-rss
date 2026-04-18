# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/service/rss.json ./service/rss.json

# Create data directory for persistent storage
RUN mkdir -p /app/data /app/sessions

# Expose dashboard port
EXPOSE 15233

# Start the application
CMD ["node", "dist/server.js"]
