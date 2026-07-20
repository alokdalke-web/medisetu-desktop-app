// src/pages/dashboard/DateFilterTabs.tsx

export type DateTab = "today" | "yesterday" | "thisWeek" | "thisMonth" | "custom";

type Props = {
  active: DateTab;
  onChange: (tab: DateTab) => void;
  onCustom: () => void;
  customLabel?: string;
};

const DateFilterTabs = ({ active, onChange, onCustom, customLabel }: Props) => {
  const tabs: { key: DateTab; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "thisWeek", label: "This Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];

  const todayDateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-[rgba(207,207,207,0.5)] rounded-xl p-0.5 flex items-center gap-1 sm:gap-2 min-w-max dark:bg-[#111726] dark:border-[#273244] ">
      {tabs.map((t) => {
        const isActive = active === t.key;
        let displayLabel =
          t.key === "custom" && isActive && customLabel ? customLabel : t.label;
        if (t.key === "today") {
          displayLabel = `Today, ${todayDateLabel}`;
        }

        return (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              if (t.key === "custom") {
                onCustom();
              } else {
                onChange(t.key);
              }
            }}
            className={` cursor-pointer  px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-[10px] text-[12px] sm:text-[14px] transition whitespace-nowrap flex items-center gap-1.5 ${
              isActive
                ? "bg-[#0d5c5e] text-white font-normal"
                : "text-[#677294] font-normal hover:text-[#100e1c] dark:text-white dark:hover:text-white"
            }`}
          >
            {displayLabel}
            {t.key === "custom" && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M5.33 1.33V3.33"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.67 1.33V3.33"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.33 6.06H13.67"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 5.67V11.33C14 13.33 13 14.67 10.67 14.67H5.33C3 14.67 2 13.33 2 11.33V5.67C2 3.67 3 2.33 5.33 2.33H10.67C13 2.33 14 3.67 14 5.67Z"
                  stroke={isActive ? "white" : "currentColor"}
                  strokeWidth="1"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DateFilterTabs;
