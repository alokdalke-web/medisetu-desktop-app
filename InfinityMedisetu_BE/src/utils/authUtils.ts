// src/utils/authUtils.ts
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { envConfig } from './envConfig';

const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = envConfig.JWT_SECRET_KEY;
const JWT_EXPIRES_IN = '7d'; // adjust as needed

export function generateTokenString(size = 32) {
  return crypto.randomBytes(size).toString('hex'); // raw token to email user
}

export function generateOTP(length = 6) {
  return Math.floor(
    Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)
  ).toString();
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex'); // store hashed
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashed: string | null | undefined
) {
  if (!password || !hashed) return false;
  return bcrypt.compare(password, hashed);
}

export function signJwt(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Signs a limited-scope temporary JWT for MFA verification.
 * This token has a 5-minute expiry and scope: "mfa_verification".
 * It can only be used to complete the MFA verification step.
 */
export function signMfaTempToken(userId: string) {
  return jwt.sign({ sub: userId, scope: 'mfa_verification' }, JWT_SECRET, {
    expiresIn: '5m',
  });
}

export async function generateStrongPassword(length = 12): Promise<string> {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()-_=+[]{}|;:,.<>?/';

  if (length < 8) {
    throw new Error('Password length must be at least 8 characters.');
  }

  // Ensure at least one of each required type
  const requiredChars = [
    uppercase[Math.floor(Math.random() * uppercase.length)],
    lowercase[Math.floor(Math.random() * lowercase.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)],
  ];

  const allChars = uppercase + lowercase + numbers + specialChars;
  const remainingLength = length - requiredChars.length;

  const remainingChars = Array.from(
    { length: remainingLength },
    () => allChars[Math.floor(Math.random() * allChars.length)]
  );

  // Shuffle the result so required characters aren't always at the front
  const finalPassword = [...requiredChars, ...remainingChars]
    .sort(() => Math.random() - 0.5)
    .join('');

  return finalPassword;
}
