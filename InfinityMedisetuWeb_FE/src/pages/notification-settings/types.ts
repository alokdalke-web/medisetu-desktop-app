export type NotificationCategory =
  | "appointments"
  | "payments"
  | "laboratory"
  | "documents"
  | "accounts";

export type NotificationEvent = {
  key: string;
  name: string;
  description: string;
  category: NotificationCategory;
};

export type ChannelStatus = "connected" | "disconnected" | "configured";

export type ChannelProvider = {
  id: string;
  name: string;
  icon: string;
  status: ChannelStatus;
  provider?: string;
  detail?: string;
};

export type NotificationTemplate = {
  id: string;
  name: string;
  channel: string;
  status: "active" | "draft";
  lastUpdated: string;
};
