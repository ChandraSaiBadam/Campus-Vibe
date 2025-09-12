# Campus Vibe

A comprehensive campus platform with GPA calculator, marketplace, faculty reviews, anonymous forum, and timetable features.

## 🚀 Quick Deployment (AWS Lambda + API Gateway)

**Cost: $3-15/year** - Perfect for your traffic (2000 users max, 200 typical)

### Prerequisites
- AWS Account with CLI configured
- MongoDB Atlas account
- Node.js installed

### One-Command Deployment

```bash
# 1. Clone and setup
git clone <your-repo>
cd Campus-connect

# 2. Configure environment
cp server/.env.production server/.env
# Edit server/.env with your MongoDB URI and other secrets

# 3. Deploy everything
./deploy.sh -b your-s3-bucket-name
```

That's it! Your app will be live on AWS with:
- ✅ Backend: Lambda + API Gateway
- ✅ Frontend: S3 + CloudFront
- ✅ Database: MongoDB Atlas (free tier)

## 📋 Manual Deployment Steps

For detailed instructions, see:
- **[SERVERLESS_DEPLOYMENT_GUIDE.md](SERVERLESS_DEPLOYMENT_GUIDE.md)** - Complete AWS deployment guide
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Alternative deployment options

## 🏗️ Architecture

### Serverless Architecture (Recommended)
```
Frontend (React) → S3 + CloudFront
Backend (Express) → Lambda + API Gateway
Database → MongoDB Atlas
```

### Features
- 📊 GPA Calculator
- 🏪 Marketplace for buying/selling
- 👨‍🏫 Faculty Reviews & Ratings
- 💬 Anonymous Forum with voting
- 📅 FFCS Timetable Integration
- 📧 Email notifications
- 🔒 JWT Authentication
- 📱 Responsive design

## 🛠️ Development

### Local Setup
```bash
# Install dependencies
npm run install-all

# Start development servers
npm run dev
```

### Environment Variables
```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Security
JWT_SECRET=your-secret
ADMIN_SECRET=admin-secret

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=app-password
```

## 📊 Cost Analysis

| Component | Free Tier | Your Usage | Cost/Year |
|-----------|-----------|------------|-----------|
| AWS Lambda | 1M requests | ~50k/month | $0-8 |
| API Gateway | 1M requests | ~50k/month | $0-3 |
| S3 Storage | 5GB | ~1GB | $0-1 |
| CloudFront | 1TB transfer | ~50GB | $0-2 |
| MongoDB Atlas | 512MB | Your data | $0-9 |
| **Total** | | | **$3-15** |

## 🔧 Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build frontend
- `./deploy.sh` - Deploy to AWS
- `cd server && serverless deploy` - Deploy backend only

## 📝 API Documentation

### Health Check
```
GET /api/health
```

### GPA Calculator
```
POST /api/gpa/calculate
```

### Marketplace
```
GET /api/marketplace/items
POST /api/marketplace/items
```

### Reviews
```
GET /api/reviews
POST /api/reviews
```

### Forum
```
GET /api/forum/questions
POST /api/forum/questions
```

### Timetable
```
GET /api/timetable
POST /api/timetable
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- 📧 Email: your-email@example.com
- 📖 Docs: [SERVERLESS_DEPLOYMENT_GUIDE.md](SERVERLESS_DEPLOYMENT_GUIDE.md)
- 🐛 Issues: GitHub Issues

---

**Happy coding! 🎉**