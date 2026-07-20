// Your multer-s3 config file (whatever it's called)
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path';
import dotenv from 'dotenv';
import { envConfig } from '../../utils/envConfig';

dotenv.config();

// ─── S3 Client ──────────────────────────────────────────────
// Support both naming conventions for flexibility
const accessKey = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_TOKEN;
const secretKey = process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_TOKEN;
const sessionToken = process.env.AWS_SESSION_TOKEN;

const s3Config: any = {
  region: process.env.AWS_REGION || 'ap-south-1',
  maxAttempts: 3,
};

// Add credentials if available
if (accessKey && secretKey) {
  const credentials: any = {
    accessKeyId: accessKey.trim(),
    secretAccessKey: secretKey.trim(),
  };

  // Add session token for temporary credentials
  if (sessionToken) {
    credentials.sessionToken = sessionToken.trim();
  }

  s3Config.credentials = credentials;
  // console.log('✅ S3 configured with explicit credentials');
} else {
  // console.log('🔄 S3 configured for default credential chain (IAM role)');
}

export const s3Client = new S3Client(s3Config);
export const BUCKET_NAME = envConfig.AWS_BUCKET_NAME || '';

// ─── Env Folder Prefix ──────────────────────────────────────
// Single shared bucket, isolated by a top-level folder per environment
// (production/, staging/, development/) so dev/staging uploads never
// mix with real patient data in production.
const S3_ENV_FOLDER =
  envConfig.NODE_ENV === 'production'
    ? 'production'
    : envConfig.NODE_ENV === 'staging'
      ? 'staging'
      : 'development';

export const withEnvPrefix = (key: string): string =>
  key.startsWith(`${S3_ENV_FOLDER}/`) ? key : `${S3_ENV_FOLDER}/${key}`;

// Log configuration
// console.log(`📦 S3 Bucket: ${BUCKET_NAME || 'Not set'}`);
// console.log(`📍 S3 Region: ${process.env.AWS_REGION || 'ap-south-1'}`);

// ─── Shared Storage Factory ────────────────────────────────
export const createS3Storage = (folder: string, allowedFormats: string[]) => {
  if (!BUCKET_NAME) {
    throw new Error('AWS_BUCKET_NAME is not configured');
  }

  return multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const fullPath = withEnvPrefix(
        `${folder}/${baseName}-${uniqueSuffix}${ext}`
      );
      cb(null, fullPath);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        allowedFormats: allowedFormats.join(','),
      });
    },
  });
};

// ─── Utility: Upload Buffer ─────────────────────────────────
export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  if (!BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is not configured');

  const prefixedKey = withEnvPrefix(key);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: prefixedKey,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${prefixedKey}`;
}

export async function doesFileExistInS3(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: withEnvPrefix(key),
      })
    );

    return true;
  } catch (error: any) {
    if (
      error?.$metadata?.httpStatusCode === 404 ||
      error?.name === 'NotFound'
    ) {
      return false;
    }

    throw error;
  }
}

// ─── Utility: Delete Object ─────────────────────────────────
export async function deleteFromS3(urlOrKey: string): Promise<void> {
  if (!BUCKET_NAME) throw new Error('AWS_BUCKET_NAME is not configured');

  let key = urlOrKey;

  // If it's a full URL, extract the key from the pathname
  if (urlOrKey.startsWith('http')) {
    const url = new URL(urlOrKey);
    key = decodeURIComponent(url.pathname.replace(/^\//, ''));
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}
