import { Button, Chip, Tooltip } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiPhone,
  FiPlus,
  FiStar,
  FiUpload,
  FiUser,
  FiX,
} from "react-icons/fi";
import StatusChip from "../../../components/shared/StatusChip";
import Icons from "../../../constants/icons";
import AvatarBubble from "./AvatarBubble";
import type { AppointmentSummaryCardProps } from "../../../types/appointment";

const formatCurrency = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const getServiceName = (appointmentData: any, clinicService?: any) => {
  const service =
    clinicService?.name ||
    clinicService?.serviceName ||
    appointmentData?.clinicService?.name ||
    appointmentData?.clinicService?.serviceName ||
    appointmentData?.clinic_service?.name ||
    appointmentData?.clinic_service?.serviceName ||
    appointmentData?.service?.name ||
    appointmentData?.service?.serviceName ||
    appointmentData?.serviceDetails?.name ||
    appointmentData?.serviceDetails?.serviceName ||
    appointmentData?.appointmentService?.name ||
    appointmentData?.appointmentService?.serviceName ||
    appointmentData?.primaryService?.name ||
    appointmentData?.primaryService?.serviceName ||
    appointmentData?.clinic_service_name ||
    appointmentData?.serviceName ||
    appointmentData?.service_name;

  if (service) return service;

  if (typeof appointmentData?.service === "string") {
    return appointmentData.service;
  }

  if (typeof appointmentData?.clinicService === "string") {
    return appointmentData.clinicService;
  }

  if (typeof clinicService === "string") {
    return clinicService;
  }

  return "—";
};

const getAmountText = (appointmentData: any, clinicService?: any) => {
  const isAlreadyPaid =
    String(appointmentData?.paymentStatus ?? "").trim().toLowerCase() === "already paid" ||
    String(appointmentData?.paymentMode ?? "").trim().toLowerCase() === "already paid";

  if (isAlreadyPaid) return "—";

  // NOTE: appointmentData.price is a cumulative total that grows whenever an
  // add-on service is attached to the appointment — it is NOT this service's
  // own price, so it must not be used here. primaryServicePrice (or the
  // clinic's catalog price) is the correct per-service amount.
  const amount =
    appointmentData?.primaryServicePrice ??
    clinicService?.price ??
    clinicService?.amount ??
    appointmentData?.amount ??
    appointmentData?.servicePrice ??
    appointmentData?.service_price ??
    appointmentData?.clinicService?.price ??
    appointmentData?.clinicService?.amount ??
    appointmentData?.clinic_service?.price ??
    appointmentData?.clinic_service?.amount ??
    appointmentData?.service?.price ??
    appointmentData?.service?.amount ??
    appointmentData?.serviceDetails?.price ??
    appointmentData?.appointmentService?.price ??
    appointmentData?.primaryService?.price ??
    0;

  return Number(amount) > 0 ? formatCurrency(Number(amount)) : "—";
};

const emptyDisplayValues = new Set(["", "-", "—", "null", "undefined"]);

const formatTime12 = (time?: string | null) => {
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const NEXT_PATIENT_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  Upcoming: { label: "Upcoming", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  Confirmed: { label: "Confirmed", className: "bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#46beae]" },
  "Patient Arrived": { label: "Waiting", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  Pending: { label: "Pending", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

const getPatientDetailText = (value: any) => {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  return emptyDisplayValues.has(text.toLowerCase()) ? "" : text;
};

const getAgeGenderText = (patient: any) => {
  const gender = getPatientDetailText(patient.gender);
  const age = getPatientDetailText(patient.age);

  return [gender, age ? `${age} Yrs` : ""].filter(Boolean).join(", ");
};

const getPaymentStatusStyles = (status: string) => {
  const n = String(status || "").trim().toLowerCase();
  if (n === "paid" || n === "already paid" || n === "success" || n === "covered")
    return { wrapper: "border border-teal-200 bg-teal-50 text-teal-700 dark:border-[#46beae]/35 dark:bg-[#123730] dark:text-[#9be7dc]", dot: "bg-teal-600" };
  if (n === "refunded")
    return { wrapper: "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300", dot: "bg-rose-600" };
  if (n === "pending")
    return { wrapper: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500" };
  if (n === "failed" || n === "unpaid")
    return { wrapper: "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300", dot: "bg-red-500" };
  return { wrapper: "border border-slate-200 bg-slate-50 text-slate-600 dark:border-[#273244] dark:bg-[#172033] dark:text-white", dot: "bg-slate-500" };
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const displayStatus = (!status || status.trim() === "" || status.trim() === "—") ? "Pending" : status;
  const { wrapper, dot } = getPaymentStatusStyles(displayStatus);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${wrapper}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {displayStatus}
    </span>
  );
};

const AppointmentSummaryCard: React.FC<AppointmentSummaryCardProps> = ({
  patient,
  appointment,
  doctor,
  id,
  navigate,
  canShowConsentFormButton,
  canShowUploadConsentButton,
  canShowDownloadConsentButton,
  canShowReferFormButton,
  setIsEditingConsent,
  setShowConsentForm,
  setActiveFormType,
  setIsConsentUploadModalOpen,
  handleDownloadConsent,
  setIsReferModalOpen,
  isPendingStatus,
  canCancel,
  canShowConfirm,
  isPaid,
  handleOpenInvoice,
  expireText,
  isCompletedStatus,
  setIsMedicalCertificateModalOpen,
  refetchMedicalCertificate,
  isFetchingCertificate,
  canShowRescheduleButton,
  canMarkNoShow,
  isCancelledStatus,
  isNoShowStatus,
  appointmentData: a,
  clinicService,
  additionalServices,
  priceText,
  totalAmountText,
  setIsAddServiceModalOpen,
  isActionBusy = false,
  canShowPatientArrived,
  isPayLaterPaymentPending = false,
  handlePatientArrived,
  actionsDisabled,
  actionLoading,
  showConfirmHint,
  handleConfirm,
  canShowMarkAsCompleted,
  handleMarkAsCompleted,
  setIsNoShowModalOpen,
  setIsCancelConfirmOpen,
  showCancelHint,
  setIsRefundModalOpen,
  nextPatientInfo,
  onGoToNextPatient,
  onCollapseDetails,
}) => {
  const serviceName = getServiceName(a, clinicService);

  // Show the first couple of add-on services inline; the rest are behind
  // "+N more" so a busy visit doesn't force a scrollbar into the card.
  const [showAllServices, setShowAllServices] = useState(false);

  // Click-toggle popover for refund details
  const [isRefundPopoverOpen, setIsRefundPopoverOpen] = useState(false);
  const refundPopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isRefundPopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (refundPopoverRef.current && !refundPopoverRef.current.contains(e.target as Node)) {
        setIsRefundPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isRefundPopoverOpen]);

  const amountText = getAmountText(a, clinicService);

  const [isNextPatientDismissed, setIsNextPatientDismissed] = useState(false);

  const paymentMode = a?.paymentMode ?? appointment?.paymentMode ?? "";

  const paymentModeLabel =
    typeof paymentMode === "string" && paymentMode.trim()
      ? paymentMode.trim()
      : "Covered";

  const ageGenderText = getAgeGenderText(patient);
  const contactText = getPatientDetailText(patient.contact);

  const hasFormActions =
    canShowConsentFormButton ||
    canShowUploadConsentButton ||
    canShowDownloadConsentButton ||
    canShowReferFormButton;

  const hasSummaryActions =
    canShowPatientArrived ||
    canShowRescheduleButton ||
    canMarkNoShow ||
    canCancel ||
    canShowConfirm ||
    canShowMarkAsCompleted ||
    ((isCancelledStatus || isNoShowStatus) && a?.paymentStatus !== "Refunded");

  const isPatientArrivedDisabled = actionsDisabled || isPayLaterPaymentPending;
  const totalServicesCount = 1 + additionalServices.length;
  const showPaymentAndTotalInline = totalServicesCount <= 2;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-surface p-4 dark:border-[#273244] dark:bg-[#111726] sm:p-5">
        {/* Header — patient identity + appointment status + profile link */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarBubble src={patient.avatar} />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-[15px] font-bold leading-5 text-text">
                  {patient.name}
                </p>
                <Chip
                  size="sm"
                  color="success"
                  variant="flat"
                  className="h-5 text-[11px] font-semibold"
                >
                  Active
                </Chip>
                <Tooltip
                  content="View patient profile"
                  placement="top"
                  showArrow
                  classNames={{
                    content:
                      "bg-surface px-3 py-1.5 text-[12px] font-medium text-slate-900 ",
                  }}
                >
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-surface text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                    onClick={() => navigate(`/patient/${patient.id}?fromAppt=${id}`)}
                    aria-label="View patient profile"
                  >
                    <FiEye className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                {contactText && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
                    <FiPhone className="h-3 w-3 shrink-0 text-teal-600 dark:text-white" />
                    {contactText}
                  </span>
                )}
                {ageGenderText && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
                    <FiUser className="h-3 w-3 shrink-0 text-teal-600 dark:text-white" />
                    {ageGenderText}
                  </span>
                )}
                {!contactText && !ageGenderText && (
                  <span className="text-xs font-semibold text-text-muted">Contact not available</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isPendingStatus ? (
              <Chip
                size="sm"
                radius="md"
                variant="light"
                classNames={{
                  base: "bg-amber-50 px-3 h-7 shrink-0 dark:bg-amber-500/10",
                  content: "text-amber-700 text-[12px] font-semibold dark:text-amber-300",
                }}
                startContent={
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {!canCancel && !canShowConfirm && (
                      <FiClock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                }
              >
                Pending
              </Chip>
            ) : (
              <StatusChip text={appointment.status} />
            )}

            {onCollapseDetails && (
              <button
                type="button"
                onClick={onCollapseDetails}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[12px] font-semibold text-text-muted shadow-sm transition hover:border-primary/40 hover:text-primary hover:bg-slate-50 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                aria-label="Collapse details"
              >
                <FiChevronUp className="h-3.5 w-3.5" />
                Collapse details
              </button>
            )}
          </div>
        </div>

        {/* Appointment meta — date/time, doctor, specialty, payment mode, total */}
        <div
          className={`grid grid-cols-1 gap-4 border-b border-line py-3 ${
            showPaymentAndTotalInline ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-5"
          }`}
        >
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <FiCalendar className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
             Appointment Date &amp; Slot
            </span>
            <p className="mt-1.5 truncate text-[13px] font-bold text-text">{appointment.dateRange}</p>
          </div>

          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <FiUser className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
              Doctor
            </span>
            <p className="mt-1.5 truncate text-[13px] font-bold text-text">Dr. {doctor.name || "—"}</p>
          </div>

          <div className="min-w-0">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <FiActivity className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
              Specialty
            </span>
            <p className="mt-1.5 truncate text-[13px] font-bold text-text">
              {doctor.speciality || doctor.qualification || "—"}
            </p>
          </div>

          {!showPaymentAndTotalInline && (
            <>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Payment Mode</span>
                <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500 dark:bg-surface" />
                  <span className="truncate text-[13px] font-bold text-text">{paymentModeLabel}</span>
                </div>
              </div>

              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-teal-700 dark:text-[#46beae]">
                    {totalAmountText || priceText || amountText}
                  </span>
                  <PaymentStatusBadge status={String(a?.paymentStatus || "—")} />
                  {String(a?.paymentStatus || "").toLowerCase() === "refunded" && (
                    <div ref={refundPopoverRef} className="relative">
                      <Tooltip
                        content="View refund breakdown"
                        placement="top"
                        showArrow
                        classNames={{
                          content:
                            "border border-slate-200 bg-surface px-3 py-1.5 text-[12px] font-medium text-slate-900 dark:border-[#273244] dark:text-white",
                          arrow: "bg-surface",
                        }}
                      >
                        <button
                          type="button"
                          aria-label="View refund details"
                          onClick={() => setIsRefundPopoverOpen((o) => !o)}
                          className={[
                            "cursor-pointer grid h-7 w-7 place-items-center rounded-full transition",
                            isRefundPopoverOpen
                              ? "bg-rose-100 text-rose-700 dark:bg-[#341117] dark:text-rose-300"
                              : "text-slate-400 hover:bg-slate-100 hover:text-rose-700 dark:text-slate-500 dark:hover:bg-[#1a2535] dark:hover:text-[#46beae]",
                          ].join(" ")}
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                      </Tooltip>

                      {isRefundPopoverOpen && (
                        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(290px,calc(100vw-2rem))]">
                          <div className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-[#273244] dark:bg-[#111726]">
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-[#273244]">
                              <p className="text-[12px] font-bold text-text">Refund Details</p>
                            </div>

                            <div className="space-y-2 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Appointment ID</span>
                                <span className="font-semibold text-text select-all">{appointment.id}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Refunded Amount</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  {a?.refundedAmount != null ? formatCurrency(Number(a.refundedAmount)) : "—"}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Refund Mode</span>
                                <span className="font-semibold text-text">{a?.refundMode || "—"}</span>
                              </div>
                              <div className="flex flex-col gap-1 border-t border-slate-50 pt-2 dark:border-[#273244]/50">
                                <span className="text-text-muted">Notes</span>
                                <span className="font-medium text-text bg-slate-50 dark:bg-[#172033] p-1.5 rounded-lg max-h-[80px] overflow-y-auto break-words whitespace-pre-wrap">
                                  {a?.refundNotes || "No notes provided"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Services — a responsive grid so a busy visit fills the row width
            instead of stacking into a tall single column. */}
        <div className="py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              <FiStar className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
              Services ({totalServicesCount})
            </span>
            {canCancel && !canShowConfirm && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
                <FiClock className="h-3.5 w-3.5" />
                <span className="text-text">{expireText}</span>
              </span>
            )}
          </div>

          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {/* Primary service */}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-[#0f1728]">
              <div className="min-w-0">
                <p title={serviceName} className="truncate text-[11px] font-bold uppercase text-teal-700 dark:text-[#9be7dc]">
                  {serviceName}
                </p>
                <p className="text-[10px] font-medium text-text-muted">Primary · {paymentModeLabel}</p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-text">{amountText}</span>
            </div>

            {/* Additional services — capped to 4 (one full row at the widest
                breakpoint) until expanded */}
            {(showAllServices ? additionalServices : additionalServices.slice(0, 4)).map(
              (svc: any, idx: number) => {
                const serviceObj = svc.service || svc;
                const svcPrice = Number(serviceObj.price || svc.price || 0);
                const svcName =
                  serviceObj.name || serviceObj.serviceName || svc.name || svc.serviceName || "Service";
                const svcMode = serviceObj.paymentMode || svc.paymentMode || "Cash";
                return (
                  <div
                    key={svc.id || serviceObj.id || idx}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-[#0f1728]"
                  >
                    <div className="min-w-0">
                      <p title={svcName} className="truncate text-[11px] font-bold uppercase text-teal-700 dark:text-[#9be7dc]">
                        {svcName}
                      </p>
                      <p className="text-[10px] font-medium text-text-muted">Add-on · {svcMode}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-text">
                      {svcPrice > 0 ? formatCurrency(svcPrice) : "—"}
                    </span>
                  </div>
                );
              },
            )}

            {/* Payment Mode and Total inline cards when total services count <= 2 */}
            {showPaymentAndTotalInline && (
              <>
                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-[#0f1728]">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Payment Mode
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500 dark:bg-surface" />
                      <span className="truncate text-[13px] font-bold text-text">{paymentModeLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-[#0f1728]">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      Total
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold text-text">
                        {totalAmountText || priceText || amountText}
                      </span>
                      <PaymentStatusBadge status={String(a?.paymentStatus || "—")} />
                    </div>
                  </div>
                  {String(a?.paymentStatus || "").toLowerCase() === "refunded" && (
                    <div ref={refundPopoverRef} className="relative shrink-0">
                      <Tooltip
                        content="View refund breakdown"
                        placement="top"
                        showArrow
                        classNames={{
                          content:
                            "border border-slate-200 bg-surface px-3 py-1.5 text-[12px] font-medium text-slate-900 dark:border-[#273244] dark:text-white",
                          arrow: "bg-surface",
                        }}
                      >
                        <button
                          type="button"
                          aria-label="View refund details"
                          onClick={() => setIsRefundPopoverOpen((o) => !o)}
                          className={[
                            "cursor-pointer grid h-6 w-6 place-items-center rounded-full transition",
                            isRefundPopoverOpen
                              ? "bg-rose-100 text-rose-700 dark:bg-[#341117] dark:text-rose-300"
                              : "text-slate-400 hover:bg-slate-100 hover:text-rose-700 dark:text-slate-500 dark:hover:bg-[#1a2535] dark:hover:text-[#46beae]",
                          ].join(" ")}
                        >
                          <FiEye className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      {isRefundPopoverOpen && (
                        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(290px,calc(100vw-2rem))]">
                          <div className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-[#273244] dark:bg-[#111726]">
                            <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-[#273244]">
                              <p className="text-[12px] font-bold text-text">Refund Details</p>
                            </div>

                            <div className="space-y-2 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Appointment ID</span>
                                <span className="font-semibold text-text select-all">{appointment.id}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Refunded Amount</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                  {a?.refundedAmount != null ? formatCurrency(Number(a.refundedAmount)) : "—"}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-text-muted">Refund Mode</span>
                                <span className="font-semibold text-text">{a?.refundMode || "—"}</span>
                              </div>
                              <div className="flex flex-col gap-1 border-t border-slate-50 pt-2 dark:border-[#273244]/50">
                                <span className="text-text-muted">Notes</span>
                                <span className="font-medium text-text bg-slate-50 dark:bg-[#172033] p-1.5 rounded-lg max-h-[80px] overflow-y-auto break-words whitespace-pre-wrap">
                                  {a?.refundNotes || "No notes provided"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {additionalServices.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllServices((v) => !v)}
                className="col-span-full flex items-center justify-center gap-1 rounded-lg py-1 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-[#46beae] dark:hover:bg-[#0f2925]/50"
              >
                {showAllServices ? (
                  <>
                    Show less <FiChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    +{additionalServices.length - 4} more service{additionalServices.length - 4 > 1 ? "s" : ""}{" "}
                    <FiChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer actions — document actions left, service/invoice actions right */}
        {(hasFormActions || isPaid || isCompletedStatus || Boolean(setIsAddServiceModalOpen)) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {canShowConsentFormButton && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="Consent Form"
                className="h-8 min-w-0 border border-slate-200 bg-surface px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiFileText size={14} />}
                onPress={() => {
                  setIsEditingConsent(true);
                  setShowConsentForm(true);
                }}
              >
                Consent
              </Button>
            )}

            {canShowUploadConsentButton && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="Upload Consent Form"
                className="h-8 min-w-0 border border-slate-200 bg-surface px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiUpload size={14} />}
                onPress={() => {
                  setActiveFormType("consent");
                  setIsConsentUploadModalOpen(true);
                }}
              >
                Consent
              </Button>
            )}

            {canShowDownloadConsentButton && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="Download Consent Form"
                className="h-8 min-w-0 border border-slate-200 bg-surface px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiDownload size={14} />}
                onPress={handleDownloadConsent}
              >
                Consent
              </Button>
            )}

            {canShowReferFormButton && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="View Refer Form"
                className="h-8 min-w-0 border border-slate-200 bg-surface px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiFileText size={14} />}
                onPress={() => setIsReferModalOpen(true)}
              >
                Refer Form
              </Button>
            )}

            {isPaid && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="View Invoice"
                className="h-8 min-w-0 border border-teal-200 bg-surface px-3 text-[12px] font-semibold text-teal-700 hover:bg-teal-50 dark:border-[#46beae]/45 dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiDownload size={14} />}
                onPress={handleOpenInvoice}
              >
                View Invoice
              </Button>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {isCompletedStatus && (
                <Button
                  size="sm"
                  radius="full"
                  variant="flat"
                  className="h-8 min-w-0 border border-slate-200 bg-surface px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                  startContent={<FiDownload size={14} />}
                  onPress={async () => {
                    if (appointment.id) {
                      setIsMedicalCertificateModalOpen(true);
                      refetchMedicalCertificate();
                    }
                  }}
                  isDisabled={isFetchingCertificate}
                >
                  Medical Certificate
                </Button>
              )}

              {setIsAddServiceModalOpen && (
                <button
                  type="button"
                  onClick={() => setIsAddServiceModalOpen(true)}
                  disabled={isCancelledStatus || isNoShowStatus || isActionBusy}
                  className="cursor-pointer inline-flex h-8 items-center gap-1.5 rounded-full border border-teal-600 bg-teal-50 px-3 text-[12px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#46beae]/50 dark:bg-[#0f2925]/40 dark:text-[#46beae] dark:hover:bg-[#0f2925]/70"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  Add Service
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Next Patient — floating popup, top-right corner. Fixed/overlay
          positioning (not part of the normal document flow) so it never
          pushes the summary card or action row around. Only relevant once
          THIS appointment is done — before that, the doctor is still with
          this patient and shouldn't be nudged toward the next one. */}
      {isCompletedStatus &&
        onGoToNextPatient &&
        nextPatientInfo &&
        !isNextPatientDismissed &&
        createPortal(
          <div className="fixed right-10 top-16 z-[999] max-w-[800px] animate-in slide-in-from-top-3 fade-in duration-300 animate-next-patient-bob">
            <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:border-[#273244] dark:bg-[#111726]">
              {/* Left accent bar */}
              <div className="absolute inset-y-0 left-0 w-1 bg-teal-600 dark:bg-[#46beae]" />

              <button
                type="button"
                onClick={() => setIsNextPatientDismissed(true)}
                aria-label="Dismiss"
                className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-text-muted dark:hover:bg-[#1a2535] dark:hover:text-slate-300"
              >
                <FiX className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={onGoToNextPatient}
                className="cursor-pointer flex w-full items-center gap-3 py-2 pl-4 pr-7 text-left transition hover:bg-slate-50 dark:hover:bg-[#0f1728]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#123730] dark:text-[#46beae]">
                  <FiUser size={16} />
                </span>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <p className="truncate text-[13px] font-bold text-text">
                    {nextPatientInfo.patientName || "Unknown Patient"}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-text-muted">
                    {nextPatientInfo.tokenNo != null ? (
                      <span>Token #{nextPatientInfo.tokenNo}</span>
                    ) : formatTime12(nextPatientInfo.time) ? (
                      <span>{formatTime12(nextPatientInfo.time)}</span>
                    ) : null}
                    {nextPatientInfo.status &&
                      NEXT_PATIENT_STATUS_META[nextPatientInfo.status] && (
                        <span
                          className={[
                            "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            NEXT_PATIENT_STATUS_META[nextPatientInfo.status].className,
                          ].join(" ")}
                        >
                          {NEXT_PATIENT_STATUS_META[nextPatientInfo.status].label}
                        </span>
                      )}
                  </div>
                </div>

                <div
                  className="next-patient-chevrons flex shrink-0 items-center gap-0.5 text-[18px] font-bold leading-none"
                  aria-label="Go to next patient next-patient-chevron-fill-dark"
                >
                  {[1, 2, 3].map((chevron) => (
                    <span key={chevron} aria-hidden="true">
                      &gt;
                    </span>
                  ))}
                </div>
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Action buttons — separate row below the 3 cards */}
      {hasSummaryActions && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/50 px-4 py-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] dark:border-[#273244] dark:from-[#111726] dark:to-[#0f1728] sm:flex-row sm:items-center sm:justify-between">
          {/* Left — contextual label */}
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-[#46beae]">
              <FiActivity className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-text">Appointment Actions</p>
              <p className="text-[11px] text-text-muted">Manage this appointment's status</p>
            </div>
          </div>

          {/* Right — action buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {canShowPatientArrived && (
              <>
                {isPayLaterPaymentPending ? (
                  <Tooltip
                    content="Please pay first"
                    placement="top"
                    showArrow
                    classNames={{
                      content:
                        "bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white",
                    }}
                  >
                    <span className="inline-flex w-full cursor-not-allowed sm:w-auto">
                      <Button
                        radius="lg"
                        isDisabled={isPatientArrivedDisabled}
                        isLoading={actionLoading === "confirm"}
                        startContent={
                          actionLoading !== "confirm" && (
                            <FiCheckCircle className="h-4 w-4 shrink-0" />
                          )
                        }
                        className="h-10 w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 text-[13px] font-semibold text-slate-500 shadow-none hover:bg-slate-200 sm:w-auto dark:bg-slate-700 dark:text-slate-400"
                      >
                        Patient Arrived
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Button
                    radius="lg"
                    onPress={handlePatientArrived}
                    isDisabled={actionsDisabled}
                    isLoading={actionLoading === "confirm"}
                    startContent={
                      actionLoading !== "confirm" && (
                        <FiCheckCircle className="h-4 w-4 shrink-0" />
                      )
                    }
                    className="h-10 w-full rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover sm:w-auto"
                  >
                    Patient Arrived
                  </Button>
                )}
              </>
            )}

            {canShowConfirm && (
              <div className="relative w-full sm:w-auto">
                <div
                  className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 transition-opacity duration-200 lg:block ${showConfirmHint ? "opacity-100" : "opacity-0"
                    }`}
                >
                  <div className="hidden relative whitespace-nowrap rounded-full border border-teal-200 bg-surface px-3 py-1.5 text-[12px] font-medium text-slate-800  ring-1 ring-teal-100">
                    Press{" "}
                    <span className="mx-1 inline-flex min-w-[22px] items-center justify-center rounded-md bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      C
                    </span>{" "}
                    for Confirm
                    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-teal-200 bg-surface" />
                  </div>
                </div>

                <Button
                  radius="lg"
                  onPress={handleConfirm}
                  isDisabled={actionsDisabled}
                  isLoading={actionLoading === "confirm"}
                  startContent={
                    actionLoading !== "confirm" && (
                      <img src={Icons.confirmIcon} alt="" className="h-4 w-4 shrink-0" />
                    )
                  }
                  className="h-10 w-full rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover sm:w-auto"
                >
                  Confirm
                </Button>
              </div>
            )}

            {canShowMarkAsCompleted && (
              <Button
                radius="lg"
                onPress={handleMarkAsCompleted}
                isDisabled={actionsDisabled}
                isLoading={actionLoading === "confirm"}
                startContent={
                  actionLoading !== "confirm" && (
                    <FiCheckCircle className="h-4 w-4 shrink-0" />
                  )
                }
                className="h-10 w-full rounded-xl bg-primary px-5 text-[13px] font-semibold text-white shadow-md shadow-success/15 hover:opacity-90 sm:w-auto"
              >
                Mark as Completed
              </Button>
            )}

            {canMarkNoShow && (
              <Button
                radius="lg"
                onPress={() => setIsNoShowModalOpen(true)}
                className="h-10 w-full rounded-xl border border-warning bg-warning/10 px-5 text-[13px] font-semibold text-amber-800 shadow-none hover:bg-warning/20 sm:w-auto dark:text-amber-300"
              >
                Mark No-Show
              </Button>
            )}

            {canShowRescheduleButton && (
              <Button
                radius="lg"
                variant="flat"
                onPress={() => navigate(`/appointment/${id}/reschedule`)}
                className="h-10 w-full justify-center whitespace-nowrap rounded-xl border border-primary bg-secondarybtn px-5 text-[13px] font-semibold text-primary shadow-none hover:bg-background-secondary sm:w-auto dark:border-[#46beae]/45 dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
              >
                Reschedule
              </Button>
            )}

            {canCancel && (
              <div className="relative w-full sm:w-auto">
                <div
                  className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 transition-opacity duration-200 lg:block ${showCancelHint ? "opacity-100" : "opacity-0"
                    }`}
                >
                  <div className="hidden relative whitespace-nowrap rounded-full border border-rose-200 bg-surface px-3 py-1.5 text-[12px] font-medium text-slate-800 ring-1 ring-rose-100">
                    Press{" "}
                    <span className="mx-1 inline-flex min-w-[30px] items-center justify-center rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white ">
                      Esc
                    </span>{" "}
                    for Cancel
                    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-rose-200 bg-surface" />
                  </div>
                </div>

                <Button
                  radius="lg"
                  onPress={() => setIsCancelConfirmOpen(true)}
                  isDisabled={actionsDisabled}
                  isLoading={actionLoading === "cancel"}
                  startContent={
                    actionLoading !== "cancel" && (
                      <img src={Icons.cancelIcon} alt="" className="h-4 w-4 shrink-0" />
                    )
                  }
                  className="h-10 w-full rounded-xl bg-danger px-5 text-[13px] font-semibold text-white shadow-md shadow-danger/15 hover:opacity-90 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            )}

            {(isCancelledStatus || isNoShowStatus) &&
              a?.paymentStatus !== "Refunded" &&
              ((a?.paymentStatus === "Pending" &&
                additionalServices.length > 0) ||
                (a?.paymentStatus === "Already Paid" &&
                  additionalServices.length > 0) ||
                (a?.paymentStatus === "Free Consultation" &&
                  additionalServices.length > 0) ||
                (a?.paymentStatus !== "Pending" &&
                  a?.paymentStatus !== "Already Paid" &&
                  a?.paymentStatus !== "Free Consultation")) && (
                <Button
                  radius="lg"
                  variant="bordered"
                  onPress={() => setIsRefundModalOpen(true)}
                  isDisabled={actionsDisabled}
                  isLoading={actionLoading === "cancel"}
                  startContent={
                    actionLoading !== "cancel" && (
                      <img src={Icons.earningIcon} className="h-4 w-4 shrink-0" alt="" />
                    )
                  }
                  className="h-10 w-full rounded-xl border-primary px-5 text-[13px] font-semibold text-primary shadow-none hover:bg-primary/5 sm:w-auto"
                >
                  Refund
                </Button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentSummaryCard;
