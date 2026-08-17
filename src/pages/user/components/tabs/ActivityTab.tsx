import React from "react";
import { FiActivity } from "react-icons/fi";

import { useGetDoctorActivityQuery } from "../../../../redux/api/doctorApi";
import { AppointmentStatusBadge, EmptyBlock, Skel, fmtDateTime } from "../shared";

type ActivityTabProps = {
  doctorId: string;
};

const ActivityTab: React.FC<ActivityTabProps> = ({ doctorId }) => {
  const { data, isFetching } = useGetDoctorActivityQuery(doctorId, { skip: !doctorId });
  const activity = data?.data ?? [];

  if (isFetching) {
    return (
      <div className="space-y-3">
        <Skel className="h-16 w-full rounded-xl" />
        <Skel className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <EmptyBlock
        icon={<FiActivity />}
        title="No activity yet"
        description="Recent appointments handled by this doctor will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activity.map((a) => (
        <div
          key={a.id}
          className="rounded-xl border border-default-200 px-4 py-3 dark:border-default-100"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-default-900 dark:text-white">
                {a.patientName ?? "-"}
              </div>
              <div className="mt-0.5 text-xs text-default-400">
                {fmtDateTime(a.appointmentDate, a.appointmentTime)}
                {a.serviceName ? ` • ${a.serviceName}` : ""}
              </div>
            </div>
            <div className="shrink-0">
              <AppointmentStatusBadge status={a.appointmentStatus} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTab;
