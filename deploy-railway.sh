#!/bin/bash

echo "🚂 Setting up Railway deployment (FREE & SIMPLE)..."

# Create railway.json config
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Create Procfile for Railway
echo "web: cd server && npm start" > Procfile

echo "✅ Railway config created!"
echo ""
echo "Now run these 3 commands:"
echo "1. npm install -g @railway/cli"
echo "2. railway login"
echo "3. railway up"
echo ""
echo "That's it! Railway will give you a free URL that works immediately."