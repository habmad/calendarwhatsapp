FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install server dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Install client dependencies and build
RUN cd client && npm install && npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"] 