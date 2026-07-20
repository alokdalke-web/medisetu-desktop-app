import { Button, Chip, Tooltip } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiPhone,
  FiPlus,
  FiStar,
  FiUpload,
  FiUser,
} from "react-icons/fi";
import { type NavigateFunction } from "react-router";

import StatusChip from "../../../components/shared/StatusChip";
import Icons from "../../../constants/icons";
import AvatarBubble from "./AvatarBubble";

type AppointmentSummaryCardProps = {
  isSummaryAccordionOpen: boolean;
  onSummaryAccordionToggle: () => void;
  patient: any;
  appointment: any;
  doctor: any;
  id: string;
  navigate: NavigateFunction;
  safe: (value: any, fallback?: string) => string;
  canShowConsentFormButton: boolean;
  canShowUploadConsentButton: boolean;
  canShowDownloadConsentButton: boolean;
  canShowReferFormButton: boolean;
  setIsEditingConsent: (open: boolean) => void;
  setShowConsentForm: (open: boolean) => void;
  setActiveFormType: (type: "consent" | "refer") => void;
  setIsConsentUploadModalOpen: (open: boolean) => void;
  handleDownloadConsent: () => void;
  setIsReferModalOpen: (open: boolean) => void;
  isPendingStatus: boolean;
  canCancel: boolean;
  canShowConfirm: boolean;
  isPaid: any;
  handleOpenInvoice: () => void;
  expireText: string;
  isCompletedStatus: boolean;
  setIsMedicalCertificateModalOpen: (open: boolean) => void;
  refetchMedicalCertificate: () => any;
  isFetchingCertificate: boolean;
  canShowRescheduleButton: boolean;
  canMarkNoShow: boolean | undefined;
  isCancelledStatus: boolean;
  appointmentData: any;
  clinicService?: any;
  additionalServices: any[];
  priceText?: string;
  additionalServicesTotal?: number;
  setIsAddServiceModalOpen?: (open: boolean) => void;
  isActionBusy?: boolean;
  canShowPatientArrived: boolean;
  isPayLaterPaymentPending?: boolean;
  handlePatientArrived: () => void | Promise<void>;
  actionsDisabled: boolean;
  actionLoading: "cancel" | "confirm" | null;
  showConfirmHint: boolean;
  handleConfirm: () => void | Promise<void>;
  canShowMarkAsCompleted: boolean;
  handleMarkAsCompleted: () => void | Promise<void>;
  setIsNoShowModalOpen: (open: boolean) => void;
  setIsCancelConfirmOpen: (open: boolean) => void;
  showCancelHint: boolean;
  setIsRefundModalOpen: (open: boolean) => void;
};

const formatCurrency = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const getServiceName = (appointmentData: any, clinicService?: any) => {
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
  const amount =
    clinicService?.price ??
    clinicService?.amount ??
    appointmentData?.amount ??
    appointmentData?.price ??
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
  const displayStatus = (!status || status.trim() === "" || status.trim() === "—") ? "Covered" : status;
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
  appointmentData: a,
  clinicService,
  additionalServices,
  priceText,
  additionalServicesTotal = 0,
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
}) => {
  const serviceName = getServiceName(a, clinicService);

  // Click-toggle popover for services breakdown
  const [isServicePopoverOpen, setIsServicePopoverOpen] = useState(false);
  const servicePopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isServicePopoverOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (servicePopoverRef.current && !servicePopoverRef.current.contains(e.target as Node)) {
        setIsServicePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isServicePopoverOpen]);
  const amountText = getAmountText(a, clinicService);

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
    (isCancelledStatus && a?.paymentStatus !== "Refunded") ||
    (isCancelledStatus && a?.paymentStatus === "Refunded");

  const isPatientArrivedDisabled = actionsDisabled || isPayLaterPaymentPending;

  return (
    <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2 xl:grid-cols-[0.95fr_1.08fr_1fr]">
      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#273244] dark:bg-[#111726]">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
          <div className="flex min-w-0 items-center gap-3 ">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
              <FiUser size={17} />
            </div>
            <h2 className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
              Patient Summary
            </h2>
          </div>

          <Tooltip
            content="View patient profile"
            placement="top"
            showArrow
            classNames={{
              content:
                "bg-white px-3 py-1.5 text-[12px] font-medium text-slate-900 ",
            }}
          >
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
              onClick={() => navigate(`/patient/${patient.id}?fromAppt=${id}`)}
              aria-label="View patient profile"
            >
              <FiEye className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        <div className="mt-3 flex min-w-0 items-center gap-3">
          <AvatarBubble src={patient.avatar} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-[14px] font-bold leading-5 text-slate-900 dark:text-white">
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
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
              {contactText && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-white">
                  <FiPhone className="h-3 w-3 shrink-0 text-teal-600 dark:text-white" />
                  {contactText}
                </span>
              )}
              {ageGenderText && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-white">
                  <FiUser className="h-3 w-3 shrink-0 text-teal-600 dark:text-white" />
                  {ageGenderText}
                </span>
              )}
              {!contactText && !ageGenderText && (
                <span className="text-xs font-semibold text-slate-400 dark:text-white">Contact not available</span>
              )}
            </div>
          </div>
        </div>

        {hasFormActions && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
            {canShowConsentFormButton && (
              <Button
                size="sm"
                radius="full"
                variant="flat"
                title="Consent Form"
                className="h-8 min-w-0 border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
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
                className="h-8 min-w-0 border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
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
                className="h-8 min-w-0 border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
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
                className="h-8 min-w-0 border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
                startContent={<FiFileText size={14} />}
                onPress={() => setIsReferModalOpen(true)}
              >
                Refer Form
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#273244] dark:bg-[#111726]">
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
              <FiCalendar size={17} />
            </div>
            <h2 className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
              Appointment Details
            </h2>
          </div>

          {appointment.tokenNo !== "" && (
            <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-[#172033] dark:text-white dark:ring-[#273244]">
              Token: {appointment.tokenNo}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
            {appointment.dateRange}
          </p>

          {isPendingStatus ? (
            <Chip
              size="sm"
              radius="md"
              variant="light"
              classNames={{
                base: "bg-[#FFF3EA] px-3 h-7 shrink-0",
                content: "text-[#F2994A] text-[12px] font-semibold",
              }}
              startContent={
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#F2994A]" />
                  {!canCancel && !canShowConfirm && (
                    <FiClock className="h-4 w-4 text-[#F2994A]" />
                  )}
                </div>
              }
            >
              Pending
            </Chip>
          ) : (
            <div className="shrink-0">
              <StatusChip text={appointment.status} />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <FiUser className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
            <span className="shrink-0 text-[12px] font-semibold text-slate-500 dark:text-white">
              Doctor:
            </span>
            <span className="truncate text-[12px] font-bold text-slate-900 dark:text-white">
              Dr. {doctor.name || "—"}
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <FiActivity className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-white" />
            <span className="shrink-0 text-[12px] font-semibold text-slate-500 dark:text-white">
              Specialty:
            </span>
            <span className="truncate text-[12px] font-bold text-slate-900 dark:text-white">
              {doctor.speciality || doctor.qualification || "—"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {isPaid && (
            <Button
              size="sm"
              radius="full"
              variant="flat"
              title="View Invoice"
              className="h-8 min-w-0 border border-teal-200 bg-white px-3 text-[12px] font-semibold text-teal-700 hover:bg-teal-50 dark:border-[#46beae]/45 dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
              startContent={<FiDownload size={14} />}
              onPress={handleOpenInvoice}
            >
              View Invoice
            </Button>
          )}

          {isCompletedStatus && (
            <Button
              size="sm"
              radius="full"
              variant="flat"
              className="h-8 min-w-0 border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-[#273244] dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
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
        </div>
      </section>

      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#273244] dark:bg-[#111726] lg:col-span-2 xl:col-span-1">
        <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
            <FiStar size={17} />
          </div>
          <h2 className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
            Service Details
          </h2>

          <div className="ml-auto flex items-center gap-2">
            {canCancel && !canShowConfirm && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-white">
                <FiClock className="h-3.5 w-3.5" />
                <span className="text-slate-900 dark:text-white">{expireText}</span>
              </div>
            )}

            {/* Full breakdown — click to toggle */}
            <div ref={servicePopoverRef} className="relative">
              <button
                type="button"
                aria-label="View services & payment breakdown"
                onClick={() => setIsServicePopoverOpen((o) => !o)}
                className={[
                  "grid h-7 w-7 place-items-center rounded-full transition",
                  isServicePopoverOpen
                    ? "bg-teal-100 text-teal-700 dark:bg-[#123730] dark:text-[#46beae]"
                    : "text-slate-400 hover:bg-slate-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-[#1a2535] dark:hover:text-[#46beae]",
                ].join(" ")}
              >
                <FiEye className="h-4 w-4" />
              </button>

              {isServicePopoverOpen && (
                <div className="absolute right-0 top-full z-[60] mt-2 w-[min(290px,calc(100vw-2rem))]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:border-[#273244] dark:bg-[#111726]">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12px] font-bold text-slate-800 dark:text-white">Services & Payment</p>
                      <PaymentStatusBadge status={String(a?.paymentStatus || "—")} />
                    </div>

                    <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
                      {/* Primary service row */}
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-[#0f1728]">
                        <div className="min-w-0">
                          <p title={serviceName} className="truncate text-[11px] font-bold text-teal-700 dark:text-[#9be7dc]">
                            {serviceName}
                          </p>
                          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Primary · {paymentModeLabel}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-slate-900 dark:text-white">{amountText}</span>
                      </div>

                      {/* Additional service rows */}
                      {additionalServices.map((svc: any, idx: number) => {
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
                              <p title={svcName} className="truncate text-[11px] font-bold text-teal-700 dark:text-[#9be7dc]">
                                {svcName}
                              </p>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Add-on · {svcMode}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-slate-900 dark:text-white">
                              {svcPrice > 0 ? formatCurrency(svcPrice) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-[#273244]">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total</span>
                      <span className="text-[13px] font-bold text-teal-700 dark:text-[#46beae]">
                        {(a?.paymentStatus === "Already Paid" && additionalServicesTotal > 0
                          ? formatCurrency(additionalServicesTotal)
                          : priceText) || amountText}
                      </span>
                    </div>

                    {setIsAddServiceModalOpen && (
                      <button
                        type="button"
                        onClick={() => { setIsServicePopoverOpen(false); setIsAddServiceModalOpen(true); }}
                        disabled={isCancelledStatus || isActionBusy}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#46beae] dark:text-[#04231f] dark:hover:bg-[#3aa898]"
                      >
                        <FiPlus className="h-3.5 w-3.5" />
                        Add Service
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact inline detail rows — consistent with Patient / Appointment cards */}
        <div className="mt-3 space-y-2.5 text-[12px]">
          {/* Primary service */}
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500">Service</span>
            <div className="min-w-0 text-right">
              <span title={serviceName} className="break-words font-bold uppercase text-teal-700 dark:text-[#46beae]">
                {serviceName}
              </span>
              <span className="ml-1.5 font-bold text-slate-900 dark:text-white">{amountText}</span>
            </div>
          </div>

          {/* Payment mode */}
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 font-medium text-slate-400 dark:text-slate-500">Payment Mode</span>
            <div className="flex min-w-0 items-center gap-1.5 text-right">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500 dark:bg-white" />
              <span className="font-semibold text-slate-700 dark:text-white">{paymentModeLabel}</span>
            </div>
          </div>

          {/* Total + payment status */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-[#273244]">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-400 dark:text-slate-500">Total</span>
              <span className="text-[13px] font-bold text-teal-700 dark:text-[#46beae]">
                {(a?.paymentStatus === "Already Paid" && additionalServicesTotal > 0
                  ? formatCurrency(additionalServicesTotal)
                  : priceText) || amountText}
              </span>
              {additionalServices.length > 0 && (
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  +{additionalServices.length} service{additionalServices.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <PaymentStatusBadge status={String(a?.paymentStatus || "—")} />
          </div>

          {/* Add service */}
          {setIsAddServiceModalOpen && (
            <button
              type="button"
              onClick={() => setIsAddServiceModalOpen(true)}
              disabled={isCancelledStatus || isActionBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-600 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#46beae]/50 dark:bg-[#0f2925]/40 dark:text-[#46beae] dark:hover:bg-[#0f2925]/70"
            >
              <FiPlus className="h-3.5 w-3.5" />
              Add Service
            </button>
          )}
        </div>
      </section>

      {/* Action buttons — separate row below the 3 cards */}
      {hasSummaryActions && (
        <div className="col-span-full flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/50 px-4 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)] dark:border-[#273244] dark:from-[#111726] dark:to-[#0f1728] sm:flex-row sm:items-center sm:justify-between">
          {/* Left — contextual label */}
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-[#46beae]">
              <FiActivity className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">Appointment Actions</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Manage this appointment's status</p>
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
                    className="h-10 w-full rounded-xl bg-teal-700 px-5 text-[13px] font-semibold text-white shadow-md shadow-teal-900/15 hover:bg-teal-800 sm:w-auto"
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
                  <div className="hidden relative whitespace-nowrap rounded-full border border-teal-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-800  ring-1 ring-teal-100">
                    Press{" "}
                    <span className="mx-1 inline-flex min-w-[22px] items-center justify-center rounded-md bg-teal-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      C
                    </span>{" "}
                    for Confirm
                    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-teal-200 bg-white" />
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
                  className="h-10 w-full rounded-xl bg-teal-700 px-5 text-[13px] font-semibold text-white shadow-md shadow-teal-900/15 hover:bg-teal-800 sm:w-auto"
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
                className="h-10 w-full rounded-xl bg-green-700 px-5 text-[13px] font-semibold text-white shadow-md shadow-green-900/15 hover:bg-green-800 sm:w-auto"
              >
                Mark as Completed
              </Button>
            )}

            {canMarkNoShow && (
              <Button
                radius="lg"
                onPress={() => setIsNoShowModalOpen(true)}
                className="h-10 w-full rounded-xl border border-amber-300 bg-amber-50 px-5 text-[13px] font-semibold text-amber-700 shadow-none hover:bg-amber-100 sm:w-auto dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300"
              >
                Mark No-Show
              </Button>
            )}

            {canShowRescheduleButton && (
              <Button
                radius="lg"
                variant="flat"
                onPress={() => navigate(`/appointment/${id}/reschedule`)}
                className="h-10 w-full justify-center whitespace-nowrap rounded-xl border border-primary bg-secondarybtn px-5 text-[13px] font-semibold text-black shadow-none hover:bg-background-secondary-50 sm:w-auto dark:border-[#46beae]/45 dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
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
                  <div className="hidden relative whitespace-nowrap rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-800 ring-1 ring-rose-100">
                    Press{" "}
                    <span className="mx-1 inline-flex min-w-[30px] items-center justify-center rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white ">
                      Esc
                    </span>{" "}
                    for Cancel
                    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-rose-200 bg-white" />
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
                  className="h-10 w-full rounded-xl bg-danger px-5 text-[13px] font-semibold text-white shadow-md shadow-rose-900/15 hover:opacity-90 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            )}

            {isCancelledStatus &&
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
