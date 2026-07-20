import { Tooltip as HeroTooltip, type TooltipProps } from "@heroui/react";

/**
 * Shared Tooltip component.
 *
 * Thin wrapper around HeroUI's Tooltip that applies consistent default styling
 * across the app while still allowing every HeroUI Tooltip prop (content,
 * placement, isDisabled, classNames, etc.) to be passed through and overridden.
 *
 * Per-usage `classNames` are merged with the defaults so existing call sites
 * keep their custom styling.
 */
const DEFAULT_CONTENT_CLASS =
  "bg-white border border-default-200 text-slate-700 rounded-xl px-3 py-2 shadow-lg text-[13px] leading-snug max-w-[260px]";

const Tooltip = ({ classNames, ...props }: TooltipProps) => {
  return (
    <HeroTooltip
      {...props}
      classNames={{
        ...classNames,
        content: [DEFAULT_CONTENT_CLASS, classNames?.content]
          .filter(Boolean)
          .join(" "),
      }}
    />
  );
};

export default Tooltip;
