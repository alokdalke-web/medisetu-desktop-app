import React from "react";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiShield,
  FiPhone,
  FiUser,
} from "react-icons/fi";

interface PatientFormSidebarProps {
  /** Live-watched form values for the preview card */
  watchedName?: string;
  watchedAge?: string | number;
  watchedGender?: string;
  watchedMobile?: string;
  watchedCity?: string;
  watchedState?: string;
  /** Completion percentage (0–100) based on filled required fields */
  completionPercent?: number;
  /** Whether we're in "edit" mode (shows different labels) */
  mode?: "add" | "edit";
}

/**
 * Right-hand sidebar for the Patient form pages.
 * Shows:
 * 1. Live preview card of the patient being added/edited
 * 2. Form completion progress
 * 3. Tips & guidelines relevant to Indian healthcare context
 *
 * Responsive: Hidden on mobile/tablet, visible from lg (1024px+).
 * Width: 280px on lg, 320px on xl.
 */
const PatientFormSidebar: React.FC<PatientFormSidebarProps> = ({
  watchedName,
  watchedAge,
  watchedGender,
  watchedMobile,
  watchedCity,
  watchedState,
  completionPercent = 0,
  mode = "add",
}) => {
  const displayName = watchedName?.trim() || "New Patient";
  const location = [watchedCity, watchedState].filter(Boolean).join(", ");
  const clampedPercent = Math.min(100, Math.max(0, Math.round(completionPercent)));

  return (
    <aside className="hidden lg:flex flex-col gap-4 w-[280px] xl:w-[320px] shrink-0 sticky top-4 self-start">
      {/* ─── Live Preview Card ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex flex-col items-center text-center">
          {/* Avatar placeholder */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-[22px] font-bold text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            {watchedName?.trim()
              ? watchedName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("")
              : <FiUser className="text-[24px] text-teal-400" />}
          </div>

          <h3 className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white max-w-full truncate">
            {displayName}
          </h3>

          {(watchedAge || watchedGender) && (
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              {[watchedGender, watchedAge ? `${watchedAge} yrs` : ""].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Quick details */}
        <div className="mt-4 space-y-2.5 border-t border-slate-100 dark:border-[#273244] pt-4">
          {watchedMobile && (
            <div className="flex items-center gap-2 text-[13px]">
              <FiPhone className="shrink-0 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">+91 {watchedMobile}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="shrink-0 text-slate-400 text-[14px]">📍</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{location}</span>
            </div>
          )}
          {!watchedMobile && !location && (
            <p className="text-[12px] text-slate-400 text-center italic">
              Fill the form to see a live preview here
            </p>
          )}
        </div>
      </div>

      {/* ─── Completion Progress ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13px] font-semibold text-slate-800 dark:text-white">Form Completion</h4>
          <span className={`text-[12px] font-bold ${clampedPercent === 100 ? "text-emerald-600" : "text-slate-500 dark:text-slate-400"}`}>
            {clampedPercent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#273244] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${clampedPercent === 100
              ? "bg-emerald-500"
              : clampedPercent >= 50
                ? "bg-teal-500"
                : "bg-amber-400"
              }`}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="mt-4 space-y-2">
          <CheckItem label="Full Name" done={Boolean(watchedName?.trim())} />
          <CheckItem label="Gender" done={Boolean(watchedGender)} />
          <CheckItem label="Age" done={Boolean(watchedAge)} />
          <CheckItem label="Phone Number" done={Boolean(watchedMobile && watchedMobile.length === 10)} />
          <CheckItem label="City" done={Boolean(watchedCity)} />
        </div>
      </div>

      {/* ─── Tips & Guidelines ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-[#111726] dark:border-[#273244]">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-[12px]">
            💡
          </span>
          <h4 className="text-[13px] font-semibold text-slate-800 dark:text-white">
            {mode === "add" ? "Quick Tips" : "Editing Tips"}
          </h4>
        </div>

        <div className="space-y-3">
          <TipItem
            icon={<FiInfo className="text-blue-500" />}
            text="Enter name as per Aadhaar/ID card for prescriptions and reports."
          />
          <TipItem
            icon={<FiPhone className="text-teal-500" />}
            text="SMS & WhatsApp reminders will be sent to the primary phone number."
          />
          <TipItem
            icon={<FiShield className="text-purple-500" />}
            text="Recording allergies prevents adverse drug reactions during prescriptions."
          />
          <TipItem
            icon={<FiAlertCircle className="text-amber-500" />}
            text="Medical info is optional but highly recommended for better patient care."
          />
        </div>
      </div>
    </aside>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const CheckItem: React.FC<{ label: string; done: boolean }> = ({ label, done }) => (
  <div className="flex items-center gap-2">
    {done ? (
      <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
    ) : (
      <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-slate-300 dark:border-slate-600 shrink-0" />
    )}
    <span
      className={`text-[12px] ${done ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-400"}`}
    >
      {label}
    </span>
  </div>
);

const TipItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-start gap-2.5">
    <span className="mt-0.5 shrink-0 text-[13px]">{icon}</span>
    <p className="text-[11px] leading-[1.5] text-slate-600 dark:text-slate-400">{text}</p>
  </div>
);

export default PatientFormSidebar;
