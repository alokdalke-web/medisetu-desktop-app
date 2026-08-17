import { motion } from "framer-motion";
import {
  FiClock,
  FiCreditCard,
  FiDroplet,
  FiInfo,
  FiLock,
  FiSettings,
} from "react-icons/fi";

import { type TrackingStep } from "../../../../../redux/api/labAssistantApi";
import { formatTimestamp } from "../trackingUtils";
export function ResultNotAvailablePlaceholder({
  isPaid,
  sampleStatus,
  nextActionLabel,
  steps,
}: {
  isPaid: boolean;
  sampleStatus?: string;
  nextActionLabel?: string | null;
  steps?: TrackingStep[];
}) {
  const isPaymentCompleted = isPaid;
  const isProcessingCompleted =
    sampleStatus &&
    !["PENDING", "SAMPLE_COLLECTED", "COLLECTED", "RECEIVED_AT_LAB"].includes(
      sampleStatus,
    );
  const isWaitingForReportReady = true;

  const sampleProcessingStep = steps?.find((s) => s.key === "SAMPLE_PROCESSING");
  const processingTimestamp = sampleProcessingStep?.timestamp;
  const expectedReportReadyAt = sampleProcessingStep?.expectedReportReadyAt;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[420px]"
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
        <FiLock className="text-2xl" />
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white border-2 border-white">
          <FiDroplet className="text-[8px]" />
        </span>
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        Result Entry Not Available Yet
      </h2>
      <p className="mt-1.5 max-w-md text-xs font-medium text-slate-500">
        Result details will appear once the workflow reaches Report Ready.
      </p>

      <div className="mt-8 grid gap-4 w-full sm:grid-cols-3">
        <div
          className={`rounded-xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isPaymentCompleted
            ? "border-emerald-200 bg-emerald-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-xl ${isPaymentCompleted
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-slate-200 text-slate-500"
                  }`}
              >
                <FiCreditCard className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Payment Completed
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              Payment has been successfully verified for this test.
            </p>
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPaymentCompleted
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isPaymentCompleted ? "bg-emerald-500" : "bg-slate-400"
                }`}
            />
            {isPaymentCompleted ? "Completed" : "Pending"}
          </span>
        </div>

        <div
          className={`rounded-xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isProcessingCompleted
            ? "border-blue-200 bg-blue-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`grid h-7 w-7 place-items-center rounded-xl ${isProcessingCompleted
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-slate-200 text-slate-500"
                  }`}
              >
                <FiSettings className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Sample Processing
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              The sample has been processed and is ready for testing.
            </p>
            {isProcessingCompleted && processingTimestamp && (
              <p className="mt-2 text-[10px] font-semibold text-slate-550 text-slate-500">
                Processed: <span className="text-slate-700">{formatTimestamp(processingTimestamp)}</span>
              </p>
            )}
            {expectedReportReadyAt && (
              <p className="mt-1 text-[10px] font-semibold text-slate-550 text-slate-500">
                Expected: <span className="text-amber-600 font-bold">{formatTimestamp(expectedReportReadyAt)}</span>
              </p>
            )}
          </div>
          <span
            className={`mt-3 inline-flex items-center gap-1.5 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${isProcessingCompleted
              ? "bg-blue-50 text-blue-700"
              : "bg-slate-100 text-slate-500"
              }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isProcessingCompleted ? "bg-blue-500" : "bg-slate-400"
                }`}
            />
            {isProcessingCompleted ? "Completed" : "Pending"}
          </span>
        </div>

        <div
          className={`rounded-xl border p-4 text-left flex flex-col justify-between min-h-[120px] transition-all ${isWaitingForReportReady
            ? "border-amber-200 bg-amber-50/20"
            : "border-slate-200 bg-slate-50/50"
            }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <FiClock className="text-sm" />
              </div>
              <h3 className="text-xs font-semibold text-slate-900">
                Waiting for Report Ready
              </h3>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 leading-normal">
              Results are locked until verification is completed.
            </p>
            {expectedReportReadyAt && (
              <p className="mt-2 text-[10px] font-semibold text-slate-550 text-slate-500">
                Expected Ready: <span className="text-amber-600 font-bold">{formatTimestamp(expectedReportReadyAt)}</span>
              </p>
            )}
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 w-full rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between text-left">
        <div className="flex items-start gap-3 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FiInfo className="text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-900">
              Current next step:{" "}
              <span className="font-semibold text-primary">
                {nextActionLabel || "Process Sample"}
              </span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Waiting for verification completion.
            </p>
          </div>
        </div>

      </div>

      <p className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
        <FiLock className="text-[9px]" />
        For data integrity, results cannot be viewed or edited until the report
        is marked as ready.
      </p>
    </motion.section>
  );
}
