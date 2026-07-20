import { eq } from 'drizzle-orm';
import { database } from '../configurations/dbConnection';
import redisClient from '../configurations/redisConfig';
import { UserModel } from '../main/users/models/user.model';
import { SettingModel } from '../main/settings/models/setting.model';
import {
  NON_CONFIGURABLE_NOTIFICATIONS,
  getRoleDefaults,
} from './notificationPreferences.constants';
import logger from './logger';

export interface ResolvedPreferenceSetting {
  enabled: boolean;
  configurable: boolean;
}

export interface ResolvedPreferences {
  inApp: Record<string, ResolvedPreferenceSetting>;
  push: Record<string, ResolvedPreferenceSetting>;
}

const REDIS_KEY_PREFIX = 'notif_prefs:';
const CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Resolves full notification preferences for a user by merging role defaults and user overrides.
 * Caches the resolved structure in Redis.
 */
export async function resolveNotificationPreferences(
  userId: string,
  role: string
): Promise<ResolvedPreferences> {
  const cacheKey = `${REDIS_KEY_PREFIX}${userId}`;

  // 1. Try to fetch from Redis cache
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn(
      `[NotificationPreferences] Redis read failed for user ${userId}:`,
      err
    );
  }

  // 2. Fetch user's settings overrides from DB
  let userOverrides: Record<string, Record<string, boolean>> = {};
  try {
    const [setting] = await database
      .select({
        notificationPreferences: SettingModel.notificationPreferences,
      })
      .from(SettingModel)
      .where(eq(SettingModel.userId, userId))
      .limit(1);

    if (setting && setting.notificationPreferences) {
      userOverrides = setting.notificationPreferences as Record<
        string,
        Record<string, boolean>
      >;
    }
  } catch (err) {
    logger.error(
      `[NotificationPreferences] DB fetch failed for user ${userId}:`,
      err
    );
  }

  // 3. Resolve preferences (Merge role defaults with user overrides)
  const roleDefaults = getRoleDefaults(role);
  const resolved: ResolvedPreferences = {
    inApp: {},
    push: {},
  };

  // Resolve inApp preferences
  const inAppEvents = new Set([
    ...Object.keys(roleDefaults.inApp),
    ...Object.keys(userOverrides.inApp || {}),
    ...NON_CONFIGURABLE_NOTIFICATIONS,
  ]);

  for (const event of inAppEvents) {
    // Non-configurable notifications are always ON
    if (NON_CONFIGURABLE_NOTIFICATIONS.includes(event)) {
      resolved.inApp[event] = { enabled: true, configurable: false };
      continue;
    }

    const defaultVal = roleDefaults.inApp[event]?.enabled ?? true;
    const userVal = userOverrides.inApp?.[event];

    resolved.inApp[event] = {
      enabled: typeof userVal === 'boolean' ? userVal : defaultVal,
      configurable: true,
    };
  }

  // Resolve push preferences
  const pushEvents = new Set([
    ...Object.keys(roleDefaults.push),
    ...Object.keys(userOverrides.push || {}),
    ...NON_CONFIGURABLE_NOTIFICATIONS,
  ]);

  for (const event of pushEvents) {
    // Non-configurable notifications are always ON
    if (NON_CONFIGURABLE_NOTIFICATIONS.includes(event)) {
      resolved.push[event] = { enabled: true, configurable: false };
      continue;
    }

    const defaultVal = roleDefaults.push[event]?.enabled ?? true;
    const userVal = userOverrides.push?.[event];

    resolved.push[event] = {
      enabled: typeof userVal === 'boolean' ? userVal : defaultVal,
      configurable: true,
    };
  }

  // 4. Cache resolved preferences in Redis
  try {
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(resolved));
  } catch (err) {
    logger.warn(
      `[NotificationPreferences] Redis write failed for user ${userId}:`,
      err
    );
  }

  return resolved;
}

/**
 * Checks in-app and push preference settings for a single user and notification action/event.
 */
export async function getUserNotificationPreference(
  userId: string,
  action: string
): Promise<{ inApp: boolean; push: boolean }> {
  // If the event is non-configurable, it is always enabled
  if (NON_CONFIGURABLE_NOTIFICATIONS.includes(action)) {
    return { inApp: true, push: true };
  }

  try {
    const cacheKey = `${REDIS_KEY_PREFIX}${userId}`;
    let resolved: ResolvedPreferences | null = null;

    // 1. Try Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      resolved = JSON.parse(cached);
    } else {
      // 2. Cache miss: Query user & resolve
      const [user] = await database
        .select({
          userType: UserModel.userType,
        })
        .from(UserModel)
        .where(eq(UserModel.id, userId))
        .limit(1);

      if (user) {
        resolved = await resolveNotificationPreferences(userId, user.userType);
      }
    }

    if (resolved) {
      const inAppEnabled = resolved.inApp[action]?.enabled ?? true;
      const pushEnabled = resolved.push[action]?.enabled ?? true;
      return { inApp: inAppEnabled, push: pushEnabled };
    }
  } catch (err) {
    logger.error(
      `[NotificationPreferences] Error resolving preferences for user=${userId}, action=${action}:`,
      err
    );
  }

  // Fail-safe: default to enabled
  return { inApp: true, push: true };
}

/**
 * Invalidates the Redis preference cache for a user.
 */
export async function invalidateNotificationPreferenceCache(
  userId: string
): Promise<void> {
  const cacheKey = `${REDIS_KEY_PREFIX}${userId}`;
  try {
    await redisClient.del(cacheKey);
  } catch (err) {
    logger.warn(
      `[NotificationPreferences] Redis delete failed for user ${userId}:`,
      err
    );
  }
}
