FROM node:18.19-alpine

# Set working directory
WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the server TypeScript code
RUN npm run server:build

# Install client dependencies and build
RUN cd client && npm ci && npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 3001

# Start the application (use the built JavaScript file)
CMD ["node", "dist/index.js"] 