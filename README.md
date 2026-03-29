<div align="center">

# VAULTIFY

### **Cloud Infrastructure Platform — Storage · Compute · AI**

[![Stars](https://img.shields.io/github/stars/VikTheBuilder/PE2?style=for-the-badge&logo=github&color=2DD4BF)](https://github.com/VikTheBuilder/PE2/stargazers)
[![Forks](https://img.shields.io/github/forks/VikTheBuilder/PE2?style=for-the-badge&logo=github&color=3B82F6)](https://github.com/VikTheBuilder/PE2/network)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![AWS](https://img.shields.io/badge/AWS-S3%20|%20EC2%20|%20Lambda%20|%20Rekognition-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)](https://aws.amazon.com)

*A production-grade cloud platform that combines object storage, virtual compute, and AI-powered image analysis — all behind a unified dashboard with pay-as-you-go billing.*

</div>

---

## Project Overview

**Vaultify** is a full-stack cloud infrastructure platform built as a comprehensive demonstration of modern cloud-native architecture. It integrates four core AWS services — **S3**, **EC2**, **Lambda**, and **Rekognition** — behind a React-based dashboard with JWT authentication, real-time billing analytics, and an Aurora-themed UI.

The platform abstracts away the complexity of raw AWS APIs and provides users with:
- **Isolated S3 storage** with drag-and-drop file management, storage class selection, file sharing via pre-signed URLs, and version history
- **On-demand EC2 compute** with SSH access (auto-provisioned key pairs and security groups)
- **Automatic AI tagging** powered by a serverless Lambda ↔ Rekognition pipeline
- **Transparent billing** with usage tracking and a configurable profit margin

> **Why Vaultify?** — This project demonstrates mastery of full-stack development, cloud service integration, event-driven architecture (S3 triggers), and Infrastructure-as-a-Service principles — all in a single, cohesive application.

---

##  Key Features

| Category | Feature | Description |
|----------|---------|-------------|
| ☁️ **Storage** | S3 File Manager | Upload, download, delete, and organize files in per-user S3 buckets |
| | Storage Classes | Choose between 7 AWS storage tiers (Standard, IA, Glacier, Deep Archive, etc.) with cost comparisons |
| | File Sharing | Generate expiring pre-signed URLs to share files securely |
| | Version History | Track and restore previous versions of uploaded files |
| | Drag & Drop | React Dropzone-powered uploads with progress tracking |
| 🖥️ **Compute** | EC2 Management | Launch, monitor, and terminate `t3.micro` instances from the dashboard |
| | SSH Access | Auto-generated key pairs and security groups — download PEM and SSH in |
| | System Health | Real-time instance status checks via `DescribeInstanceStatus` API |
| | Live Logs | Server-side event logger tracks launches, terminations, and errors |
| 🤖 **AI** | Auto Tagging | Lambda function triggers on S3 upload → Rekognition detects labels → tags POSTed back |
| | Label Viewer | Dedicated AI Tags view shows detected labels with confidence percentages |
| | Multi-Region | Supports cross-region Rekognition when not available in the S3 region |
| 💰 **Billing** | Usage Tracking | Real-time storage, request, and data transfer cost analytics |
| | Margin Config | Configurable markup (default 30%) over AWS costs |
| | Billing History | Monthly breakdowns with cost projections |
| 🔐 **Auth** | JWT Security | Token-based authentication with bcrypt password hashing |
| | Per-User Isolation | Each user gets their own S3 bucket, tagged EC2 instances, and billing records |
| 🎨 **UI** | Aurora Theme | Glassmorphism dark theme with teal/blue gradients and micro-animations |
| | Responsive | Fully responsive layout with mobile-optimized sidebar navigation |

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (:3000)                       │
│                                                                     │
│  LandingPage ─→ Login/Register ─→ Dashboard (Sidebar Navigation)    │
│                                    ├── Storage Manager              │
│                                    ├── Compute Manager              │
│                                    ├── AI Tags Viewer               │
│                                    ├── Billing Analytics            │
│                                    ├── Share Modal                  │
│                                    └── Version History              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ Axios HTTP (JWT Bearer Token)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXPRESS BACKEND (:5000)                         │
│                                                                     │
│  Middleware: JWT Auth │ Helmet │ CORS │ Rate Limiter │ Multer       │
│                                                                     │
│  Routes:  /api/auth      → Register, Login, Profile                 │
│           /api/files     → Upload, Download, Delete, Tag Update     │
│           /api/compute   → Launch, List, Terminate, Health, Logs    │
│           /api/billing   → Usage, Current Costs, History            │
│           /api/storage   → Stats, Cost Analysis, Recommendations    │
│           /api/shared    → Create Share Links, List Shared Files    │
│           /api/versions  → Version List, Restore, Compare           │
│           /api/folders   → Create, List, Move Files                 │
│                                                                     │
│  Services: awsService.js │ ec2Service.js │ billingService.js        │
│            storageService.js │ versionService.js                    │
│                                                                     │
│  Models:   User │ File │ Folder │ SharedFile │ Billing (JSON-based) │
└──────┬──────────────┬───────────────┬───────────────────────────────┘
       │              │               │
  ┌────▼─────┐   ┌────▼────┐    ┌─────▼───────┐
  │  AWS S3  │   │ AWS EC2 │    │   AWS       │
  │ Storage  │   │ Compute │    │ Rekognition │
  │          │   │         │    │             │
  │ Per-user │   │ t3.micro│    │ DetectLabels│
  │ buckets  │   │ SSH-ready│   │             │
  └────┬─────┘   └─────────┘    └─────▲───────┘
       │                               │
       │  S3 Event Notification        │ DetectLabels API
       │  (s3:ObjectCreated:*)         │
       ▼                               │
  ┌───────────────────────────────────────┐
  │         AWS LAMBDA FUNCTION           │
  │         (Vaultify-AI-Tagger)          │
  │                                       │
  │  S3 trigger → Download image bytes    │
  │  → Rekognition DetectLabels           │
  │  → POST tags to /api/files/tags/update│
  └───────────────────────────────────────┘
```

### Data Flow — AI Tagging Pipeline

```
User uploads image → Express saves to S3 (uploads/ prefix)
                     → S3 fires ObjectCreated event
                     → Lambda receives event payload
                     → Lambda calls Rekognition.DetectLabels
                     → Rekognition returns labels + confidence %
                     → Lambda POSTs tags to backend API (via ngrok/public URL)
                     → Backend saves tags to file metadata
                     → Frontend displays AI tags in dashboard
```

---

##  Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | Component-based SPA framework with hooks |
| **React Router** | 6.x | Client-side routing with protected/public route guards |
| **Axios** | 1.5.x | Promise-based HTTP client with JWT interceptors |
| **React Dropzone** | 14.x | Drag-and-drop file upload zone |
| **React Icons** | 4.x | Feather icon set (FiServer, FiKey, FiCopy, etc.) |
| **CSS3** | — | Custom glassmorphism design system with CSS variables |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | Server runtime |
| **Express** | 4.18.x | REST API framework |
| **JSON Web Token** | 9.x | Stateless authentication |
| **bcryptjs** | 2.4.x | Password hashing (10 salt rounds) |
| **Multer** | 1.4.x | Multipart file upload handling |
| **Helmet** | 7.x | Security headers |
| **express-rate-limit** | 7.x | API rate limiting |
| **dotenv** | 16.x | Environment variable loading |

### AWS Services

| Service | SDK Package | Purpose |
|---------|------------|---------|
| **S3** | `@aws-sdk/client-s3` | Object storage, bucket management, pre-signed URLs |
| **EC2** | `@aws-sdk/client-ec2` | Instance lifecycle, key pairs, security groups |
| **Lambda** | `@aws-sdk/client-lambda` | Function ARN lookup for S3 trigger attachment |
| **Rekognition** | `@aws-sdk/client-rekognition` | Image label detection (DetectLabels) |
| **CloudWatch Logs** | `@aws-sdk/client-cloudwatch-logs` | Log group access |

### Database

| Technology | Purpose |
|-----------|---------|
| **JSON Files** | Lightweight file-based persistence for users, files, billing, and folders |

> **Design Decision:** JSON-based storage was chosen intentionally for portability and zero-dependency deployment. The model layer (`server/models/`) abstracts read/write operations, making it trivial to swap in MongoDB, PostgreSQL, or DynamoDB later.

---

##  Directory Structure

```
vaultify/
│
├── src/                                # ─── React Frontend ───────────
│   ├── App.js                          # Root router (Protected/Public routes)
│   ├── App.css                         # Global styles
│   ├── index.js                        # React entry point
│   ├── index.css                       # CSS reset + design tokens
│   │
│   ├── components/
│   │   ├── LandingPage.js / .css       # Aurora-themed marketing page
│   │   ├── Login.js                    # JWT login form
│   │   ├── Register.js                 # Registration + bucket creation
│   │   ├── Auth.css                    # Shared auth styles
│   │   ├── Dashboard.js / .css         # Main layout with sidebar navigation
│   │   ├── Storage.js / .css           # S3 file manager (upload/download/share)
│   │   ├── StorageClassModal.js / .css # Storage tier selector with cost comparison
│   │   ├── ComputeManager.js / .css    # EC2 instance dashboard + SSH panel
│   │   ├── AITagsView.js              # Rekognition label viewer
│   │   ├── DashboardBilling.js / .css  # Billing analytics and cost tracking
│   │   ├── ShareModal.js / .css        # File sharing with expiring links
│   │   ├── VersionHistory.js / .css    # File version management
│   │   ├── LoadingScreen.js / .css     # Animated loading state
│   │   ├── NotificationContainer.js    # Toast notification system
│   │   └── NotificationTest.js         # Notification testing utility
│   │
│   ├── contexts/
│   │   ├── ThemeContext.js             # Dark/light theme provider
│   │   ├── NotificationContext.js      # Global toast notification state
│   │   └── SharedFilesContext.js       # Shared files state management
│   │
│   ├── services/
│   │   └── api.js                      # Axios client + all API methods
│   │
│   ├── styles/                         # Additional style modules
│   ├── utils/                          # Shared utility functions
│   └── tests/                          # Test files
│
├── server/                             # ─── Express Backend ──────────
│   ├── app.js                          # Express app entry + middleware setup
│   │
│   ├── config/
│   │   └── environment.js              # Centralized env var loading & validation
│   │
│   ├── middleware/
│   │   ├── auth.js                     # JWT token verification middleware
│   │   └── security.js                 # Helmet, CORS, rate limiter setup
│   │
│   ├── routes/
│   │   ├── auth.js                     # POST /register, /login
│   │   ├── files.js                    # File CRUD + AI tag update callback
│   │   ├── compute.js                  # EC2 lifecycle + health + SSH key download
│   │   ├── billing.js                  # Usage stats, current costs, history
│   │   ├── storage.js                  # Storage analytics & recommendations
│   │   ├── sharedFiles.js              # Share link creation & management
│   │   ├── versions.js                 # File versioning endpoints
│   │   └── folders.js                  # Folder CRUD
│   │
│   ├── services/
│   │   ├── awsService.js               # S3, Rekognition, Lambda SDK clients
│   │   ├── ec2Service.js               # EC2 ops + auto key pair/security group
│   │   ├── billingService.js           # Cost calculations with margin
│   │   ├── storageService.js           # Storage stats & class recommendations
│   │   └── versionService.js           # File version tracking
│   │
│   ├── models/
│   │   ├── User.js                     # User CRUD (JSON persistence)
│   │   ├── File.js                     # File metadata management
│   │   ├── Folder.js                   # Folder hierarchy
│   │   ├── SharedFile.js               # Shared link records
│   │   └── Billing.js                  # Usage tracking records
│   │
│   └── data/                           # Runtime data (gitignored)
│       ├── users.json
│       ├── files.json
│       ├── billing.json
│       └── keys/                       # SSH key pairs (gitignored)
│
├── aws-lambda-tagger/                  # ─── Lambda Function ──────────
│   ├── index.js                        # S3 event → Rekognition → POST tags
│   ├── package.json                    # Lambda dependencies (axios, aws-sdk)
│   └── README-LAMBDA.md               # Deployment guide
│
├── .env.example                        # Environment variable template
├── .gitignore                          # Comprehensive exclusions
├── package.json                        # Project dependencies & scripts
└── README.md                           # This file
```

---

##  Component Breakdown

### Frontend Components

| Component | File | Responsibility |
|-----------|------|---------------|
| **App** | `App.js` | Route definitions, `ProtectedRoute` (redirects to `/login` if no token), `PublicRoute` (redirects to `/dashboard` if logged in) |
| **LandingPage** | `LandingPage.js` | Marketing page with hero section, feature cards, stats counter, and CTA — uses Aurora gradient animations |
| **Dashboard** | `Dashboard.js` | Main layout shell with collapsible sidebar, active page routing (Storage, Compute, AI Tags, Billing), user profile section |
| **Storage** | `Storage.js` | Full-featured S3 file manager — drag-and-drop upload (via React Dropzone), file listing with sort/filter, download via pre-signed URLs, delete, share, version history, storage class selection |
| **ComputeManager** | `ComputeManager.js` | EC2 dashboard — launch/terminate instances, stats cards (running/stopped/total), SSH connection panel with copy-to-clipboard commands, PEM key download, live system health gauge, real-time event logs |
| **AITagsView** | `AITagsView.js` | Displays Rekognition-detected labels for uploaded images with confidence percentages |
| **DashboardBilling** | `DashboardBilling.js` | Usage analytics — storage, requests, data transfer costs, monthly history charts, cost projections |
| **ShareModal** | `ShareModal.js` | Modal for generating expiring pre-signed share URLs with configurable duration |
| **VersionHistory** | `VersionHistory.js` | File version timeline with restore capability |

### Backend Services

| Service | File | Responsibility |
|---------|------|---------------|
| **awsService** | `awsService.js` | Initializes all AWS SDK clients (S3, EC2, Rekognition, CloudWatch, Lambda). Handles bucket CRUD, file upload/delete, pre-signed URLs, Rekognition label detection, and **auto-attaches Lambda triggers on new buckets** |
| **ec2Service** | `ec2Service.js` | EC2 instance lifecycle with user-scoped tagging. **Auto-provisions** SSH key pairs (`vaultify-ssh-key.pem`) and security groups (port 22 open) on first launch. Includes real-time health checks via `DescribeInstanceStatus` and an in-memory event logger |
| **billingService** | `billingService.js` | Calculates real-time costs based on storage usage, request counts, and data transfer. Applies configurable margin (default 30%) |
| **storageService** | `storageService.js` | Aggregates storage analytics — total size, file counts per storage class, cost breakdowns, and intelligent class recommendations |
| **versionService** | `versionService.js` | Tracks file version history, enables restore to previous versions |

---

##  Prerequisites

| Software | Version | Required |
|----------|---------|----------|
| **Node.js** | 18.x or higher | ✅ |
| **npm** | 9.x or higher | ✅ |
| **AWS Account** | — | ✅ |
| **AWS IAM User** | With S3, EC2, Lambda, Rekognition access | ✅ |
| **ngrok** | Any version | Required for Lambda → local backend tunnel |
| **Git** | Any version | For cloning |

### Required AWS IAM Policies

Attach these managed policies to your IAM user:

- `AmazonS3FullAccess`
- `AmazonEC2FullAccess`
- `AmazonRekognitionReadOnlyAccess`
- `AWSLambda_ReadOnlyAccess`

---

##  Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/VikTheBuilder/PE2.git
cd PE2
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file:

```env
# ─── Server ──────────────────────────────────────────
PORT=5000
JWT_SECRET=change_this_to_a_random_secret

# ─── AWS Configuration ──────────────────────────────
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1

# ─── Development Mode ───────────────────────────────
DEV_MODE=false

# ─── AWS Lambda & EC2 ───────────────────────────────
AWS_LAMBDA_FUNCTION_NAME=Vaultify-AI-Tagger
EC2_DEFAULT_AMI=ami-xxxxxxxxxxxxxxxxx

# ─── Lambda ↔ Backend Auth ──────────────────────────
VAULTIFY_API_KEY=change_this_to_a_random_key

# ─── Billing ────────────────────────────────────────
SITE_MARGIN=30
```

### 4. Deploy the Lambda Function (optional — for AI tagging)

See the full guide: [`aws-lambda-tagger/README-LAMBDA.md`](aws-lambda-tagger/README-LAMBDA.md)

```bash
cd aws-lambda-tagger
npm install
# Zip and upload to AWS Lambda Console
```

Set Lambda environment variables:
| Variable | Value |
|----------|-------|
| `VAULTIFY_API_URL` | Your ngrok URL (e.g., `https://xxxx.ngrok-free.app`) |
| `VAULTIFY_API_KEY` | Must match `.env` VAULTIFY_API_KEY |

### 5. Start the Application

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

##  Usage

### Storage Management
```
Dashboard → Storage → Drag files to upload → Choose storage class
                   → Click file → Download / Share / View Versions
```

### EC2 Compute
```
Dashboard → Compute → "Launch Instance" → Enter name
                   → Wait for "Running" status → Download PEM key
                   → SSH: ssh -i vaultify-ssh-key.pem ec2-user@<IP>
```

### AI Tagging (automatic)
```
Upload any image → Lambda triggers automatically
                → Rekognition detects labels
                → Tags appear in AI Tags view
```

### Billing
```
Dashboard → Billing → View real-time costs
                   → Track monthly usage history
                   → Monitor storage class breakdowns
```

---

##  API Reference

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | `{username, email, password}` | Create account + S3 bucket |
| `POST` | `/api/auth/login` | `{email, password}` | Returns JWT token |

### File Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/files/upload` | Upload file (multipart/form-data) |
| `GET` | `/api/files` | List user's files |
| `DELETE` | `/api/files/:id` | Delete file from S3 + metadata |
| `POST` | `/api/files/tags/update` | Lambda callback — AI tag ingestion |

### Compute

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/compute` | List user's EC2 instances |
| `POST` | `/api/compute/launch` | Launch t3.micro instance |
| `DELETE` | `/api/compute/:instanceId` | Terminate instance |
| `GET` | `/api/compute/health` | Instance status checks |
| `GET` | `/api/compute/logs` | System event history |
| `GET` | `/api/compute/key` | Download SSH PEM key |

### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/billing/usage` | Current month usage stats |
| `GET` | `/api/billing/current` | Real-time cost calculation |
| `GET` | `/api/billing/history` | Monthly billing history |

### Storage Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/storage/stats` | Storage usage breakdown |
| `POST` | `/api/storage/recommendations` | Storage class suggestions |

### Sharing & Versions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shared-files` | Generate share link |
| `GET` | `/api/shared-files` | List shared files |
| `GET` | `/api/versions/:fileId` | Get version history |
| `POST` | `/api/versions/:fileId/restore` | Restore previous version |

---

##  Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT tokens with configurable expiry |
| **Password Storage** | bcrypt with 10 salt rounds |
| **API Security** | Helmet headers, CORS restrictions, rate limiting |
| **S3 Isolation** | Per-user buckets with `BlockPublicAccess` enabled |
| **EC2 Isolation** | User-scoped tags prevent cross-account termination |
| **Lambda Auth** | API key validation on tag update endpoint |
| **File Downloads** | Time-limited pre-signed URLs (1-hour default) |

---

## Future Roadmap

- [ ] **Database Migration** — Replace JSON files with MongoDB or PostgreSQL for production scalability
- [ ] **Real CloudWatch Metrics** — Integrate CloudWatch `GetMetricData` for actual CPU/memory monitoring
- [ ] **Multi-Region Support** — User-selectable deployment regions
- [ ] **File Previews** — In-browser preview for images, PDFs, and documents
- [ ] **Team Workspaces** — Shared buckets and role-based access control
- [ ] **CI/CD Pipeline** — GitHub Actions for automated testing and deployment
- [ ] **Docker Support** — Containerize frontend and backend for easy deployment
- [ ] **S3 Lifecycle Policies** — Automatic tier transitions based on access patterns
- [ ] **WebSocket Notifications** — Real-time push notifications for uploads and AI tagging
- [ ] **Cost Alerts** — Email/SMS alerts when usage exceeds configurable thresholds

---

## License

This project is licensed under the **group 89**.

---

<div align="center">


*Vaultify — Cloud infrastructure, simplified.*

</div>