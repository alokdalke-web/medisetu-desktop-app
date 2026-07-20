import type { ActiveBoardStatus, StatusMetaMap, StatusToUserStatusMap } from "./types";

export const BOARD_STATUSES: ActiveBoardStatus[] = [
  "Pending",
  "Reviewing",
  "Approved",
  "Rejected",
];

export const STATUS_TO_USER_STATUS: StatusToUserStatusMap = {
  Pending: "Pending",
  Approved: "Active",
  Reviewing: "Reviewing",
  Rejected: "Rejected",
  Archive: "Archive",
};

export const STATUS_META: StatusMetaMap = {
  Pending: {
    color: "warning",
    className: "border-amber-200 bg-amber-50/60",
  },
  Approved: {
    color: "success",
    className: "border-emerald-200 bg-emerald-50/60",
  },
  Reviewing: {
    color: "primary",
    className: "border-sky-200 bg-sky-50/60",
  },
  Rejected: {
    color: "danger",
    className: "border-rose-200 bg-rose-50/60",
  },
  Archive: {
    color: "default",
    className: "border-slate-200 bg-slate-50/70",
  },
};

export const KPI_CARD_CONFIG = [
  {
    title: "Total",
    key: "total" as const,
    description: "All profile requests",
    iconName: "FiList",
    iconBg: "bg-slate-50",
    progressColor: "bg-slate-500",
  },
  {
    title: "Pending",
    key: "pending" as const,
    description: "Awaiting review",
    iconName: "FiClock",
    iconBg: "bg-amber-50",
    progressColor: "bg-amber-500",
  },
  {
    title: "Approved",
    key: "approved" as const,
    description: "Successfully approved",
    iconName: "FiThumbsUp",
    iconBg: "bg-emerald-50",
    progressColor: "bg-emerald-500",
  },
  {
    title: "Rejected",
    key: "rejected" as const,
    description: "Requests declined",
    iconName: "FiAlertCircle",
    iconBg: "bg-rose-50",
    progressColor: "bg-rose-500",
  },
];
