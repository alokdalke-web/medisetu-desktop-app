import { Button, Spinner } from "@heroui/react";
import React from "react";
import {
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiEye,
  FiPlus,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router";

import { useGetLabTestsQuery } from "../../redux/api/labApi";
import { useGetMfaStatusQuery } from "../../redux/api/mfaApi";

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

const LabAssistantPendingDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: catalogData, isLoading: catalogLoading } = useGetLabTestsQuery({
    page: 1,
    limit: 1,
  });
  const { data: mfaData, isLoading: mfaLoading } = useGetMfaStatusQuery();

  const isLoading = catalogLoading || mfaLoading;
  const catalogCount =
    catalogData?.pagination?.totalRecords ?? catalogData?.data?.length ?? 0;
  const catalogReady = catalogCount > 0;
  const mfaEnabled = Boolean(mfaData?.data?.mfaEnabled);

  const completedTasksCount = [mfaEnabled, catalogReady].filter(Boolean).length;
  const totalTasks = 2;
  const progressPercent = Math.round((completedTasksCount / totalTasks) * 100);

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
    <div className="w-full px-0 py-8 space-y-8 animate-fadeIn">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#0a6c74] dark:text-[#9be7dc] md:text-3xl">
          Setup Center
        </h1>
        <p className="text-sm text-[#677294] dark:text-slate-300 md:text-base">
          Complete these steps to set up your lab and start managing test work smoothly.
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

      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
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
          done={catalogReady}
          icon={<FiClipboard className="h-6 w-6 text-[#0a6c74] dark:text-[#9be7dc]" />}
          iconClassName="bg-teal-50 dark:bg-[#0a6c74]/10"
          title="Lab Test Catalog"
          description="Add lab tests with departments, sample types, pricing, and report templates."
          completeText="View Catalog"
          onPress={() => navigate("/lab/queue")}
        />
      </div>

      <div className="flex w-full flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[#273244] dark:bg-[#111726] md:flex-row">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20">
            <FiUsers className="h-6 w-6 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Admin Approval Status
            </h3>
            <p className="text-sm leading-relaxed text-[#677294] dark:text-slate-400">
              Your access will be active after an Super-admin approves your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabAssistantPendingDashboard;
