import { Tooltip } from "@heroui/react";
import React from "react";
import { FiCheck, FiPlus } from "react-icons/fi";

export const PrescriptionToast: React.FC<{
  toast: { show: boolean; msg: string };
}> = ({ toast }) =>
    toast.show ? (
      <div className="fixed bottom-6 right-6 z-[999]">
        <div className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm shadow-lg">
          {toast.msg}
        </div>
      </div>
    ) : null;

export const EmptyPrescriptionSummary: React.FC<{ imageSrc: string }> = ({
  imageSrc,
}) => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden p-4 text-center">
    <img
      src={imageSrc}
      alt="Prescription summary"
      className="max-h-[min(45%,220px)] w-auto max-w-[80%] object-contain"
    />
    <div className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
      No Prescription Added Yet
    </div>
  </div>
);

export const MedicineSearchResultRow: React.FC<{
  highlightedNameHtml: string;
  alreadyAdded: boolean;
  onAdd: () => void;
  canEdit?: boolean;
  lockMessage?: string;
  showLockTooltip?: boolean;
}> = ({
  highlightedNameHtml,
  alreadyAdded,
  onAdd,
  canEdit = true,
  lockMessage,
  showLockTooltip = false,
}) => {
    const addButton = showLockTooltip ? (
      <button
        type="button"
        disabled={!canEdit}
        onClick={onAdd}
        className={[
          "grid h-7 w-7 place-items-center rounded-full border transition",
          !canEdit
            ? "border-slate-200 text-slate-400 cursor-not-allowed"
            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
        ].join(" ")}
      >
        <FiPlus className="h-4 w-4" />
      </button>
    ) : (
      <button
        type="button"
        onClick={onAdd}
        className="grid h-7 w-7 place-items-center rounded-full border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition"
      >
        <FiPlus className="h-4 w-4" />
      </button>
    );

    return (
      <div
        className={[
          "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 mb-2 transition",
          alreadyAdded
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-white hover:bg-slate-50",
        ].join(" ")}
      >
        <div className="min-w-0">
          <div
            className="truncate text-sm font-semibold text-slate-900"
            dangerouslySetInnerHTML={{
              __html: highlightedNameHtml,
            }}
          />
        </div>

        {alreadyAdded ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white">
            <FiCheck className="h-4 w-4" />
          </span>
        ) : showLockTooltip ? (
          <Tooltip
            content={lockMessage}
            isDisabled={canEdit}
            placement="top"
          >
            <span className="inline-flex">{addButton}</span>
          </Tooltip>
        ) : (
          addButton
        )}
      </div>
    );
  };
