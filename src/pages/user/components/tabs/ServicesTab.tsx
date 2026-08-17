import React from "react";
import { FiPackage } from "react-icons/fi";

import { useGetDoctorServicesQuery } from "../../../../redux/api/doctorApi";
import { EmptyBlock, Skel, fmtCurrency } from "../shared";

type ServicesTabProps = {
  doctorId: string;
};

const ServicesTab: React.FC<ServicesTabProps> = ({ doctorId }) => {
  const { data, isFetching } = useGetDoctorServicesQuery(doctorId, { skip: !doctorId });
  const services = data?.data ?? [];

  if (isFetching) {
    return (
      <div className="space-y-3">
        <Skel className="h-16 w-full rounded-xl" />
        <Skel className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <EmptyBlock
        icon={<FiPackage />}
        title="No services configured"
        description="Services offered by this doctor will appear here."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-default-200 px-4 py-3 dark:border-default-100"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-default-900 dark:text-white">
              {s.serviceName}
            </div>
            <div className="mt-0.5 text-xs text-default-400">
              {s.durationDays ? `${s.durationDays} day validity` : "One-time"}
              {s.canBeBookedByPatient ? " • Bookable by patient" : " • Staff-only booking"}
            </div>
          </div>
          <div className="shrink-0 text-sm font-semibold text-default-900 dark:text-white">
            {fmtCurrency(s.price, s.currency)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ServicesTab;
