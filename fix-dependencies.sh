#!/bin/bash

echo "🔧 Adding missing dependencies for full functionality..."

cd server

# Create a complete but optimized package.json
cat > package-complete.json << 'EOF'
{
  "name": "campus-vibe-lambda",
  "version": "1.0.0",
  "main": "lambda.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "serverless-http": "^3.2.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.3.1",
    "mongodb": "5.9",
    "mongoose": "^7.0.0",
    "express-rate-limit": "^7.1.5",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1"
  }
}
EOF

# Replace package.json and install
mv package.json package-minimal.json
mv package-complete.json package.json

# Clean install with production dependencies only
rm -rf node_modules
npm install --production --no-optional

cd ..

echo "🚀 Redeploying with complete dependencies..."
serverless deploy --stage prod --verbose