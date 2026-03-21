# Vaultify AI Tagger — Lambda Deployment Guide

## Overview

This Lambda function watches your S3 bucket for new uploads, sends each image to **Amazon Rekognition** for label detection, and POSTs the results back to the Vaultify API so tags appear instantly on the dashboard.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| AWS Account | With permissions for Lambda, S3, Rekognition |
| Node.js 18+ | Locally, for `npm install` |
| Vaultify API | Running and accessible (public URL or VPC) |

---

## 1. Install Dependencies

```bash
cd aws-lambda-tagger
npm install
```

## 2. Create the Deployment Zip

```bash
# From inside aws-lambda-tagger/
zip -r ../vaultify-ai-tagger.zip .
```

> **Windows (PowerShell):**
> ```powershell
> Compress-Archive -Path .\* -DestinationPath ..\vaultify-ai-tagger.zip
> ```

## 3. Create the Lambda Function

1. Open **AWS Console → Lambda → Create function**
2. Choose **Author from scratch**
3. Settings:
   - **Function name:** `vaultify-ai-tagger`
   - **Runtime:** Node.js 18.x (or 20.x)
   - **Architecture:** x86_64
   - **Handler:** `index.handler`
4. Click **Create function**

## 4. Upload the Zip

1. In the Lambda function page, click **Upload from → .zip file**
2. Select the `vaultify-ai-tagger.zip` you created
3. Click **Save**

## 5. Set Environment Variables

Go to **Configuration → Environment variables** and add:

| Variable | Value | Example |
|----------|-------|---------|
| `VAULTIFY_API_URL` | Your Vaultify API base URL | `https://xxxx.ngrok-free.app` |
| `VAULTIFY_API_KEY` | Must match `VAULTIFY_API_KEY` in `.env` | `your_random_key` |
| `REKOGNITION_MAX` | Maximum labels to return | `10` |
| `REKOGNITION_MIN_CONF` | Minimum confidence % | `70` |

## 6. Configure IAM Permissions

The Lambda execution role needs these policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectLabels"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

Replace `YOUR-BUCKET-NAME` with your actual S3 bucket name.

## 7. Add the S3 Trigger

1. In the Lambda function page, click **Add trigger**
2. Select **S3**
3. Configure:
   - **Bucket:** your Vaultify user bucket
   - **Event types:** `s3:ObjectCreated:*`
   - **Prefix:** `uploads/` (recommended — avoids triggering on non-upload objects)
   - **Suffix:** `.jpg` (optional — add multiple triggers for `.png`, `.webp`, etc.)
4. Acknowledge the recursive invocation warning
5. Click **Add**

## 8. Adjust Timeout & Memory

Go to **Configuration → General configuration**:
- **Timeout:** 30 seconds (Rekognition + API call)
- **Memory:** 256 MB (sufficient for image metadata processing)

---

## Testing

### Test with a Sample Event

In the Lambda console, create a test event using the **S3 Put** template:

```json
{
  "Records": [
    {
      "s3": {
        "bucket": { "name": "your-bucket-name" },
        "object": {
          "key": "uploads/test-image.jpg",
          "size": 1024000
        }
      }
    }
  ]
}
```

### Check CloudWatch Logs

Go to **CloudWatch → Log groups → /aws/lambda/vaultify-ai-tagger** to see:
- `🔍 Calling Rekognition…` — label detection calls
- `✅ Rekognition returned N labels` — successful detections
- `📡 Posting tags to…` — API communication
- `❌ FAILED processing…` — full error details for debugging

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `AccessDenied` on Rekognition | Add `rekognition:DetectLabels` to the Lambda role |
| `AccessDenied` on S3 | Add `s3:GetObject` for the bucket ARN |
| API returns 401/403 | Check `VAULTIFY_API_KEY` is a valid token |
| Timeout errors | Increase Lambda timeout to 60s |
| Function not triggering | Verify S3 event notification is enabled and prefix matches |
| Rekognition ENOTFOUND | Rekognition may not be available in your region — set `REKOGNITION_REGION=ap-south-1` in Lambda env vars |

---

## Local Development with ngrok

For local testing, use **ngrok** to expose your backend to Lambda:

```bash
ngrok http 5000
```

Copy the `https://xxxx.ngrok-free.app` URL and set it as `VAULTIFY_API_URL` in Lambda env vars.

> ⚠️ The ngrok URL changes each time you restart (free plan). Update the Lambda env var accordingly.

Monitor incoming requests at `http://127.0.0.1:4040`.
