import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  data?: any;
  ts: string;
  read?: boolean;
}

interface NotificationState {
  list: NotificationItem[];
  unread: number;
}

const STORAGE_KEY = "medisetu_notifications";
const DISMISSED_KEY = "medisetu_notifications_dismissed";

const defaultState: NotificationState = { list: [], unread: 0 };

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function loadInitialState(): NotificationState {
  if (typeof window === "undefined") return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    const dismissed = loadDismissed();

    const list: NotificationItem[] = Array.isArray(parsed.list)
      ? parsed.list
          .map((n: any) => ({
            id: String(n.id),
            title: String(n.title ?? "Notification"),
            body: String(n.body ?? ""),
            data: n.data ?? {},
            ts: String(n.ts ?? new Date().toISOString()),
            read: Boolean(n.read ?? false),
          }))
          // ✅ don't load dismissed ones
          .filter((n: NotificationItem) => !dismissed.has(n.id))
      : [];

    const unread = list.filter((n) => !n.read).length;
    return { list, unread };
  } catch (e) {
    console.warn("⚠️ Failed to load notifications:", e);
    return defaultState;
  }
}

function saveState(state: NotificationState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const notificationSlice = createSlice({
  name: "notifications",
  initialState: loadInitialState(),
  reducers: {
    addNotification: (state, action: PayloadAction<NotificationItem>) => {
      const dismissed = loadDismissed();

      const incoming: NotificationItem = {
        ...action.payload,
        id: String(action.payload.id),
        read: Boolean(action.payload.read ?? false),
      };

      // ✅ ignore dismissed ids (prevents re-appear after refresh)
      if (dismissed.has(incoming.id)) return;

      const existing = state.list.find((n) => n.id === incoming.id);
      if (existing) {
        existing.title = incoming.title;
        existing.body = incoming.body;
        existing.data = incoming.data;
        existing.ts = incoming.ts;
        existing.read = incoming.read;
      } else {
        state.list.push(incoming);
      }

      state.unread = state.list.filter((n) => !n.read).length;
      saveState(state);
    },

    markRead: (state, action: PayloadAction<string>) => {
      const id = String(action.payload);
      const found = state.list.find((n) => n.id === id);
      if (found) found.read = true;

      state.unread = state.list.filter((n) => !n.read).length;
      saveState(state);
    },

    // ✅ dismiss = remove + store in dismissed list
    removeNotification: (state, action: PayloadAction<string>) => {
      const id = String(action.payload);

      const dismissed = loadDismissed();
      dismissed.add(id);
      saveDismissed(dismissed);

      state.list = state.list.filter((n) => n.id !== id);
      state.unread = state.list.filter((n) => !n.read).length;

      saveState(state);
    },

    markAllRead: (state) => {
      state.list.forEach((n) => (n.read = true));
      state.unread = 0;
      saveState(state);
    },

    clearNotifications: (state) => {
      state.list = [];
      state.unread = 0;

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(DISMISSED_KEY);
        } catch {}
      }
    },
  },
});

export const { addNotification, markRead, removeNotification, markAllRead, clearNotifications } =
  notificationSlice.actions;

export default notificationSlice.reducer;
