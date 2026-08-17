import React from "react";
import { FiClock } from "react-icons/fi";

import { useGetDoctorAvailabilityByIdQuery } from "../../../../redux/api/doctorApi";
import { EmptyBlock, Skel, to12h } from "../shared";
import type { DoctorAvailabilityItem } from "../../../../types/doctor";

type AvailabilityTabProps = {
  doctorId: string;
};

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const dayRank = (day: string) => {
  const idx = DAY_ORDER.indexOf(String(day ?? "").trim().toLowerCase());
  return idx === -1 ? 99 : idx;
};

const capitalize = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "-";

const DayRow: React.FC<{ item: DoctorAvailabilityItem }> = ({ item }) => {
  const available = item.isAvailable && item.startTime && item.endTime;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-default-200 px-4 py-3 dark:border-default-100 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            available
              ? "bg-primary/10 text-primary"
              : "bg-default-100 text-default-400 dark:bg-default-50/50"
          }`}
        >
          <FiClock className="text-[16px]" />
        </div>
        <div>
          <div className="text-sm font-semibold text-default-900 dark:text-white">
            {capitalize(item.dayOfWeek)}
          </div>
          <div className="mt-0.5 text-xs text-default-400">
            {available
              ? `${to12h(item.startTime)} – ${to12h(item.endTime)}`
              : "Unavailable"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
        {item.noOfPatients ? (
          <span className="rounded-full bg-default-100 px-2.5 py-1 text-[11px] font-medium text-default-600 dark:bg-default-50/50 dark:text-default-300">
            {item.noOfPatients} tokens
          </span>
        ) : item.slotMinutes ? (
          <span className="rounded-full bg-default-100 px-2.5 py-1 text-[11px] font-medium text-default-600 dark:bg-default-50/50 dark:text-default-300">
            {item.slotMinutes} min slots
          </span>
        ) : null}
        {item.breaks
          .filter((b) => b.startTime && b.endTime)
          .map((b) => (
            <span
              key={b.id}
              className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
            >
              Break {to12h(b.startTime)}–{to12h(b.endTime)}
            </span>
          ))}
      </div>
    </div>
  );
};

const AvailabilityTab: React.FC<AvailabilityTabProps> = ({ doctorId }) => {
  const { data, isFetching } = useGetDoctorAvailabilityByIdQuery(doctorId, { skip: !doctorId });

  const days = React.useMemo(() => {
    const list = data?.data ?? [];
    return [...list].sort((a, b) => dayRank(a.dayOfWeek) - dayRank(b.dayOfWeek));
  }, [data]);

  if (isFetching) {
    return (
      <div className="space-y-3">
        <Skel className="h-16 w-full rounded-xl" />
        <Skel className="h-16 w-full rounded-xl" />
        <Skel className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <EmptyBlock
        icon={<FiClock />}
        title="No availability set"
        description="This user's weekly clinic hours will appear here once configured."
      />
    );
  }

  return (
    <div className="space-y-3">
      {days.map((d) => (
        <DayRow key={d.id} item={d} />
      ))}
    </div>
  );
};

export default AvailabilityTab;
