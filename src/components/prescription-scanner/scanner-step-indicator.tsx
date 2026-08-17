import { Chip } from "@heroui/chip";

import type { PagePhase } from "../../types/prescription-scanner";

type StepIndicatorProps = {
  phase: PagePhase;
};

/** Step indicator so users always know where they are. */
export function ScannerStepIndicator({ phase }: StepIndicatorProps) {
  const steps: { key: PagePhase[]; label: string }[] = [
    { key: ["idle", "session_ready"], label: "1. Capture" },
    { key: ["uploaded"], label: "2. Review" },
    { key: ["scanning"], label: "3. Processing" },
    { key: ["result"], label: "4. Result" },
  ];

  const activeIndex = steps.findIndex((step) => step.key.includes(phase));

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <Chip
            color={
              i < activeIndex
                ? "success"
                : i === activeIndex
                  ? "primary"
                  : "default"
            }
            size="sm"
            variant={i === activeIndex ? "solid" : "flat"}
          >
            {step.label}
          </Chip>
          {i < steps.length - 1 && <span className="text-default-300">›</span>}
        </div>
      ))}
    </div>
  );
}
