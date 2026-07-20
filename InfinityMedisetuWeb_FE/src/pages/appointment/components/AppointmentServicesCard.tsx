import { Chip } from "@heroui/react";
import React from "react";
import { FiClipboard, FiInfo, FiShield } from "react-icons/fi";

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
type AppointmentServicesCardProps = {
  appointmentData: any;
  clinicService: any;
  priceText: string;
  additionalServices: any[];
  additionalServicesTotal: number;
  setIsAddServiceModalOpen: (open: boolean) => void;
  isConfirmedStatus: boolean;
  isCompletedStatus: boolean;
  isCancelledStatus: boolean;
  isActionBusy: boolean;
  showReasonColumn: boolean;
  hasSymptoms: boolean;
  symptoms?: any[];
  primaryServicePriceText: string;
  expireText: string;
  paymentModeDisplay: string;
  reasonLabel: string;
  reasonText: string;
};

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */
const formatCurrency = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

/* ─────────────────────────────────────────────────────────
   Payment status badge
───────────────────────────────────────────────────────── */
const getPaymentStatusStyles = (status: string) => {
  const n = String(status || "").trim().toLowerCase();
  if (n === "paid" || n === "already paid" || n === "success" || n === "covered")
    return { wrapper: "border border-teal-200 bg-teal-50 text-teal-700", dot: "bg-teal-600" };
  if (n === "refunded")
    return { wrapper: "border border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-600" };
  if (n === "pending")
    return { wrapper: "border border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (n === "failed" || n === "unpaid")
    return { wrapper: "border border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" };
  return { wrapper: "border border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-500" };
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const displayStatus = (!status || status.trim() === "" || status.trim() === "—") ? "Covered" : status;
  const { wrapper, dot } = getPaymentStatusStyles(displayStatus);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${wrapper}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {displayStatus}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────
   Mini info box (used inside hover popovers)
───────────────────────────────────────────────────────── */
const MiniInfoBox = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-[14px] border border-slate-100 bg-white px-3 py-3 text-center shadow-sm">
    <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    <div className="mt-1 text-[15px] font-bold text-slate-900">{children}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Hover popover card (Reason / Payment Status)
───────────────────────────────────────────────────────── */
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
          className={`pointer-events-none fixed left-1/2 top-1/2 z-[9999] hidden -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-teal-100 bg-white p-4 opacity-0 shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition-all duration-200 lg:block group-hover:pointer-events-auto group-hover:opacity-100 ${popoverW}`}
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
  appointmentData: a,
  showReasonColumn,
  hasSymptoms,
  symptoms = [],
  reasonLabel,
  reasonText,
}) => {
  const hasReason = showReasonColumn && Boolean(reasonText?.trim());
  const isRefunded = a?.paymentStatus === "Refunded";
  const refundAmount =
    a?.refundedAmount !== null && a?.refundedAmount !== undefined
      ? formatCurrency(Number(a?.refundedAmount))
      : "—";
  const refundMode = a?.refundMode || "—";
  const refundNotes = String(a?.refundNotes || "").trim();
  const hasRefundDetails = isRefunded || Boolean(refundNotes);
  const paymentStatusText = String(a?.paymentStatus || "—");

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

  const hasBottomSection = hasReason || showSymptomsCard || hasRefundDetails;

  // The service summary (total, payment status, extra services, Add Service) now
  // lives inside the Service Details card. This card only shows the extra context
  // (reason / refund details / symptoms) and hides entirely when there's none.
  if (!hasBottomSection) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-5">

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

          {/* Payment Status with refund details */}
          {hasRefundDetails && (
            <HoverPopoverCard
              icon={<FiShield size={14} />}
              title="Payment Status"
              helperText="Hover to view full details"
              rightContent={<PaymentStatusBadge status={paymentStatusText} />}
              hoverTitle="Payment Status"
              hoverContent={
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-3 py-2.5 shadow-sm">
                    <span className="text-[12px] font-semibold text-slate-500">Status</span>
                    <PaymentStatusBadge status={paymentStatusText} />
                  </div>
                  {isRefunded && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MiniInfoBox label="Refund Amount">
                        <p className="text-teal-700">{refundAmount}</p>
                      </MiniInfoBox>
                      <MiniInfoBox label="Refund Mode">
                        <p className="truncate">{refundMode}</p>
                      </MiniInfoBox>
                    </div>
                  )}
                  {refundNotes && (
                    <div className="rounded-[14px] bg-white px-3 py-3 shadow-sm">
                      <p className="text-[11px] font-bold  text-slate-500">Refund Note</p>
                      <p className="mt-2 break-words text-[12px] font-semibold leading-5 text-slate-600">
                        {refundNotes}
                      </p>
                    </div>
                  )}
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
