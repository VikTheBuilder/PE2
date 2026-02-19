# AWS S3 Storage Classes Integration

This document explains how SkyCrate automatically optimizes AWS S3 storage costs by using different storage classes based on file characteristics.

## 🎯 What This Does

When users upload files, SkyCrate automatically selects the most cost-effective AWS S3 storage class based on:
- **File type** (images, videos, archives, etc.)
- **File size** (large files get different treatment)
- **Expected access patterns** (frequent vs infrequent access)

## 💰 Storage Classes & Costs

| Storage Class | Cost/GB/Month | Best For | Retrieval Time |
|---------------|---------------|----------|----------------|
| **INTELLIGENT_TIERING** | $0.0125 | Automatic optimization | Immediate |
| **STANDARD** | $0.023 | Frequently accessed files | Immediate |
| **STANDARD_IA** | $0.0125 | Large, infrequently accessed files | Immediate |
| **ONEZONE_IA** | $0.01 | Non-critical, infrequent access | Immediate |
| **GLACIER_IR** | $0.004 | Archive with instant retrieval | Immediate |
| **GLACIER** | $0.0036 | Long-term archive | 1-5 minutes |
| **DEEP_ARCHIVE** | $0.00099 | Long-term backup | 12 hours |

## 🤖 Intelligent Tiering Storage Class

### What is Intelligent Tiering?
**INTELLIGENT_TIERING** is AWS's most advanced storage class that automatically optimizes costs by moving your files between different access tiers based on changing access patterns. No manual intervention required!

### How It Works
- **Frequent Access**: Files accessed regularly stay in the Frequent Access tier (same cost as Standard)
- **Infrequent Access**: Files not accessed for 30+ days move to Infrequent Access tier (same cost as Standard-IA)
- **Archive Instant**: Files not accessed for 90+ days move to Archive Instant tier (same cost as Glacier Instant Retrieval)
- **Archive Access**: Files not accessed for 1+ year move to Archive Access tier (same cost as Glacier)
- **Deep Archive**: Files not accessed for 2+ years move to Deep Archive Access tier (same cost as Deep Archive)

### Benefits
- **Automatic Optimization**: AWS handles all tier movements based on your actual usage patterns
- **No Retrieval Fees**: Unlike other storage classes, Intelligent Tiering has no retrieval fees
- **Monitoring Fees**: Small monthly monitoring fee ($0.0025/1,000 objects) for the automation
- **Cost Effective**: Automatically saves money for files with unpredictable access patterns

### SkyCrate Integration
- **30% Service Margin**: We add value through simplified interface and support
- **SkyCrate Price**: $0.01625/GB/month ($0.0125 base + 30% margin)
- **Automatic Selection**: Recommended for users who want "set it and forget it" storage

## 🤖 Automatic Optimization Logic

### File Size Based
- **Files > 100MB**: Automatically use `STANDARD_IA` for cost savings
- **Files < 100MB**: Use `STANDARD` for frequent access

### File Type Based
- **Images/Videos/PDFs**: Use `STANDARD` (frequently accessed)
- **Archive files** (.zip, .rar, .tar): Use `GLACIER` (long-term storage)
- **Backup files** (.bak, .backup): Use `GLACIER_IR` (instant retrieval archives)
- **Other files**: Default to `STANDARD`

## 📊 Cost Analysis Features

### Real-time Cost Estimation
Every uploaded file shows:
```json
{
  "storageClass": "STANDARD_IA",
  "estimatedMonthlyCost": 0.0045
}
```

### Storage Cost Analysis Endpoint
Get detailed cost breakdown for your files:
```bash
GET /api/storage/cost-analysis
```

Response:
```json
{
  "totalFiles": 25,
  "totalSize": 1073741824,
  "totalMonthlyCost": 12.45,
  "storageClassBreakdown": {
    "STANDARD": {
      "count": 15,
      "totalSize": 524288000,
      "totalCost": 8.20
    },
    "STANDARD_IA": {
      "count": 8,
      "totalSize": 419430400,
      "totalCost": 3.50
    },
    "GLACIER": {
      "count": 2,
      "totalSize": 130023424,
      "totalCost": 0.75
    }
  },
  "recommendations": [
    "Consider moving large, infrequently accessed files to Glacier storage class",
    "Large files in Standard storage could be moved to Standard-IA for cost savings"
  ]
}
```

## 🚀 How It Works

### 1. File Upload Process
```javascript
// Automatic storage class selection
const optimalStorageClass = getOptimalStorageClass(mimetype, size);
const estimatedMonthlyCost = getStorageClassCost(optimalStorageClass) * (size / (1024 * 1024 * 1024));

// Upload with optimized storage class
const uploadParams = {
  Bucket: userBucket,
  Key: s3Key,
  Body: fileBuffer,
  StorageClass: optimalStorageClass,  // 🎯 Automatic optimization
  ServerSideEncryption: 'AES256'
};
```

### 2. Cost Tracking
Every file stores:
- `storageClass`: The S3 storage class used
- `estimatedMonthlyCost`: Calculated monthly cost
- File metadata for future optimization

### 3. User Benefits
- **Automatic cost optimization** - no manual configuration needed
- **Real-time cost visibility** - see costs for each file
- **Smart recommendations** - get suggestions to save more money
- **Transparent pricing** - understand exactly what you're paying for

## 📈 Cost Savings Examples

### Example 1: Large Video Files
- **Before**: 1GB video in STANDARD = $0.023/month
- **After**: 1GB video in STANDARD_IA = $0.0125/month
- **Savings**: 46% cost reduction

### Example 2: Archive Files
- **Before**: 5GB backup in STANDARD = $0.115/month
- **After**: 5GB backup in GLACIER = $0.018/month
- **Savings**: 84% cost reduction

### Example 3: Mixed Workload (100GB total)
- **Before**: All files in STANDARD = $2.30/month
- **After**: Optimized storage classes = $1.20/month
- **Savings**: 48% cost reduction

## 🔧 Configuration

The system works automatically, but you can customize the logic by modifying:

```javascript
// In server/index.js
const getOptimalStorageClass = (fileType, fileSize) => {
  // Customize your optimization logic here
  const sizeInMB = fileSize / (1024 * 1024);
  
  if (sizeInMB > 100) return 'STANDARD_IA';
  if (fileType.includes('zip')) return 'GLACIER';
  // ... your custom rules
  
  return 'STANDARD';
};
```

## 📊 Monitoring & Analytics

### View Your Savings
```bash
# Get cost analysis
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/storage/cost-analysis
```

### File List with Costs
```bash
# Get files with storage class info
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/files
```

Each file response includes:
```json
{
  "id": "file-123",
  "originalName": "video.mp4",
  "fileSize": 104857600,
  "storageClass": "STANDARD_IA",
  "estimatedMonthlyCost": 0.0125,
  "uploadDate": "2024-01-15T10:30:00Z"
}
```

## 🎯 Best Practices

### For Maximum Savings:
1. **Large files** (>100MB) automatically get cost-optimized storage
2. **Archive files** are stored in Glacier for 84% cost savings
3. **Backup files** use Glacier Instant Retrieval for immediate access at low cost
4. **Frequently accessed files** stay in Standard for performance

### Monitoring:
- Check `/api/storage/cost-analysis` regularly for optimization opportunities
- Review storage class distribution in your dashboard
- Act on cost-saving recommendations

## 🚨 Important Notes

### Retrieval Costs
- **Glacier**: Small retrieval fees apply (but huge storage savings)
- **Standard-IA**: Retrieval fees for frequent access
- **Standard**: No retrieval fees

### Minimum Storage Duration
- **Standard-IA**: 30 days minimum
- **Glacier**: 90 days minimum
- **Deep Archive**: 180 days minimum

### Transition Timing
Files are assigned optimal storage class at upload time. For existing files, consider implementing lifecycle policies.

---

**🎉 Result**: Your SkyCrate application now automatically optimizes AWS S3 costs, potentially saving 40-80% on storage expenses while maintaining performance for frequently accessed files!