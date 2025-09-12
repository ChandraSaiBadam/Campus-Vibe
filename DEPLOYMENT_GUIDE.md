# Campus Vibe - Deployment Guide

This guide provides instructions for deploying the Campus Vibe application to a production environment.

## Prerequisites

Before deploying, ensure you have:

1. A server or hosting platform (VPS, cloud provider, etc.)
2. Node.js (version 14 or higher) installed on the server
3. A MongoDB Atlas account or access to a MongoDB database
4. A domain name (optional, for custom domain access)

## Deployment Options

### Option 1: Manual Deployment

#### 1. Server Setup

1. Clone or upload the project to your server:

   ```bash
   git clone <repository-url>
   # or upload the project files to your server
   ```

2. Install dependencies for both server and client:

   ```bash
   # From the project root directory
   npm run install-all
   ```

3. Configure environment variables:

   - Update `server/.env` with your production MongoDB URI and other settings
   - Ensure `PORT` is set to your desired port (e.g., 5000)
   - Set `NODE_ENV=production`

4. Build the client application:

   ```bash
   # From the project root directory
   npm run build
   ```

5. Start the application:

   ```bash
   # Option A: Run server and client separately
   # Terminal 1 - Start the server:
   cd server
   npm start

   # Terminal 2 - Serve the client build (install serve globally first):
   npm install -g serve
   serve -s build -l 3000

   # Option B: Use PM2 for process management (recommended for production)
   npm install -g pm2

   # Start server with PM2
   pm2 start server/app.js --name "campus-vibe-server" --env production

   # Serve client build with PM2
   pm2 serve client/build 3000 --name "campus-vibe-client" --spa

   # Save PM2 configuration
   pm2 save
   ```

#### 2. Reverse Proxy Setup (Optional but Recommended)

If you want to serve both the client and server on the same domain, set up a reverse proxy using Nginx:

1. Install Nginx:

   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nginx

   # CentOS/RHEL
   sudo yum install nginx
   ```

2. Create an Nginx configuration file:

   ```bash
   sudo nano /etc/nginx/sites-available/campus-vibe
   ```

3. Add the following configuration:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain

       # Client application
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_buffering off;
       }

       # API requests
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       # Socket.IO requests
       location /socket.io/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. Enable the site:
    ```bash
    sudo ln -s /etc/nginx/sites-available/campus-vibe /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    ```

### Option 2: Cloud Deployment (Heroku, Render, etc.)

#### Heroku Deployment

1. Create a `Procfile` in the project root:

   ```
   web: cd server && npm start
   ```

2. Create a `heroku-postbuild` script in the root `package.json`:

   ```json
   "scripts": {
     "heroku-postbuild": "cd client && npm install && npm run build"
   }
   ```

3. Deploy to Heroku:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

#### Render Deployment

1. Create a `render.yaml` file in the project root:
    ```yaml
    services:
      - type: web
        name: campus-vibe-server
        env: node
        buildCommand: npm install && cd client && npm install && npm run build
        startCommand: npm start
        envVars:
          - key: NODE_ENV
            value: production
    ```

### Option 3: Docker Deployment

1. Create a `Dockerfile` for the server:

   ```dockerfile
   FROM node:16-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm install

   COPY . .

   EXPOSE 5000

   CMD ["node", "app.js"]
   ```

2. Create a `docker-compose.yml`:

   ```yaml
   version: "3.8"
   services:
     server:
       build: ./server
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - MONGODB_URI=your-mongodb-uri
       volumes:
         - ./server/uploads:/app/uploads

     client:
       build:
         context: ./client
         dockerfile: Dockerfile.prod
       ports:
         - "3000:3000"
       depends_on:
         - server
   ```

## Environment Configuration

### Production Environment Variables

Ensure your `.env` files are properly configured for production:

**Server Environment (`server/.env`)**:

```env
# MongoDB Configuration
MONGODB_URI=your-production-mongodb-uri

# Server Configuration
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=your-jwt-secret-key
ADMIN_SECRET=your-admin-secret-key

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=https://your-domain.com
```

## Monitoring and Maintenance

### Process Management

Use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server/app.js --name "campus-vibe" --env production

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart campus-vibe

# Stop application
pm2 stop campus-vibe

# Save current process list
pm2 save
```

### Log Management

Set up log rotation to prevent disk space issues:

```bash
# Install logrotate
sudo apt-get install logrotate

# Create logrotate configuration
sudo nano /etc/logrotate.d/campus-vibe
```

Add the following to the logrotate configuration:

```
/path/to/your/app/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs >/dev/null 2>&1 || true
    endscript
}
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Configure CORS properly in your environment files
3. **Rate Limiting**: The application already includes rate limiting
4. **Input Validation**: All API endpoints include input validation
5. **MongoDB Security**: Ensure your MongoDB Atlas cluster has proper IP whitelisting

## Scaling Considerations

1. **Database**: Use a managed MongoDB service like MongoDB Atlas
2. **Load Balancing**: Use a load balancer for high-traffic applications
3. **Caching**: Implement Redis caching for frequently accessed data
4. **CDN**: Use a CDN for static assets

## Troubleshooting

### Common Issues

1. **Port Already in Use**:

   ```bash
   # Find process using port
   lsof -i :5000

   # Kill process
   kill -9 <PID>
   ```

2. **MongoDB Connection Issues**:

   - Verify your MongoDB URI
   - Check IP whitelist in MongoDB Atlas
   - Ensure database user has proper permissions

3. **Build Issues**:

   ```bash
   # Clear build cache
   cd client && rm -rf build node_modules
   npm install
   npm run build
   ```

4. **Memory Issues**:
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Backup and Recovery

### Database Backup

For MongoDB Atlas:

1. Use Atlas Backup feature for automatic backups
2. Export data manually using mongodump:
   ```bash
   mongodump --uri="your-mongodb-uri" --out=/backup/location
   ```

### File Backup

Include the `uploads` directory in your backup strategy:

```bash
# Create backup script
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz server/uploads
```

## Conclusion

The Campus Vibe application is ready for production deployment. Follow the steps above based on your hosting environment. The application includes:

- RESTful API with comprehensive endpoints
- Real-time chat using Socket.IO
- File upload capabilities
- Database integration with MongoDB
- Security features including rate limiting and input validation

For any issues during deployment, refer to the troubleshooting section or consult the application logs for detailed error information.
