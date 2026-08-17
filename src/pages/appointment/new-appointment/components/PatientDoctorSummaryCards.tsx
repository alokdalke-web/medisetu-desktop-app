import React from "react";
import { FiCalendar, FiCreditCard, FiPhone } from "react-icons/fi";

import StatusChip from "../../../../components/shared/StatusChip";

import type { PatientDoctorSummaryCardsProps } from "../../../../types/appointment";

const PatientDoctorSummaryCards: React.FC<PatientDoctorSummaryCardsProps> = ({
  showPatientSummary,
  showDoctorSummary,
  patientName,
  patientAgeGender,
  patientPhone,
  patientLastVisit,
  noShowDisplay,
  rawNoShowStatus,
  doctorName,
  doctorRole,
  doctorFee,
  getInitials,
}) => {
  if (!showPatientSummary && !showDoctorSummary) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 ">
      {showPatientSummary && (
        <div>
          <div className="rounded-2xl  bg-slate-50 p-4 dark:bg-[#111726]">
            <div className="grid gap-3 sm:grid-cols-3 sm:items-center ">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full border border-line bg-slate-50 flex items-center justify-center text-text text-sm font-semibold dark:bg-[#0f1728]">
                  {getInitials(patientName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-teal-700 dark:text-[#46beae]">
                    {patientName}
                  </div>
                  <div className="truncate text-[12px] text-text-muted">
                    {patientAgeGender}
                  </div>
                </div>
              </div>

              {patientPhone !== "-" ? (
                <div className="flex items-center gap-2 sm:justify-center sm:border-l sm:border-line sm:pl-4">
                  <FiPhone className="text-text-muted" />
                  <div>
                    <div className="text-[13px] font-semibold text-text">
                      {patientPhone}
                    </div>
                    <div className="text-[11px] text-text-muted">
                      Phone Number
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}

              {patientLastVisit !== "-" || noShowDisplay ? (
                <div className="flex items-center gap-3 sm:justify-end sm:border-l sm:border-line sm:pl-4 pr-5">
                  <div className="flex flex-col items-start sm:items-end leading-tight gap-1">
                    {noShowDisplay && (
                      <StatusChip
                        text={noShowDisplay}
                        status={String(rawNoShowStatus ?? "")}
                      />
                    )}
                    {patientLastVisit !== "-" && (
                      <div className="flex items-center gap-2 text-[11px] text-text-muted">
                        <FiCalendar className="h-3 w-3 shrink-0" />
                        <span className="text-[13px] font-semibold text-text">
                          {patientLastVisit}
                        </span>
                        <span>Last Visit</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          </div>
        </div>
      )}

      {showDoctorSummary && (
        <div className="rounded-2xl  bg-slate-50 p-4 dark:bg-[#111726]">
          <div className="flex items-center justify-between gap-3 ">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full border border-line bg-slate-50 flex items-center justify-center text-text text-sm font-semibold dark:bg-[#0f1728]">
                {getInitials(doctorName)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-teal-700 dark:text-[#46beae]">
                  {doctorName}
                </div>
                <div className="truncate text-[12px] text-text-muted">
                  {doctorRole}
                </div>
              </div>
            </div>

            {doctorFee !== "-" && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[13px] font-semibold text-text">
                  <FiCreditCard className="text-text-muted" />
                  <span>{doctorFee}</span>
                </div>
                <div className="text-[11px] text-text-muted">Fee</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDoctorSummaryCards;
