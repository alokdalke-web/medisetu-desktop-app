import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the type for environment variables
interface EnvConfigType {
  NODE_ENV: string;
  PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASS: string;
  DB_HOST: string;
  DB_URL: string;
  DB_PORT: string;
  // Production DB Config
  PROD_DB_NAME: string;
  PROD_DB_USER: string;
  PROD_DB_PASS: string;
  PROD_DB_HOST: string;
  PROD_DB_URL: string;
  PROD_DB_PORT: string;
  // Development DB Config
  DEV_DB_NAME: string;
  DEV_DB_USER: string;
  DEV_DB_PASS: string;
  DEV_DB_HOST: string;
  DEV_DB_URL: string;
  DEV_DB_PORT: string;
  // Staging DB Config
  STAGING_DB_NAME: string;
  STAGING_DB_USER: string;
  STAGING_DB_PASS: string;
  STAGING_DB_HOST: string;
  STAGING_DB_URL: string;
  STAGING_DB_PORT: string;
  JWT_SECRET_KEY: string;
  FRONT_END_URI: string;
  BACKEND_BASE_URL: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  THIRD_PARTY_API_KEY: string;
  AWS_ACCESS_TOKEN: string;
  AWS_SECRET_TOKEN: string;
  AWS_REGION: string;
  AWS_BUCKET_NAME: string;
  DEV_AWS_BUCKET_NAME: string;
  STAGING_AWS_BUCKET_NAME: string;
  PROD_AWS_BUCKET_NAME: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  TURNSTILE_SECRET_KEY: string;
  SUPER_ADMIN_NAME: string;
  SUPER_ADMIN_EMAIL: string;
  SUPER_ADMIN_PASSWORD: string;

  ENABLE_NOTIFICATIONS: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  ENABLE_RAZORPAY_ROUTE: boolean;

  MEDICINE_DB_NAME: string;
  MEDICINE_DB_USER: string;
  MEDICINE_DB_PASS: string;
  MEDICINE_DB_HOST: string;
  MEDICINE_DB_URL: string;
}

// Create the environment configuration object
const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.NODE_ENV === 'staging';

export const envConfig: EnvConfigType = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'secret_key',
  FRONT_END_URI: process.env.FRONT_END_URI!,
  BACKEND_BASE_URL: process.env.BACKEND_BASE_URL!,

  // Selected DB Config
  DB_NAME:
    (isProduction
      ? process.env.PROD_DB_NAME
      : isStaging
        ? process.env.STAGING_DB_NAME
        : process.env.DEV_DB_NAME) || process.env.DB_NAME!,
  DB_USER:
    (isProduction
      ? process.env.PROD_DB_USER
      : isStaging
        ? process.env.STAGING_DB_USER
        : process.env.DEV_DB_USER) || process.env.DB_USER!,
  DB_PASS:
    (isProduction
      ? process.env.PROD_DB_PASS
      : isStaging
        ? process.env.STAGING_DB_PASS
        : process.env.DEV_DB_PASS) || process.env.DB_PASS!,
  DB_HOST:
    (isProduction
      ? process.env.PROD_DB_HOST
      : isStaging
        ? process.env.STAGING_DB_HOST
        : process.env.DEV_DB_HOST) || process.env.DB_HOST!,
  DB_URL:
    (isProduction
      ? process.env.PROD_DB_URL
      : isStaging
        ? process.env.STAGING_DB_URL
        : process.env.DEV_DB_URL) || process.env.DB_URL!,
  DB_PORT:
    (isProduction
      ? process.env.PROD_DB_PORT
      : isStaging
        ? process.env.STAGING_DB_PORT
        : process.env.DEV_DB_PORT) || process.env.DB_PORT!,

  // Production DB Config
  PROD_DB_NAME: process.env.PROD_DB_NAME!,
  PROD_DB_USER: process.env.PROD_DB_USER!,
  PROD_DB_PASS: process.env.PROD_DB_PASS!,
  PROD_DB_HOST: process.env.PROD_DB_HOST!,
  PROD_DB_URL: process.env.PROD_DB_URL!,
  PROD_DB_PORT: process.env.PROD_DB_PORT!,

  // Development DB Config
  DEV_DB_NAME: process.env.DEV_DB_NAME!,
  DEV_DB_USER: process.env.DEV_DB_USER!,
  DEV_DB_PASS: process.env.DEV_DB_PASS!,
  DEV_DB_HOST: process.env.DEV_DB_HOST!,
  DEV_DB_URL: process.env.DEV_DB_URL!,
  DEV_DB_PORT: process.env.DEV_DB_PORT!,

  // Staging DB Config
  STAGING_DB_NAME: process.env.STAGING_DB_NAME!,
  STAGING_DB_USER: process.env.STAGING_DB_USER!,
  STAGING_DB_PASS: process.env.STAGING_DB_PASS!,
  STAGING_DB_HOST: process.env.STAGING_DB_HOST!,
  STAGING_DB_URL: process.env.STAGING_DB_URL!,
  STAGING_DB_PORT: process.env.STAGING_DB_PORT!,

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || 'user',
  SMTP_PASS: process.env.SMTP_PASS || 'password',
  SMTP_FROM: process.env.SMTP_FROM || 'Clinic <no-reply@clinic.example>',
  THIRD_PARTY_API_KEY: process.env.THIRD_PARTY_API_KEY || 'api_key',
  AWS_ACCESS_TOKEN: process.env.AWS_ACCESS_TOKEN!,
  AWS_SECRET_TOKEN: process.env.AWS_SECRET_TOKEN!,
  AWS_REGION: process.env.AWS_REGION!,
  AWS_BUCKET_NAME:
    (isProduction
      ? process.env.PROD_AWS_BUCKET_NAME
      : isStaging
        ? process.env.STAGING_AWS_BUCKET_NAME
        : process.env.DEV_AWS_BUCKET_NAME) || process.env.AWS_BUCKET_NAME!,
  DEV_AWS_BUCKET_NAME: process.env.DEV_AWS_BUCKET_NAME!,
  STAGING_AWS_BUCKET_NAME: process.env.STAGING_AWS_BUCKET_NAME!,
  PROD_AWS_BUCKET_NAME: process.env.PROD_AWS_BUCKET_NAME!,

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  TURNSTILE_SECRET_KEY:
    process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA', // Default testing key
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'admin@medisetu.com',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',

  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS || 'false',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET!,
  ENABLE_RAZORPAY_ROUTE: process.env.ENABLE_RAZORPAY_ROUTE === 'true',

  MEDICINE_DB_NAME: process.env.MEDICINE_DB_NAME!,
  MEDICINE_DB_USER: process.env.MEDICINE_DB_USER!,
  MEDICINE_DB_PASS: process.env.MEDICINE_DB_PASS!,
  MEDICINE_DB_HOST: process.env.MEDICINE_DB_HOST!,
  MEDICINE_DB_URL: process.env.MEDICINE_DB_URL!,
};
