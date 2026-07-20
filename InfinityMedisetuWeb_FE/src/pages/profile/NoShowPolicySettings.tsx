import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addToast } from "@heroui/react";
import {
  useGetNoShowPolicyQuery,
  useSetNoShowPolicyMutation,
} from "../../redux/api/appointmentApi";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import warning from "../../../public/assets/icons/warning-icon.svg";

type NoShowAction = "warning" | "penalty" | "advance_required" | "blocked";
type ActionKey = NoShowAction;

const ACTIONS: Array<{ value: ActionKey; label: string }> = [
  { value: "warning", label: "Send Warning Notification" },
  { value: "advance_required", label: "Require Advance Payment" },
  { value: "penalty", label: "Apply Penalty" },
  { value: "blocked", label: "Block Patient Account" },
];

type ActionMeta = {
  color: string;
  bg: string;
  message: string;
};

const ACTION_META: Record<ActionKey, ActionMeta> = {
  warning: {
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    message:
      "After 1 no-show, the system sends an automated SMS/Email warning.",
  },
  penalty: {
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    message: "Added to next invoice",
  },
  advance_required: {
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    message: "Patient must pay in full before booking another slot.",
  },
  blocked: {
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    message:
      "Account restricted from online booking. Manual override required.",
  },
};

type BaseRule = { count: number; label: string; display: string };
type Rule = BaseRule & { action: ActionKey; penaltyAmount: number | string };

const STATIC_RULES: BaseRule[] = [
  { count: 1, label: "1st consecutive miss", display: "1" },
  { count: 2, label: "2nd consecutive miss", display: "2" },
  { count: 3, label: "3rd consecutive miss", display: "3" },
  { count: 4, label: "4 or more misses", display: "4+" },
];

const DEFAULT_ACTIONS: ActionKey[] = [
  "warning",
  "advance_required",
  "penalty",
  "blocked",
];

type ActionDropdownProps = {
  value: ActionKey;
  options: Array<{
    value: ActionKey;
    label: string;
    disabled?: boolean;
  }>;
  onChange: (value: ActionKey) => void;
};

function ActionDropdown({
  value,
  options,
  onChange,
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const viewportWidth = window.innerWidth;

    const desiredWidth = Math.max(rect.width, 220);
    const safeWidth = Math.min(
      desiredWidth,
      viewportWidth - viewportPadding * 2,
    );

    const safeLeft = Math.min(
      Math.max(rect.left, viewportPadding),
      viewportWidth - safeWidth - viewportPadding,
    );

    setMenuPosition({
      top: rect.bottom + 8,
      left: safeLeft,
      width: safeWidth,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleReposition = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left shadow-sm transition-all ${
          isOpen
            ? "border-primary ring-2 ring-teal-100"
            : "border-slate-200 hover:border-primary/40"
        }`}
      >
        <span className="truncate text-sm font-medium text-slate-700">
          {selectedOption?.label}
        </span>

        <svg
          className={`ml-3 h-4 w-4 shrink-0 transition-transform ${
            isOpen ? "rotate-180 text-primary" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            className="fixed z-[9999]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      option.disabled
                        ? "cursor-not-allowed bg-white text-black"
                        : isSelected
                          ? "bg-primary text-white"
                          : "bg-white text-slate-700 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <span className="min-w-0 flex-1">{option.label}</span>

                    {isSelected && (
                      <svg
                        className="h-4 w-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function NoShowPolicySettings() {
  const { data, isLoading, refetch } = useGetNoShowPolicyQuery();
  const [savePolicy, { isLoading: isSaving }] = useSetNoShowPolicyMutation();

  const { setDirty } = useUnsavedChanges();

  const [isActive, setIsActive] = useState(false);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState<number>(15);
  const [isToggling, setIsToggling] = useState(false);

  const [rules, setRules] = useState<Rule[]>(
    STATIC_RULES.map((r, i) => ({
      ...r,
      action: DEFAULT_ACTIONS[i],
      penaltyAmount: DEFAULT_ACTIONS[i] === "penalty" ? 200 : "",
    })),
  );
  const [saved, setSaved] = useState(false);

  const baselineRef = useRef<{
    isActive: boolean;
    gracePeriodMinutes: number;
    rules: Array<{ count: number; action: ActionKey; penaltyAmount?: number }>;
  } | null>(null);

  useEffect(() => {
    const existing: any =
      (data as any)?.result ?? (data as any)?.data ?? (data as any);
    if (!existing) return;

    const nextIsActive = !!existing.isActive;
    const nextGrace = Number(existing.gracePeriodMinutes ?? 15);

    let nextRules: Rule[] = rules;
    if (Array.isArray(existing.rules) && existing.rules.length) {
      nextRules = existing.rules
        .slice(0, STATIC_RULES.length)
        .map((r: any, i: number) => {
          const count = Number(r.count ?? i + 1);
          const action = (r.action as ActionKey) || "warning";
          const penaltyAmount =
            action === "penalty" ? Number(r.penaltyAmount ?? 0) : "";
          const base = STATIC_RULES[Math.min(i, STATIC_RULES.length - 1)];

          return {
            ...base,
            count,
            action,
            penaltyAmount,
          } as Rule;
        });
    }

    setIsActive(nextIsActive);
    setGracePeriodMinutes(nextGrace);
    setRules(nextRules);

    baselineRef.current = {
      isActive: nextIsActive,
      gracePeriodMinutes: nextGrace,
      rules: nextRules.map((r) => ({
        count: Number(r.count ?? 1),
        action: r.action,
        ...(r.action === "penalty" && r.penaltyAmount
          ? { penaltyAmount: Number(r.penaltyAmount) }
          : {}),
      })),
    };

    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  const rulesComparable = useMemo(
    () =>
      rules.slice(0, STATIC_RULES.length).map((r) => ({
        count: Number(r.count ?? 1),
        action: r.action,
        ...(r.action === "penalty" && r.penaltyAmount
          ? { penaltyAmount: Number(r.penaltyAmount) }
          : {}),
      })),
    [rules],
  );

  const isPageDirty = useMemo(() => {
    const base = baselineRef.current;
    if (!base) return false;

    const same =
      base.isActive === Boolean(isActive) &&
      base.gracePeriodMinutes === Number(gracePeriodMinutes) &&
      JSON.stringify(base.rules) === JSON.stringify(rulesComparable);

    return !same;
  }, [isActive, gracePeriodMinutes, rulesComparable]);

  useEffect(() => {
    setDirty(Boolean(isPageDirty));
  }, [isPageDirty, setDirty]);

  const updateRule = (
    index: number,
    field: "action" | "penaltyAmount",
    value: any,
  ) => {
    const updated = rules.map((r, i) => {
      if (i !== index) return r;

      if (field === "action") {
        return {
          ...r,
          action: value as ActionKey,
          penaltyAmount: value === "penalty" ? r.penaltyAmount || 0 : "",
        };
      }

      return { ...r, [field]: value };
    });

    setRules(updated);
    setSaved(false);
  };

  const deleteRule = (index: number) => {
    if (rules.length <= 1) {
      addToast({
        title: "Cannot remove last rule",
        description: "At least one rule is required.",
        color: "danger",
      });
      return;
    }

    const next = rules.filter((_, i) => i !== index);
    setRules(next);
    setSaved(false);
  };

  const addRule = () => {
    if (rules.length >= STATIC_RULES.length) {
      addToast({
        title: "Maximum rules reached",
        description: `You can only add up to ${STATIC_RULES.length} rules.`,
        color: "warning",
      });
      return;
    }

    const nextBase = STATIC_RULES[rules.length];

    const newRule: Rule = {
      ...nextBase,
      action: DEFAULT_ACTIONS[rules.length] || "warning",
      penaltyAmount: DEFAULT_ACTIONS[rules.length] === "penalty" ? 200 : "",
    };

    setRules([...rules, newRule]);
    setSaved(false);
  };

  const usedActions = (currentIndex: number): ActionKey[] =>
    rules.filter((_, i) => i !== currentIndex).map((r) => r.action);

  const validateRules = () => {
    if (!rules.length) {
      addToast({ title: "Add at least one rule", color: "danger" });
      return false;
    }

    const counts = rules.map((r) => r.count);
    if (new Set(counts).size !== counts.length) {
      addToast({
        title: "Duplicate no-show count",
        description: "Each rule must have a different count.",
        color: "danger",
      });
      return false;
    }

    const actions = rules.map((r) => r.action);
    if (new Set(actions).size !== actions.length) {
      addToast({
        title: "Duplicate action",
        description: "Each rule must have a unique action.",
        color: "danger",
      });
      return false;
    }

    for (const r of rules) {
      if (r.count < 1) {
        addToast({
          title: "Invalid count",
          description: "Count must be 1 or more.",
          color: "danger",
        });
        return false;
      }

      if (r.action === "penalty") {
        const amt = Number(r.penaltyAmount ?? 0);
        if (!Number.isFinite(amt) || amt <= 0) {
          addToast({
            title: "Missing penalty amount",
            description: "Please enter penalty amount greater than 0.",
            color: "danger",
          });
          return false;
        }
      }
    }

    return true;
  };

  const buildPayload = (activeValue = isActive) => ({
    isActive: activeValue,
    gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
    rules: rules.slice(0, STATIC_RULES.length).map((r) => ({
      count: Number(r.count ?? 1),
      action: r.action,
      ...(r.action === "penalty"
        ? { penaltyAmount: Number(r.penaltyAmount ?? 0), penaltyType: "fixed" }
        : {}),
    })),
  });

  const handleToggleChange = async (nextValue: boolean) => {
    const prev = isActive;
    setIsActive(nextValue);

    try {
      setIsToggling(true);
      await savePolicy(buildPayload(nextValue)).unwrap();

      addToast({
        title: nextValue ? "No-Show Policy enabled" : "No-Show Policy disabled",
        color: "success",
      });

      await refetch();
      setDirty(false);
    } catch {
      setIsActive(prev);
      addToast({ title: "Failed to update policy status", color: "danger" });
    } finally {
      setIsToggling(false);
    }
  };

  const handleSave = async () => {
    if (isActive && !validateRules()) return;

    try {
      await savePolicy(buildPayload()).unwrap();
      addToast({ title: "Settings saved", color: "success" });
      await refetch();
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      addToast({ title: "Failed to save", color: "danger" });
    }
  };

  const isBusy = isLoading || isSaving || isToggling;

  return (
    <div className="bg-white font-sans dark:bg-[#111726] dark:text-slate-100 [&_.text-slate-800]:dark:text-white [&_.text-slate-700]:dark:text-slate-200 [&_.text-slate-600]:dark:text-slate-300 [&_.bg-white]:dark:bg-[#0f1728] [&_.border-slate-200]:dark:border-[#273244] [&_.border-slate-100]:dark:border-[#273244]">
      <ProfilePageHeader
        icon={<img src={warning} alt="" className="w-4" />}
        title="No-Show Policy"
      />
      <div className="mx-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-[#273244] dark:bg-[#0f1728]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                Enable No-Show Policy
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Automatically apply rules for missed appointments across the
                system. Set rules for patients who miss scheduled appointments
                to optimize clinic efficiency.
              </p>
            </div>

            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-primary" : "text-slate-400"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>

              <button
                onClick={() => handleToggleChange(!isActive)}
                disabled={isBusy}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  isActive ? "bg-primary/100" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {isActive && (
          <div className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-800">
                  Policy Rules
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Define actions based on consecutive no-shows
                </p>
              </div>

              {rules.length < STATIC_RULES.length && (
                <button
                  type="button"
                  onClick={addRule}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 sm:w-auto"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Rule
                </button>
              )}
            </div>

            <div className="px-4 py-5 sm:px-6 sm:py-8">
              <div className="relative">
                <div
                  className="absolute bottom-5 left-[18px] top-5 w-0.5 bg-slate-200 sm:left-4"
                  style={{ zIndex: 0 }}
                />

                <div className="space-y-6 sm:space-y-8">
                  {rules.map((rule, index) => {
                    const meta =
                      ACTION_META[rule.action] || ACTION_META.warning;
                    const isBlocked = rule.action === "blocked";

                    return (
                      <div
                        key={`${rule.display}-${index}`}
                        className="relative flex gap-4 sm:gap-6"
                      >
                        <div
                          className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow-sm ${
                            isBlocked
                              ? "bg-red-100 text-red-600"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {rule.display}
                        </div>

                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-3">
                            <div className="w-full lg:w-48 lg:shrink-0">
                              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                No-Show Count
                              </label>
                              <div className="flex min-h-9 items-center text-sm font-medium text-slate-600">
                                {rule.label}
                              </div>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start">
                              <div className="min-w-0 flex-1">
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                  Action to Take
                                </label>

                                <ActionDropdown
                                  value={rule.action}
                                  onChange={(nextValue) =>
                                    updateRule(index, "action", nextValue)
                                  }
                                  options={ACTIONS.map((a) => ({
                                    ...a,
                                    disabled:
                                      a.value !== rule.action &&
                                      usedActions(index).includes(a.value),
                                  }))}
                                />

                                <div
                                  className={`mt-2 text-xs leading-5 ${meta.color}`}
                                >
                                  <span>{meta.message}</span>
                                </div>
                              </div>

                              {rule.action === "penalty" && (
                                <div className="w-full sm:w-40 lg:w-32 lg:shrink-0">
                                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                    Penalty Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={rule.penaltyAmount}
                                    onChange={(e) =>
                                      updateRule(
                                        index,
                                        "penaltyAmount",
                                        e.target.value,
                                      )
                                    }
                                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-teal-100"
                                    placeholder="Amount"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="self-start lg:pt-5">
                              <button
                                type="button"
                                onClick={() => deleteRule(index)}
                                disabled={rules.length <= 1}
                                title={
                                  rules.length <= 1
                                    ? "At least one rule required"
                                    : "Delete rule"
                                }
                                className={`rounded-md p-1.5 transition-colors ${
                                  rules.length <= 1
                                    ? "cursor-not-allowed text-slate-300"
                                    : "text-slate-300 hover:text-red-400"
                                }`}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                onClick={() => {
                  setRules(
                    STATIC_RULES.map((r, i) => ({
                      ...r,
                      action: DEFAULT_ACTIONS[i],
                      penaltyAmount:
                        DEFAULT_ACTIONS[i] === "penalty" ? 200 : "",
                    })),
                  );
                  setSaved(false);
                }}
                className="w-full px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-700 sm:w-auto"
              >
                Discard Changes
              </button>

              <button
                onClick={handleSave}
                disabled={isBusy}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all sm:w-auto ${
                  saved ? "bg-green-500" : "bg-primary hover:bg-primary"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}