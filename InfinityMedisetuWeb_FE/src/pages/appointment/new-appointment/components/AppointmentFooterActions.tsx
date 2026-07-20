import React from "react";

import AppButton from "../../../../components/shared/AppButton";

type AppointmentFooterActionsProps = {
  hasActiveSubscription: boolean;
  isCreating: boolean;
  isSubmitting: boolean;
  saveButtonRef: React.RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onSubmit: React.MouseEventHandler<HTMLButtonElement>;
};

const AppointmentFooterActions: React.FC<AppointmentFooterActionsProps> = ({
  hasActiveSubscription,
  isCreating,
  isSubmitting,
  saveButtonRef,
  onCancel,
  onSubmit,
}) => {
  if (!hasActiveSubscription) return null;

  return (
    <>
      {/* Desktop / Tablet */}
      <div className="hidden sm:flex items-center justify-end mt-4 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-teal-600 bg-white px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-70 cursor-pointer dark:border-[#46beae] dark:bg-[#0f1728] dark:text-[#46beae] dark:hover:bg-[#1a3a35]"
          disabled={isCreating || isSubmitting}
        >
          Cancel
        </button>

        <button
          ref={saveButtonRef}
          type="button"
          onClick={onSubmit}
          disabled={isCreating || isSubmitting}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-70 cursor-pointer dark:bg-[#46beae] dark:text-slate-900 dark:hover:bg-[#349e90]"
        >
          {isCreating || isSubmitting ? "Saving..." : "Save Appointment"}
        </button>
      </div>

      {/* Mobile */}
      <div className="mt-4 flex flex-col sm:hidden gap-3">
        <AppButton
          text="Cancel"
          onPress={onCancel}
          buttonVariant="outlined"
          isDisabled={isCreating || isSubmitting}
        />

        <AppButton
          text={isCreating || isSubmitting ? "Saving..." : "Save Appointment"}
          type="submit"
          buttonVariant="primary"
          isDisabled={isCreating || isSubmitting}
        />
      </div>
    </>
  );
};

export default AppointmentFooterActions;
