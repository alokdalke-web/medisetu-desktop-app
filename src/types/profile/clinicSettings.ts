export interface SettingsForm {
  voiceCallEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  loginAlertsEnabled: boolean;
  autoLogoutMinutes: number | null;
  reminders: any[];
}

export interface EventInfo {
  name: string;
  description: string;
}
