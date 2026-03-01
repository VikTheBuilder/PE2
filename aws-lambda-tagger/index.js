/**
 * Vaultify AI Tagger — AWS Lambda Function
 * ─────────────────────────────────────────
 * Runtime  : Node.js 18.x+
 * Trigger  : S3 ObjectCreated events
 * Purpose  : Detects image labels via Amazon Rekognition and
 *            POSTs them back to the Vaultify API.
 *
 * Environment Variables (set in Lambda console):
 *   VAULTIFY_API_URL    – e.g. https://your-api.example.com
 *   VAULTIFY_API_KEY    – bearer token for authenticating with Vaultify
 *   REKOGNITION_MAX     – max labels to return (default 10)
 *   REKOGNITION_MIN_CONF – minimum confidence % (default 70)
 */

import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import axios from 'axios';

// ── Clients & Config ────────────────────────────────────────
const rekognition = new RekognitionClient({});

const API_URL = process.env.VAULTIFY_API_URL || 'http://localhost:5000';
const API_KEY = process.env.VAULTIFY_API_KEY || '';
const MAX_LABELS = parseInt(process.env.REKOGNITION_MAX, 10) || 10;
const MIN_CONFIDENCE = parseFloat(process.env.REKOGNITION_MIN_CONF) || 70;

// Only process these MIME prefixes
const IMAGE_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff', '.tif'
]);

// ── Helpers ─────────────────────────────────────────────────
const isImage = (key) => {
    const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
};

const sanitiseKey = (raw) =>
    decodeURIComponent(raw.replace(/\+/g, ' '));

// ── Handler ─────────────────────────────────────────────────
export const handler = async (event) => {
    console.log('🚀 Lambda triggered — processing S3 event');
    console.log('Event payload:', JSON.stringify(event, null, 2));

    const results = [];

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = sanitiseKey(record.s3.object.key);
        const size = record.s3.object.size;

        console.log(`\n📦 Processing: s3://${bucket}/${key}  (${size} bytes)`);

        // ── Skip non-image files ──
        if (!isImage(key)) {
            console.log('⏭️  Skipping — not an image file');
            results.push({ key, skipped: true, reason: 'not_image' });
            continue;
        }

        try {
            // ── 1) Call Rekognition ──────────────────────────────
            console.log(`🔍 Calling Rekognition (max=${MAX_LABELS}, minConf=${MIN_CONFIDENCE}%)…`);

            const detectResponse = await rekognition.send(
                new DetectLabelsCommand({
                    Image: {
                        S3Object: { Bucket: bucket, Name: key }
                    },
                    MaxLabels: MAX_LABELS,
                    MinConfidence: MIN_CONFIDENCE
                })
            );

            const labels = (detectResponse.Labels || []).map((l) => ({
                Name: l.Name,
                Confidence: Math.round(l.Confidence * 10) / 10
            }));

            console.log(`✅ Rekognition returned ${labels.length} labels:`);
            labels.forEach((l) => console.log(`   • ${l.Name} (${l.Confidence}%)`));

            // ── 2) POST labels to Vaultify API ──────────────────
            const payload = {
                s3Key: key,
                labels
            };

            const endpoint = `${API_URL}/api/files/tags/update`;
            console.log(`📡 Posting tags to ${endpoint}…`);

            const apiResponse = await axios.post(endpoint, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {})
                },
                timeout: 10_000
            });

            console.log(`✅ API responded ${apiResponse.status}:`, JSON.stringify(apiResponse.data));

            results.push({ key, labels: labels.length, status: apiResponse.status });

        } catch (err) {
            // ── Structured error logging for CloudWatch ─────────
            console.error(`❌ FAILED processing s3://${bucket}/${key}`);
            console.error('Error name   :', err.name);
            console.error('Error message:', err.message);

            if (err.response) {
                // Axios HTTP error
                console.error('HTTP status  :', err.response.status);
                console.error('Response body:', JSON.stringify(err.response.data));
            }

            if (err.$metadata) {
                // AWS SDK error
                console.error('AWS request ID:', err.$metadata.requestId);
                console.error('HTTP status   :', err.$metadata.httpStatusCode);
            }

            console.error('Full stack:', err.stack);

            results.push({ key, error: err.message });
        }
    }

    console.log('\n🏁 Lambda execution complete');
    console.log('Results:', JSON.stringify(results, null, 2));

    return {
        statusCode: 200,
        body: JSON.stringify({ processed: results.length, results })
    };
};
