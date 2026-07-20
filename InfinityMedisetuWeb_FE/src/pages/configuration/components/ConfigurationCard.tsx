import React from "react";
import { FiArrowRight } from "react-icons/fi";

import AppButton from "../../../components/shared/AppButton";
import type { ConfigurationSection } from "../types";
import StatusBadge from "./StatusBadge";

type ConfigurationCardProps = {
  section: ConfigurationSection;
};

const ConfigurationCard: React.FC<ConfigurationCardProps> = ({ section }) => {
  const iconBg = section.iconBgClass ?? "bg-primary/10";
  const iconText = section.iconTextClass ?? "text-primary";

  return (
    <div className="flex flex-col rounded-2xl border border-default-200 bg-background p-5 transition-colors hover:border-default-300 dark:border-default-100 dark:hover:border-default-200 sm:p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Icon */}
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconBg} ${iconText}`}
          >
            {section.icon}
          </div>

          {/* Title + Status + Description */}
          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-bold text-default-900 dark:text-white sm:text-[16px]">
                {section.title}
              </h3>
              <StatusBadge status={section.status} />
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-default-400 sm:text-[13px]">
              {section.description}
            </p>
          </div>
        </div>

        {/* Highlight stat */}
        <div className="hidden shrink-0 text-right sm:block">
          <div className="text-2xl font-bold text-primary leading-none">
            {section.highlightValue}
          </div>
          <div className="mt-1 text-[10px] font-medium text-default-400">
            {section.highlightLabel}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {section.stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2.5 rounded-lg bg-default-50 px-3 py-2.5 dark:bg-default-50/30"
          >
            <span className="shrink-0 text-[15px] text-default-400">
              {stat.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-default-900 dark:text-white">
                {stat.value}
              </div>
              <div className="truncate text-[10px] text-default-400">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action button */}
      <div className="mt-5">
        <AppButton
          text={section.actionLabel}
          buttonVariant="outlined"
          onPress={section.onAction}
          className="gap-2"
          endContent={<FiArrowRight className="text-[14px]" />}
        />
      </div>
    </div>
  );
};

export default ConfigurationCard;
