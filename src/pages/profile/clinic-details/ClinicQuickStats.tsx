import React from "react";
import { FiStar, FiUsers, FiGrid, FiAward, FiClock } from "react-icons/fi";
import type { ClinicQuickStatsProps } from "../../../types/profile/clinicDetailsSections";

type Tile = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  /** Alpha-based accent so one class pair composites correctly in both themes. */
  accent: string;
};

const ClinicQuickStats: React.FC<ClinicQuickStatsProps> = ({ stats }) => {
  const tiles = [
    stats.rating !== null && {
      icon: <FiStar className="h-5 w-5" />,
      title: "Rating",
      value: stats.rating.toFixed(1),
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      icon: <FiUsers className="h-5 w-5" />,
      title: "Doctors",
      value: stats.doctorCount,
      accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    stats.departmentCount > 0 && {
      icon: <FiGrid className="h-5 w-5" />,
      title: "Departments",
      value: stats.departmentCount,
      accent: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    stats.yearsOfExperience !== null && {
      icon: <FiAward className="h-5 w-5" />,
      title: "Experience",
      value: `${stats.yearsOfExperience} yrs`,
      accent: "bg-primary/10 text-primary",
    },
    {
      icon: <FiClock className="h-5 w-5" />,
      title: "Status",
      value: stats.isOpenNow ? "Open" : "Closed",
      accent: stats.isOpenNow
        ? "bg-green-500/10 text-green-600 dark:text-green-400"
        : "bg-red-500/10 text-red-600 dark:text-red-400",
    },
  ].filter(Boolean) as Tile[];

  // Rating/experience drop out when unset, so the column count follows the
  // actual tile count — a fixed 5-column grid would leave dead space instead.
  const columnClass =
    {
      1: "lg:grid-cols-1",
      2: "lg:grid-cols-2",
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-5",
    }[tiles.length] ?? "lg:grid-cols-5";

  return (
    <div
      className={`flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 ${columnClass} [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent] active:[scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400`}
    >
      {tiles.map((tile) => (
        <div
          key={tile.title}
          className="flex min-w-[150px] shrink-0 items-center gap-3 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-primary/30 sm:min-w-0 sm:shrink"
        >
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tile.accent}`}
          >
            {tile.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] text-text-muted">{tile.title}</p>
            <h3 className="truncate text-[20px] font-semibold leading-tight text-text">
              {tile.value}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClinicQuickStats;
