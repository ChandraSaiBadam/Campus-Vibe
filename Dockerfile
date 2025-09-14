FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY server/ ./

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]