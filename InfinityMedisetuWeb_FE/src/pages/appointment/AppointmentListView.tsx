import { Avatar, Pagination } from "@heroui/react";
import React, { useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiMoreVertical,
  FiRefreshCw,
  FiSmartphone,
  FiUserX,
} from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import StatusChip from "../../components/shared/StatusChip";
import QueueStatusIcon from "../../components/appointment/QueueStatusIcon";
import MarkNoShowModal from "./MarkNoShowModal";

/* ---------------- Types ---------------- */

type Row = {
  rawId: string;
  id: string;
  name: string;
  avatar: string | null;
  age: number | null;
  gender: "Male" | "Female" | "-";
  mobile: string | null;
  date: string;
  time: string;
  appointmentDurationMinutes: number | null;
  tokenNo: number | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  refundMode: string | null;
  refundedAmount: number | null;
  refundNotes: string | null;
  servicePrice?: number | null;
  type: string;
  doctorName: string;
  qualification: string | null;
  status: string;
  isExpired: boolean;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  bookingSource?: string | null;
};

type PageSize = 6 | 10 | 15;
type Layout = "list" | "card";

export interface QueueWaitData {
  /** Map of appointmentId → estimatedWaitMinutes from real-time queue */
  waitByAppointmentId: Map<string, number>;
  hasData: boolean;
}

interface Props {
  layout: Layout;
  showSkeleton: boolean;
  /** Show a subtle loading overlay (opacity) without replacing content */
  isRefreshing?: boolean;
  rows: Row[];
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  goToDetails: (id: string) => void;
  sortDir?: "asc" | "desc" | null;
  onSortStatus?: () => void;
  /** Real-time queue wait data (optional, shown as extra column when available) */
  queueWaitData?: QueueWaitData;
  /** Whether the clinic has the no-show policy enabled */
  noShowPolicyActive?: boolean;
}

/* ---------------- UI bits ---------------- */

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#172033] ${className}`}
  />
);

const doctorDisplayName = (name: string) => {
  const clean = String(name || "").trim();
  if (!clean || clean === "—") return "—";
  return clean.toLowerCase().startsWith("dr.") ? clean : `Dr. ${clean}`;
};

/* ---------- time range helper dynamic duration ---------- */

function toTimeRange(
  raw: string,
  durationMinutes: number | null | undefined = 30,
) {
  const s = (raw || "").trim();
  if (!s || s === "—") return "—";

  let addMinutes = 30;

  if (durationMinutes !== null && durationMinutes !== undefined) {
    const parsed = Number(durationMinutes);
    addMinutes = !isNaN(parsed) && parsed > 0 ? parsed : 30;
  }

  const m1 = s.match(/^(\d{1,2}):(\d{2})$/);
  const m2 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  let total = 0;

  if (m1) {
    const h = Number(m1[1]);
    const m = Number(m1[2]);
    total = h * 60 + m;
  } else if (m2) {
    let h = Number(m2[1]);
    const m = Number(m2[2]);
    const ap = m2[3].toUpperCase();

    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;

    total = h * 60 + m;
  } else {
    return s;
  }

  const end = total + addMinutes;

  const fmt = (mins: number) => {
    const m = ((mins % 1440) + 1440) % 1440;
    const h24 = Math.floor(m / 60);
    const mm = m % 60;
    const ap = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    return `${String(h12).padStart(2, "0")}:${String(mm).padStart(
      2,
      "0",
    )} ${ap}`;
  };

  return `${fmt(total)} - ${fmt(end)}`;
}

const getPaymentModeMeta = (mode?: string | null) => {
  const value = String(mode || "").trim().toLowerCase();

  if (value === "cash") {
    return {
      icon: FaRupeeSign,
      iconClassName: "bg-emerald-50 text-emerald-600",
    };
  }

  if (value === "upi") {
    return {
      icon: FiSmartphone,
      iconClassName: "bg-violet-50 text-violet-600",
    };
  }

  if (value === "card") {
    return {
      icon: FiCreditCard,
      iconClassName: "bg-blue-50 text-blue-600",
    };
  }

  if (value === "follow-up") {
    return {
      icon: FiRefreshCw,
      iconClassName: "bg-cyan-50 text-cyan-600",
    };
  }

  if (value === "covered") {
    return {
      icon: FiCheckCircle,
      iconClassName: "bg-blue-50 text-blue-600",
    };
  }

  return {
    icon: FiCreditCard,
    iconClassName: "bg-slate-100 text-slate-500 dark:bg-[#172033] dark:text-white",
  };
};

const PaymentModeCell: React.FC<{ mode: string | null }> = ({ mode }) => {
  const label = mode === "Pay Later" ? "Pay on Visit" : mode || "—";
  const meta = getPaymentModeMeta(label);
  const Icon = meta.icon;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={[
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          meta.iconClassName,
        ].join(" ")}
      >
        <Icon className="text-[15px]" />
      </span>

      <span className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">
        {label}
      </span>
    </div>
  );
};

const PaymentStatusCell: React.FC<{ row: Row }> = ({ row }) => {
  const paymentStatus = String(row.paymentStatus || "").trim().toLowerCase();
  const isPayOnVisit =
    row.paymentMethod === "Pay Later" || row.paymentMethod === "Pay on Visit";

  if (row.paymentMethod === "Not Required") {
    return (
      <div className="min-w-0">
        <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
          Free
        </span>
        <p className="mt-1 truncate text-[12px] font-medium text-slate-500 dark:text-white">
          Consultation
        </p>
      </div>
    );
  }

  if (row.paymentStatus === "Refunded") {
    return (
      <div className="min-w-0">
        <span className="inline-flex rounded-md bg-orange-50 px-2.5 py-1 text-[12px] font-semibold text-orange-600">
          Refunded
        </span>
        <p className="mt-1 truncate text-[12px] font-medium text-slate-600 dark:text-white">
          ₹{row.refundedAmount || 0} via {row.refundMode || "-"}
        </p>
      </div>
    );
  }

  if (row.paymentStatus === "Paid" || row.paymentStatus === "Already Paid") {
    return (
      <div className="min-w-0">
        <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-600">
          Paid
        </span>
        <p className="mt-1 truncate text-[12px] font-medium text-slate-600 dark:text-white">
          ₹{row.servicePrice || 0}
          {row.paymentMethod ? ` via ${row.paymentMethod}` : ""}
        </p>
      </div>
    );
  }

  if (row.paymentStatus === "Covered") {
    return (
      <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-600">
        Covered
      </span>
    );
  }

  if (paymentStatus === "pending" || (isPayOnVisit && !row.paymentStatus)) {
    return (
      <span className="inline-flex rounded-md bg-orange-50 px-2.5 py-1 text-[12px] font-semibold text-orange-600">
        Pending
      </span>
    );
  }

  if (row.paymentStatus === "Unpaid") {
    return (
      <span className="inline-flex rounded-md bg-orange-50 px-2.5 py-1 text-[12px] font-semibold text-orange-600">
        Unpaid
      </span>
    );
  }

  return (
    <span className="truncate text-[14px] font-semibold text-slate-900 dark:text-white">
      {row.paymentStatus || "—"}
    </span>
  );
};

const getBookingSourceMeta = (source?: string | null) => {
  const value = String(source || "").trim().toLowerCase();

  switch (value) {
    case "walk_in":
      return {
        label: "Walk-In",
        className: "bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-100 dark:border-slate-800/30",
      };
    case "phone_call":
      return {
        label: "Phone Call",
        className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30",
      };
    case "web_portal":
      return {
        label: "Web Portal",
        className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30",
      };
    case "mobile_app":
      return {
        label: "Mobile App",
        className: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30",
      };
    default:
      return {
        label: source || "—",
        className: "bg-slate-50 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-100 dark:border-slate-800/30",
      };
  }
};

const BookingSourceCell: React.FC<{ source: string | null | undefined }> = ({ source }) => {
  if (!source) {
    return <span className="text-slate-400 dark:text-slate-500">—</span>;
  }
  const meta = getBookingSourceMeta(source);
  return (
    <span className={["inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold", meta.className].join(" ")}>
      {meta.label}
    </span>
  );
};

/* ---------------- Bottom Controls ---------------- */

const BottomControls: React.FC<{
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  variant?: "card" | "plain";
}> = ({
  show,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
  variant = "card",
}) => {
  const [isPageSizeOpen, setIsPageSizeOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];
  const fromRecord =
    totalRecords > 0 ? Math.min((page - 1) * rowsPerPage + 1, totalRecords) : 0;
  const toRecord = totalRecords > 0 ? Math.min(page * rowsPerPage, totalRecords) : 0;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={
        variant === "plain"
          ? "px-0 py-0"
          : "border-t border-slate-100 px-4 py-3 dark:border-[#273244]"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-center sm:justify-start">
          <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
            Showing {fromRecord} to {toRecord} of {totalRecords} appointments
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
            <span className="whitespace-nowrap">Rows per page:</span>

            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPageSizeOpen((prev) => !prev)}
                className={[
                  "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                  "bg-white px-3 text-[13px] font-semibold text-primary shadow-sm",
                  "dark:bg-[#111726] dark:text-white",
                  "outline-none transition",
                  "hover:border-primary/60 hover:bg-primary/5",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20",
                ].join(" ")}
              >
                <span>{rowsPerPage}</span>

                <FiChevronDown
                  className={`text-primary transition-transform duration-200 ${
                    isPageSizeOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isPageSizeOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                  {pageSizeOptions.map((size) => {
                    const active = rowsPerPage === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setRowsPerPage(size);
                          setIsPageSizeOpen(false);
                        }}
                        className={[
                          "flex h-9 w-full items-center px-3 text-left text-[13px] transition",
                          active
                            ? "bg-primary text-white"
                            : "bg-white text-slate-700 hover:bg-primary/5 hover:text-primary dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] dark:hover:text-white",
                        ].join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {show && totalRecords > 0 && totalPages > 1 && (
            <div className="flex justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
                onChange={setPage}
                radius="lg"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                  item:
                    "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none " +
                    "hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary " +
                    "dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  prev:
                    "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  next:
                    "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                  cursor: "hidden",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Main Component ---------------- */

const AppointmentListView: React.FC<Props> = ({
  layout,
  showSkeleton,
  isRefreshing,
  rows,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
  goToDetails,
  sortDir,
  onSortStatus,
  queueWaitData,
  noShowPolicyActive: _noShowPolicyActive,
}) => {
  const hasWaitColumn = queueWaitData?.hasData ?? false;

  // ── No-Show modal state ──
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [noShowAppointmentId, setNoShowAppointmentId] = useState<string>("");

  /** Check if a row is eligible for marking as no-show */
  const canMarkRowNoShow = (row: Row): boolean => {
    const status = row.status?.toLowerCase() ?? "";
    if (status === "completed" || status === "cancelled") return false;
    if (["noshow", "no-show", "no show"].includes(status)) return false;
    if (!(status === "pending" || status === "confirmed")) return false;

    const dateRaw = row.appointmentDate;
    if (!dateRaw) return false;

    let year = 0, month = 0, day = 0;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateRaw.trim());
    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]) - 1;
      day = Number(isoMatch[3]);
    } else {
      const dmyMatch = /^(\d{2})-(\d{2})-(\d{4})/.exec(dateRaw.trim());
      if (dmyMatch) {
        day = Number(dmyMatch[1]);
        month = Number(dmyMatch[2]) - 1;
        year = Number(dmyMatch[3]);
      } else {
        const fallbackDate = new Date(dateRaw);
        if (Number.isNaN(fallbackDate.getTime())) return false;
        year = fallbackDate.getFullYear();
        month = fallbackDate.getMonth();
        day = fallbackDate.getDate();
      }
    }

    const apptDate = new Date(year, month, day);

    const hasTokenNo = row.tokenNo !== null && row.tokenNo !== undefined;
    if (hasTokenNo) {
      apptDate.setHours(23, 59, 59, 999);
      return apptDate.getTime() < Date.now();
    }

    const timeRaw = row.appointmentTime;
    if (timeRaw) {
      const timeMatch = /(\d{1,2}):(\d{2})/.exec(timeRaw.trim());
      if (timeMatch) {
        let hours = Number(timeMatch[1]);
        const minutes = Number(timeMatch[2]);
        if (/pm/i.test(timeRaw) && hours < 12) {
          hours += 12;
        }
        if (/am/i.test(timeRaw) && hours === 12) {
          hours = 0;
        }
        apptDate.setHours(hours, minutes, 0, 0);
        return apptDate.getTime() < Date.now();
      }
    }

    apptDate.setHours(23, 59, 59, 999);
    return apptDate.getTime() < Date.now();
  };

  const handleNoShowClick = (e: React.MouseEvent, appointmentId: string) => {
    e.stopPropagation();
    setNoShowAppointmentId(appointmentId);
    setNoShowModalOpen(true);
  };
  /* ✅ LIST view */
  if (layout === "list") {
    return (
      <>
      <div className={[
        "overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none",
        isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200",
      ].join(" ")}>
        <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <table className="w-full min-w-[1180px] text-left">
            <thead className="bg-slate-50/80 dark:bg-[#111726]">
              <tr className="border-b border-slate-100 dark:border-[#273244]">
                <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Patient
                </th>

                <th className="w-[18%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Doctor
                </th>

                <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Payment Mode
                </th>

                <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Payment Status
                </th>

                <th className="w-[13%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Booking Source
                </th>

                <th className="w-[15%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                  Date &amp; Slot
                </th>

                <th
                  className="w-[12%] cursor-pointer px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white"
                  onClick={() => onSortStatus?.()}
                >
                  <div className="flex items-center gap-1">
                    Status

                    <div className="flex flex-col -space-y-1">
                      <FiChevronUp
                        className={`text-[10px] ${
                          sortDir === "asc"
                            ? "text-primary"
                            : "text-slate-300 dark:text-white"
                        }`}
                      />

                      <FiChevronDown
                        className={`text-[10px] ${
                          sortDir === "desc"
                            ? "text-primary"
                            : "text-slate-300 dark:text-white"
                        }`}
                      />
                    </div>
                  </div>
                </th>

                {hasWaitColumn && (
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <FiClock size={13} />
                      Est. Wait
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={hasWaitColumn ? 8 : 7} className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <Skel className="h-10 w-10 rounded-full" />

                        <div className="min-w-0 flex-1">
                          <Skel className="h-4 w-44" />
                          <Skel className="mt-2 h-3 w-64 max-w-[70%]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr
                    key={row.rawId}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-[#151e31]"
                    onClick={() => goToDetails(row.rawId)}
                  >
                    {/* Patient */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={row.avatar || ""}
                          name={row.name}
                          size="sm"
                          className="bg-emerald-50 text-emerald-700 dark:bg-[#16352f] dark:text-white"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">
                            {row.name}
                          </p>

                          <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">
                            {[
                              row.age != null ? `${row.age} Y` : null,
                              row.gender !== "-" ? row.gender : null,
                              row.mobile,
                            ]
                              .filter(Boolean)
                              .join("  •  ") || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Doctor */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={row.doctorName || "Doctor"}
                          size="sm"
                          className="bg-slate-100 text-slate-700 dark:bg-[#172033] dark:text-white"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">
                            {doctorDisplayName(row.doctorName)}
                          </p>

                          <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">
                            {row.qualification || row.type || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Payment Mode */}
                    <td className="px-5 py-4">
                      <PaymentModeCell mode={row.paymentMethod} />
                    </td>

                    {/* Payment Status */}
                    <td className="px-5 py-4">
                      <PaymentStatusCell row={row} />
                    </td>

                    {/* Booking Source */}
                    <td className="px-5 py-4">
                      <BookingSourceCell source={row.bookingSource} />
                    </td>

                    {/* Date & Slot */}
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-slate-950 dark:text-white">
                          {row.date || "—"}
                        </p>

                        <p className="truncate text-[12px] font-medium text-slate-500 dark:text-white">
                          {row.tokenNo != null
                            ? `Token: ${row.tokenNo}`
                            : toTimeRange(
                                row.time,
                                row.appointmentDurationMinutes,
                              )}
                        </p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusChip
                          status={row.status}
                          isExpired={row.isExpired}
                        />
                        {canMarkRowNoShow(row) && (
                          <button
                            type="button"
                            onClick={(e) => handleNoShowClick(e, row.rawId)}
                            title="Mark No-Show"
                            aria-label="Mark No-Show"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 hover:border-rose-300 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
                          >
                            <FiUserX className="text-[13px]" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Est. Wait (from real-time queue) */}
                    {hasWaitColumn && (
                      <td className="px-5 py-4">
                        {(() => {
                          const wait = queueWaitData?.waitByAppointmentId.get(row.rawId);
                          const status = row.status?.toLowerCase();

                          if (status === "completed") {
                            return <QueueStatusIcon variant="completed" />;
                          }
                          if (status === "patient arrived") {
                            return <QueueStatusIcon variant="in-progress" />;
                          }
                          if (status === "cancelled" || status === "noshow") {
                            return <QueueStatusIcon variant="cancelled" />;
                          }
                          if (wait != null && wait > 0) {
                            return <QueueStatusIcon variant="delayed" waitMinutes={wait} />;
                          }
                          // wait is 0 OR no data for active appointments → on time
                          return <QueueStatusIcon variant="on-time" />;
                        })()}
                      </td>
                    )}

                    {/* <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToDetails(row.rawId);
                          }}
                          title="View appointment"
                          aria-label="View appointment"
                        >
                          <FiEye className="text-[15px]" />
                        </button>

                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToDetails(row.rawId);
                          }}
                          title="Open appointment"
                          aria-label="Open appointment"
                        >
                          <FiMoreVertical className="text-[16px]" />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={hasWaitColumn ? 8 : 7}
                    className="h-[320px] text-center text-slate-400 dark:text-white"
                  >
                    No appointments found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <BottomControls
          show={!showSkeleton}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      </div>
      <MarkNoShowModal
        isOpen={noShowModalOpen}
        onOpenChange={setNoShowModalOpen}
        appointmentId={noShowAppointmentId}
      />
      </>
    );
  }

  /* ✅ CARD view */
  return (
    <>
    <div className={[
      "mt-3",
      isRefreshing ? "opacity-60 pointer-events-none transition-opacity duration-200" : "transition-opacity duration-200",
    ].join(" ")}>
      {showSkeleton ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skel className="h-10 w-10 rounded-full" />

                  <div>
                    <Skel className="h-4 w-28" />
                    <Skel className="mt-2 h-3 w-24" />
                  </div>
                </div>

                <Skel className="h-7 w-7 rounded-full" />
              </div>

              <Skel className="mt-4 h-12 w-full rounded-xl" />

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <Skel className="h-4 w-32" />
                  <Skel className="mt-2 h-3 w-20" />
                </div>

                <Skel className="h-7 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.rawId}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => goToDetails(row.rawId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToDetails(row.rawId);
                  }
                }}
                className="w-full p-4 text-left"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={row.avatar || ""}
                      name={row.name}
                      size="sm"
                      className="bg-slate-200 dark:bg-[#172033] dark:text-white"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-5 text-slate-900 dark:text-white">
                        {row.name}
                      </p>

                      <p className="truncate text-[12px] font-medium leading-4 text-slate-500 dark:text-white">
                        {row.mobile || "—"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-white dark:hover:bg-[#151e31]"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToDetails(row.rawId);
                    }}
                    aria-label="Action"
                  >
                    <FiMoreVertical className="text-[16px]" />
                  </button>
                </div>

                {/* Doctor strip */}
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-[#0f1728]">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={row.doctorName || "Doctor"}
                      size="sm"
                      className="bg-slate-200 dark:bg-[#172033] dark:text-white"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-5 text-slate-900 dark:text-white">
                        {row.doctorName || "—"}
                      </p>

                      <p className="truncate text-[12px] font-medium leading-4 text-primary">
                        {row.type || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#0f1728]">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-white">
                      Payment Mode
                    </p>

                    <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                      {row.paymentMethod || "—"}
                    </p>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-white">
                      Payment Status
                    </p>

                    <p className="truncate text-[13px] font-semibold">
                      {row.paymentStatus === "Refunded" ? (
                        <span className="text-orange-600">
                          ₹{row.refundedAmount || 0} Refunded
                        </span>
                      ) : row.paymentStatus === "Paid" ||
                        row.paymentStatus === "Already Paid" ? (
                        <span className="text-emerald-600">
                          ₹{row.servicePrice || 0} Paid
                        </span>
                      ) : row.paymentStatus === "Covered" ? (
                        <span className="text-blue-600">Covered</span>
                      ) : (
                        <span className="text-slate-900 dark:text-white">
                          {row.paymentStatus || "—"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <span className="mt-[5px] h-2.5 w-2.5 rounded-full bg-emerald-600" />

                    <div>
                      <p className="text-[13px] font-medium leading-5 text-slate-900 dark:text-white">
                        {row.date}
                      </p>

                      <p className="text-[12px] font-medium leading-4 text-slate-500 dark:text-white">
                        {row.tokenNo != null ? `Token: ${row.tokenNo}` : row.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canMarkRowNoShow(row) && (
                      <button
                        type="button"
                        onClick={(e) => handleNoShowClick(e, row.rawId)}
                        title="Mark No-Show"
                        aria-label="Mark No-Show"
                        className="flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] font-medium text-rose-600 transition hover:bg-rose-100 hover:border-rose-300 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400 dark:hover:bg-rose-900"
                      >
                        <FiUserX className="text-[12px]" />
                        No-Show
                      </button>
                    )}
                    <StatusChip status={row.status} isExpired={row.isExpired} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-10 text-center text-slate-400 dark:border-[#273244] dark:bg-[#111726] dark:text-white">
          No appointments found for the selected criteria.
        </div>
      )}

      <div className="mt-4 ">
        <BottomControls
          variant="plain"
          show={!showSkeleton}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
        />
      </div>
    </div>
    <MarkNoShowModal
      isOpen={noShowModalOpen}
      onOpenChange={setNoShowModalOpen}
      appointmentId={noShowAppointmentId}
    />
    </>
  );
};

export default AppointmentListView;
