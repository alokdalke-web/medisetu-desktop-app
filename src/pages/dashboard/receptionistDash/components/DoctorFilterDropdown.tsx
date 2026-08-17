import { FiChevronDown, FiUsers } from "react-icons/fi";
import type { DoctorFilterDropdownProps } from "../../../../types/receptionistDash";

const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const DoctorFilterDropdown = ({
  doctorsList,
  selectedDoctorId,
  selectedDoctorName,
  isOpen,
  setIsOpen,
  onSelect,
  isApprovalPending,
  lockedTitle,
  dropdownRef,
}: DoctorFilterDropdownProps) => (
  <div className="relative w-full sm:w-auto" ref={dropdownRef}>
    <button
      type="button"
      disabled={isApprovalPending}
      title={lockedTitle}
      onClick={() => setIsOpen(!isOpen)}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      className={`cursor-pointer flex items-center gap-2 rounded-xl border border-line bg-surface py-2.5 pr-4 pl-3 text-[14px] text-text hover:bg-slate-50 w-full sm:w-auto min-w-[180px] dark:hover:bg-surface-muted ${disabledNavClass}`}
    >
      <FiUsers className="h-[18px] w-[18px] text-text-muted" />
      <span className="truncate max-w-[160px]">{selectedDoctorName}</span>
      <FiChevronDown className="h-4 w-4 text-text-muted ml-auto" />
    </button>
    {isOpen && (
      <div
        role="listbox"
        aria-label="Filter by doctor"
        className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-line bg-surface py-1 shadow-lg max-h-60 overflow-y-auto dark:shadow-none"
      >
        <button
          type="button"
          role="option"
          aria-selected={!selectedDoctorId}
          onClick={() => onSelect("")}
          className={`cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-surface-muted ${
            !selectedDoctorId ? "font-medium text-text bg-surface-muted" : "text-text-muted"
          }`}
        >
          All Doctors
        </button>
        {doctorsList.map((doc) => (
          <button
            key={doc.id}
            type="button"
            role="option"
            aria-selected={selectedDoctorId === doc.id}
            onClick={() => onSelect(doc.id)}
            className={`cursor-pointer w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-surface-muted ${
              selectedDoctorId === doc.id ? "font-medium text-text bg-surface-muted" : "text-text-muted"
            }`}
          >
            {doc.name}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default DoctorFilterDropdown;
