import React from "react";
import { Button } from "@heroui/react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";
import { OnboardingStepSkeleton } from "./OnboardingStepSkeleton";

interface ApprovalPendingPanelProps {
  isChecking: boolean;
  onCheckStatus: () => void;
  status?: string | null;
  onUpdateProfile?: () => void;
  onRequestReview?: () => void;
  isRequestingReview?: boolean;
  onGoToDashboard?: () => void;
}

const ApprovalPendingPanel: React.FC<ApprovalPendingPanelProps> = ({
  isChecking,
  onCheckStatus,
  status,
  onUpdateProfile,
  onRequestReview,
  isRequestingReview,
  onGoToDashboard,
}) => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const isRejected =
    normalizedStatus === "rejected" || normalizedStatus === "inactive";

  if (isChecking && !status) {
    return <OnboardingStepSkeleton variant="verification" showFooter={false} />;
  }

  if (isRejected) {
    return (
      <RejectedPanel
        onUpdateProfile={onUpdateProfile}
        onRequestReview={onRequestReview}
        isRequestingReview={isRequestingReview}
        onGoToDashboard={onGoToDashboard}
      />
    );
  }

  return <PendingPanel isChecking={isChecking} onCheckStatus={onCheckStatus} onGoToDashboard={onGoToDashboard} />;
};

/* ─────────────── Pending Panel ─────────────── */

const pendingSteps = [
  { title: "Clinic Information", status: "Completed", type: "completed" },
  { title: "Profile Details", status: "Completed", type: "completed" },
  { title: "Approval Pending", status: "In Progress", type: "pending" },
];

const PendingPanel: React.FC<{
  isChecking: boolean;
  onCheckStatus: () => void;
  onGoToDashboard?: () => void;
}> = ({ isChecking, onCheckStatus, onGoToDashboard }) => (
  <main className="flex min-h-0 w-full flex-1 justify-center ">
    <section className="no-scrollbar relative mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col items-center overflow-y-auto rounded-[22px] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]  dark:border-slate-700 dark:bg-slate-800 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] lg:rounded-[28px]  2xl:max-w-[1240px]">
      <div className="relative mx-auto flex w-full max-w-[920px] flex-col items-center pt-[clamp(14px,2dvh,50px)] text-center">
        {/* Illustration */}
        <div className="mb-3 ">
          <svg width="180" height="117" viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="120" rx="70" ry="6" fill="#E8F6F4" className="dark:opacity-20" />
            <path d="M30 115c0-12 5-22 10-22s6 10 6 22" stroke="#0A6C74" strokeWidth="1.5" fill="none" />
            <ellipse cx="32" cy="90" rx="5" ry="7" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="0.8" className="dark:opacity-20" />
            <ellipse cx="40" cy="95" rx="4" ry="6" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="0.8" className="dark:opacity-20" />
            <path d="M160 115c0-10 4-16 7-16s5 6 5 16" stroke="#0A6C74" strokeWidth="1.2" fill="none" />
            <ellipse cx="162" cy="97" rx="4" ry="5.5" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="0.8" className="dark:opacity-20" />
            <ellipse cx="169" cy="100" rx="3.5" ry="5" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="0.8" className="dark:opacity-20" />
            <ellipse cx="55" cy="55" rx="18" ry="12" fill="#F0FAF9" className="dark:opacity-20" />
            <ellipse cx="145" cy="50" rx="16" ry="10" fill="#F0FAF9" className="dark:opacity-20" />
            <path d="M155 20l8-4-3 7z" fill="#0A6C74" opacity="0.7" />
            <path d="M148 26l7-6" stroke="#0A6C74" strokeWidth="0.8" strokeDasharray="3 2" />
            <path d="M70 18l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" fill="#0A6C74" opacity="0.2" />
            <path d="M135 30l1 2 2 .3-1.5 1.5.3 2-2-1-2 1 .3-2-1.5-1.5 2-.3z" fill="#0A6C74" opacity="0.15" />
            <rect x="60" y="30" width="50" height="70" rx="6" fill="white" stroke="#0A6C74" strokeWidth="2.2" className="dark:fill-slate-700" />
            <rect x="77" y="23" width="16" height="10" rx="4" fill="#0A6C74" />
            <circle cx="74" cy="50" r="5" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M72 50l2 2 3.5-3.5" stroke="#0A6C74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="83" y="48" width="20" height="3.5" rx="1.7" fill="#0A6C74" opacity="0.2" />
            <circle cx="74" cy="65" r="5" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M72 65l2 2 3.5-3.5" stroke="#0A6C74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="83" y="63" width="20" height="3.5" rx="1.7" fill="#0A6C74" opacity="0.2" />
            <circle cx="74" cy="80" r="5" fill="#E8F6F4" stroke="#0A6C74" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M72 80l2 2 3.5-3.5" stroke="#0A6C74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="83" y="78" width="20" height="3.5" rx="1.7" fill="#0A6C74" opacity="0.2" />
            <circle cx="130" cy="65" r="20" fill="white" stroke="#0A6C74" strokeWidth="2.5" className="dark:fill-slate-700" />
            <circle cx="130" cy="65" r="14" fill="#F0FAF9" stroke="#0A6C74" strokeWidth="1.2" className="dark:opacity-20" />
            <path d="M130 55v10l5 5" stroke="#0A6C74" strokeWidth="2" strokeLinecap="round" />
            <circle cx="130" cy="65" r="2" fill="#0A6C74" />
          </svg>
        </div>

        <h2 className="text-[24px] font-bold leading-tight text-slate-900 dark:text-white sm:text-[28px]">
          Waiting for approval
        </h2>

        <div className="mt-3 space-y-1">
          <p className="text-[14px] text-slate-600 dark:text-slate-400 sm:text-[15px]">
            Your clinic information and profile details are submitted.
          </p>
          <p className="text-[14px] text-slate-600 dark:text-slate-400 sm:text-[15px]">
            The remaining setup steps will unlock when a super admin activates your account.
          </p>
        </div>

        {/* Step Cards */}
        <div className="mt-8 w-full max-w-[880px]">
          <div className="flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center md:gap-0">
            {pendingSteps.map((step, index) => {
              const isCompleted = step.type === "completed";
              const isPending = step.type === "pending";
              const isLast = index === pendingSteps.length - 1;

              return (
                <React.Fragment key={step.title}>
                  <div
                    className={[
                      "flex min-w-0 flex-1 items-center gap-4 rounded-2xl border px-5 py-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:bg-slate-800",
                      isPending
                        ? "border-[#F3C967]/70 bg-[#FFFCF2] dark:border-[#F5C344]/30"
                        : "border-[#BDE7D1] bg-[#F3FBF6] dark:border-slate-700",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                        isCompleted
                          ? "bg-[#DDF5E7] text-[#18A15F] dark:bg-primary/20 dark:text-primary-hover"
                          : "bg-[#FFF0C9] text-[#F4A51C] dark:bg-[#F5C344]/20 dark:text-[#F5C344]",
                      ].join(" ")}
                    >
                      {isCompleted ? (
                        <FiCheckCircle className="h-6 w-6" />
                      ) : (
                        <FiClock className="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white sm:text-[16px]">
                        {step.title}
                      </h3>
                      <p
                        className={[
                          "mt-1 text-[13px] font-bold",
                          isCompleted ? "text-[#18A15F] dark:text-primary-hover" : "text-[#E5940B] dark:text-[#F5C344]",
                        ].join(" ")}
                      >
                        {step.status}
                      </p>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="hidden shrink-0 items-center md:flex">
                      <div className={`h-[7px] w-[7px] rounded-full ${index === 0 ? "bg-[#BDE7D1]" : "bg-[#F3C967]"}`} />
                      <div className={`h-[2px] w-8 border-t-2 border-dashed ${index === 0 ? "border-[#BDE7D1]" : "border-[#F3C967]"}`} />
                      <div className={`h-[7px] w-[7px] rounded-full ${index === 0 ? "bg-[#BDE7D1]" : "bg-[#F3C967]"}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex w-full max-w-[880px] flex-col items-stretch gap-4 rounded-2xl border border-[#D9EEEC] bg-[#F2FBFA] p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] dark:border-primary/20 dark:bg-primary/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DFF4F1] text-primary dark:bg-primary/20 dark:text-primary-hover">
              <FiBell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-slate-900 dark:text-white">We'll notify you</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                You will receive an email once your account is approved.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {onGoToDashboard && (
              <Button
                className="h-12 min-w-[170px] rounded-xl border-1 border-[#0A6C74] bg-white px-6 text-[14px] font-bold text-[#0A6C74] transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-primary-hover dark:bg-slate-800 dark:text-primary-hover dark:hover:bg-slate-700"
                radius="lg"
                variant="bordered"
                startContent={<FiGrid className="h-4 w-4" />}
                onPress={onGoToDashboard}
              >
                Go to Dashboard
              </Button>
            )}
            <Button
              className="h-12 min-w-[170px] rounded-xl bg-[#0A6C74] px-6 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(10,108,116,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#075d64] dark:bg-primary-hover dark:shadow-[0_4px_14px_rgba(70,190,174,0.3)] dark:hover:bg-primary"
              radius="lg"
              isLoading={isChecking}
              startContent={!isChecking ? <FiRefreshCw className="h-4 w-4" /> : null}
              onPress={onCheckStatus}
            >
              Check Status
            </Button>
          </div>
        </div>
      </div>
    </section>
  </main>
);

/* ─────────────── Rejected Panel ─────────────── */

const rejectedSteps = [
  { title: "Clinic Information", status: "Completed", type: "completed" },
  { title: "Profile Details", status: "Completed", type: "completed" },
  { title: "Application Rejected", status: "Action Required", type: "rejected" },
];

const RejectedPanel: React.FC<{
  onUpdateProfile?: () => void;
  onRequestReview?: () => void;
  isRequestingReview?: boolean;
  onGoToDashboard?: () => void;
}> = () => (
  <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1">
    <section className="no-scrollbar relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-800 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] md:p-6 lg:rounded-[28px] lg:p-7 xl:p-8">
      <div className="relative flex flex-col items-center text-center">
        {/* Illustration */}
        <div className="mb-2">
          <svg width="160" height="104" viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="120" rx="70" ry="6" fill="#FEF2F2" className="dark:opacity-20" />
            {/* Left leaves */}
            <path d="M30 115c0-12 5-22 10-22s6 10 6 22" stroke="#DC2626" strokeWidth="1.5" fill="none" opacity="0.4" />
            <ellipse cx="32" cy="90" rx="5" ry="7" fill="#FEF2F2" stroke="#DC2626" strokeWidth="0.8" opacity="0.5" className="dark:opacity-20" />
            <ellipse cx="40" cy="95" rx="4" ry="6" fill="#FEF2F2" stroke="#DC2626" strokeWidth="0.8" opacity="0.5" className="dark:opacity-20" />
            {/* Right leaves */}
            <path d="M160 115c0-10 4-16 7-16s5 6 5 16" stroke="#DC2626" strokeWidth="1.2" fill="none" opacity="0.4" />
            <ellipse cx="162" cy="97" rx="4" ry="5.5" fill="#FEF2F2" stroke="#DC2626" strokeWidth="0.8" opacity="0.5" className="dark:opacity-20" />
            <ellipse cx="169" cy="100" rx="3.5" ry="5" fill="#FEF2F2" stroke="#DC2626" strokeWidth="0.8" opacity="0.5" className="dark:opacity-20" />
            {/* Clipboard */}
            <rect x="60" y="30" width="50" height="70" rx="6" fill="white" stroke="#DC2626" strokeWidth="2.2" className="dark:fill-slate-700" />
            <rect x="77" y="23" width="16" height="10" rx="4" fill="#DC2626" />
            {/* X marks on rows */}
            <circle cx="74" cy="50" r="5" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M71.5 47.5l5 5M76.5 47.5l-5 5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="83" y="48" width="20" height="3.5" rx="1.7" fill="#DC2626" opacity="0.2" />
            <circle cx="74" cy="65" r="5" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M71.5 62.5l5 5M76.5 62.5l-5 5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="83" y="63" width="20" height="3.5" rx="1.7" fill="#DC2626" opacity="0.2" />
            <circle cx="74" cy="80" r="5" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" className="dark:opacity-20" />
            <path d="M71.5 77.5l5 5M76.5 77.5l-5 5" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="83" y="78" width="20" height="3.5" rx="1.7" fill="#DC2626" opacity="0.2" />
            {/* Warning shield */}
            <path d="M130 45l15 5v12c0 10-6 18-15 22-9-4-15-12-15-22V50l15-5z" fill="white" stroke="#DC2626" strokeWidth="2.5" className="dark:fill-slate-700" />
            <path d="M130 45l15 5v12c0 10-6 18-15 22-9-4-15-12-15-22V50l15-5z" fill="#FEF2F2" opacity="0.5" className="dark:opacity-20" />
            <path d="M130 57v10" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="130" cy="72" r="1.5" fill="#DC2626" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-[20px] font-bold leading-tight text-[#DC2626] dark:text-red-400 sm:text-[24px]">
          Application Rejected
        </h2>

        {/* Description */}
        <div className="mt-1 space-y-0.5">
          <p className="text-[13px] text-slate-600 dark:text-slate-400 sm:text-[14px]">
            Your application was reviewed and could not be approved at this time.
          </p>
          <p className="text-[13px] text-slate-600 dark:text-slate-400 sm:text-[14px]">
            Please update your details and submit for re-review.
          </p>
        </div>

        {/* Step Cards */}
        <div className="mt-4 w-full max-w-[620px]">
          <div className="flex items-stretch justify-center">
            {rejectedSteps.map((step, index) => {
              const isCompleted = step.type === "completed";
              const isRejected = step.type === "rejected";
              const isLast = index === rejectedSteps.length - 1;

              return (
                <React.Fragment key={step.title}>
                  <div
                    className={[
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-white px-3 py-3 dark:bg-slate-800 sm:px-4 sm:py-3",
                      isRejected
                        ? "border-[#DC2626]/30 dark:border-red-500/30 shadow-[0_2px_8px_rgba(220,38,38,0.06)]"
                        : "border-slate-200 dark:border-slate-700",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isCompleted
                          ? "bg-[#0A6C74] text-white"
                          : "bg-[#FEF2F2] dark:bg-red-900/20 text-[#DC2626] dark:text-red-400",
                      ].join(" ")}
                    >
                      {isCompleted ? (
                        <FiCheckCircle className="h-4 w-4" />
                      ) : (
                        <FiXCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <h3 className="text-[12px] font-semibold leading-tight text-slate-900 dark:text-white sm:text-[13px]">
                        {step.title}
                      </h3>
                      <p
                        className={[
                          "mt-0.5 text-[11px] font-medium",
                          isCompleted ? "text-[#0A6C74] dark:text-primary-hover" : "text-[#DC2626] dark:text-red-400",
                        ].join(" ")}
                      >
                        {step.status}
                      </p>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="mx-0.5 flex shrink-0 items-center">
                      <div className={`h-[5px] w-[5px] rounded-full border-2 ${index === 0 ? "border-[#0A6C74]/40" : "border-[#DC2626]/40 dark:border-red-500/40"} bg-white dark:bg-slate-800`} />
                      <div className={`h-[2px] w-2 ${index === 0 ? "bg-[#0A6C74]/20" : "bg-[#DC2626]/30 dark:bg-red-500/30"}`} />
                      <div className={`h-[5px] w-[5px] rounded-full border-2 ${index === 0 ? "border-[#0A6C74]/40" : "border-[#DC2626]/40 dark:border-red-500/40"} bg-white dark:bg-slate-800`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-4 w-full max-w-[620px] rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 dark:border-red-900/50 dark:bg-red-900/20 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DC2626]/10 dark:bg-red-500/20 text-[#DC2626] dark:text-red-400 mt-0.5">
              <FiAlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-[#991B1B] dark:text-red-300 sm:text-[14px]">
                What can you do?
              </p>
              <ul className="mt-1 space-y-1 text-[12px] text-[#7F1D1D] dark:text-red-200 sm:text-[13px]">
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#DC2626] dark:bg-red-400" />
                  Update your clinic or profile details if any information was incorrect.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#DC2626] dark:bg-red-400" />
                  Ensure all required documents and information are provided.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#DC2626] dark:bg-red-400" />
                  Submit again for re-review once you've made changes.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 h-px w-full bg-slate-200 dark:bg-slate-700" />

        {/* Footer */}
        <div className="mt-3 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="flex items-center gap-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626] dark:bg-red-900/20 dark:text-red-400">
              <FiAlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900 dark:text-white">Need help?</p>
              <p className="text-[12px] text-slate-600 dark:text-slate-400">
                Contact support if you believe this was a mistake.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default ApprovalPendingPanel;
