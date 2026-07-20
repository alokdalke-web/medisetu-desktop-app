type StatCardData = {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: string;
  delta?: number;
  bgColor: string;
  deltaLabel?: string;
  trendLabel?: string;
  trendTitle?: string;
  direction?: "up" | "down" | "neutral";
  sparkUp?: boolean;
  compact?: boolean;
  compactSparkline?: boolean;
};


export const StatCard = ({
  icon,
  label,
  sublabel,
  value,
  delta,
  bgColor,
  deltaLabel = "yesterday",
  trendLabel,
  trendTitle,
  direction,
  sparkUp,
  compact = false,
  compactSparkline = false,
}: StatCardData) => {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const deltaValue = showDelta ? (delta as number) : 0;
  const resolvedDirection =
    direction ??
    (showDelta
      ? deltaValue > 0
        ? "up"
        : deltaValue < 0
          ? "down"
          : "neutral"
      : sparkUp === false
        ? "down"
        : "up");
  const isUp = resolvedDirection === "up";
  const isDown = resolvedDirection === "down";
  const comparisonText =
    trendLabel ??
    (deltaLabel.trim().toLowerCase().startsWith("vs ")
      ? deltaLabel
      : `vs ${deltaLabel}`);
  const trendToneClass = isUp
    ? "text-[#27b77a]"
    : isDown
      ? "text-[#e5484d]"
      : "text-[rgba(103,114,148,0.8)] dark:text-white";
  const trendArrow = showDelta && deltaValue !== 0 ? (isUp ? "↑" : isDown ? "↓" : "") : "";
  const trendPercentageText = showDelta
    ? `${deltaValue > 0 ? "+" : ""}${deltaValue}%`
    : "";
  const cardClassName = compact
    ? "min-h-[92px] gap-2 rounded-[14px] px-3 py-2.5"
    : "min-h-[104px] gap-2 sm:gap-3 rounded-[6px] px-3 py-3 sm:px-4";
  const contentGapClassName = compact ? "gap-2" : "gap-2.5 sm:gap-3";
  const iconClassName = compact ? "h-8 w-8" : "h-9 w-9";
  const labelClassName = compact
    ? "text-[12px] font-medium leading-4"
    : "text-[13px] sm:text-[14px] font-medium";
  const valueClassName = compact
    ? "mt-0.5 text-[20px] font-semibold leading-6"
    : "mt-1 text-[20px] sm:text-[22px] 2xl:text-[24px] font-semibold leading-7";
  const trendClassName = compact
    ? "mt-1 flex items-center gap-x-1 whitespace-nowrap text-[9px] leading-3"
    : "mt-2 flex items-center gap-x-1 whitespace-nowrap text-[10px]";
  const emptyTrendClassName = compact ? "mt-1 h-3" : "mt-2 h-[13px]";
  const sparklineClassName = compact
    ? "hidden md:flex lg:hidden 2xl:flex shrink-0 items-end origin-bottom-right scale-[0.86]"
    : [
        "hidden md:flex lg:hidden 2xl:flex shrink-0 items-end origin-bottom-right",
        compactSparkline ? "scale-x-[0.88] scale-y-[0.68]" : "",
      ].join(" ");

const SparklineUp = () => (
  <svg
    width="87"
    height="31"
    viewBox="0 0 88 32"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M1 30C1 30 7 31.5 10.5 30C16.5 28 16 17 22.5 16C29 15 30 29 37 28.5C43 28.5 44.5 19 50.5 19C56 19 57.5 28 63 28.5C73.5 29 69.5 1 80 1C83 1 87 3.5 87 3.5"
      stroke="#2FAE8E"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M10.5 30C7 31.5 1 30 1 30V31.5L87 30.5V3.5C87 3.5 83 1 80 1C69.5 1 73.5 29 63 28.5C57.5 28 56 19 50.5 19C44.5 19 43 28.5 37 28.5C30 29 29 15 22.5 16C16 17 16.5 28 10.5 30Z"
      fill="url(#sparkGreenGrad)"
      fillOpacity="0.4"
    />
    <defs>
      <linearGradient
        id="sparkGreenGrad"
        x1="44"
        y1="1"
        x2="44"
        y2="31.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#2FAE8E" />
        <stop offset="1" stopColor="#2FAE8E" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const SparklineDown = () => (
  <svg
    width="87"
    height="28"
    viewBox="0 0 88 28"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M1 27C1 27 7 28 11 27C23 24.5 16 -1.5 28 1C36 2.5 33.5 15 41.5 16C43 16.5 44 16.5 45.5 16C48 15.5 48.5 14 51 12.5C53 11 55.5 11 57.5 12.5C61 15 61.5 17 64 20C67 23 70 23 71.5 21.5C73 20 73.5 18.5 77 18C79.5 17.5 87 26 87 26"
      stroke="#E5484D"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M11 27C7 28 1 27 1 27L12 27C23 23.5 16 -1.5 28 1C36 2.5 33.5 15 41.5 16C43 16.5 44 16.5 45.5 16C48 15.5 48.5 14 51 12.5C53 11 55.5 11 57.5 12.5C61 15 61.5 17 64 20C67 23 70 23 71.5 21.5C73 20 73.5 17.5 76 17C78.5 16.5 87 26 87 26L12 27C11.5 27 11.3 27 11 27Z"
      fill="url(#sparkRedGrad)"
      fillOpacity="0.4"
    />
    <defs>
      <linearGradient
        id="sparkRedGrad"
        x1="44"
        y1="1"
        x2="44"
        y2="27.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#E5484D" />
        <stop offset="1" stopColor="#E5484D" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

const SparklineNeutral = () => (
  <svg
    width="87"
    height="28"
    viewBox="0 0 88 28"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M1 18C9 16.5 13 16.5 21 18C29 19.5 33 19.5 41 18C49 16.5 53 16.5 61 18C69 19.5 75 19.5 87 17.5"
      stroke="#94A3B8"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M1 18C9 16.5 13 16.5 21 18C29 19.5 33 19.5 41 18C49 16.5 53 16.5 61 18C69 19.5 75 19.5 87 17.5V28H1V18Z"
      fill="url(#sparkNeutralGrad)"
      fillOpacity="0.35"
    />
    <defs>
      <linearGradient
        id="sparkNeutralGrad"
        x1="44"
        y1="17"
        x2="44"
        y2="28"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#94A3B8" />
        <stop offset="1" stopColor="#94A3B8" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);
  return (
    <div className={`flex min-w-0 flex-1 items-stretch justify-between border border-[rgba(229,231,234,0.6)] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none ${cardClassName}`}>
      <div className={`flex min-w-0 flex-1 items-start ${contentGapClassName}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-lg dark:bg-[#172033] ${iconClassName} ${bgColor}`}
        >
          {icon}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col leading-[18px]">
            <span className={`${labelClassName} whitespace-nowrap text-[#677294] dark:text-white`}>
              {label}
            </span>
            {sublabel && (
              <span className={`${labelClassName} whitespace-nowrap text-[#677294] dark:text-white`}>
                {sublabel}
              </span>
            )}
          </div>

          <span className={`whitespace-nowrap text-[#100e1c] dark:text-white ${valueClassName}`}>
            {value}
          </span>

          {showDelta ? (
            <div
              className={trendClassName}
              title={trendTitle}
            >
              <span
                className={`font-medium ${trendToneClass}`}
              >
                {trendArrow ? `${trendArrow} ` : ""}
                {trendPercentageText}
              </span>
              <span className="whitespace-nowrap text-[rgba(103,114,148,0.6)] dark:text-white">
                {comparisonText}
              </span>
            </div>
          ) : (
            <div className={emptyTrendClassName} />
          )}
        </div>
      </div>

      <div className={sparklineClassName}>
        {isUp ? <SparklineUp /> : isDown ? <SparklineDown /> : <SparklineNeutral />}
      </div>
    </div>
  );
};
