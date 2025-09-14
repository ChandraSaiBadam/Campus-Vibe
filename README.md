# Campus Vibe

A comprehensive campus platform with GPA calculator, marketplace, faculty reviews, anonymous forum, and timetable features.

## 🚀 Quick Deployment (Cost-Optimized AWS Serverless)

**Cost: $0.95-$5/month** - Handles 2000 concurrent users, 300 average users

### Prerequisites

- AWS Account with CLI configured
- MongoDB Atlas account (free tier)
- Node.js 18+ installed
- Email for monitoring alerts

### One-Command Deployment

```bash
# 1. Clone and setup
git clone <your-repo>
cd campus-vibe

# 2. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and secrets

# 3. Deploy everything with monitoring
./scripts/deploy-complete.sh -m admin@example.com
```

That's it! Your app will be live on AWS with:

- ✅ Backend: Lambda + API Gateway (cost-optimized)
- ✅ Frontend: S3 + CloudFront (global CDN)
- ✅ Database: MongoDB Atlas (free tier)
- ✅ Monitoring: CloudWatch + Cost Alerts
- ✅ Security: HTTPS, CORS, Rate limiting

## 📋 Manual Deployment Steps

For detailed instructions, see:

- **[COMPREHENSIVE_DEPLOYMENT_GUIDE.md](COMPREHENSIVE_DEPLOYMENT_GUIDE.md)** - Complete deployment guide with monitoring
- **[SERVERLESS_DEPLOYMENT_GUIDE.md](SERVERLESS_DEPLOYMENT_GUIDE.md)** - Basic AWS serverless deployment
- **[S3_CLOUDFRONT_DEPLOYMENT_GUIDE.md](S3_CLOUDFRONT_DEPLOYMENT_GUIDE.md)** - Frontend deployment details
- **[MONITORING_SETUP_GUIDE.md](MONITORING_SETUP_GUIDE.md)** - Monitoring and cost tracking
- **[TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)** - Common issues and solutions
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Traditional deployment options

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

## 📊 Cost Analysis (Optimized)

| Component     | Free Tier     | Your Usage | Cost/Month   | Cost/Year      |
| ------------- | ------------- | ---------- | ------------ | -------------- |
| AWS Lambda    | 1M requests   | ~50k/month | $0-0.50      | $0-6           |
| API Gateway   | 1M requests   | ~50k/month | $0-0.20      | $0-2.40        |
| S3 Storage    | 5GB           | ~1GB       | $0.02        | $0.24          |
| CloudFront    | 1TB transfer  | ~50GB      | $0.08        | $0.96          |
| CloudWatch    | Basic metrics | Monitoring | $0.15        | $1.80          |
| MongoDB Atlas | 512MB         | Your data  | $0-9         | $0-108         |
| **Total**     |               |            | **$0.95-$5** | **$11.40-$60** |

### Cost Monitoring

```bash
# Real-time cost analysis
./scripts/analyze-costs.sh --detailed --recommendations

# Monitor frontend costs
cd client && npm run monitor:costs:detailed
```

## 🔧 Scripts

### Development

- `npm run dev` - Start development servers
- `npm run build` - Build frontend

### Deployment

- `./scripts/deploy-complete.sh -m admin@example.com` - Complete deployment with monitoring
- `./scripts/deploy-lambda.sh` - Deploy backend only
- `./scripts/deploy-s3-cloudfront.sh` - Deploy frontend only
- `./scripts/deploy-monitoring.sh` - Deploy monitoring only

### Monitoring & Maintenance

- `./scripts/analyze-costs.sh --detailed` - Analyze AWS costs
- `./scripts/quick-deploy-frontend.sh` - Quick frontend update
- `./test-deployment.js` - Validate deployment
- `cd server && npm run analyze:costs` - Backend cost analysis
- `cd client && npm run monitor:costs` - Frontend cost analysis

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
