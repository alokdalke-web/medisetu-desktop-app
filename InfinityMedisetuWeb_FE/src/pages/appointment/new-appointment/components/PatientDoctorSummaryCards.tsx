import React from "react";
import { FiCalendar, FiCreditCard, FiPhone } from "react-icons/fi";

import StatusChip from "../../../../components/shared/StatusChip";

type PatientDoctorSummaryCardsProps = {
  showPatientSummary: boolean;
  showDoctorSummary: boolean;
  patientName: string;
  patientAgeGender: string;
  patientPhone: string;
  patientLastVisit: string;
  noShowDisplay: string;
  rawNoShowStatus: unknown;
  doctorName: string;
  doctorRole: string;
  doctorFee: string;
  getInitials: (name: string) => string;
};

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
                <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 text-sm font-semibold dark:border-[#38445a] dark:bg-[#0f1728] dark:text-slate-200">
                  {getInitials(patientName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-teal-700 dark:text-[#46beae]">
                    {patientName}
                  </div>
                  <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {patientAgeGender}
                  </div>
                </div>
              </div>

              {patientPhone !== "-" ? (
                <div className="flex items-center gap-2 sm:justify-center sm:border-l sm:border-slate-200 sm:pl-4 dark:border-[#273244]">
                  <FiPhone className="text-slate-500 dark:text-slate-400" />
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                      {patientPhone}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Phone Number
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}

              {patientLastVisit !== "-" || noShowDisplay ? (
                <div className="flex items-center gap-3 sm:justify-end sm:border-l sm:border-slate-200 sm:pl-4 pr-5 dark:border-[#273244]">
                  <div className="flex flex-col items-start sm:items-end leading-tight gap-1">
                    {noShowDisplay && (
                      <StatusChip
                        text={noShowDisplay}
                        status={String(rawNoShowStatus ?? "")}
                      />
                    )}
                    {patientLastVisit !== "-" && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <FiCalendar className="h-3 w-3 shrink-0" />
                        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
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
              <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 text-sm font-semibold dark:border-[#38445a] dark:bg-[#0f1728] dark:text-slate-200">
                {getInitials(doctorName)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-teal-700 dark:text-[#46beae]">
                  {doctorName}
                </div>
                <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                  {doctorRole}
                </div>
              </div>
            </div>

            {doctorFee !== "-" && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[13px] font-semibold text-slate-900 dark:text-white">
                  <FiCreditCard className="text-slate-500 dark:text-slate-400" />
                  <span>{doctorFee}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Fee</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDoctorSummaryCards;
