import React from "react";
import { FiSettings } from "react-icons/fi";

import AppButton from "../../../components/shared/AppButton";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-default-200 bg-default-50/50 px-6 py-12 text-center dark:border-default-100 dark:bg-default-50/20">
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-default-100 text-default-400 dark:bg-default-50/50">
      {icon ?? <FiSettings className="text-[24px]" />}
    </div>
    <h3 className="mt-4 text-[15px] font-semibold text-default-700 dark:text-default-200">{title}</h3>
    <p className="mt-1 max-w-[320px] text-[13px] text-default-400">
      {description}
    </p>
    {actionLabel && onAction && (
      <div className="mt-5">
        <AppButton text={actionLabel} buttonVariant="primary" onPress={onAction} />
      </div>
    )}
  </div>
);

export default EmptyState;
