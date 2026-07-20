import { eq } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import { HttpError } from '../../../middlewear/errorHandler';
import { comparePassword, hashPassword } from '../../../utils/authUtils';
import { UserModel } from '../../users/models/user.model';
import { SettingModel } from '../models/setting.model';
import {
  SettingUpdateDto,
  UpdateNotificationPreferencesDto,
} from '../schemas/setting.schemas';

export class SettingServices {
  static async getSetting(userId: string) {
    const [setting] = await database
      .select()
      .from(SettingModel)
      .where(eq(SettingModel.userId, userId))
      .limit(1);
    return setting;
  }
  static async updateSetting(userId: string, payload: SettingUpdateDto) {
    const [setting] = await database
      .update(SettingModel)
      .set({ ...payload })
      .where(eq(SettingModel.userId, userId))
      .returning({
        id: SettingModel.id,
        emailNotification: SettingModel.emailNotification,
        smsNotification: SettingModel.smsNotification,
        whatsappNotification: SettingModel.whatsappNotification,
        appointmentReminder: SettingModel.appointmentReminder,
      });
    if (
      payload.newPassword &&
      payload.currentPassword &&
      payload.confirmPassword
    ) {
      if (payload.newPassword !== payload.confirmPassword)
        throw new HttpError(400, 'Password does not match');

      const [existPassword] = await database
        .select({
          password: UserModel.password,
        })
        .from(UserModel)
        .where(eq(UserModel.id, userId))
        .limit(1);

      if (!existPassword || !existPassword.password)
        throw new HttpError(400, 'User not found or password not set');

      const ok = await comparePassword(
        payload.currentPassword,
        existPassword.password
      );

      if (!ok) throw new HttpError(400, 'Invalid password');

      const hashedPassword = await hashPassword(payload.newPassword);

      await database
        .update(UserModel)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(UserModel.id, userId));
    }

    return setting;
  }

  static async getNotificationPreferences(userId: string, role: string) {
    const { resolveNotificationPreferences } =
      await import('../../../utils/notificationPreferences.utils');
    return await resolveNotificationPreferences(userId, role);
  }

  static async updateNotificationPreferences(
    userId: string,
    role: string,
    payload: UpdateNotificationPreferencesDto
  ) {
    const {
      resolveNotificationPreferences,
      invalidateNotificationPreferenceCache,
    } = await import('../../../utils/notificationPreferences.utils');
    const { NON_CONFIGURABLE_NOTIFICATIONS } =
      await import('../../../utils/notificationPreferences.constants');

    // 1. Get existing settings
    const [setting] = await database
      .select()
      .from(SettingModel)
      .where(eq(SettingModel.userId, userId))
      .limit(1);

    const currentPrefs = (setting?.notificationPreferences || {}) as Record<
      string,
      Record<string, boolean>
    >;

    const inAppOverrides = { ...(currentPrefs.inApp || {}) };
    const pushOverrides = { ...(currentPrefs.push || {}) };

    // 2. Merge overrides while ignoring non-configurable keys
    if (payload.inApp) {
      for (const [key, val] of Object.entries(payload.inApp)) {
        if (!NON_CONFIGURABLE_NOTIFICATIONS.includes(key)) {
          inAppOverrides[key] = val;
        }
      }
    }

    if (payload.push) {
      for (const [key, val] of Object.entries(payload.push)) {
        if (!NON_CONFIGURABLE_NOTIFICATIONS.includes(key)) {
          pushOverrides[key] = val;
        }
      }
    }

    const newPrefs = {
      inApp: inAppOverrides,
      push: pushOverrides,
    };

    // 3. Save to database
    if (setting) {
      await database
        .update(SettingModel)
        .set({
          notificationPreferences: newPrefs,
          updatedAt: new Date(),
        })
        .where(eq(SettingModel.userId, userId));
    } else {
      await database.insert(SettingModel).values({
        userId,
        notificationPreferences: newPrefs,
      });
    }

    // 4. Invalidate Redis cache
    await invalidateNotificationPreferenceCache(userId);

    // 5. Return updated & resolved preferences
    return await resolveNotificationPreferences(userId, role);
  }
}
