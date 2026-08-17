/**
 * Widget auth-info types.
 *
 * WidgetAuthInfo uses a discriminated union: at least one of
 * `user_email` or `user_phone` must be a non-empty string.
 * This mirrors the backend Zod `.refine()` validation.
 */
type WidgetAuthInfo = {
  external_user_id?: string;
  user_name?: string;
  user_role?: string;
} & (
  | { user_email: string; user_phone?: string }
  | { user_phone: string; user_email?: string }
);

/**
 * Global API exposed by widget.js on `window.ChatWidget`.
 */
interface ChatWidgetAPI {
  open: () => void;
  close: () => void;
  toggle: () => void;
  setAuthInfo: (info: WidgetAuthInfo | null) => void;
  getAuthInfo: () => WidgetAuthInfo | null;
  setDarkMode: (isDark: boolean) => void;
  getDarkMode: () => boolean;
}

interface Window {
  ChatWidget?: ChatWidgetAPI;
}
