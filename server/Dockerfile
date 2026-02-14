FROM node:20-alpine

WORKDIR /app

# Install dependencies for better-sqlite3 native build
RUN apk add --no-cache python3 make g++

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built frontend and server
COPY dist/ ./dist/
COPY server/ ./server/

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

CMD ["node", "server/index.js"]
