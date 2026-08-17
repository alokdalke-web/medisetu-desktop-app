import React from "react";
import { FiEdit3 } from "react-icons/fi";

const DraftDataIndicator: React.FC = () => (
  <span
    title="Draft data is saved for this appointment."
    className={[
      "relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary shadow-sm shadow-primary/10",
      "dark:border-primary/35 dark:bg-primary/15 dark:text-[#46beae]",
    ].join(" ")}
    aria-label="Saved draft data"
  >
    <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
    </span>
    <FiEdit3 className="h-3.5 w-3.5" />
  </span>
);

export default DraftDataIndicator;
