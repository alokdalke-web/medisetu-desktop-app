import { FiArrowRight, FiCheckCircle } from "react-icons/fi";
import type { SetupProgressBannerProps } from "../../../../types/doctorDash";

const APPROVAL_LOCKED_TITLE = "Available after account approval";
const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const SetupProgressBanner = ({ progress, navigate, isNavigationDisabled = false }: SetupProgressBannerProps) => {
  const lockedTitle = isNavigationDisabled ? APPROVAL_LOCKED_TITLE : undefined;

  return (
    <div className="rounded-[16px] border border-line bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-[220px]">
          <h3 className="text-[15px] font-semibold text-text">{progress.title}</h3>
          <p className="mt-4 text-[13px] font-semibold text-text-muted">
            {progress.completed} of {progress.total} steps completed
          </p>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {progress.steps.map((step) => {
            const isDone = step.status === "completed";
            return (
              <button
                key={`${step.stepNumber}-${step.title}`}
                type="button"
                disabled={isNavigationDisabled}
                title={lockedTitle}
                onClick={() => step.path && navigate(step.path)}
                className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#151e31] ${disabledNavClass}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-[#e6fbf7] text-[#0a6c74] ring-4 ring-[#eefbf8] dark:bg-[#16352f] dark:text-[#9be7dc] dark:ring-[#0d1e1b]"
                      : "bg-[#eef1ff] text-[#6b5bd6] ring-4 ring-[#f4f2ff] dark:bg-[#1d2440] dark:text-[#c8b6ff] dark:ring-[#151e31]"
                  }`}
                >
                  {isDone ? <FiCheckCircle className="h-5 w-5" /> : <span className="text-[15px] font-bold">{step.stepNumber}</span>}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-text">
                    {step.title}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] font-medium ${
                      isDone ? "text-[#27b77a]" : "text-text-muted"
                    }`}
                  >
                    {step.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:flex-row sm:items-center xl:flex-col xl:items-end">
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={() => navigate(progress.ctaPath)}
            className={`cursor-pointer rounded-lg bg-[#0a6c74] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(10,108,116,0.18)] transition hover:bg-[#085a61] ${disabledNavClass}`}
          >
            {progress.ctaLabel}
          </button>
          <button
            type="button"
            disabled={isNavigationDisabled}
            title={lockedTitle}
            onClick={() => navigate(progress.ctaPath)}
            className={`flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[#0a6c74] transition hover:underline dark:text-[#9be7dc] ${disabledNavClass}`}
          >
            {progress.secondaryLabel} <FiArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupProgressBanner;
