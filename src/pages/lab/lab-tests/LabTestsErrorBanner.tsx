import { getLabApiErrorMessage } from "../../../redux/api/labAssistantApi";

type LabTestsErrorBannerProps = {
  error: unknown;
  onRetry: () => void;
};

export function LabTestsErrorBanner({
  error,
  onRetry,
}: LabTestsErrorBannerProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{getLabApiErrorMessage(error, "Failed to load tests.")}</span>

        <button
          onClick={onRetry}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-100"
          type="button"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
