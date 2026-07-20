// src/main/patient/services/patientAuth.service.ts
import { and, eq, lt } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { HttpError } from '../../../middlewear/errorHandler';
import { TokenModel } from '../../users/models/token.model';
import { UserModel } from '../../users/models/user.model';
import { UserProfileModel } from '../../users/models/userProfile.model';
import { generateOTP, hashToken, signJwt } from '../../../utils/authUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A profile is considered complete when the three fields required by the
 * post-login modal have been filled: name, gender, and date of birth.
 * Email is intentionally excluded — it is optional per the data model.
 */
function checkProfileComplete(
  name: string | null | undefined,
  gender: string | null | undefined,
  dob: string | null | undefined
): boolean {
  return Boolean(name?.trim()) && Boolean(gender) && Boolean(dob?.trim());
}
import { UniversalNotificationService } from '../../notifications/services/universalNotification.service';
import logger from '../../../utils/logger';
import { loginAlertQueue } from '../../notifications/services/loginAlertQueue.service';

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_SECS = 60; // 1-minute cooldown between resends
const MAX_RESEND_COUNT = 5; // max resends per OTP session
const OTP_RATE_REDIS_PREFIX = 'patient:otp_rate'; // Redis key prefix for rate limiting
const OTP_RATE_WINDOW_SECS = 10 * 60; // 10-minute window
const MAX_OTP_ATTEMPTS_PER_WINDOW = 5; // max send+resend per window
const SESSION_CACHE_TTL_SECS = 7 * 24 * 60 * 60; // 7 days — mirrors JWT expiry

// In true, always use a fixed OTP so AWS SNS is never called.
const IS_DEV = true;
const DEV_FIXED_OTP = '000000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise mobile to 10-digit string (strips leading 91 / +91 / 0).
 */
function normaliseMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits; // already 10 digits
}

/**
 * Format mobile to E.164 for AWS SNS (+91XXXXXXXXXX).
 */
function toE164(mobile: string): string {
  return `+91${normaliseMobile(mobile)}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class PatientAuthService {
  /**
   * Step 1 — Send OTP to any mobile number.
   *
   * Stores the OTP in `tokens` table with type='patient_otp'.
   * The `email` column of the tokens row holds the patient's mobile number.
   * If the patient account already exists, it is checked for blocked/archived
   * status before an OTP is generated — avoids wasting SMS credits.
   */
  static async sendOtp(mobile: string) {
    const normalised = normaliseMobile(mobile);

    // 1️⃣ Redis rate limit — max 5 sends per 10-min window per mobile
    const rateKey = `${OTP_RATE_REDIS_PREFIX}:${normalised}`;
    const sendCount = await redisClient.incr(rateKey);
    if (sendCount === 1) {
      await redisClient.expire(rateKey, OTP_RATE_WINDOW_SECS);
    }
    if (sendCount > MAX_OTP_ATTEMPTS_PER_WINDOW) {
      throw new HttpError(
        429,
        'Too many OTP requests. Please try again after 10 minutes.'
      );
    }

    // 2️⃣ Early account-status guard — only for existing patients.
    //    New mobiles pass through freely; account is created in verifyOtp.
    const [existingPatient] = await database
      .select({
        userStatus: UserModel.userStatus,
        isUserBlocked: UserModel.isUserBlocked,
        isArchive: UserModel.isArchive,
      })
      .from(UserModel)
      .where(
        and(eq(UserModel.mobile, normalised), eq(UserModel.userType, 'Patient'))
      )
      .limit(1);

    if (existingPatient) {
      if (existingPatient.isArchive) {
        throw new HttpError(
          403,
          'This account has been archived. Please contact support.'
        );
      }
      if (
        existingPatient.isUserBlocked ||
        existingPatient.userStatus === 'Blocked' ||
        existingPatient.userStatus === 'Inactive'
      ) {
        throw new HttpError(
          403,
          'Your account has been deactivated. Please contact support.'
        );
      }
    }

    // 3️⃣ Delete any existing patient_otp for this mobile (one active OTP at a time)
    // mobile is stored in the `email` column for patient_otp type
    await database
      .delete(TokenModel)
      .where(
        and(
          eq(TokenModel.email, normalised),
          eq(TokenModel.type, 'patient_otp')
        )
      );

    // 4️⃣ Generate & store OTP in tokens table
    const otp = IS_DEV ? DEV_FIXED_OTP : generateOTP(6);
    const otpHash = hashToken(otp);

    if (IS_DEV) {
      logger.info(`[DEV] OTP for ${normalised}: ${otp}`);
    }

    await database.insert(TokenModel).values({
      // userId is NULL at this stage — patient may not exist yet
      email: normalised, // stores mobile in email column per data model spec
      tokenHash: otpHash,
      type: 'patient_otp',
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      used: false,
      resendCount: 0,
    });

    // 5️⃣ Send SMS via AWS SNS (skipped in development).
    //    Awaited so that a delivery failure surfaces as a 502 rather than
    //    silently returning "OTP sent" while the patient receives nothing.
    if (!IS_DEV) {
      const smsBody = `Your MediSetu OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`;
      try {
        await UniversalNotificationService.send({
          recipient: { mobile: toE164(normalised) },
          event: 'patient_otp',
          channels: ['sms'],
          title: 'MediSetu OTP',
          body: smsBody,
        });
      } catch (err) {
        logger.error(
          `[PatientAuth] Failed to send OTP SMS to ${normalised}:`,
          err
        );
        // Clean up the stored OTP — it is useless if the patient never received it
        await database
          .delete(TokenModel)
          .where(
            and(
              eq(TokenModel.email, normalised),
              eq(TokenModel.type, 'patient_otp')
            )
          );
        throw new HttpError(
          502,
          'We could not deliver the OTP to your mobile number. Please try again.'
        );
      }
    }

    logger.info(`[PatientAuth] OTP sent to ...${normalised.slice(-4)}`);

    return {
      message: IS_DEV
        ? 'OTP sent (dev mode: use 000000)'
        : 'OTP sent to your mobile number',
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    };
  }

  /**
   * Step 2 — Verify OTP, then upsert patient.
   *
   * Looks up the token row by mobile (stored in `email` column) + hash.
   * After OTP is validated:
   *  - Patient with this mobile exists → login (existing user).
   *  - No patient found → auto-create user + empty profile → first login.
   *
   * Returns isNewUser=true on first login so the frontend can redirect
   * to the "complete your profile" screen.
   */
  static async verifyOtp(
    mobile: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const normalised = normaliseMobile(mobile);
    const otpHash = hashToken(otp);

    // 1️⃣ Find matching token record (mobile stored in email column)
    const [record] = await database
      .select()
      .from(TokenModel)
      .where(
        and(
          eq(TokenModel.email, normalised),
          eq(TokenModel.tokenHash, otpHash),
          eq(TokenModel.type, 'patient_otp')
        )
      )
      .limit(1);

    if (!record) {
      throw new HttpError(400, 'Invalid OTP. Please check and try again.');
    }

    if (new Date(record.expiresAt) < new Date()) {
      await database.delete(TokenModel).where(eq(TokenModel.id, record.id));
      throw new HttpError(400, 'OTP has expired. Please request a new one.');
    }

    // 2️⃣ Delete OTP token immediately — single use
    await database.delete(TokenModel).where(eq(TokenModel.id, record.id));

    // 3️⃣ Upsert patient — login if exists, auto-create if not
    let isNewUser = false;

    let patient = await database
      .select({
        id: UserModel.id,
        name: UserModel.name,
        email: UserModel.email,
        mobile: UserModel.mobile,
        userType: UserModel.userType,
        userStatus: UserModel.userStatus,
        isUserBlocked: UserModel.isUserBlocked,
        isArchive: UserModel.isArchive,
        emailVerifiedAt: UserModel.emailVerifiedAt,
        isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
      })
      .from(UserModel)
      .where(
        and(eq(UserModel.mobile, normalised), eq(UserModel.userType, 'Patient'))
      )
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!patient) {
      // First time — auto-create patient account
      isNewUser = true;

      patient = await database.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(UserModel)
          .values({
            mobile: normalised,
            userType: 'Patient',
            userStatus: 'Active',
            // No fake email — per data model spec, patients store NULL
          })
          .returning({
            id: UserModel.id,
            name: UserModel.name,
            email: UserModel.email,
            mobile: UserModel.mobile,
            userType: UserModel.userType,
            userStatus: UserModel.userStatus,
            isUserBlocked: UserModel.isUserBlocked,
            isArchive: UserModel.isArchive,
            emailVerifiedAt: UserModel.emailVerifiedAt,
            isAdminDoctorAccess: UserModel.isAdminDoctorAccess,
          });

        // Create empty profile row so downstream joins never return null
        await tx.insert(UserProfileModel).values({ userId: newUser.id });

        return newUser;
      });

      logger.info(
        `[PatientAuth] New patient auto-created for mobile ...${normalised.slice(-4)}`
      );
    } else {
      // Existing patient — guard archived, blocked, and inactive accounts
      if (patient.isArchive) {
        throw new HttpError(
          403,
          'This account has been archived. Please contact support.'
        );
      }
      if (
        patient.isUserBlocked ||
        patient.userStatus === 'Blocked' ||
        patient.userStatus === 'Inactive'
      ) {
        throw new HttpError(
          403,
          'Your account has been deactivated. Please contact support.'
        );
      }
    }

    // 4️⃣ Sign JWT
    const token = signJwt({ sub: patient.id });

    // 5️⃣ Fetch profile fields needed to compute isProfileComplete.
    //    For a new user this row was just created (empty), so all fields will
    //    be null — isProfileComplete will correctly be false.
    const [profile] = await database
      .select({
        gender: UserProfileModel.gender,
        dob: UserProfileModel.dob,
      })
      .from(UserProfileModel)
      .where(eq(UserProfileModel.userId, patient.id))
      .limit(1);

    const isProfileComplete = checkProfileComplete(
      patient.name,
      profile?.gender,
      profile?.dob
    );

    // 6️⃣ Cache patient in Redis
    await redisClient.setex(
      `user:${patient.id}`,
      SESSION_CACHE_TTL_SECS,
      JSON.stringify(patient)
    );

    // 7️⃣ Clear OTP rate limit on successful login
    await redisClient.del(`${OTP_RATE_REDIS_PREFIX}:${normalised}`);

    // 8️⃣ Queue login alert (non-blocking)
    loginAlertQueue
      .addLoginAlert({
        userId: patient.id,
        userEmail: patient.email ?? '',
        userName: patient.name ?? '',
        loginTime: new Date().toISOString(),
        ipAddress,
        userAgent,
      })
      .catch(() => {
        /* non-critical */
      });

    logger.info(
      `[PatientAuth] Patient ${patient.id} logged in via OTP (new=${isNewUser}, profileComplete=${isProfileComplete})`
    );

    return {
      message: isNewUser
        ? 'Account created and logged in successfully'
        : 'Login successful',
      token,
      isNewUser,
      // true  → profile is complete, go straight to home / member selection
      // false → show the profile completion modal before anything else
      isProfileComplete,
      user: {
        id: patient.id,
        mobile: patient.mobile,
        userType: patient.userType,
        userStatus: patient.userStatus,
      },
    };
  }

  /**
   * Resend OTP — enforces a per-request cooldown and max resend cap.
   *
   * Finds the active patient_otp token row by mobile (stored in `email` column),
   * checks cooldown and resend cap, then replaces the hash + expiry.
   */
  static async resendOtp(mobile: string) {
    const normalised = normaliseMobile(mobile);

    // 1️⃣ Rate limit check (shared with sendOtp)
    const rateKey = `${OTP_RATE_REDIS_PREFIX}:${normalised}`;
    const sendCount = await redisClient.incr(rateKey);
    if (sendCount === 1) {
      await redisClient.expire(rateKey, OTP_RATE_WINDOW_SECS);
    }
    if (sendCount > MAX_OTP_ATTEMPTS_PER_WINDOW) {
      throw new HttpError(
        429,
        'Too many OTP requests. Please try again after 10 minutes.'
      );
    }

    // 2️⃣ Find existing patient_otp token (mobile in email column)
    const [existing] = await database
      .select()
      .from(TokenModel)
      .where(
        and(
          eq(TokenModel.email, normalised),
          eq(TokenModel.type, 'patient_otp')
        )
      )
      .limit(1);

    if (!existing) {
      throw new HttpError(
        400,
        'No active OTP session found. Please request a new OTP.'
      );
    }

    // 3️⃣ Enforce resend count cap
    if (existing.resendCount >= MAX_RESEND_COUNT) {
      throw new HttpError(
        429,
        'Maximum resend limit reached. Please wait 10 minutes before requesting a new OTP.'
      );
    }

    // 4️⃣ Enforce 1-minute cooldown between resends (skipped in dev)
    if (!IS_DEV) {
      const lastSentAt = existing.updatedAt ?? existing.createdAt;
      const secondsSinceLast =
        (Date.now() - new Date(lastSentAt).getTime()) / 1000;
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECS) {
        const waitSeconds = Math.ceil(
          OTP_RESEND_COOLDOWN_SECS - secondsSinceLast
        );
        throw new HttpError(
          429,
          `Please wait ${waitSeconds} seconds before requesting another OTP.`
        );
      }
    }

    // 5️⃣ Generate fresh OTP and update the token row
    const newOtp = IS_DEV ? DEV_FIXED_OTP : generateOTP(6);
    const newOtpHash = hashToken(newOtp);

    if (IS_DEV) {
      logger.info(`[DEV] Resent OTP for ${normalised}: ${newOtp}`);
    }

    const newExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await database
      .update(TokenModel)
      .set({
        tokenHash: newOtpHash,
        expiresAt: newExpiresAt,
        resendCount: existing.resendCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(TokenModel.id, existing.id));

    // 6️⃣ Send SMS via AWS SNS (skipped in development).
    //    Awaited so delivery failures surface as a 502 rather than
    //    silently returning "OTP resent" while the patient receives nothing.
    if (!IS_DEV) {
      const smsBody = `Your MediSetu login OTP is ${newOtp}. Valid for 5 minutes. Do not share this code with anyone.`;
      try {
        await UniversalNotificationService.send({
          recipient: { mobile: toE164(normalised) },
          event: 'patient_otp',
          channels: ['sms'],
          title: 'MediSetu OTP',
          body: smsBody,
        });
      } catch (err) {
        logger.error(
          `[PatientAuth] Failed to resend OTP SMS to ${normalised}:`,
          err
        );
        // Roll back the resend count increment so the patient can try again
        await database
          .update(TokenModel)
          .set({
            tokenHash: existing.tokenHash,
            expiresAt: existing.expiresAt,
            resendCount: existing.resendCount,
            updatedAt: existing.updatedAt,
          })
          .where(eq(TokenModel.id, existing.id));
        throw new HttpError(
          502,
          'We could not deliver the OTP to your mobile number. Please try again.'
        );
      }
    }

    logger.info(
      `[PatientAuth] OTP resent to mobile ending in ...${normalised.slice(-4)}`
    );

    return {
      message: IS_DEV
        ? 'OTP resent (dev mode: use 000000)'
        : 'OTP resent successfully',
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
      resendCount: existing.resendCount + 1,
    };
  }

  /**
   * Logout — invalidates the Redis session cache for the patient.
   * The JWT itself remains valid until expiry (stateless), but the cached
   * user record is cleared so the next requireAuth re-fetches from DB.
   */
  static async logout(userId: string) {
    await redisClient.del(`user:${userId}`);
    logger.info(`[PatientAuth] Patient ${userId} logged out`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Cleanup utility — removes all expired patient_otp token rows.
   * Call from a cron job or scheduled task.
   */
  static async cleanupExpiredOtps() {
    const deleted = await database
      .delete(TokenModel)
      .where(
        and(
          lt(TokenModel.expiresAt, new Date()),
          eq(TokenModel.type, 'patient_otp')
        )
      );
    logger.info('[PatientAuth] Cleaned up expired patient OTP token records');
    return deleted;
  }
}
