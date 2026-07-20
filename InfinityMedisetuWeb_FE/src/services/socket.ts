// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000";

/* -----------------------------
   FULL LOGGING (shows payload)
----------------------------- */
const logEvent = (event: string, args: any[]) => {
  const ignored = ["ping", "pong"];
  if (ignored.includes(event)) return;

  try {
    console.groupCollapsed(`📡 ${event}`);
    args.forEach((_a, _i) => {
      // console.dir(_a, { depth: null });
    });
    console.groupEnd();
  } catch {
    // fallback (older browsers)
    console.log("📡", event, args);
  }
};

export const connectSocket = (token: string, userId?: string): Socket => {
  // ✅ IMPORTANT: if socket already exists, DON'T create another
  if (socket) {
    return socket;
  }

  // In Electron Desktop Mode, we don't have a local Socket.IO server running.
  // Instead of throwing ERR_CONNECTION_REFUSED on loop, we just return a dummy socket.
  if (typeof window !== 'undefined' && (window as any).ipcAPI) {
    socket = {
      on: () => {},
      off: () => {},
      emit: () => {},
      disconnect: () => {},
      onAny: () => {}
    } as any;
    return socket as Socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // ✅ Expose socket for dev testing (remove in production)
  if (import.meta.env.DEV) {
    (window as any).__socket = socket;
  }

  // ✅ log EVERY event with full args
  socket.onAny((event, ...args) => logEvent(event, args));

  /* -----------------------------
     Specific events (extra clarity)
  ----------------------------- */
  socket.on("notification.new", (_raw: any) => {
    // const p = _raw?.payload ?? _raw;
    // console.dir(_raw, { depth: null });
    // console.dir(p, { depth: null });
    // console.dir(p?.metadata, { depth: null });
    // console.groupEnd();
  });

  socket.on("notification.unread_count", (data: any) => {
    // console.groupCollapsed("🔔 [notification.unread_count] FULL");
    // console.dir(data, { depth: null });

    if (Array.isArray(data?.notifications) && data.notifications.length) {
      // console.log("notifications[0] sample =");
      // console.dir(data.notifications[0], { depth: null });
    }
    // console.groupEnd();
  });

  socket.on("notification.initial_unread", (_data: any) => {
    // console.groupCollapsed("🔔 [notification.initial_unread] FULL");
    // console.dir(_data, { depth: null });
    // console.groupEnd();
  });

  socket.on("event_to_client", (msg: any) => {
    console.groupCollapsed("📨 [event_to_client] FULL");
    // console.dir(msg, { depth: null });

    // If backend sends wrapped message like:
    // { event: "notification.new", payload: {...} }
    if (msg?.event === "notification.new") {
      // const p = msg?.payload;
      // console.dir(p, { depth: null });
    }

    console.groupEnd();
  });

  socket.on("appointment.prescription.pdf_ready", (data: any) => {
    console.log("✅ Prescription link ready:", data?.pdfUrl);
  });

  socket.on("notification.prescription.ready", (data: any) => {
    console.log("✅ Prescription link ready:", data?.pdfUrl);
  });

  /* -----------------------------
     Connection events
  ----------------------------- */
  socket.on("connect", () => {
    console.log("✅ Socket connected successfully!");

    if (userId) {
      const room = `user:${userId}`;
      socket?.emit("join", room);
    } else {
      console.warn(
        "⚠️ connectSocket called without userId (room join skipped)",
      );
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("🔴 Socket connection error:", err?.message || err);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};

/* -----------------------------
   ✅ THESE EXPORTS FIX YOUR ERROR
----------------------------- */
export const markNotificationAsRead = (
  notificationId: string,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    const id = String(notificationId);

    const timeout = setTimeout(() => {
      reject(new Error("Mark as read timeout"));
    }, 5000);

    socket.emit(
      "notification.mark_read",
      { notificationId: id },
      (res: any) => {
        clearTimeout(timeout);
        if (res?.status === "success") resolve(res);
        else reject(new Error(res?.message || "Unknown error"));
      },
    );
  });
};

export const markAllNotificationsAsRead = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error("Mark all as read timeout"));
    }, 5000);

    socket.emit("notification.mark_all_read", (res: any) => {
      clearTimeout(timeout);
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

export const callReception = (data: {
  clinicId: string;
  doctorId: string;
  doctorName: string;
  profileImage?: string;
  receptionId?: string;
  callType?: "RECEPTION" | "NEXT_PATIENT";
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("call.reception", data, (res: any) => {
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

export const acknowledgeCall = (data: {
  doctorId: string;
  receptionId: string;
  receptionName: string;
  clinicId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("call.acknowledge", data, (res: any) => {
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

export const declineCall = (data: {
  doctorId: string;
  receptionId: string;
  receptionName: string;
  clinicId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }

    socket.emit("call.decline", data, (res: any) => {
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

export const cancelCall = (data: {
  doctorId: string;
  clinicId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }
    socket.emit("call.cancel", data, (res: any) => {
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

export const waitCall = (data: {
  doctorId: string;
  receptionId: string;
  receptionName: string;
  clinicId: string;
}): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error("Socket not connected"));
      return;
    }
    socket.emit("call.wait", data, (res: any) => {
      if (res?.status === "success") resolve(res);
      else reject(new Error(res?.message || "Unknown error"));
    });
  });
};

// ✅ keep default export too (if some files import default)
export default {
  connectSocket,
  getSocket,
  disconnectSocket,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  callReception,
  acknowledgeCall,
  declineCall,
  cancelCall,
  waitCall,
};
