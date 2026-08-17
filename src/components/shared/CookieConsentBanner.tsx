import React, { useState, useEffect, useCallback } from "react";
import { FiShield, FiSettings, FiCheck } from "react-icons/fi";
import { MdOutlineCookie } from "react-icons/md";
import {
  getStoredConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  saveCustomConsent,
} from "../../utils/cookieConsent";

/* ─── Toggle Switch ─────────────────────────────────────────────────────────── */

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0a6c74]/30 ${
      checked
        ? "bg-[#0a6c74]"
        : "bg-slate-300 dark:bg-[#3a4456]"
    } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? "translate-x-[20px]" : "translate-x-[3px]"
      }`}
    />
  </button>
);

/* ─── Main Banner ───────────────────────────────────────────────────────────── */

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(true);
  const [functionalChecked, setFunctionalChecked] = useState(true);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const consent = getStoredConsent();
      if (!consent) {
        setVisible(true);
        requestAnimationFrame(() => setAnimateIn(true));
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleAcceptAll = useCallback(() => {
    acceptAllCookies();
    dismiss();
    window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
  }, [dismiss]);

  const handleRejectNonEssential = useCallback(() => {
    rejectNonEssentialCookies();
    dismiss();
    window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
  }, [dismiss]);

  const handleSavePreferences = useCallback(() => {
    saveCustomConsent({
      analytics: analyticsChecked,
      functional: functionalChecked,
    });
    dismiss();
    window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
  }, [analyticsChecked, functionalChecked, dismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop (only when details open) */}
      {showDetails && (
        <div
          className="pointer-events-auto absolute inset-0 bg-black/20 backdrop-blur-[2px] dark:bg-black/40"
          onClick={() => setShowDetails(false)}
        />
      )}

      {/* Banner */}
      <div
        className={`pointer-events-auto absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-[440px] transition-all duration-300 ease-out ${
          animateIn
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-primary/15 bg-white p-5 shadow-2xl shadow-slate-900/10 ring-1 ring-primary/5 dark:border-primary/25 dark:bg-[#0f2428] dark:shadow-black/30">
          {/* Cookie icon + Header */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 dark:bg-primary/20">
              <MdOutlineCookie className="h-5.5 w-5.5 text-primary dark:text-[#46beae]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-slate-950 dark:text-white">
                Cookie Preferences
              </h3>
              <p className="mt-1 text-[12.5px] leading-[1.6] text-slate-500 dark:text-slate-300">
                We use cookies to keep you logged in, understand how you use IMS, and improve your experience.
              </p>
            </div>
          </div>

          {/* Preference details */}
          {showDetails && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              {/* Essential */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                    <FiShield className="h-3.5 w-3.5 text-primary dark:text-[#46beae]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white">Essential</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Login, security & sessions</p>
                  </div>
                </div>
                <Toggle checked disabled onChange={() => {}} />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 ring-1 ring-cyan-100 dark:bg-cyan-500/15 dark:ring-transparent">
                    <svg className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white">Analytics</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Usage data & performance</p>
                  </div>
                </div>
                <Toggle checked={analyticsChecked} onChange={setAnalyticsChecked} />
              </div>

              {/* Functional */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-500/15 dark:ring-transparent">
                    <FiSettings className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-900 dark:text-white">Functional</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Preferences, drafts & UI settings</p>
                  </div>
                </div>
                <Toggle checked={functionalChecked} onChange={setFunctionalChecked} />
              </div>

              {/* Save custom */}
              <button
                type="button"
                onClick={handleSavePreferences}
                className="mt-1 w-full rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary-active focus:outline-none focus:ring-3 focus:ring-primary/20"
              >
                Save My Preferences
              </button>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-4 flex items-center gap-2">
            {!showDetails && (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/10 dark:text-[#46beae]"
              >
                <FiSettings className="h-3 w-3" />
                Customize
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleRejectNonEssential}
              className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-active active:scale-[0.97] focus:outline-none focus:ring-3 focus:ring-primary/20"
            >
              <FiCheck className="h-3.5 w-3.5" />
              Accept All
            </button>
          </div>

          {/* Policy link */}
          <div className="mt-3 border-t border-slate-100 pt-3 text-center dark:border-white/10">
            <a
              href="/cookie-policy"
              className="text-[11px] font-medium text-slate-400 transition-colors hover:text-primary dark:text-slate-400 dark:hover:text-[#46beae]"
            >
              Read our Cookie Policy →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
