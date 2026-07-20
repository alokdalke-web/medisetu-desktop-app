export interface PreferenceSetting {
  enabled: boolean;
  configurable: boolean;
}

export interface RolePreferences {
  inApp: Record<string, PreferenceSetting>;
  push: Record<string, PreferenceSetting>;
}

export const NON_CONFIGURABLE_NOTIFICATIONS = [
  'appointment_canceled',
  'payment_received',
  'appointment_no_show',
];

export const ROLE_DEFAULTS: Record<string, RolePreferences> = {
  Super_Admin: {
    inApp: {
      clinic_created: { enabled: true, configurable: true },
    },
    push: {
      clinic_created: { enabled: true, configurable: true },
    },
  },
  Admin: {
    inApp: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: true, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: false },
      payment_received: { enabled: true, configurable: false },
      test_log_created: { enabled: true, configurable: true },
      test_report_uploaded: { enabled: true, configurable: true },
      user_created: { enabled: true, configurable: true },
    },
    push: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: false, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: false },
      payment_received: { enabled: true, configurable: true },
      test_log_created: { enabled: false, configurable: true },
      test_report_uploaded: { enabled: false, configurable: true },
      user_created: { enabled: true, configurable: true },
    },
  },
  Doctor: {
    inApp: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: true, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: false },
      test_assigned_to_lab: { enabled: true, configurable: true },
      test_report_uploaded: { enabled: true, configurable: true },
      pdf_ready: { enabled: true, configurable: true },
    },
    push: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: false, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: false },
      test_assigned_to_lab: { enabled: false, configurable: true },
      test_report_uploaded: { enabled: true, configurable: true },
      pdf_ready: { enabled: false, configurable: true },
    },
  },
  Patient: {
    inApp: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: true, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      payment_received: { enabled: true, configurable: false },
      test_report_uploaded: { enabled: true, configurable: true },
      pdf_ready: { enabled: true, configurable: true },
    },
    push: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: true, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      payment_received: { enabled: true, configurable: false },
      test_report_uploaded: { enabled: true, configurable: true },
      pdf_ready: { enabled: true, configurable: true },
    },
  },
  Receptionist: {
    inApp: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: true, configurable: true },
      appointment_confirmed: { enabled: true, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: false },
      payment_received: { enabled: true, configurable: true },
    },
    push: {
      appointment_created: { enabled: true, configurable: true },
      appointment_rescheduled: { enabled: false, configurable: true },
      appointment_confirmed: { enabled: false, configurable: true },
      appointment_canceled: { enabled: true, configurable: false },
      appointment_no_show: { enabled: true, configurable: true },
      payment_received: { enabled: false, configurable: true },
    },
  },
  Lab_Assistant: {
    inApp: {
      test_log_created: { enabled: true, configurable: true },
      test_assigned_to_lab: { enabled: true, configurable: true },
      test_report_uploaded: { enabled: true, configurable: true },
    },
    push: {
      test_log_created: { enabled: true, configurable: true },
      test_assigned_to_lab: { enabled: true, configurable: true },
      test_report_uploaded: { enabled: false, configurable: true },
    },
  },
};

export function getRoleDefaults(role: string): RolePreferences {
  if (role === 'Super_Admin') {
    const adminDefaults = ROLE_DEFAULTS.Admin || { inApp: {}, push: {} };
    const superAdminDefaults = ROLE_DEFAULTS.Super_Admin || {
      inApp: {},
      push: {},
    };
    return {
      inApp: { ...adminDefaults.inApp, ...superAdminDefaults.inApp },
      push: { ...adminDefaults.push, ...superAdminDefaults.push },
    };
  }
  return (
    ROLE_DEFAULTS[role] || {
      inApp: {},
      push: {},
    }
  );
}
