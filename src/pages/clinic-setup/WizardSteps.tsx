// components/WizardStepsHero.tsx
import React from "react";
import { Button } from "@heroui/react";

type Props = {
  /** 0-based index of the active step */
  current: number;
  /** Click a step to jump */
  onStepClick?: (index: number) => void;
  /** Optional labels (defaults provided) */
  labels?: readonly string[];
  className?: string;
};

const DEFAULT_LABELS = [
  "Clinic Details",
  "Doctor Profile",
  "Services & Pricing",
  "Clinic Availability",
] as const;


const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

const WizardStepsHero: React.FC<Props> = ({
  current,
  onStepClick,
  labels = DEFAULT_LABELS,
  className,
}) => {
  const cur = clamp(current, 0, Math.max(0, labels.length - 1));

  return (
    <div className={cx("w-full", className)}>
      <ol
        className="mx-auto flex w-full max-w-[1100px] items-center"
        role="list"
        aria-label="Onboarding steps"
      >
        {labels.map((label, i) => {
          const isActive = i === cur;
          const isDone = i < cur;

          return (
            <li key={label} className="flex flex-1 items-center" role="listitem">
              {/* Step */}
              <div className="flex flex-col items-center">
                <Button
                  isIconOnly
                  radius="full"
                  size="sm"
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${label}`}
                  onPress={() => onStepClick?.(i)}
                  variant={isActive ? "solid" : "flat"}
                  color={isActive ? "success" : "default"}
                  className={cx(
                    "relative h-9 w-9 min-w-9 font-semibold transition-all duration-300 ease-out",
                    isActive && "bg-teal-700 text-white ring-2 ring-teal-700",
                    isDone && "bg-white text-teal-700 ring-2 ring-teal-700",
                    !isActive && !isDone && "bg-white text-gray-500 ring-2 ring-gray-300",
                    !isActive && "hover:scale-105"
                  )}
                >
           
                  <span
                    aria-hidden
                    className={cx(
                      "pointer-events-none absolute inset-0 rounded-full ring-4 ring-teal-200/60 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="relative z-[1] text-[13px]">{i + 1}</span>
                </Button>

                {/* STEP n */}
                <div
                  className={cx(
                    "mt-2 text-[11px] uppercase tracking-wide leading-none transition-colors",
                    isActive ? "text-teal-700" : "text-gray-400"
                  )}
                >
                  STEP {i + 1}
                </div>

                {/* Title */}
                <div
                  className={cx(
                    "mt-1 text-sm font-semibold transition-colors",
                    isActive ? "text-teal-700" : "text-slate-900"
                  )}
                >
                  {label}
                </div>
              </div>

              {/* Connector */}
              {i !== labels.length - 1 && (
                <div className="mx-4 h-[2px] flex-1 rounded-full overflow-hidden" aria-hidden>
                  <div
                    className={cx(
                      "h-full w-full transition-colors duration-500 ease-out",
                      isDone ? "bg-teal-700" : "bg-gray-200"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WizardStepsHero;
