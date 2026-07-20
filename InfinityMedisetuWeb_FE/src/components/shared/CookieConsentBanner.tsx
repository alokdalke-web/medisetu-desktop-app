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
        <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-[#1e1b4b] via-[#1e2248] to-[#162032] p-5 shadow-2xl shadow-indigo-950/30">
          {/* Cookie icon + Header */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 ring-1 ring-amber-400/30">
              <MdOutlineCookie className="h-5.5 w-5.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-white">
                Cookie Preferences
              </h3>
              <p className="mt-1 text-[12.5px] leading-[1.6] text-indigo-200/70">
                We use cookies to keep you logged in, understand how you use IMS, and improve your experience.
              </p>
            </div>
          </div>

          {/* Preference details */}
          {showDetails && (
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              {/* Essential */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                    <FiShield className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">Essential</p>
                    <p className="text-[11px] text-indigo-300/60">Login, security & sessions</p>
                  </div>
                </div>
                <Toggle checked disabled onChange={() => {}} />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15">
                    <svg className="h-3.5 w-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">Analytics</p>
                    <p className="text-[11px] text-indigo-300/60">Usage data & performance</p>
                  </div>
                </div>
                <Toggle checked={analyticsChecked} onChange={setAnalyticsChecked} />
              </div>

              {/* Functional */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
                    <FiSettings className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">Functional</p>
                    <p className="text-[11px] text-indigo-300/60">Preferences & UI settings</p>
                  </div>
                </div>
                <Toggle checked={functionalChecked} onChange={setFunctionalChecked} />
              </div>

              {/* Save custom */}
              <button
                type="button"
                onClick={handleSavePreferences}
                className="mt-1 w-full rounded-lg bg-amber-400 px-4 py-2 text-[12px] font-semibold text-[#1e1b4b] transition-colors hover:bg-amber-300"
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
                className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-medium text-indigo-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                <FiSettings className="h-3 w-3" />
                Customize
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleRejectNonEssential}
              className="rounded-lg px-3 py-2 text-[12px] font-medium text-indigo-300/70 transition-colors hover:text-white hover:bg-white/5"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-[12px] font-semibold text-[#1e1b4b] shadow-md shadow-amber-500/20 transition-all hover:bg-amber-300 active:scale-[0.97]"
            >
              <FiCheck className="h-3.5 w-3.5" />
              Accept All
            </button>
          </div>

          {/* Policy link */}
          <div className="mt-3 border-t border-white/8 pt-3 text-center">
            <a
              href="/cookie-policy"
              className="text-[11px] font-medium text-indigo-300/50 hover:text-amber-400 transition-colors"
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
