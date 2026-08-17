import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

const WIDGET_SCRIPT_URL =
  import.meta.env.VITE_WIDGET_SCRIPT_URL?.trim() ?? "";

const WIDGET_DATA_KEY =
  import.meta.env.VITE_WIDGET_DATA_KEY?.trim() ?? "";

/** Safely extract phone — backend may return `phone` or `mobile`. */
function getPhone(user: Record<string, unknown>): string {
  const val = user.phone ?? user.mobile ?? "";
  return typeof val === "string" ? val : "";
}

/**
 * Build a typed auth-info payload from the current Redux user.
 * Returns `null` when there is no user session.
 */
function buildAuthInfo(
  user: ReturnType<typeof useAuth>["user"],
): WidgetAuthInfo | null {
  if (!user) return null;

  const email = typeof user.email === "string" ? user.email.trim() : "";
  const phone = getPhone(user as unknown as Record<string, unknown>).trim();

  // The discriminated union requires at least one of email or phone.
  if (!email && !phone && !user.id) return null;

  return {
    external_user_id: user.id,
    user_name: user.name || undefined,
    user_email: email || undefined,
    user_phone: phone || undefined,
    user_role: user.role || undefined,
  } as WidgetAuthInfo;
}

/**
 * Fully destroy the widget instance so the loader IIFE can re-run.
 *
 * The widget-loader IIFE sets `window.__chatWidgetLoaderInitialized`
 * as a one-time guard AND creates DOM elements (#chat-widget-container
 * with the iframe + launcher). Simply removing the <script> tag is not
 * enough — we must also remove those DOM nodes and reset the guard.
 */
function destroyWidgetInstance(): void {
  // 1. Remove DOM nodes created by the widget loader
  document.getElementById("chat-widget-container")?.remove();
  document.getElementById("chat-widget-launcher")?.remove();

  // 2. Remove any leftover <script> tags for widget.js
  document
    .querySelectorAll(`script[src="${WIDGET_SCRIPT_URL}"]`)
    .forEach((el) => el.remove());

  // 3. Reset the one-time initialization guard
  //    (defined as `window.__chatWidgetLoaderInitialized` in widget-loader/index.js)
   
  (window as any).__chatWidgetLoaderInitialized = false;

  // 4. Clear the ChatWidget API so stale methods can't be called
   
  delete (window as any).ChatWidget;
}

function hasWidgetConfiguration(): boolean {
  const missingVars = [
    !WIDGET_SCRIPT_URL && "VITE_WIDGET_SCRIPT_URL",
    !WIDGET_DATA_KEY && "VITE_WIDGET_DATA_KEY",
  ].filter(Boolean);

  if (missingVars.length === 0) return true;

  console.error(
    `[WidgetLoader] Missing support widget configuration: ${missingVars.join(
      ", ",
    )}. Widget script will not be injected.`,
  );

  return false;
}

/** Delay before re-injecting the widget after login / logout (ms). */
const RELOAD_DELAY_MS = 2000 as const;

/**
 * Renderless component that manages the widget <script> lifecycle.
 *
 * Strategy:
 *  - On initial mount → inject immediately (no delay).
 *  - On login / logout / role change → fully destroy the widget instance
 *    (DOM + guard flag), wait RELOAD_DELAY_MS, then re-inject the script
 *    so the loader IIFE boots fresh with the correct auth info.
 */
export default function WidgetLoader() {
  const { user } = useAuth();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const isInitialMount = useRef(true);

  // ── Sync app theme → widget dark mode ──
  const { isDark } = useTheme();

  useEffect(() => {
    // Dynamic updates after the widget is already running
    window.ChatWidget?.setDarkMode(isDark);
  }, [isDark]);

  // ── Inject script ──
  useEffect(() => {
    // ── Fully destroy any previous widget instance ──
    destroyWidgetInstance();
    scriptRef.current = null;

    if (!hasWidgetConfiguration()) {
      return () => {
        destroyWidgetInstance();
        scriptRef.current = null;
      };
    }

    // First mount: inject immediately. Subsequent changes: delay so the
    // old widget has time to tear down and the user context is stable.
    const delay = isInitialMount.current ? 0 : RELOAD_DELAY_MS;
    isInitialMount.current = false;

    const timer = setTimeout(() => {
      const script = document.createElement("script");
      script.src = WIDGET_SCRIPT_URL;
      script.setAttribute("data-key", WIDGET_DATA_KEY);
      script.setAttribute(
        "data-auth-info",
        JSON.stringify(buildAuthInfo(user) ?? {}),
      );
      script.setAttribute("data-dark-mode", String(isDark));
      script.async = true;

      document.body.appendChild(script);
      scriptRef.current = script;
    }, delay);

    return () => {
      clearTimeout(timer);
      destroyWidgetInstance();
      scriptRef.current = null;
    };
  }, [user]);

  return null;
}
