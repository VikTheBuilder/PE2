# Storage Page - SkyCrate

## Overview
The Storage page provides comprehensive analytics and management for your cloud storage, showing detailed information about storage classes, file sizes, and costs.

## Features

### 1. Storage Overview Cards
- **Total Storage**: Shows total storage used across all storage classes
- **Total Files**: Displays the number of files stored
- **Monthly Cost**: Estimated monthly storage cost
- **Storage Classes**: Number of active storage classes in use

### 2. Storage Class Breakdown
Each storage class shows:
- **Storage Class Name**: Standard, Standard-IA, Glacier, etc.
- **Description**: What the storage class is best for
- **Cost**: Per GB per month pricing
- **File Count**: Number of files in that storage class
- **Total Size**: Combined size of all files in that storage class
- **Monthly Cost**: Total monthly cost for that storage class
- **View Files Button**: Click to see files in that specific storage class

### 3. File Management
- **Grid/List View**: Toggle between grid and list view modes
- **Search**: Search files by name
- **Filter by Storage Class**: View files from specific storage classes
- **Sort Options**: Sort by size, date, or name (ascending/descending)
- **File Information**: Each file shows:
  - File icon based on type
  - File name
  - File size
  - Upload date
  - Storage class badge
  - Monthly cost
  - Action buttons (star, download, share)

### 4. Storage Classes Available
- **INTELLIGENT_TIERING**: $0.016/GB/month - Automatic optimization based on access patterns
- **STANDARD**: $0.029/GB/month - Frequently accessed files
- **STANDARD_IA**: $0.017/GB/month - Infrequently accessed files
- **ONEZONE_IA**: $0.014/GB/month - Non-critical, infrequent access
- **GLACIER_IR**: $0.006/GB/month - Archive with instant retrieval
- **GLACIER**: $0.005/GB/month - Long-term archive
- **DEEP_ARCHIVE**: $0.002/GB/month - Long-term backup

## How to Access

1. **From Dashboard**: Click on "Storage" in the left sidebar
2. **Direct URL**: Navigate to `/storage` (requires authentication)

## Navigation

- **Back to Dashboard**: Click the "Back to Dashboard" button
- **Storage Class Filter**: Use the dropdown to filter files by storage class
- **View Files**: Click "View Files" on any storage class card to see files in that class

## Responsive Design

The storage page is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## API Endpoints

### GET /api/storage/stats
Returns comprehensive storage statistics including:
- Total files and storage
- Storage class breakdown
- File type breakdown
- Size breakdown
- Cost analysis

### GET /api/storage/cost-analysis
Returns detailed cost analysis with recommendations for optimization.

## Cost Optimization

The system automatically:
- Recommends optimal storage classes based on file characteristics
- Shows cost savings opportunities
- Provides recommendations for moving files to more cost-effective storage classes

## File Actions

- **Star**: Mark important files for quick access
- **Download**: Download files directly
- **Share**: Copy file sharing links
- **View Details**: See storage class and cost information

## Theme Support

The storage page supports both light and dark themes, automatically adapting to your system preference or manual selection.

## Security

- All endpoints require authentication
- Users can only access their own storage data
- File operations are restricted to authenticated users

## Performance

- Efficient data loading with pagination support
- Real-time cost calculations
- Optimized file filtering and sorting
- Responsive UI with smooth animations

---

**Note**: The storage page provides real-time data from your AWS S3 storage, showing actual usage patterns and costs to help you optimize your cloud storage strategy.
