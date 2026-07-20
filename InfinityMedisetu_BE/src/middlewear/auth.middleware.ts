/* eslint-disable @typescript-eslint/no-explicit-any */
// src/middleware/auth.middleware.ts
import { and, eq, isNull } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../configurations/dbConnection'; // your drizzle database instance
import redisClient from '../configurations/redisConfig';
import {
  ClinicAssignModel,
  ClinicModel,
} from '../main/clinic/models/clinic.model';
import { ClinicSettingsModel } from '../main/clinic/models/clinicSettings.model';
import { PharmacyAssignModel } from '../main/pharmacy/models/pharmacy.model';
import { UserModel } from '../main/users/models/user.model'; // your existing user model file path
import { envConfig } from '../utils/envConfig';
import { asyncHandler, HttpError } from './errorHandler'; // adjust path if needed
import {
  LabsModel,
  UserLabAssignmentsModel,
} from '../main/lab/models/lab.model';

// Minimal shape of JWT payload we sign in auth.service.ts
type JwtPayload = {
  sub: string; // user id
  iat?: number;
  exp?: number;
};

// Minimal user shape attached to req
export interface AuthUser {
  id: string;
  email: string;
  userType:
    | 'Admin'
    | 'User'
    | 'Super_Admin'
    | 'Doctor'
    | 'Receptionist'
    | 'Pharmacist'
    | string;
  emailVerifiedAt?: string | null;
  userStatus?: 'Active' | 'Inactive' | string;
  isAdminDoctorAccess?: boolean;
  // add other fields you need (avoid sending password)
}

// augment Express Request to include `user`
declare module 'express-serve-static-core' {
  interface Request {
    user: AuthUser;
    clinicId: string;
    labId: string;
  }
}

const JWT_SECRET = envConfig.JWT_SECRET_KEY || 'change-me';

/**
 * Extract Bearer token from Authorization header
 */
function getTokenFromHeader(req: Request): string | null {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth) return null;
  const parts = String(auth).split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) return parts[1];
  return null;
}

interface PendingAllowedRoute {
  method: string;
  path: string;
}

const PENDING_ALLOWED_ROUTES: PendingAllowedRoute[] = [
  { method: 'GET', path: '/api/v1/users' },
  { method: 'GET', path: '/api/v1/clinic/user' },
  { method: 'GET', path: '/api/v1/subscription/limitations/overview' },
  { method: 'GET', path: '/api/v1/doctor/user' },
  { method: 'GET', path: '/api/v1/clinic/user' },
  { method: 'POST', path: '/api/v1/users/register' },
  { method: 'GET', path: '/api/v1/clinic' },
  { method: 'POST', path: '/api/v1/clinic' },
  { method: 'PUT', path: '/api/v1/users/onboarding/progress' },
  { method: 'PUT', path: '/api/v1/clinic/:clinicId' },
  { method: 'PUT', path: '/api/v1/doctor' },
  { method: 'POST', path: '/api/v1/users/onboarding/submit' },
  {
    method: 'GET',
    path: '/api/v1/banners/eligible?placement=DASHBOARD_SIDEBAR',
  },
  { method: 'GET', path: '/api/v1/lab/clinic/:clinicId' },
  { method: 'GET', path: '/api/v1/pharmacy/all' },
  { method: 'GET', path: '/api/v1/subscription/my-subscription' },
  { method: 'GET', path: '/api/v1/dashboard/today-overview' },
  { method: 'GET', path: '/api/v1/dashboard' },
  { method: 'GET', path: '/api/v1/dashboard/revenue-overview' },
  { method: 'GET', path: '/api/v1/doctor/my-profile-update-requests' },
  { method: 'GET', path: '/api/v1/widget/messages' },
  { method: 'GET', path: '/api/v1/mfa/status' },
  { method: 'GET', path: '/api/v1/clinic/settings' },
  { method: 'GET', path: '/api/v1/subscription/plans' },

  { method: '*', path: '*' },
];

/**
 * Core middleware: verify token, load user, attach req.user
 * Use asyncHandler wrapper when exporting to auto-catch errors
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = getTokenFromHeader(req);
    if (!token) throw new HttpError(401, 'Authorization token missing');

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err: unknown) {
      throw new HttpError(401, 'Invalid or expired token: ' + err);
    }
    if (!payload?.sub) throw new HttpError(401, 'Invalid token payload');

    let userRow: any;
    const redisKey = `user:${payload.sub}`;
    const cachedUser = await redisClient.get(redisKey);

    if (cachedUser) {
      userRow = JSON.parse(cachedUser);
    } else {
      // Fetch user from DB
      const [dbUser] = await database
        .select()
        .from(UserModel)
        .where(eq(UserModel.id, payload.sub))
        .limit(1);

      if (!dbUser) throw new HttpError(401, 'User not found');
      userRow = dbUser;

      // Cache user for 10 minutes
      await redisClient.setex(redisKey, 600, JSON.stringify(userRow));
    }

    // check user status — block deactivated, archived, or blocked users
    if (userRow.isArchive) {
      throw new HttpError(
        403,
        'Your account has been deactivated. Please contact your clinic administrator.'
      );
    }

    if (userRow.isUserBlocked) {
      throw new HttpError(403, 'Your account has been blocked.');
    }

    const reqMethod = req.method.toUpperCase();
    const reqPath = (req.originalUrl || '').split('?')[0];
    const isPendingAllowedRoute = PENDING_ALLOWED_ROUTES.some((route) => {
      // Allow method '*' to match any HTTP method
      if (route.method !== '*' && route.method.toUpperCase() !== reqMethod)
        return false;

      // Allow path '*' or '/*' to match any request path
      if (route.path === '*' || route.path === '/*') return true;

      const reqSegments = reqPath.split('/').filter(Boolean);
      const routeSegments = route.path.split('/').filter(Boolean);

      const hasWildcard = routeSegments[routeSegments.length - 1] === '*';

      if (!hasWildcard && reqSegments.length !== routeSegments.length)
        return false;
      if (hasWildcard && reqSegments.length < routeSegments.length - 1)
        return false;

      const matchLength = hasWildcard
        ? routeSegments.length - 1
        : routeSegments.length;

      for (let i = 0; i < matchLength; i++) {
        const routeSeg = routeSegments[i];
        if (routeSeg.startsWith(':')) continue;
        if (routeSeg.toLowerCase() !== reqSegments[i].toLowerCase())
          return false;
      }

      return true;
    });

    if (
      userRow.userStatus === 'Inactive' ||
      // userRow.userStatus === 'New' ||
      userRow.userStatus === 'Reviewing' ||
      userRow.userStatus === 'Blocked' ||
      userRow.userStatus === 'Rejected' ||
      (userRow.userStatus === 'Pending' && !isPendingAllowedRoute)
    ) {
      throw new HttpError(403, 'Your account is not active.');
    }

    // attach minimal user to request (do NOT include password)
    req.user = {
      id: userRow.id,
      email: userRow.email,
      userType: userRow.userType,
      emailVerifiedAt: userRow.emailVerifiedAt
        ? String(userRow.emailVerifiedAt)
        : null,
      userStatus: userRow.userStatus,
      isAdminDoctorAccess: userRow.isAdminDoctorAccess,
    };

    return next();
  }
);

/**
 * Role-based guard factory
 * usage: app.get('/admin', requireAuth, requireRole(['Admin']), handler)
 */

export const requireRole = (allowed: string | string[]) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const roles = Array.isArray(allowed) ? allowed : [allowed];
    const user = req.user;
    if (!user) {
      throw new HttpError(401, 'Authentication required');
    }

    const isRoleAllowed = roles.includes(user.userType);

    const isAdminDoctorAllowed =
      user.userType === 'Admin' &&
      roles.length === 1 &&
      roles[0] === 'Doctor' &&
      user.isAdminDoctorAccess === true;
    if (!isRoleAllowed && !isAdminDoctorAllowed) {
      throw new HttpError(403, 'Insufficient role');
    }
    return next();
  });

export const requireAdmin = requireRole([
  'Admin',
  'Super_Admin',
  'Doctor',
  'Patient',
  'Lab_Assistant',
  'Receptionist',
  'Pharmacist',
]);
export const requireReceptionist = requireRole([
  'Admin',
  'Super_Admin',
  'Doctor',
  'Receptionist',
  'Lab_Assistant',
]);

export const requirePharmacist = requireRole([
  'Admin',
  'Super_Admin',
  'Pharmacist',
]);
export const requireUser = requireRole([
  'Admin',
  'Super_Admin',
  'Doctor',
  'Receptionist',
  'Pharmacist',
]);
export const requireSuperAdmin = requireRole(['Super_Admin']);
export const requireLabAssistant = requireRole([
  'Admin',
  'Super_Admin',
  'Lab_Assistant',
]);
export const requireDoctor = requireRole(['Doctor']);
export const requirePatient = requireRole(['Patient']);

export const requireClinic = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Authentication required');

    let clinicId: string | undefined;
    let clinicStatus: string | undefined;

    const redisKey = `user_clinic:${user.id}`;
    const cached = await redisClient.get(redisKey);

    if (cached) {
      // Cache stores "clinicId:status" e.g. "uuid:Active"
      const [cachedId, cachedStatus] = cached.split(':status:');
      clinicId = cachedId;
      clinicStatus = cachedStatus;
    } else {
      if (user.userType === 'Pharmacist') {
        const [clinic] = await database
          .select({
            clinicId: PharmacyAssignModel.clinicId,
            status: ClinicModel.status,
          })
          .from(PharmacyAssignModel)
          .innerJoin(
            ClinicModel,
            eq(ClinicModel.id, PharmacyAssignModel.clinicId)
          )
          .where(eq(PharmacyAssignModel.userId, user.id))
          .limit(1);

        if (!clinic) throw new HttpError(403, 'Access denied');
        clinicId = clinic.clinicId;
        clinicStatus = clinic.status;
      } else {
        const [clinic] = await database
          .select({
            clinicId: ClinicAssignModel.clinicId,
            status: ClinicModel.status,
          })
          .from(ClinicAssignModel)
          .innerJoin(
            ClinicModel,
            eq(ClinicModel.id, ClinicAssignModel.clinicId)
          )
          .where(eq(ClinicAssignModel.userId, user.id))
          .limit(1);

        if (!clinic) throw new HttpError(403, 'Access denied');
        clinicId = clinic.clinicId;
        clinicStatus = clinic.status;
      }

      // Cache clinicId + status together for 5 minutes
      await redisClient.setex(
        redisKey,
        300,
        `${clinicId}:status:${clinicStatus}`
      );
    }

    if (!clinicId) {
      throw new HttpError(403, 'Access denied');
    }

    if (clinicStatus === 'Inactive') {
      throw new HttpError(
        403,
        'This clinic has been deactivated. Please contact support.'
      );
    }

    if (clinicStatus === 'Blocked') {
      throw new HttpError(
        403,
        'This clinic has been blocked. Please contact support.'
      );
    }

    req.clinicId = clinicId;
    return next();
  }
);

export const requireLab = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Authentication required');

    let labId: string | undefined;
    const clinicId = req.clinicId;

    const redisKey = clinicId
      ? `user_lab:${user.id}:clinic:${clinicId}`
      : `user_lab:${user.id}`;
    const cachedLabId = await redisClient.get(redisKey);

    if (cachedLabId) {
      labId = cachedLabId;
    } else if (
      clinicId &&
      (user.userType === 'Admin' || user.userType === 'Super_Admin')
    ) {
      const [lab] = await database
        .select({
          labId: LabsModel.id,
        })
        .from(LabsModel)
        .where(
          and(eq(LabsModel.clinicId, clinicId), isNull(LabsModel.deletedAt))
        )
        .limit(1);

      if (!lab) {
        throw new HttpError(403, 'Lab access denied');
      }

      labId = lab.labId;

      await redisClient.setex(redisKey, 600, labId);
    } else {
      const conditions = [eq(UserLabAssignmentsModel.userId, user.id)];
      if (clinicId) {
        conditions.push(eq(UserLabAssignmentsModel.clinicId, clinicId));
      }

      const [row] = await database
        .select({
          labId: UserLabAssignmentsModel.labId,
        })
        .from(UserLabAssignmentsModel)
        .where(and(...conditions))
        .limit(1);

      if (!row) {
        throw new HttpError(403, 'Lab access denied');
      }

      labId = row.labId;

      // cache for 10 minutes
      await redisClient.setex(redisKey, 600, labId);
    }
    if (labId) {
      req.labId = labId;
      return next();
    } else {
      throw new HttpError(403, 'Access denied');
    }
  }
);

/**
 * Enforce clinic auto-logout based on inactivity.
 *
 * Applies only when:
 * - the current request has a resolved `req.clinicId` (via `requireClinic`)
 * - AND the authenticated user is the owner of that clinic (`clinics.user_id = auth user id`)
 * - AND there is a `clinic_settings` row for that clinic with `auto_logout_minutes` set.
 *
 * Behaviour:
 * - If last dashboard API activity is older than `auto_logout_minutes`, access is revoked (401).
 * - If the user continues calling APIs within that window, access is kept.
 */
export const enforceClinicAutoLogout = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Authentication required');

    const clinicId = req.clinicId;
    if (!clinicId) {
      // We only enforce auto-logout for clinic-scoped requests
      return next();
    }

    // 1️⃣ Load clinic + settings (cached in Redis for 30 minutes)
    const settingsCacheKey = `clinic_autologout:${clinicId}`;
    let row: {
      clinicId: string;
      ownerId: string;
      autoLogoutMinutes: number | null;
    } | null = null;

    const cached = await redisClient.get(settingsCacheKey);
    if (cached) {
      row = JSON.parse(cached);
    } else {
      const [dbRow] = await database
        .select({
          clinicId: ClinicModel.id,
          ownerId: ClinicModel.userId,
          autoLogoutMinutes: ClinicSettingsModel.autoLogoutMinutes,
        })
        .from(ClinicModel)
        .leftJoin(
          ClinicSettingsModel,
          eq(ClinicSettingsModel.clinicId, ClinicModel.id)
        )
        .where(eq(ClinicModel.id, clinicId))
        .limit(1);

      if (dbRow) {
        row = dbRow;
        // Cache for 30 minutes
        await redisClient.setex(settingsCacheKey, 1800, JSON.stringify(dbRow));
      }
    }

    if (!row) {
      // No such clinic -> let other guards handle it
      return next();
    }

    // 2️⃣ Enforce only when this user is the clinic owner AND settings exist
    if (row.ownerId !== user.id) {
      // Not the clinic owner -> no auto-logout enforcement
      return next();
    }

    const autoLogoutMinutes = row.autoLogoutMinutes;
    if (!autoLogoutMinutes || autoLogoutMinutes <= 0) {
      // No auto-logout configured -> allow
      return next();
    }

    // 3️⃣ Check last activity from Redis
    const now = Date.now();
    const redisKey = `session:last_activity:${row.clinicId}:${user.id}`;

    const lastActivityRaw = await redisClient.get(redisKey);
    if (lastActivityRaw) {
      const lastActivityTs = Number(lastActivityRaw);
      if (!Number.isNaN(lastActivityTs)) {
        const diffMinutes = (now - lastActivityTs) / (1000 * 60);
        if (diffMinutes >= autoLogoutMinutes) {
          // Idle beyond configured minutes -> revoke access
          await redisClient.del(redisKey);
          throw new HttpError(
            401,
            'Session expired due to inactivity. Please log in again.'
          );
        }
      }
    }

    // 4️⃣ Update last-activity timestamp (keeps active users logged in)
    const ttlSeconds = Math.max(
      autoLogoutMinutes * 60 * 2,
      autoLogoutMinutes * 60
    );
    await redisClient.setex(redisKey, ttlSeconds, String(now));

    return next();
  }
);

/**
 * Ensure email is verified
 */

export const requireEmailVerified = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new HttpError(401, 'Authentication required');
    if (!user.emailVerifiedAt) throw new HttpError(403, 'Email not verified');
    return next();
  }
);
