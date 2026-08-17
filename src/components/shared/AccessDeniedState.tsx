import React from "react";
import { FiShieldOff } from "react-icons/fi";

interface AccessDeniedStateProps {
  /** Title text to display */
  title?: string;
  /** Explanation of why access was denied */
  message?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Optional action (e.g. "Go Back", "Switch Clinic") */
  action?: React.ReactNode;
  /** Compact = smaller padding/icon, for use inside cards/modals rather than a full section */
  compact?: boolean;
}

/**
 * Inline "you don't have access to this" state — for a single widget/section/modal
 * whose data request came back 403, as opposed to a full-page navigation 403
 * (see pages/AccessDenied.tsx for that case). Matches the CommonTableError/
 * CommonTableEmpty visual weight so it doesn't look out of place next to them.
 */
const AccessDeniedState: React.FC<AccessDeniedStateProps> = ({
  title = "Access restricted",
  message = "You don't have permission to view this. It may belong to another clinic.",
  icon,
  action,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border border-line bg-surface ${
        compact ? "p-6" : "p-10"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-danger/10 ${
          compact ? "h-10 w-10 mb-3" : "h-14 w-14 mb-4"
        }`}
      >
        {icon || (
          <FiShieldOff
            className={compact ? "h-5 w-5 text-danger" : "h-7 w-7 text-danger"}
          />
        )}
      </div>
      <h3
        className={`font-semibold text-text ${compact ? "text-sm" : "text-base"}`}
      >
        {title}
      </h3>
      <p
        className={`text-text-subtle mt-1 max-w-sm ${compact ? "text-xs" : "text-sm"}`}
      >
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default AccessDeniedState;
