import { useState, useRef, useEffect } from "react";
import { Spinner } from "@heroui/react";
import { motion } from "framer-motion";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiMoreVertical,
  FiPauseCircle,
  FiXCircle,
} from "react-icons/fi";

import {
  canUploadReport,
  formatCurrency,
  type LabTestRow,
} from "../labData";
import {
  LabStatusBadge,
  PaymentBadge,
  SampleStatusBadge,
} from "./LabStatusBadge";

export type LabTestTableMode = "all" | "assigned" | "my";
export type LabTestTableView = "list" | "card";

type LabTestTableProps = {
  mode: LabTestTableMode;
  view?: LabTestTableView;
  rows: LabTestRow[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onHold: (row: LabTestRow) => void;
  onReject: (row: LabTestRow) => void;
  onMarkPaid: (row: LabTestRow) => void;
  onViewInvoice?: (row: LabTestRow) => void;
  onViewTracking: (row: LabTestRow) => void;
  onEnterResult?: (row: LabTestRow) => void;
  onUploadReport?: (row: LabTestRow) => void;
  isMutating?: boolean;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextPage?: number | null;
  previousPage?: number | null;
};

const tableHeaders = {
  all: [
    "Patient",
    "Doctor",
    "Test Name",
    "Category",
    "Price",
    "Date & Time",
    "Status",
    "Action",
  ],
  assigned: [
    "Patient",
    "Doctor",
    "Test Name",
    "Category",
    "Price",
    "Date & Time",
    "Status",
    "Payment",
  ],
  my: [
    "Patient",
    "Doctor",
    "Test Name",
    "Category",
    "Price",
    "Date & Time",
    "Status",
    "Payment",
    "Sample",
    "Action",
  ],
};

const columnWidths: Record<LabTestTableMode, string[]> = {
  all: ["17%", "11%", "15%", "10%", "7%", "12%", "11%", "17%"],
  assigned: ["18%", "12%", "17%", "11%", "8%", "12%", "12%", "10%"],
  my: ["15%", "10%", "14%", "9%", "7%", "11%", "10%", "7%", "8%", "9%"],
};

const avatarColors = [
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
  "bg-amber-50 text-amber-600",
];

const thClass =
  "px-5 py-4 align-middle text-[13px] font-bold text-slate-500";

const tdClass = "px-5 py-4 align-middle";

const actionThClass =
  "px-5 py-4 align-middle text-center text-[13px] font-bold text-slate-500";

const actionTdClass = "px-5 py-4 align-middle text-center";

function getInitials(name: string) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "NA";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarClass(name: string) {
  const value = String(name ?? "");
  const total = value
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarColors[total % avatarColors.length];
}

function PatientCell({ row }: { row: LabTestRow }) {
  const patientDetails = [
    row.patientMobile,
    row.patientAge ? `${row.patientAge} yrs` : null,
    row.patientGender,
  ].filter(Boolean);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black ${getAvatarClass(
          row.patientName,
        )}`}
      >
        {getInitials(row.patientName)}
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-bold text-slate-950">
            {row.patientName}
          </span>
          {row.isIndependent && (
            <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-normal text-amber-700">
              Walk-in
            </span>
          )}
        </div>

        {patientDetails.length > 0 && (
          <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
            {patientDetails.join(" | ")}
          </div>
        )}

      </div>
    </div>
  );
}

function TestNameCell({ row }: { row: LabTestRow }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[14px] font-bold text-slate-950">
        {row.testName}
      </div>

      {row.uniqueTestId && (
        <div
          className="mt-0.5 truncate text-[12px] font-medium text-slate-500"
          title={`Test ID: ${row.uniqueTestId}`}
        >
          Test ID: <span className="font-mono">{row.uniqueTestId}</span>
        </div>
      )}

    
    </div>
  );
}

function getBackendStatusLabel(status: LabTestRow["status"]) {
  return String(status ?? "-");
}

function InvoiceIconButton({
  row,
  onViewInvoice,
  isMutating,
}: {
  row: LabTestRow;
  onViewInvoice?: (row: LabTestRow) => void;
  isMutating?: boolean;
}) {
  if (!onViewInvoice) return null;

  const title = row.invoiceNumber
    ? `View invoice ${row.invoiceNumber}`
    : "View invoice";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onViewInvoice(row);
      }}
      disabled={isMutating}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-primary transition-all duration-200 hover:bg-primary/5 hover:text-primary-active focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      title={title}
      aria-label={title}
    >
      <FiFileText className="text-sm" />
    </button>
  );
}

function ActionCell({
  row,
  mode,
  onHold,
  onReject,
  onMarkPaid,
  onViewInvoice,
  onViewTracking,
  onEnterResult,
  onUploadReport: _onUploadReport,
  isMutating,
}: {
  row: LabTestRow;
  mode: LabTestTableMode;
  onHold: (row: LabTestRow) => void;
  onReject: (row: LabTestRow) => void;
  onMarkPaid: (row: LabTestRow) => void;
  onViewInvoice?: (row: LabTestRow) => void;
  onViewTracking: (row: LabTestRow) => void;
  onEnterResult?: (row: LabTestRow) => void;
  onUploadReport?: (row: LabTestRow) => void;
  isMutating?: boolean;
}) {
  const isPaid = String(row.paymentStatus).toLowerCase() === "paid";
  const isRejected = row.status === "REJECTED";

  const canUseReportActions = canUploadReport(
    row.paymentStatus,
    row.sampleStatus,
  );

  const canEnterResult = canUseReportActions;
  const canUploadPdf = canUseReportActions;

  const reportPdfUrl =
    typeof row.reportPdf === "string" && row.reportPdf.trim()
      ? row.reportPdf.trim()
      : null;

  if (mode === "all") {
    if (row.status !== "INITIATED") {
      return (
        <div className="flex w-full items-center justify-center whitespace-nowrap">
          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500">
            No action
          </span>
        </div>
      );
    }

    if (row.isAvailableInLabCatalog === false) {
      return (
        <div className="flex w-full items-center justify-center whitespace-nowrap">
          <span
            title="Not Test available"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500"
          >
            Not Test available
          </span>
        </div>
      );
    }

    return (
      <div className="flex w-full items-center justify-center gap-2 whitespace-nowrap">
        <button
          type="button"
          onClick={() => onHold(row)}
          disabled={isRejected || isMutating}
          className="inline-flex h-9 min-w-[88px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-3 text-[11px] font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-white focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <FiPauseCircle className="text-xs" />
          Accept
        </button>

        <button
          type="button"
          onClick={() => onReject(row)}
          disabled={isRejected || isMutating}
          className="inline-flex h-9 min-w-[82px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[11px] font-bold text-red-600 transition-all duration-200 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FiXCircle className="text-xs" />
          Reject
        </button>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="flex w-full items-center justify-center whitespace-nowrap">
        <button
          type="button"
          onClick={() => onMarkPaid(row)}
          disabled={isMutating}
          className="inline-flex h-9 min-w-[96px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-[11px] font-bold text-amber-700 transition-all duration-200 hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark Paid
        </button>
      </div>
    );
  }

  if (canEnterResult || canUploadPdf || reportPdfUrl) {
    return (
      <div className="flex w-full items-center justify-center gap-2 whitespace-nowrap">
        {canEnterResult && onEnterResult && (
          <button
            type="button"
            onClick={() => onEnterResult(row)}
            disabled={isMutating}
            className="inline-flex h-9 min-w-[108px] items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(0,128,128,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-active hover:shadow-[0_12px_24px_rgba(0,128,128,0.26)] focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiEdit3 className="text-xs" />
            {row.resultId ? "Edit Result" : "Enter Result"}
          </button>
        )}

        <InvoiceIconButton
          row={row}
          onViewInvoice={onViewInvoice}
          isMutating={isMutating}
        />

        {reportPdfUrl && (
          <a
            href={reportPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-primary transition-all duration-200 hover:bg-slate-50 hover:text-primary-active"
            title="Download PDF"
          >
            <FiDownload />
          </a>
        )}

        <button
          type="button"
          className="grid h-9 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="More actions"
        >
          <FiMoreVertical />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center gap-2 whitespace-nowrap">
      <InvoiceIconButton
        row={row}
        onViewInvoice={onViewInvoice}
        isMutating={isMutating}
      />

      <button
        type="button"
        onClick={() => onViewTracking(row)}
        disabled={isMutating}
        className="cursor-pointer inline-flex h-9 min-w-[80px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-sm transition-all duration-200 hover:border-primary/25 hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiEye className="text-xs" />
        View
      </button>

      <button
        type="button"
        className="grid h-9 w-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
        aria-label="More actions"
      >
        <FiMoreVertical />
      </button>
    </div>
  );
}

function MobileTestCard({
  row,
  mode,
  onHold,
  onReject,
  onMarkPaid,
  onViewInvoice,
  onViewTracking,
  onEnterResult,
  onUploadReport,
  isMutating,
}: {
  row: LabTestRow;
  mode: LabTestTableMode;
  onHold: (row: LabTestRow) => void;
  onReject: (row: LabTestRow) => void;
  onMarkPaid: (row: LabTestRow) => void;
  onViewInvoice?: (row: LabTestRow) => void;
  onViewTracking: (row: LabTestRow) => void;
  onEnterResult?: (row: LabTestRow) => void;
  onUploadReport?: (row: LabTestRow) => void;
  isMutating?: boolean;
}) {
  const barcodeValue = row.barcode?.value?.trim();
  const showBarcodeValue =
    barcodeValue && barcodeValue !== row.uniqueTestId?.trim();
  const patientDetails = [
    row.patientMobile,
    row.patientAge ? `${row.patientAge} yrs` : null,
    row.patientGender,
  ].filter(Boolean);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={mode === "assigned" ? () => onViewTracking(row) : undefined}
      className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] ${
        mode === "assigned" ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black ${getAvatarClass(
              row.patientName,
            )}`}
          >
            {getInitials(row.patientName)}
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-black text-slate-950">
                {row.testName}
              </p>
              {row.isIndependent && (
                <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-normal text-amber-700">
                  Walk-in
                </span>
              )}
            </div>

            {row.uniqueTestId && (
              <p
                className="mt-1 truncate text-xs font-semibold text-slate-500"
                title={`Test ID: ${row.uniqueTestId}`}
              >
                Test ID: <span className="font-mono">{row.uniqueTestId}</span>
              </p>
            )}

            {showBarcodeValue && (
              <p
                className="mt-0.5 truncate text-xs font-semibold text-slate-500"
                title={`Barcode: ${barcodeValue}`}
              >
                Barcode: <span className="font-mono">{barcodeValue}</span>
              </p>
            )}

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {row.testCategory}
            </p>
          </div>
        </div>

        <LabStatusBadge
          status={row.status}
          label={getBackendStatusLabel(row.status)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-400">Patient</p>
          <p className="mt-1 font-black text-slate-800">{row.patientName}</p>
          {patientDetails.length > 0 && (
            <p className="mt-0.5 truncate font-semibold text-slate-500">
              {patientDetails.join(" | ")}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-400">Doctor</p>
          <p className="mt-1 font-black text-slate-800">{row.doctorName}</p>
          <p className="mt-0.5 truncate font-semibold text-slate-500">
            {row.doctorMeta}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-400">Price</p>
          <p className="mt-1 font-black text-slate-800">
            {formatCurrency(row.testPrice)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <p className="font-semibold text-slate-400">Date & Time</p>
          <p className="mt-1 font-black text-slate-800">
            {row.date}, {row.time}
          </p>
        </div>
      </div>

      {mode !== "all" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-bold text-slate-500">Payment</span>
          <PaymentBadge status={row.paymentStatus} />
        </div>
      )}

      {mode === "my" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-bold text-slate-500">Sample</span>
          <SampleStatusBadge status={row.sampleStatus} />
        </div>
      )}

      {mode !== "assigned" && (
        <div className="mt-4" onClick={(event) => event.stopPropagation()}>
          <ActionCell
            row={row}
            mode={mode}
            onHold={onHold}
            onReject={onReject}
            onMarkPaid={onMarkPaid}
            onViewInvoice={onViewInvoice}
            onViewTracking={onViewTracking}
            onEnterResult={onEnterResult}
            onUploadReport={onUploadReport}
            isMutating={isMutating}
          />
        </div>
      )}
    </motion.article>
  );
}

function TableSkeleton({ mode }: { mode: LabTestTableMode }) {
  const columns = tableHeaders[mode].length;

  return (
    <>
      {Array.from({ length: 7 }).map((_, row) => (
        <tr key={row} className="animate-pulse">
          {Array.from({ length: columns }).map((__, col) => (
            <td key={col} className="px-4 py-4 align-middle">
              <div className="h-4 rounded-full bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PageSizeDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [6, 10, 15];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35 bg-white px-3 text-[13px] font-semibold text-primary shadow-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        <span>{value}</span>
        <FiChevronDown
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="py-1">
            {options.map((opt) => {
              const isActive = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`flex h-9 w-full items-center px-3 text-left text-[13px] transition-colors ${
                    isActive
                      ? "bg-[#0A6C74] text-white"
                      : "text-[#677294] hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getPaginationRange(currentPage: number, totalPages: number): (number | string)[] {
  const range: (number | string)[] = [];
  
  if (totalPages <= 6) {
    for (let i = 1; i <= totalPages; i++) {
      range.push(i);
    }
    return range;
  }

  // If currentPage is near the start
  if (currentPage <= 3) {
    range.push(1, 2, 3, 4);
    range.push("...");
    range.push(totalPages);
    return range;
  }

  // If currentPage is near the end
  if (currentPage >= totalPages - 3) {
    range.push(1);
    range.push("...");
    for (let i = totalPages - 3; i <= totalPages; i++) {
      range.push(i);
    }
    return range;
  }

  // Otherwise in the middle
  range.push(1);
  range.push("...");
  range.push(currentPage, currentPage + 1, currentPage + 2, currentPage + 3);
  
  const gap = totalPages - (currentPage + 3);
  if (gap === 1) {
    range.push(totalPages);
  } else if (gap === 2) {
    range.push(totalPages - 1, totalPages);
  } else if (gap > 2) {
    range.push("...", totalPages);
  }
  
  return range;
}

export function LabTestTable({
  mode,
  view = "list",
  rows,
  isLoading,
  page,
  pageSize,
  totalRows,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onHold,
  onReject,
  onMarkPaid,
  onViewInvoice,
  onViewTracking,
  onEnterResult,
  onUploadReport,
  isMutating,
  hasNextPage,
  hasPreviousPage,
  nextPage,
  previousPage,
}: LabTestTableProps) {
  const headers = tableHeaders[mode];
  const widths = columnWidths[mode];
  const showActionColumn = headers.includes("Action");
  const isCardView = view === "card";

  const firstResult = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, totalRows);

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${
          isCardView ? "hidden" : "hidden md:block"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-left">
            <colgroup>
              {widths.map((width, index) => (
                <col key={`${mode}-${index}`} style={{ width }} />
              ))}
            </colgroup>

            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200/80">
                {headers.map((header) => (
                  <th
                    key={header}
                    className={header === "Action" ? actionThClass : thClass}
                  >
                    <div
                      className={
                        header === "Action"
                          ? "flex w-full items-center text-center justify-center"
                          : "flex w-full items-center"
                      }
                    >
                      {header}
                      {/* {header !== "Action" && <SortIcon />} */}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <TableSkeleton mode={mode} />
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-12 text-center text-sm font-semibold text-slate-500"
                  >
                    No tests found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.rawId || row.id}
                    onClick={
                      mode === "assigned"
                        ? () => onViewTracking(row)
                        : undefined
                    }
                    className={`transition-all duration-200 hover:bg-slate-50/80 ${
                      mode === "assigned" ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className={tdClass}>
                      <PatientCell row={row} />
                    </td>

                    <td className={tdClass}>
                      <div className="truncate text-[14px] font-bold text-slate-950">
                        {row.doctorName}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] font-medium text-slate-500">
                        {row.doctorMeta}
                      </div>
                    </td>

                    <td className={tdClass}>
                      <TestNameCell row={row} />
                    </td>

                    <td className={tdClass}>
                      <span
                        className="inline-flex max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md bg-blue-50 px-2.5 py-1 text-[12px] font-bold text-blue-600"
                        title={row.testCategory}
                      >
                        {row.testCategory}
                      </span>
                    </td>

                    <td className={`${tdClass} text-[14px] font-bold text-slate-950`}>
                      {formatCurrency(row.testPrice)}
                    </td>

                    <td className={tdClass}>
                      <div className="text-[14px] font-bold text-slate-900">{row.date}</div>
                      <div className="mt-0.5 text-[12px] font-medium text-slate-500">
                        {row.time}
                      </div>
                    </td>

                    <td className={tdClass}>
                      <LabStatusBadge
                        status={row.status}
                        label={getBackendStatusLabel(row.status)}
                      />
                    </td>

                    {(mode === "assigned" || mode === "my") && (
                      <td className={tdClass}>
                        <PaymentBadge status={row.paymentStatus} />
                      </td>
                    )}

                    {mode === "my" && (
                      <td className={tdClass}>
                        <SampleStatusBadge status={row.sampleStatus} />
                      </td>
                    )}

                    {showActionColumn && (
                      <td
                        className={actionTdClass}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ActionCell
                          row={row}
                          mode={mode}
                          onHold={onHold}
                          onReject={onReject}
                          onMarkPaid={onMarkPaid}
                          onViewInvoice={onViewInvoice}
                          onViewTracking={onViewTracking}
                          onEnterResult={onEnterResult}
                          onUploadReport={onUploadReport}
                          isMutating={isMutating}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3.5 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium">
            Showing {firstResult} to {lastResult} of {totalRows} results
          </span>

          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
            <span className="hidden whitespace-nowrap sm:inline-block">Rows per page:</span>
            <PageSizeDropdown value={pageSize} onChange={onPageSizeChange} />

            <button
              type="button"
              onClick={() => onPageChange(previousPage ?? Math.max(1, page - 1))}
              disabled={hasPreviousPage !== undefined ? !hasPreviousPage : page <= 1}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <FiChevronLeft />
            </button>

            {getPaginationRange(page, totalPages).map((item, index) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="grid h-9 w-9 place-items-center text-slate-400 font-bold"
                  >
                    ...
                  </span>
                );
              }
              const pageNum = item as number;
              const isActive = pageNum === page;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`grid h-9 min-w-9 place-items-center rounded-lg font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-[0_8px_18px_rgba(0,128,128,0.18)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onPageChange(nextPage ?? Math.min(totalPages, page + 1))}
              disabled={hasNextPage !== undefined ? !hasNextPage : page >= totalPages}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </motion.div>

      <div
        className={`grid gap-3 ${
          isCardView ? "md:grid-cols-2 xl:grid-cols-3" : "md:hidden"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
            <Spinner size="sm" />
            <span className="ml-2">Loading tests...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No tests found
          </div>
        ) : (
          rows.map((row) => (
            <MobileTestCard
              key={row.rawId || row.id}
              row={row}
              mode={mode}
              onHold={onHold}
              onReject={onReject}
              onMarkPaid={onMarkPaid}
              onViewInvoice={onViewInvoice}
              onViewTracking={onViewTracking}
              onEnterResult={onEnterResult}
              onUploadReport={onUploadReport}
              isMutating={isMutating}
            />
          ))
        )}
      </div>

      <div
        className={`flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between ${
          isCardView
            ? "rounded-none border-0 bg-transparent px-0 py-3 shadow-none"
            : "rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden"
        }`}
      >
        <span className="font-semibold">
          Showing {firstResult} to {lastResult} of {totalRows} results
        </span>

        <div className="flex items-center gap-2">
          <span className="text-[#677294] font-medium whitespace-nowrap">Rows per page:</span>
          <PageSizeDropdown value={pageSize} onChange={onPageSizeChange} />

          <button
            type="button"
            onClick={() => onPageChange(previousPage ?? Math.max(1, page - 1))}
            disabled={hasPreviousPage !== undefined ? !hasPreviousPage : page <= 1}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <FiChevronLeft />
          </button>

          {getPaginationRange(page, totalPages).map((item, index) => {
            if (item === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="grid h-9 w-9 place-items-center text-slate-400 font-bold"
                >
                  ...
                </span>
              );
            }
            const pageNum = item as number;
            const isActive = pageNum === page;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`grid h-9 min-w-9 place-items-center rounded-xl font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-primary text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(nextPage ?? Math.min(totalPages, page + 1))}
            disabled={hasNextPage !== undefined ? !hasNextPage : page >= totalPages}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
