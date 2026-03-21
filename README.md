<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/AWS-S3%20%7C%20EC2%20%7C%20Rekognition%20%7C%20Lambda-FF9900?logo=amazonaws&logoColor=white" alt="AWS" />
</p>

# ☁️ Vaultify — Cloud Infrastructure Platform

A full-stack cloud platform for **file storage**, **compute management**, and **AI-powered image tagging** — built with React, Node.js, and AWS.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **☁️ S3 Storage** | Upload, download, share, and organize files in isolated S3 buckets |
| **🖥️ EC2 Compute** | Launch and terminate EC2 instances from the dashboard |
| **🤖 AI Tagging** | Auto-tag images using Amazon Rekognition via a Lambda pipeline |
| **💰 Billing** | Real-time cost tracking with 30% margin over AWS costs |
| **🔐 Auth** | JWT-based registration and login with per-user bucket isolation |
| **🌙 Theme** | Aurora dark theme with glassmorphism UI and light/dark toggle |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React Frontend (:3000)                                  │
│  Landing Page → Login/Register → Dashboard               │
│  Storage │ Compute │ AI Tags │ Billing                   │
└──────────────┬───────────────────────────────────────────┘
               │ REST API
┌──────────────▼───────────────────────────────────────────┐
│  Express Backend (:5000)                                 │
│  /api/auth │ /api/files │ /api/compute │ /api/billing    │
└──────┬────────────┬────────────┬─────────────────────────┘
       │            │            │
  ┌────▼───┐   ┌────▼───┐   ┌───▼────┐
  │ AWS S3 │   │ AWS EC2│   │Rekognit│
  │ Storage│   │Compute │   │  ion   │
  └────────┘   └────────┘   └───▲────┘
                                │
                     ┌──────────┴──────────┐
                     │  AWS Lambda         │
                     │  (Auto AI Tagger)   │
                     │  S3 trigger → Rekog │
                     │  → POST tags back   │
                     └─────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **AWS Account** with IAM credentials (S3, EC2, Rekognition access)
- **ngrok** (for Lambda → local backend tunnel)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/vaultify.git
cd vaultify
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your AWS credentials:
```env
JWT_SECRET=your_random_secret
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
EC2_DEFAULT_AMI=ami-xxxxxxxxx    # Amazon Linux 2023 AMI for your region
VAULTIFY_API_KEY=your_lambda_key
```

### 3. Run
```bash
# Terminal 1 — Backend
npm run server

# Terminal 2 — Frontend
npm start

# Terminal 3 — ngrok tunnel (for Lambda callbacks)
ngrok http 5000
```

Open **http://localhost:3000** → Register → Start using!

---

## 📂 Project Structure

```
vaultify/
├── src/                        # React Frontend
│   ├── components/
│   │   ├── LandingPage.js      # Aurora-themed landing page
│   │   ├── Dashboard.js        # Main dashboard with sidebar
│   │   ├── Storage.js          # S3 file manager (upload/download/share)
│   │   ├── ComputeManager.js   # EC2 instance management
│   │   ├── AITagsView.js       # Rekognition AI tags viewer
│   │   ├── DashboardBilling.js # Usage & cost analytics
│   │   ├── Login.js            # Authentication
│   │   └── Register.js         # User registration
│   ├── services/api.js         # Axios API client
│   └── contexts/               # Theme & notification providers
│
├── server/                     # Express Backend
│   ├── app.js                  # Server entry point
│   ├── config/environment.js   # Centralized config
│   ├── middleware/auth.js      # JWT authentication
│   ├── routes/
│   │   ├── auth.js             # Register/login endpoints
│   │   ├── files.js            # File CRUD + AI tag update
│   │   ├── compute.js          # EC2 launch/list/terminate
│   │   ├── billing.js          # Cost calculations
│   │   └── storage.js          # Storage stats & recommendations
│   ├── services/
│   │   ├── awsService.js       # S3 + Rekognition SDK client
│   │   └── ec2Service.js       # EC2 operations
│   └── models/                 # JSON-based data models
│
├── aws-lambda-tagger/          # Lambda function (deploy separately)
│   ├── index.js                # S3 trigger → Rekognition → POST tags
│   ├── package.json
│   └── README-LAMBDA.md        # Lambda deployment guide
│
├── .env.example                # Environment template
├── .gitignore
└── README.md
```

---

## 🤖 Lambda AI Tagger Setup

The Lambda function auto-tags uploaded images using Rekognition. See [`aws-lambda-tagger/README-LAMBDA.md`](aws-lambda-tagger/README-LAMBDA.md) for full deployment instructions.

**Quick summary:**
1. `cd aws-lambda-tagger && npm install`
2. Zip the folder contents and upload to AWS Lambda
3. Set Lambda env vars: `VAULTIFY_API_URL` (ngrok URL), `VAULTIFY_API_KEY`
4. Add S3 trigger on your bucket → `s3:ObjectCreated:*`
5. Attach `AmazonRekognitionReadOnlyAccess` + `AmazonS3ReadOnlyAccess` policies to the Lambda role

> **Note:** If your S3 bucket is in a region where Rekognition is unavailable (e.g. `ap-south-2`), the Lambda uses `ap-south-1` for Rekognition calls.

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account + S3 bucket |
| POST | `/api/auth/login` | Login, returns JWT |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file to S3 |
| GET | `/api/files` | List user's files |
| DELETE | `/api/files/:id` | Delete file |
| POST | `/api/files/tags/update` | Lambda callback for AI tags |

### Compute
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/compute` | List user's EC2 instances |
| POST | `/api/compute/launch` | Launch t3.micro instance |
| DELETE | `/api/compute/:id` | Terminate instance |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing/usage` | Current month usage |
| GET | `/api/billing/current` | Real-time costs |
| GET | `/api/billing/history` | Billing history |

---

## 🛠️ Tech Stack

- **Frontend:** React 18, CSS3 (glassmorphism), React Router, Axios
- **Backend:** Node.js, Express, JWT, bcrypt
- **Cloud:** AWS S3, EC2, Rekognition, Lambda
- **Fonts:** Space Grotesk (landing), Inter (dashboard)
- **Tunnel:** ngrok (Lambda → local dev)

---

## 📝 License

MIT

---

<p align="center"><b>Vaultify</b> — Cloud infrastructure, simplified. ☁️</p>