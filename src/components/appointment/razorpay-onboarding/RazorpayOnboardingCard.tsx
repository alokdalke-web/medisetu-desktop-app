/**
 * RazorpayOnboardingCard.tsx
 *
 * Clinic-level native Razorpay Route onboarding. Admin-only.
 *
 * Replaces the old hosted-onboarding flow (POST /clinic/onboard-route with no
 * body, KYC completed on Razorpay's own pages) with the in-app wizard: the
 * clinic submits business/stakeholder/bank details and KYC documents directly,
 * POSTs the full application, and Razorpay verifies it asynchronously —
 * routeStatus moves PENDING -> ACTIVE (or NEEDS_CLARIFICATION on rejection).
 */

import React, { useState } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import {
  FiCreditCard,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiAlertCircle,
  FiRefreshCw,
  FiEdit3,
} from "react-icons/fi";
import {
  useGetOnboardingStatusQuery,
  useGetClinicBankDetailsQuery,
} from "../../../redux/api/clinicApi";
import type { ClinicRouteStatus } from "../../../types/razorpayOnboarding";
import RazorpayOnboardingWizardModal from "./RazorpayOnboardingWizardModal";
import ChangeBankDetailsModal from "./ChangeBankDetailsModal";

type StatusPresentation = {
  label: string;
  helper: string;
  bannerClassName: string;
  icon: React.ReactNode;
};

const STATUS_PRESENTATION: Record<ClinicRouteStatus, StatusPresentation> = {
  INACTIVE: {
    label: "Not Linked",
    helper: "Link your bank account to accept online patient consultations.",
    bannerClassName:
      "bg-slate-50 border-slate-200 text-slate-600 dark:bg-[#0f1728] dark:border-[#273244] dark:text-slate-300",
    icon: null,
  },
  PENDING: {
    label: "Under Review",
    helper:
      "Your bank account and KYC documents are under review. Payouts will be enabled once verified.",
    bannerClassName:
      "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400",
    icon: <FiClock size={13} />,
  },
  NEEDS_CLARIFICATION: {
    label: "Needs Clarification",
    helper:
      "Razorpay could not verify your submission. Review the reasons below and resubmit.",
    bannerClassName:
      "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400",
    icon: <FiAlertCircle size={13} />,
  },
  ACTIVE: {
    label: "Activated & Verified",
    helper:
      "Razorpay Route activated. Settlement account verified — online payments settle to your clinic automatically.",
    bannerClassName:
      "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-400",
    icon: <FiCheckCircle size={13} />,
  },
  SUSPENDED: {
    label: "Suspended",
    helper:
      "This account is suspended. Please contact platform support to resolve this.",
    bannerClassName: "bg-slate-800 border-slate-700 text-white dark:bg-black dark:border-slate-800",
    icon: <FiAlertTriangle size={13} />,
  },
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const RazorpayOnboardingCard: React.FC = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isChangeBankOpen, setIsChangeBankOpen] = useState(false);

  const {
    data: statusData,
    isLoading,
    isFetching,
    refetch,
  } = useGetOnboardingStatusQuery();

  const statusInfo = statusData?.data;
  const status: ClinicRouteStatus = statusInfo?.status ?? "INACTIVE";
  const presentation = STATUS_PRESENTATION[status] ?? STATUS_PRESENTATION.INACTIVE;
  const onboardedAt = formatDate(statusInfo?.onboardedAt);

  const { data: bankData, isLoading: isBankLoading } =
    useGetClinicBankDetailsQuery(undefined, {
      skip: status !== "ACTIVE",
    });
  const bankDetails = bankData?.data;

  return (
    <Card className="border border-slate-200 bg-white shadow-none rounded-[16px] dark:border-[#273244] dark:bg-[#111726]">
      <CardBody className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#0D9488] text-[#0D9488] shrink-0">
            <FiCreditCard size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight dark:text-white">
              Razorpay Account Linking
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug dark:text-slate-400">
              Link your clinic's Razorpay account to receive online payments directly
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-[12px] text-slate-500 dark:text-slate-400">
            Loading status…
          </div>
        ) : (
          <>
            <div
              className={`rounded-xl border px-4 py-3 ${presentation.bannerClassName}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
                  {presentation.icon}
                  {presentation.label}
                </span>
                {status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
                    aria-label="Refresh onboarding status"
                  >
                    <FiRefreshCw
                      size={11}
                      className={isFetching ? "animate-spin" : ""}
                    />
                    Refresh
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-1.5 leading-snug">
                {presentation.helper}
              </p>

              {status === "NEEDS_CLARIFICATION" &&
                statusInfo?.rejectionReasons &&
                statusInfo.rejectionReasons.length > 0 && (
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {statusInfo.rejectionReasons.map((reason, idx) => (
                      <li key={idx} className="text-[11px]">
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}

              {onboardedAt && status === "ACTIVE" && (
                <p className="text-[10px] mt-1.5 opacity-80">
                  Linked on {onboardedAt}
                </p>
              )}
            </div>

            {status === "ACTIVE" && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#273244] space-y-3">
                <h4 className="text-[12px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Payout Bank Details
                </h4>
                {isBankLoading ? (
                  <div className="text-[12px] text-slate-500 dark:text-slate-400">
                    Loading account details…
                  </div>
                ) : bankDetails ? (
                  <div className="rounded-xl border border-slate-100 dark:border-[#273244] px-4 py-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                          Account Holder
                        </span>
                        <span className="text-[12px] text-slate-700 font-medium dark:text-slate-300">
                          {bankDetails.beneficiaryName || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                          Bank Name
                        </span>
                        <span className="text-[12px] text-slate-700 font-medium dark:text-slate-300">
                          {bankDetails.bankName || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                          IFSC Code
                        </span>
                        <span className="text-[12px] text-slate-700 font-medium dark:text-slate-300">
                          {bankDetails.ifscCode || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                          Account Number
                        </span>
                        <span className="text-[12px] font-mono text-slate-700 font-medium dark:text-slate-300">
                          {bankDetails.maskedAccountNumber || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <Button
                  size="sm"
                  variant="flat"
                  startContent={<FiEdit3 size={13} />}
                  onPress={() => setIsChangeBankOpen(true)}
                  className="text-[12px] font-medium"
                >
                  Change Settlement Bank Account
                </Button>
              </div>
            )}

            {(status === "INACTIVE" || status === "NEEDS_CLARIFICATION") && (
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  onPress={() => setIsWizardOpen(true)}
                  className="text-[12px] font-medium"
                >
                  {status === "NEEDS_CLARIFICATION"
                    ? "Edit and Resubmit Setup"
                    : "Start Setup"}
                </Button>
              </div>
            )}
          </>
        )}
      </CardBody>

      {isWizardOpen && (
        <RazorpayOnboardingWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          draft={statusInfo?.draft}
          uploadedDocuments={
            statusInfo?.documents
              ? Object.fromEntries(
                  statusInfo.documents.map((doc) => [
                    doc.documentType,
                    { uploaded: doc.uploaded, fileName: doc.fileName },
                  ]),
                )
              : undefined
          }
          onSubmitted={() => refetch()}
        />
      )}

      {isChangeBankOpen && (
        <ChangeBankDetailsModal
          isOpen={isChangeBankOpen}
          onClose={() => setIsChangeBankOpen(false)}
          onUpdated={() => refetch()}
        />
      )}
    </Card>
  );
};

export default RazorpayOnboardingCard;
