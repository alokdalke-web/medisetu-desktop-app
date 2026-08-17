import { Chip } from "@heroui/react";
import React from "react";
import { FiClipboard, FiInfo } from "react-icons/fi";

import type { AppointmentServicesCardProps } from "../../../types/appointment";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    val
  );

const HoverPopoverCard = ({
  icon,
  title,
  helperText,
  rightContent,
  hoverTitle,
  hoverContent,
  largeHover = false,
}: {
  icon: React.ReactNode;
  title: string;
  helperText?: string;
  rightContent?: React.ReactNode;
  hoverTitle?: string;
  hoverContent?: React.ReactNode;
  largeHover?: boolean;
}) => {
  const popoverW = largeHover ? "w-[min(620px,calc(100vw-48px))]" : "w-[min(460px,calc(100vw-48px))]";
  return (
    <div className="group relative flex items-center gap-2.5">
      {/* Icon */}
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
        {icon}
      </div>

      {/* Text */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-semibold text-slate-700">{title}</span>
        {helperText && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600">
            <FiInfo className="h-3 w-3" />
            {helperText}
          </span>
        )}
      </div>

      {/* Right badge (e.g. Refunded) */}
      {rightContent && <div className="ml-2 shrink-0">{rightContent}</div>}

      {/* Hover popover */}
      {hoverContent && (
        <div
          className={`pointer-events-none fixed left-1/2 top-1/2 z-[9999] hidden -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-teal-100 bg-surface p-4 opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition-all duration-200 lg:block group-hover:pointer-events-auto group-hover:opacity-100 ${popoverW}`}
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
              {icon}
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-slate-800">{hoverTitle || title}</h4>
              <p className="text-[11px] text-slate-500">{largeHover ? "Full reason" : "Full details"}</p>
            </div>
          </div>
          <div className="mt-3 rounded-[16px] bg-slate-50 px-4 py-3">{hoverContent}</div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════ */
const AppointmentServicesCard: React.FC<AppointmentServicesCardProps> = ({
  appointmentData: _a,
  showReasonColumn,
  hasSymptoms,
  symptoms = [],
  reasonLabel,
  reasonText,
}) => {
  const hasReason = showReasonColumn && Boolean(reasonText?.trim());
  // const isRefunded = a?.paymentStatus === "Refunded";
  // const refundAmount =
  //   a?.refundedAmount !== null && a?.refundedAmount !== undefined
  //     ? formatCurrency(Number(a?.refundedAmount))
  //     : "—";
  // const refundMode = a?.refundMode || "—";
  // const refundNotes = String(a?.refundNotes || "").trim();
  // const hasRefundDetails = isRefunded || Boolean(refundNotes);
  // const paymentStatusText = String(a?.paymentStatus || "—");

  const visibleSymptoms = Array.isArray(symptoms)
    ? symptoms
      .map((item: any) => (typeof item === "string" ? item : item?.name))
      .filter((name: any) => String(name ?? "").trim().length > 0)
      .map((name: any) => String(name).trim())
    : [];
  const maxVisibleSymptoms = 4;
  const shownSymptoms = visibleSymptoms.slice(0, maxVisibleSymptoms);
  const remainingSymptomsCount = Math.max(visibleSymptoms.length - maxVisibleSymptoms, 0);
  const showSymptomsCard = hasSymptoms && visibleSymptoms.length > 0;

  const hasBottomSection = hasReason || showSymptomsCard;

  // The service summary (total, payment status, extra services, Add Service) now
  // lives inside the Service Details card. This card only shows the extra context
  // (reason / refund details / symptoms) and hides entirely when there's none.
  if (!hasBottomSection) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-surface px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-5">

      {/* ════ Reason | Payment Status (refund) | Symptoms ════ */}
      {hasBottomSection && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">

          {/* Reschedule / cancel reason */}
          {hasReason && (
            <HoverPopoverCard
              icon={<FiClipboard size={14} />}
              title={reasonLabel || "Reason"}
              helperText="Hover to view full reason"
              largeHover
              hoverTitle={reasonLabel || "Reason"}
              hoverContent={
                <div className="flex items-start gap-3">
                  <FiInfo className="mt-1 h-4 w-4 shrink-0 text-teal-600" />
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-slate-700">
                    {reasonText}
                  </p>
                </div>
              }
            />
          )}



          {/* Symptoms chips */}
          {showSymptomsCard && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-slate-400 shrink-0">
                Symptoms:
              </span>
              {shownSymptoms.map((symptomName: string) => (
                <Chip
                  key={symptomName}
                  size="sm"
                  variant="flat"
                  color="success"
                  className="h-6 max-w-[150px] px-2.5 text-[11px] font-semibold text-teal-700"
                >
                  <span className="truncate">{symptomName}</span>
                </Chip>
              ))}
              {remainingSymptomsCount > 0 && (
                <Chip size="sm" variant="flat" className="h-6 px-2.5 text-[11px] font-semibold text-slate-600">
                  +{remainingSymptomsCount} more
                </Chip>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AppointmentServicesCard;
