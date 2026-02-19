# SkyCrate - Cloud Storage Platform

A modern cloud storage platform with **Pay-As-You-Go billing** built with React, Node.js, and AWS S3.

## 🚀 Features

- **💰 Pay-As-You-Go Billing** - Usage-based pricing with transparent costs
- **🔐 Secure Authentication** - JWT-based user system
- **☁️ AWS S3 Storage** - Reliable cloud storage with intelligent class selection
- **📱 Modern UI** - Responsive design with dark/light themes
- **📁 File Management** - Upload, download, organize, and share files
- **📊 Cost Analytics** - Real-time usage tracking and billing insights
- **🏪 Service Margin** - 30% markup over AWS costs for sustainable business

## 💰 Billing System

### How It Works
- Users get individual S3 buckets for isolated storage
- Real-time tracking of storage, requests, and data transfer
- Monthly billing with detailed breakdowns
- 30% margin over AWS costs for platform sustainability

### Pricing Structure
- **Storage**:
  - Intelligent Tiering: $0.016/GB/month (AWS Intelligent Tiering)
  - Lightning Fast: $0.029/GB/month (Standard)
  - Smart Saver: $0.017/GB/month (Standard-IA)
  - Budget Smart: $0.014/GB/month (OneZone-IA)
  - Archive Pro: $0.006/GB/month (Glacier Instant)
  - Deep Freeze: $0.005/GB/month (Glacier)
  - Vault Keeper: $0.002/GB/month (Deep Archive)
- **Requests**: $0.065/1K uploads, $0.005/1K downloads
- **Data Transfer**: $0.13/GB (first 10GB free monthly)
- **Archive Retrieval**: $0.052/GB (Flexible), $0.039/GB (Deep)

### Revenue Model
```
AWS Bill (your cost): $100
User Bills (with 30% margin): $130
Your Profit: $30
```

## 🛠️ Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
```

Edit `.env` file:
```env
# Server
PORT=5000
JWT_SECRET=your_secure_jwt_secret

# AWS Configuration  
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Development Mode (skip AWS costs during testing)
DEV_MODE=false

# Billing Configuration
SITE_MARGIN=30  # 30% markup over AWS costs
```

### 3. Start the Application
```bash
# Start backend server
npm run server

# Start frontend (in another terminal)
npm start
```

## 📂 Project Structure

```
skycrate/
├── src/                          # React Frontend
│   ├── components/
│   │   ├── DashboardBilling.js   # Pay-as-you-go billing UI
│   │   ├── Storage.js            # File management
│   │   └── ...
│   └── services/api.js           # API client
├── server/
│   ├── index.js                  # Express server with billing APIs
│   └── data/
│       ├── users.json            # User accounts
│       ├── files.json            # File metadata
│       └── billing.json          # Usage tracking
├── .env                          # Configuration (not in git)
└── README.md                     # This file
```

## 🔧 Tech Stack

**Frontend**
- React 18 with hooks
- Modern CSS with glassmorphism design
- React Icons for UI elements

**Backend**
- Node.js with Express
- JWT authentication
- AWS S3 SDK v3
- Real-time billing tracking

**Storage**
- AWS S3 with multiple storage classes
- Individual buckets per user
- Secure pre-signed URLs

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - User login

### File Management
- `POST /api/files/upload` - Upload files
- `GET /api/files` - List user files
- `DELETE /api/files/:id` - Delete files

### Billing (New)
- `GET /api/billing/usage` - Current month usage
- `GET /api/billing/history` - Billing history
- `GET /api/billing/current` - Real-time costs

### Storage Analytics
- `GET /api/storage/cost-analysis` - Cost breakdowns
- `POST /api/storage/recommendations` - Storage class suggestions

## 💡 Usage

1. **Register** - Create your account
2. **Upload** - Drag & drop files or browse
3. **Manage** - Organize in folders, star favorites
4. **Monitor** - Track usage and costs in billing dashboard
5. **Optimize** - Use recommended storage classes to save money

## 🏢 Business Model

This is a **SaaS platform** where:
- You pay AWS for actual usage
- Users pay you with a 30% markup
- You profit from the margin while providing value through:
  - Simple interface (no AWS complexity)
  - Usage analytics and cost optimization
  - Professional billing and invoicing
  - Customer support and platform maintenance

## ⚙️ Configuration

### Storage Classes
```env
SHOW_STORAGE_CLASS_OPTIONS=true      # Enable class selection
SHOW_STORAGE_RECOMMENDATIONS=true    # Smart suggestions
DEFAULT_STORAGE_CLASS=STANDARD       # Fallback option
```

### File Size Limits
```env
MAX_FILE_SIZE_BYTES=26214400        # 25MB default
```

### Billing Margin
```env
SITE_MARGIN=30                      # 30% markup over AWS costs
```

## 🚀 Deployment

1. **Build frontend**
   ```bash
   npm run build
   ```

2. **Set production environment**
   ```env
   NODE_ENV=production
   DEV_MODE=false
   ```

3. **Deploy to your hosting platform** (Heroku, DigitalOcean, AWS, etc.)

## 📊 Monitoring

- **Real-time costs** in the billing dashboard
- **Usage analytics** per storage class
- **Monthly projections** based on current usage
- **Cost optimization tips** for users

## 🔒 Security

- JWT token authentication
- Isolated S3 buckets per user
- Secure file uploads with validation
- Pre-signed URLs for downloads
- Password hashing with bcrypt

## 📚 Documentation

- `AWS_STORAGE_CLASSES.md` - Detailed storage class information
- `env.example` - All configuration options
- API documentation in server code comments

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📝 License

MIT License - see LICENSE file for details

---

**SkyCrate** - Simple cloud storage with transparent billing 🚀