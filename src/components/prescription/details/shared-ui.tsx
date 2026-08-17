import React, { useEffect } from "react";
import { FiChevronDown, FiChevronRight, FiX } from "react-icons/fi";
import Tooltip from "../../shared/Tooltip";
import type {
  ActionRowProps,
  RightDrawerProps,
  SectionCardProps,
  SectionTone,
} from "../../../types/prescription";

/**
 * One icon treatment for every clinical section.
 *
 * Each section used to pick its own pastel tint (violet, amber, cyan, rose,
 * fuchsia, …). Ten competing hues give a doctor no hierarchy to read — nothing
 * stands out because everything does, including the one field that genuinely
 * must: allergies. Sections are now uniformly brand-tinted, and `tone="danger"`
 * is reserved for the clinically dangerous one.
 */
const iconToneClass = (tone: SectionTone, filled: boolean) => {
  if (tone === "danger") {
    return "bg-danger/10 text-danger";
  }
  return filled
    ? "bg-primary/10 text-primary dark:text-primary-hover"
    : "bg-surface-muted text-text-muted";
};

/**
 * The value line under a section title.
 *
 * When the section has content this shows the content itself; only an empty
 * section falls back to the static prompt, because that is the only time a
 * prompt is the more useful thing to read.
 */
const SectionSubtitle: React.FC<{ summary?: string; subtitle?: string }> = ({
  summary,
  subtitle,
}) => {
  const text = summary?.trim() || subtitle;
  if (!text) return null;

  return (
    <div
      className={[
        "truncate text-[11px] leading-4",
        summary?.trim() ? "text-text" : "text-text-muted",
      ].join(" ")}
      title={summary?.trim() || undefined}
    >
      {text}
    </div>
  );
};

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  children,
  icon,
  iconTooltip,
  tone = "default",
  showTooltip = false,
  tooltipText,
  subtitle,
  summary,
  defaultOpen = false,
  openStateKey = "",
  filled = false,
  headerAction,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen, openStateKey]);

  const titleText =
    typeof title === "string" ? title : subtitle || iconTooltip || "section";

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border bg-surface transition-colors",
        isOpen ? "border-primary/40 ring-1 ring-primary/15" : "border-line",
      ].join(" ")}
    >
      <div
        className={[
          "flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left transition",
          isOpen ? "bg-primary/[0.04]" : "hover:bg-surface-muted",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${titleText}`}
        >
          {icon ? (
            <span
              className={[
                "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                iconToneClass(tone, filled),
              ].join(" ")}
            >
              {icon}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <Tooltip
              content={tooltipText}
              isDisabled={!showTooltip || !tooltipText}
              placement="top"
            >
              <div
                className={[
                  "flex items-center gap-1.5 truncate text-[13px] font-semibold leading-5 text-text",
                  showTooltip ? "cursor-not-allowed" : "",
                ].join(" ")}
              >
                {typeof title === "string" ? (
                  <span className="truncate">{title}</span>
                ) : (
                  <div className="min-w-0 flex-1">{title}</div>
                )}
              </div>
            </Tooltip>

            <SectionSubtitle summary={summary} subtitle={subtitle} />
          </div>
        </button>

        {headerAction ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg transition hover:bg-black/5 lg:h-8 lg:w-8 dark:hover:bg-white/10"
          aria-expanded={isOpen}
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${titleText}`}
        >
          <FiChevronDown
            className={[
              "transition-transform duration-200",
              isOpen
                ? "rotate-180 text-primary dark:text-primary-hover"
                : "text-text-subtle",
            ].join(" ")}
          />
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-line px-3 pb-3 pt-2.5">{children}</div>
      ) : null}
    </div>
  );
};

export const MiniChip: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-text">
    {children}
  </span>
);

export const ActionRow: React.FC<ActionRowProps> = ({
  title,
  subtitle,
  summary,
  onClick,
  children,
  disabled,
  icon,
  tone = "default",
  filled = false,
}) => {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
      className={[
        "w-full rounded-xl border border-line bg-surface px-2.5 py-1.5 text-left transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:bg-surface-muted",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {icon ? (
            <span
              className={[
                "relative grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors",
                iconToneClass(tone, filled),
              ].join(" ")}
            >
              {icon}
            </span>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold leading-5 text-text">
              {title}
            </div>
            <SectionSubtitle summary={summary} subtitle={subtitle} />
          </div>
        </div>

        <FiChevronRight className="shrink-0 text-text-subtle" />
      </div>

      {hasChildren ? (
        <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
      ) : null}
    </button>
  );
};

export const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = "w-full sm:w-[420px]",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close drawer backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/20"
      />

      <div
        className={[
          "absolute right-0 top-0 h-[100dvh] max-w-full bg-surface shadow-2xl",
          widthClass,
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line p-4">
            <div>
              <div className="text-base font-semibold text-text">{title}</div>
              {subtitle ? (
                <div className="text-xs text-text-muted">{subtitle}</div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-text-muted transition hover:bg-surface-muted hover:text-text"
              aria-label="Close"
            >
              <FiX />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {footer ? (
            <div className="border-t border-line p-4">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
