import { FiUsers } from "react-icons/fi";
import FeatureInfoTip from "../../../../components/shared/FeatureInfoTip";
import { doctorQueueTips } from "../../../../constants/featureTips";
import type { DoctorQueueWidgetProps } from "../../../../types/receptionistDash";
import { initials } from "../helpers/receptionistDashFormatters";

const disabledNavClass =
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:-translate-y-0";

const DoctorQueueWidget = ({
  queues,
  isApprovalPending,
  lockedTitle,
  onSelectDoctor,
}: DoctorQueueWidgetProps) => (
  <div className="bg-surface border border-line rounded-[16px] p-4 flex flex-col gap-3 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <h3 className="text-[15px] font-semibold text-text">Doctor Queues</h3>
        <FeatureInfoTip
          title="Doctor Queues"
          tips={doctorQueueTips}
          guideSection="dashboard-receptionist"
          linkLabel="Read dashboard guide"
          align="right"
        />
      </div>
      <span className="text-[12px] font-medium text-text-muted">Today</span>
    </div>

    {queues.length === 0 ? (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <div className="h-9 w-9 rounded-full bg-surface-muted flex items-center justify-center">
          <FiUsers className="h-4 w-4 text-text-muted" />
        </div>
        <p className="text-[12px] font-medium text-text-muted">
          No doctor queues yet today.
        </p>
      </div>
    ) : (
      <ul className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {queues.map((q) => {
          const pct =
            q.total > 0 ? Math.round((q.completed / q.total) * 100) : 0;
          return (
            <li key={q.doctorId}>
              <button
                type="button"
                disabled={isApprovalPending}
                title={lockedTitle ?? `Filter dashboard by ${q.doctorName}`}
                onClick={() => onSelectDoctor(q.doctorId)}
                className={`cursor-pointer w-full rounded-xl border border-line px-3 py-2.5 text-left hover:bg-surface-muted transition ${disabledNavClass}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                    {initials(q.doctorName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text truncate">
                      {q.doctorName}
                    </p>
                    <p className="text-[11px] font-medium text-text-muted">
                      {q.completed} of {q.total} seen
                      {q.remaining > 0 ? ` · ${q.remaining} waiting` : ""}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-primary shrink-0">
                    {pct}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default DoctorQueueWidget;
