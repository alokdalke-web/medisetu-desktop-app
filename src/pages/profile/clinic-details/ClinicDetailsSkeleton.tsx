import React from "react";
import SkeletonBlock from "../../appointment/components/list/SkeletonBlock";

/** Shown while `useGetClinicProfileOverviewQuery()` is loading. */
const ClinicDetailsSkeleton: React.FC = () => {
  return (
    <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-1/3" />
            <SkeletonBlock className="h-3 w-1/4" />
          </div>
        </div>
        <SkeletonBlock className="h-2 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonBlock className="h-40 rounded-2xl lg:col-span-2" />
        <SkeletonBlock className="h-40 rounded-2xl" />
      </div>
    </div>
  );
};

export default ClinicDetailsSkeleton;
