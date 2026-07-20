import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { getSocket } from "../services/socket";
import { addNotification, markAllRead, markRead } from "../redux/slices/notificationSlice";
import type { AppDispatch } from "../redux/store";

const DISMISSED_KEY = "medisetu_notifications_dismissed";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

export const useSocketNotifications = (enabled: boolean) => {
  const dispatch = useDispatch<AppDispatch>();

  const initialLoadDone = useRef(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  // ✅ buffer for notification.new received before unread_count
  const pendingNewRef = useRef<any[]>([]);
  // ✅ dedupe by id
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    dismissedRef.current = loadDismissed();

    const socket = getSocket();
    if (!socket) return;

      const handlePayload = (raw: any) => {
      const payload = raw?.payload ?? raw;

      const id = String(payload?.notificationId ?? payload?.id ?? "");
      if (!id) return;

      // ✅ ignore dismissed
      if (dismissedRef.current.has(id)) return;

      // ✅ dedupe
      if (seenRef.current.has(id)) return;
      seenRef.current.add(id);

      let meta = payload?.metadata ?? payload?.data ?? {};
      // ✅ sometimes meta can be JSON string
      if (typeof meta === "string") {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = {};
        }
      }
      if (meta == null) meta = {};

      dispatch(
        addNotification({
          id,
          title: payload?.title ?? "Notification",
          body: payload?.body ?? "",
          data: meta, // ✅ appointmentId should be inside data.appointmentId
          ts: payload?.createdAt ?? payload?.ts ?? new Date().toISOString(),
          read: Boolean(payload?.read ?? false),
        })
      );
    };

    const onNotificationNew = (msg: any) => {
      // ✅ don’t drop it; buffer it
      if (!initialLoadDone.current) {
        pendingNewRef.current.push(msg);
        return;
      }
      handlePayload(msg);
    };

    const onGeneric = (msg: any) => {
      if (msg?.event !== "notification.new") return;
      if (!initialLoadDone.current) {
        pendingNewRef.current.push(msg?.payload ?? msg);
        return;
      }
      handlePayload(msg?.payload ?? msg);
    };

    const onUnreadCount = (data: any) => {
      const arr = Array.isArray(data?.notifications) ? data.notifications : [];
      arr.forEach((n: unknown) => handlePayload(n));

      initialLoadDone.current = true;

      // ✅ flush buffered notification.new (these usually have richer payload like metadata)
      if (pendingNewRef.current.length) {
        pendingNewRef.current.forEach(handlePayload);
        pendingNewRef.current = [];
      }
    };

    const onMarkedRead = (data: any) => {
      const id = String(data?.notificationId ?? "");
      if (id) dispatch(markRead(id));
    };

    const onAllMarkedRead = () => {
      dispatch(markAllRead());
    };

    socket.on("notification.unread_count", onUnreadCount);
    socket.on("notification.initial_unread", onUnreadCount); // ✅ new batch-on-connect event
    socket.on("notification.new", onNotificationNew);
    socket.on("event_to_client", onGeneric);
    socket.on("notification.marked_read", onMarkedRead);
    socket.on("notification.all_marked_read", onAllMarkedRead);

    return () => {
      socket.off("notification.unread_count", onUnreadCount);
      socket.off("notification.initial_unread", onUnreadCount);
      socket.off("notification.new", onNotificationNew);
      socket.off("event_to_client", onGeneric);
      socket.off("notification.marked_read", onMarkedRead);
      socket.off("notification.all_marked_read", onAllMarkedRead);
    };
  }, [enabled, dispatch]);
};
