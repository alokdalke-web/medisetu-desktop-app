import { useDisclosure } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiColumns,
  FiBookOpen,
  FiMenu,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { useTheme } from "../../hooks/useTheme";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import LogoutModal from "../../pages/settings/LogoutModal";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetLabAppointmentTestsQuery } from "../../redux/api/labAssistantApi";
import { logout } from "../../redux/slices/authSlice";
import { removeNotification } from "../../redux/slices/notificationSlice";
import { clearActiveRole } from "../../redux/slices/roleSlice";
import type { RootState } from "../../redux/store";
import { markNotificationAsRead } from "../../services/socket";
import { useLocation } from "react-router";
import RoleSwitcherDropdown from "./RoleSwitcherDropdown";
import FullscreenToggle from "../common/FullscreenToggle";
import LiveClock from "../common/LiveClock";
import SyncStatusPanel from "./SyncStatusPanel";
import { OfflineGuideModal } from "./OfflineGuideModal";
/* ---------------- helpers ---------------- */

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

function formatNotificationTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;

  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toMs(ts: any) {
  if (!ts) return 0;
  if (typeof ts === "number") return ts < 1e12 ? ts * 1000 : ts;
  const ms = Date.parse(String(ts));
  return Number.isFinite(ms) ? ms : 0;
}

function capitalizeDisplayName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .replace(/(^|[\s-])([a-z])/g, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toUpperCase()}`,
    );
}

type UiNotification = {
  id: string;
  title: string;
  body?: string;
  ts: string;
  read: boolean;
  data?: any;
};

function debugSafeParseMeta(raw: any) {
  let parsed = null;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_e) {
    parsed = null;
  }
  return parsed ?? {};
}

function getAppointmentIdFromNotification(n: UiNotification): string {
  const data = debugSafeParseMeta(n?.data);

  const directAppointmentId = (n as any)?.appointmentId;
  const metaAppointmentId = (n as any)?.metadata?.appointmentId;
  const dataAppointmentId = data?.appointmentId;

  const finalId =
    dataAppointmentId ?? directAppointmentId ?? metaAppointmentId ?? null;

  return finalId ? String(finalId) : "";
}

function resolveNotificationRoute(n: UiNotification): string | null {
  const data = debugSafeParseMeta(n?.data);

  const appointmentId = getAppointmentIdFromNotification(n);
  const clinicId = data?.clinicId;
  const source = data?.source;

  if (appointmentId) return `/appointment/${appointmentId}`;
  if (source === "schedule-update") return `/profile/availability`;
  if (clinicId) return `/clinic/${clinicId}`;

  return null;
}

/* ---------------- component ---------------- */

type HeaderProps = {
  onOpenLeft?: () => void;
  onOpenRight?: () => void;
};

const Header: React.FC<HeaderProps> = ({ onOpenLeft, onOpenRight }) => {
  const { list, unread } = useSelector(
    (state: RootState) => state.notifications,
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { data: user } = useGetUserQuery();
  const isLabAssistant = (user as any)?.userType === "Lab_Assistant";
  const { data: labAppointmentTests } = useGetLabAppointmentTestsQuery(
    {
      tab: "all",
      page: 1,
      limit: 100,
      datePreset: "today",
      trendPeriod: "daily",
    },
    {
      skip: !isLabAssistant,
    },
  );

  const { data: clinics } = useGetAllClinicsQuery(undefined, {
    skip: isLabAssistant,
  });

  const base: any = (clinics as any)?.result ?? clinics ?? {};
  const clinic = base?.clinic ?? null;

  const clinicName = clinic?.clinicName ?? "Infinity MediSetu";
  const clinicTagline = clinic?.tagline ?? clinic?.Tagline ?? "";
  const labName = capitalizeDisplayName(
    labAppointmentTests?.labName ?? labAppointmentTests?.lab?.name,
  );
  const headerTitle = isLabAssistant
    ? labName || "Lab Assistant"
    : clinicName;

  const [notifOpen, setNotifOpen] = useState(false);
  const [, setProfileOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ✅ NEW: clearing state
  const [isClearingAll, setIsClearingAll] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const { isOpen: logoutOpen, onOpenChange: onLogoutOpenChange } =
    useDisclosure();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t))
        setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(t))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const afterLogout = () => {
    try {
      dispatch(logout());
      dispatch(clearActiveRole());
    } catch (e) {
      console.error("logout failed", e);
    }
    setProfileOpen(false);
    navigate("/login");
  };

  const onNotificationClick = (n: UiNotification) => {
    const nid = String(n.id);
    if (busyId === nid || isClearingAll) return;

    setBusyId(nid);

    const route = resolveNotificationRoute(n);

    setNotifOpen(false);
    dispatch(removeNotification(nid));

    if (route) navigate(route);

    markNotificationAsRead(nid)
      .catch((e) => console.error("markNotificationAsRead failed", e))
      .finally(() => setBusyId(null));
  };

  // ✅ NEW: Clear all notifications
  const onClearAllNotifications = async () => {
    if (isClearingAll) return;
    if (!list || list.length === 0) return;

    setIsClearingAll(true);

    const ids = list.map((n: any) => String(n?.id)).filter(Boolean);

    // 1) mark all as read (best-effort)
    await Promise.allSettled(ids.map((id) => markNotificationAsRead(id)));

    // 2) remove from redux
    ids.forEach((id) => dispatch(removeNotification(id)));

    setIsClearingAll(false);
    setNotifOpen(false);
  };

  const notifPanelClass = isMobile
    ? "fixed left-3 right-3 top-14 z-50"
    : "absolute right-0 mt-3 z-50 w-[380px] max-w-[calc(100vw-1.5rem)]";

  return (
    <>
      <header className="flex items-center justify-between px-2 sm:px-6 h-12 sm:h-[60px] bg-white border-b border-gray-200 relative">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          {onOpenLeft && (
            <button
              type="button"
              onClick={onOpenLeft}
              className="xl:hidden inline-flex h-8 w-8 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
              aria-label="Open menu"
            >
              <FiMenu className="text-gray-700" />
            </button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
            {clinic?.clinicLogo && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 overflow-hidden sm:h-10 sm:w-10">
                <img
                  src={clinic.clinicLogo}
                  alt={clinicName}
                  className="h-7 w-7 p-1 sm:h-8 sm:w-8"
                />
              </div>
            )}

            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-semibold text-gray-900 sm:text-base dark:text-white">
                {headerTitle}
              </div>
              {clinicTagline && !isLabAssistant && (
                <div className="hidden truncate text-[10px] text-slate-500 sm:block dark:text-slate-400">
                  {clinicTagline}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {onOpenRight && (
            <button
              type="button"
              onClick={onOpenRight}
              className="xl:hidden inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
              aria-label="Open right panel"
            >
              <FiColumns className="text-gray-700" />
            </button>
          )}

          <div className="hidden sm:block">
            <LiveClock />
          </div>
          {/* Role Switcher Dropdown */}
          <RoleSwitcherDropdown />
          <div className="hidden sm:block">
            <FullscreenToggle />
          </div>
          {/* Dark mode toggle */}
          <div className="relative group inline-block">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDark ? (
                <FiSun className="text-yellow-400 text-lg" />
              ) : (
                <FiMoon className="text-gray-700 text-lg" />
              )}
            </button>
            <span
              className="absolute top-full left-1/2 -translate-x-1/2 
    whitespace-nowrap bg-white text-black dark:text-white text-xs 
    px-2 py-1 rounded-md shadow-md
    opacity-0 group-hover:opacity-100 
    transition duration-200 pointer-events-none"
            >
              {isDark ? "Light mode" : "Dark mode"}
            </span>
          </div>

          <div className="relative group inline-block">
            <button
              onClick={() =>
                window.open(
                  `/app/guidelines?from=${location.pathname}`,
                  "_blank",
                )
              }
              className="inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FiBookOpen className="text-lg" />
            </button>

            {/* Tooltip */}
            <span
              className="absolute top-full left-1/2 -translate-x-1/2 
    whitespace-nowrap bg-white text-black text-xs 
    px-2 py-1 rounded-md shadow-md
    opacity-0 group-hover:opacity-100 
    transition duration-200"
            >
              Open Guidelines
            </span>
          </div>

          <div className="relative group inline-block">
            <OfflineGuideModal />
          </div>

          <div className="relative group inline-block">
            <SyncStatusPanel />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              className="relative inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              onClick={() => setNotifOpen((p) => !p)}
              aria-label="Notifications"
            >
              <FiBell size={18} className="text-gray-700" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && isMobile && (
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/20"
                onClick={() => setNotifOpen(false)}
                aria-label="Close notifications"
              />
            )}

            {notifOpen && (
              <div className={notifPanelClass}>
                <div className="w-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Notifications
                      </p>
                      <p className="text-xs text-gray-500">
                        {unread > 0
                          ? `${unread} unread`
                          : list.length === 0
                            ? "No notifications"
                            : "All caught up"}
                      </p>
                    </div>

                    {/* ✅ NEW: Clear all button */}
                    {list.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearAllNotifications}
                        disabled={isClearingAll}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClearingAll ? "Clearing..." : "Clear all"}
                      </button>
                    )}
                  </div>

                  <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto py-2">
                    {list.length === 0 && (
                      <p className="text-gray-500 text-sm px-4 py-3">
                        You have no notifications right now.
                      </p>
                    )}

                    {list
                      .slice()
                      .sort((a: any, b: any) => {
                        const diff = toMs(b?.ts) - toMs(a?.ts);
                        if (diff !== 0) return diff;
                        return String(b?.id ?? "").localeCompare(
                          String(a?.id ?? ""),
                        );
                      })
                      .map((n: any) => {
                        const notif = n as UiNotification;
                        const nid = String(notif.id);
                        const isBusy = busyId === nid;

                        return (
                          <button
                            key={nid}
                            type="button"
                            disabled={isBusy || isClearingAll}
                            className={`w-full text-left px-4 py-3 transition-colors ${isBusy || isClearingAll
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-gray-50"
                              }`}
                            onClick={() => onNotificationClick(notif)}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notif.read ? "bg-gray-300" : "bg-emerald-500"
                                  }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 break-words">
                                  {notif.title}
                                </p>
                                {notif.body ? (
                                  <p className="mt-0.5 text-xs text-gray-600 line-clamp-2 break-words">
                                    {notif.body}
                                  </p>
                                ) : null}

                                <p className="mt-1 text-[11px] text-gray-400">
                                  {formatNotificationTime(notif.ts)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      <LogoutModal
        isOpen={logoutOpen}
        onOpenChange={onLogoutOpenChange}
        onConfirm={afterLogout}
      />
    </>
  );
};

export default Header;

