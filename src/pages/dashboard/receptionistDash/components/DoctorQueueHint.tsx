import { FiPhoneCall } from "react-icons/fi";
import type { DoctorQueueHintProps } from "../../../../types/receptionistDash";

const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const DoctorQueueHint = ({
  selectedDoctorName,
  isApprovalPending,
  lockedTitle,
  onClear,
}: DoctorQueueHintProps) => (
  <div className="bg-surface border border-line rounded-[16px] p-4 flex items-center gap-3">
    <div className="h-9 w-9 rounded-full bg-[#e6fbf7] flex items-center justify-center shrink-0 dark:bg-[#16352f]">
      <FiPhoneCall className="h-4 w-4 text-primary dark:text-[#9be7dc]" />
    </div>
    <div className="min-w-0">
      <p className="text-[14px] font-semibold text-text">
        Showing only {selectedDoctorName}
      </p>
      <p className="text-[12px] font-medium text-text-muted">
        Clear the filter to see all doctors' queues for today.
      </p>
    </div>
    <button
      type="button"
      disabled={isApprovalPending}
      title={lockedTitle}
      onClick={onClear}
      className={`cursor-pointer ml-auto text-[12px] font-medium text-primary hover:underline shrink-0 dark:text-[#9be7dc] ${disabledNavClass}`}
    >
      Clear filter
    </button>
  </div>
);

export default DoctorQueueHint;
