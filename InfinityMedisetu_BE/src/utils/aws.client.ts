// src/utils/s3Client.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { envConfig } from './envConfig';

/**
 * Determine if we're in development environment
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Get credentials based on environment
 * - Development: Use explicit credentials from env
 * - Production: Return undefined to let SDK use default credential chain
 */
const getCredentials = () => {
  // Priority 1: Check for explicit credentials (works for both dev and prod if provided)
  const accessKeyId = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_TOKEN;
  const secretAccessKey =
    process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_TOKEN;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    const credentials: any = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    };

    // Add session token for temporary credentials (ASIA keys)
    if (sessionToken) {
      credentials.sessionToken = sessionToken.trim();
      // console.log('✅ Using temporary credentials with session token');
    } else {
      // console.log('✅ Using permanent credentials');
    }

    return credentials;
  }

  // Priority 2: Use default credential chain (IAM roles, etc.)
  // console.log('🔄 No explicit credentials found, using default credential chain');
  return undefined;
};

/**
 * Create a single S3Client instance
 */
export const s3Client = new S3Client({
  region: envConfig.AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
  credentials: getCredentials(),
  maxAttempts: 3,
});

// Log configuration on startup (only in development)
if (isDevelopment) {
  // console.log('🔧 S3 Client Configuration:');
  // console.log(`   Mode: ${getCredentials() ? 'Explicit credentials' : 'Default chain'}`);
  // console.log(`   Region: ${envConfig.AWS_REGION || process.env.AWS_REGION || 'ap-south-1'}`);
  // console.log(`   Bucket: ${envConfig.AWS_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'Not set'}`);
}

/**
 * Robust helper: convert various response.Body types to Buffer
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamToBuffer(body: any): Promise<Buffer> {
  if (!body) throw new Error('No body provided');

  // Uint8Array (already buffer-like)
  if (body instanceof Uint8Array) return Buffer.from(body);

  // If body is an async iterable (v3 often exposes async iterable)
  if (body && typeof body[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of body as AsyncIterable<any>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // If body is a Node.js Readable stream (older Node)
  if (body && typeof body.on === 'function') {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body.on('data', (chunk: any) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      );
      body.on('end', () => resolve(Buffer.concat(chunks)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body.on('error', (err: any) => reject(err));
    });
  }

  // If body has arrayBuffer (e.g., Blob-like in some runtimes)
  if (body && typeof body.arrayBuffer === 'function') {
    const ab = await body.arrayBuffer();
    return Buffer.from(ab);
  }

  // Fallback: attempt to stringify
  return Buffer.from(String(body || ''));
}

/**
 * Download file from S3 and return Buffer
 */
export const downloadFileFromS3 = async (
  bucket: string | undefined,
  key: string
): Promise<Buffer> => {
  if (!bucket) throw new Error('Bucket name is required');

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: decodeURIComponent(key),
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('File not found in S3 (empty Body)');
  }

  return streamToBuffer(response.Body);
};

/**
 * Upload a Buffer to S3 using PutObjectCommand (simple upload)
 */
export const uploadToS3 = async (
  buffer: Buffer,
  bucketName: string,
  key: string,
  contentType = 'application/octet-stream'
): Promise<{ location: string; etag?: string }> => {
  if (!bucketName) throw new Error('Bucket name is required');
  if (!buffer || buffer.length === 0) throw new Error('Buffer is empty');

  const putCmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  const result = await s3Client.send(putCmd);

  const region = envConfig.AWS_REGION || process.env.AWS_REGION || 'ap-south-1';
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  const location = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;

  return { location, etag: result.ETag as string | undefined };
};

/**
 * Delete file from S3 by key
 */
export const deleteFromS3 = async (
  bucketName: string,
  key: string
): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};

export default s3Client;
