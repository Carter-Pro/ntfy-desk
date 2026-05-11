export interface Subscription {
  id: number | null;
  url: string;
  topic: string;
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: number | null;
  subscription_id: number;
  title: string | null;
  body: string | null;
  timestamp: string | null;
  received_at: string;
  is_read: boolean;
}

export interface AppSettings {
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  notification_volume: number;
  message_retention_days: number;
  startup_run: boolean;
  minimize_to_tray: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dnd_enabled: false,
  dnd_start: "22:00",
  dnd_end: "08:00",
  notification_volume: 80,
  message_retention_days: 30,
  startup_run: true,
  minimize_to_tray: true,
};
