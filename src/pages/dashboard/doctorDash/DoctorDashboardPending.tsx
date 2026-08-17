import React from "react";
import { Button, Spinner } from "@heroui/react";
import { useNavigate } from "react-router";
import {
  FiCheckCircle,
  FiClock,
  FiEye,
  FiLock,
  FiPlus,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { LuPill, LuStethoscope } from "react-icons/lu";

import { useGetMfaStatusQuery } from "../../../redux/api/mfaApi";
import { useGetDoctorQuery } from "../../../redux/api/doctorApi";
import { useGetMedicinesQuery } from "../../../redux/api/medicineApi";
import { getDoctorAvailabilityList } from "../../../utils/clinicSetupStatus";

const StatusBadge: React.FC<{ done: boolean }> = ({ done }) =>
  done ? (
    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/20">
      <FiCheckCircle className="h-3.5 w-3.5" /> Completed
    </div>
  ) : (
    <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-950/20">
      <FiClock className="h-3.5 w-3.5 animate-spin" /> Pending
    </div>
  );

type SetupCardProps = {
  done: boolean;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  completeText: string;
  pendingText?: string;
  onPress: () => void;
};

const SetupCard: React.FC<SetupCardProps> = ({
  done,
  icon,
  iconClassName,
  title,
  description,
  completeText,
  pendingText = "Start Setup",
  onPress,
}) => (
  <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-[#273244] dark:bg-[#111726]">
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
          {icon}
        </div>
        <StatusBadge done={done} />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-[#677294] dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>

    <div className="pt-6">
      <Button
        className={
          done
            ? "w-full border border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            : "w-full bg-[#0a6c74] font-semibold text-white hover:bg-[#085a61]"
        }
        onPress={onPress}
      >
        {done ? (
          <>
            <FiEye className="mr-2 h-4 w-4" /> {completeText}
          </>
        ) : (
          <>
            <FiPlus className="mr-2 h-4 w-4" /> {pendingText}
          </>
        )}
      </Button>
    </div>
  </div>
);

const DoctorDashboardPending: React.FC = () => {
  const navigate = useNavigate();

  const { data: doctorData, isLoading: doctorLoading } = useGetDoctorQuery();
  const { data: mfaData, isLoading: mfaLoading } = useGetMfaStatusQuery();
  const { data: medicinesData, isLoading: medicinesLoading } =
    useGetMedicinesQuery(undefined, { refetchOnMountOrArgChange: true });

  const services = doctorData?.result?.services;
  const availability = getDoctorAvailabilityList(doctorData?.result);
  const medicinesCount =
    medicinesData?.pagination?.totalRecords ?? medicinesData?.medicines.length ?? 0;

  const mfaEnabled = Boolean(mfaData?.data?.mfaEnabled);
  const serviceAdded = Boolean(Array.isArray(services) && services.length > 0);
  const workingHoursAdded = Boolean(
    Array.isArray(availability) && availability.length > 0,
  );
  const medicineAdded = medicinesCount > 0;

  const completedTasksCount = [
    mfaEnabled,
    serviceAdded,
    workingHoursAdded,
    medicineAdded,
  ].filter(Boolean).length;
  const totalTasks = 4;
  const progressPercent = Math.round((completedTasksCount / totalTasks) * 100);
  const isLoading = doctorLoading || mfaLoading || medicinesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4">
        <Spinner size="lg" color="primary" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Loading your setup progress...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 px-0 py-8 animate-fadeIn">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#0a6c74] dark:text-[#9be7dc] md:text-3xl">
          Setup Center
        </h1>
        <p className="text-sm text-[#677294] dark:text-slate-300 md:text-base">
          Complete these steps while your profile is waiting for admin approval.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[#273244] dark:bg-[#111726]">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Your Setup Progress
          </h2>
          <span className="text-sm font-bold text-[#0a6c74] dark:text-[#9be7dc]">
            {progressPercent}% Completed ({completedTasksCount} of {totalTasks})
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-[#0a6c74] transition-all duration-500 ease-out dark:bg-[#0a6c74]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SetupCard
          done={mfaEnabled}
          icon={<FiShield className="h-6 w-6 text-violet-600" />}
          iconClassName="bg-violet-50 dark:bg-violet-950/20"
          title="Security & Access"
          description="Enable multi-factor authentication (MFA) to secure your account."
          completeText="Manage MFA"
          onPress={() => navigate("/profile/security")}
        />

        <SetupCard
          done={serviceAdded}
          icon={<LuStethoscope className="h-6 w-6 text-[#0a6c74] dark:text-[#9be7dc]" />}
          iconClassName="bg-teal-50 dark:bg-[#0a6c74]/10"
          title="Add First Service"
          description="Add your consultation service, price, validity, and booking availability."
          completeText="View Services"
          onPress={() =>
            navigate(serviceAdded ? "/profile/services" : "/profile/services/new")
          }
        />

        <SetupCard
          done={workingHoursAdded}
          icon={<FiClock className="h-6 w-6 text-blue-600" />}
          iconClassName="bg-blue-50 dark:bg-blue-950/20"
          title="Set Working Hours"
          description="Add your clinic days, appointment timing, breaks, and slot rules."
          completeText="View Hours"
          onPress={() => navigate("/profile/availability")}
        />

        <SetupCard
          done={medicineAdded}
          icon={<LuPill className="h-6 w-6 text-emerald-600" />}
          iconClassName="bg-emerald-50 dark:bg-emerald-950/20"
          title="Add First Medicine"
          description="Create your first medicine entry for quicker digital prescriptions."
          completeText="View Medicines"
          onPress={() =>
            navigate(medicineAdded ? "/profile/medicines" : "/profile/medicines/setup")
          }
        />
      </div>

      <div className="flex w-full flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[#273244] dark:bg-[#111726] md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20">
            <FiUsers className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Approval Status
            </h3>
            <p className="text-sm leading-relaxed text-[#677294] dark:text-slate-400">
              Your dashboard access will unlock after a super admin approves your profile.
            </p>
          </div>
        </div>
        <Button
          className="w-full cursor-not-allowed border border-slate-200 bg-slate-100 font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 md:w-auto"
          isDisabled
        >
          <FiLock className="mr-2 h-4 w-4" /> Awaiting Approval
        </Button>
      </div>
    </div>
  );
};

export default DoctorDashboardPending;
