#!/bin/bash

echo "🎯 Creating minimal Lambda deployment..."

# Create a minimal package.json for Lambda
cd server
cat > package-lambda.json << 'EOF'
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
    "dotenv": "^16.3.1"
  }
}
EOF

# Backup original and use minimal
mv package.json package-full.json
mv package-lambda.json package.json

# Install minimal dependencies
rm -rf node_modules
npm install --production

cd ..

echo "🚀 Deploying minimal package..."
serverless deploy --stage prod --verbose

echo "🔄 Restoring full package.json..."
cd server
mv package-full.json package.json
cd ..