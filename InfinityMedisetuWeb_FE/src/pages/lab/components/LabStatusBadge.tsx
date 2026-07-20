import type { ReactNode } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import type { LabReportStatus } from "../labData";
import type { SampleStatus } from "../../../redux/api/labAssistantApi";

type BadgeTone = "teal" | "blue" | "green" | "orange" | "red" | "gray" | "violet";

const toneClass: Record<BadgeTone, string> = {
  teal: "border-primary/15 bg-primary/10 text-primary",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  orange: "border-amber-100 bg-amber-50 text-amber-700",
  red: "border-red-100 bg-red-50 text-red-700",
  gray: "border-slate-200 bg-slate-50 text-slate-600",
  violet: "border-violet-100 bg-violet-50 text-violet-700",
};

const statusMeta: Record<
  LabReportStatus,
  { label: string; tone: BadgeTone; icon: ReactNode }
> = {
  INITIATED: {
    label: "New Test",
    tone: "teal",
    icon: <FiFileText className="text-[12px]" />,
  },
  PENDING: {
    label: "Pending",
    tone: "orange",
    icon: <FiClock className="text-[12px]" />,
  },
  ON_HOLD: {
    label: "On Hold",
    tone: "orange",
    icon: <FiClock className="text-[12px]" />,
  },
  REJECTED: {
    label: "Rejected",
    tone: "red",
    icon: <FiX className="text-[12px]" />,
  },
  IN_PROGRESS: {
    label: "In Progress",
    tone: "blue",
    icon: <FiRefreshCw className="text-[12px]" />,
  },
  COMPLETED: {
    label: "Completed",
    tone: "green",
    icon: <FiCheckCircle className="text-[12px]" />,
  },
};

const sampleMeta: Record<SampleStatus, { label: string; tone: BadgeTone }> = {
  NOT_STARTED: { label: "Not Started", tone: "gray" },
  SAMPLE_COLLECTION_PENDING: {
    label: "Collection Pending",
    tone: "orange",
  },
  SAMPLE_COLLECTED: { label: "Sample Collected", tone: "blue" },
  SAMPLE_RECEIVED_AT_LAB: { label: "Received At Lab", tone: "blue" },
  SAMPLE_PROCESSING: { label: "Processing", tone: "teal" },
  TESTING_IN_PROGRESS: { label: "Testing in Progress", tone: "violet" },
  QUALITY_CHECK: { label: "Result Verification", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "green" },
};

const legacyStatusMeta: Partial<
  Record<string, { label: string; tone: BadgeTone; icon: ReactNode }>
> = {
  Initiated: {
    label: "New Test",
    tone: "teal",
    icon: <FiFileText className="text-[12px]" />,
  },
  Pending: {
    label: "Pending",
    tone: "orange",
    icon: <FiClock className="text-[12px]" />,
  },
  PENDING: {
    label: "Pending",
    tone: "orange",
    icon: <FiClock className="text-[12px]" />,
  },
  InProgress: {
    label: "InProgress",
    tone: "blue",
    icon: <FiRefreshCw className="text-[12px]" />,
  },
  Completed: {
    label: "Completed",
    tone: "green",
    icon: <FiCheckCircle className="text-[12px]" />,
  },
  Rejected: {
    label: "Rejected",
    tone: "red",
    icon: <FiX className="text-[12px]" />,
  },
};

export function LabStatusBadge({
  status,
  label,
}: {
  status: LabReportStatus;
  label?: string;
}) {
  const meta =
    statusMeta[status] ??
    legacyStatusMeta[String(status)] ??
    statusMeta.INITIATED;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none transition-colors",
        toneClass[meta.tone],
      ].join(" ")}
    >
      {meta.icon}
      {label ?? meta.label}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const normalized = String(status).toLowerCase();
  const paid = normalized === "paid";
  const failed = normalized === "failed";

  const className = paid
    ? toneClass.green
    : failed
      ? toneClass.red
      : toneClass.orange;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        className,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {paid ? "Paid" : failed ? "Failed" : "Pending"}
    </span>
  );
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  const meta = sampleMeta[status] ?? sampleMeta.NOT_STARTED;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        toneClass[meta.tone],
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
