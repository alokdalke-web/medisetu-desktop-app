import { Button, Input } from "@heroui/react";
import React from "react";
import { FiActivity } from "react-icons/fi";

type AppointmentVitalsSectionProps = {
  canUpdateVitals: boolean;
  vitals: any;
  vitalErrors: Record<string, string | null>;
  isSavingVitals: boolean;
  isActionBusy: boolean;
  fieldClassNames: any;
  handleAutoFillVitals: () => void;
  handleVitalChange: (key: any, value: string) => void;
  handleSaveVitals: () => void | Promise<void>;
};

const AppointmentVitalsSection: React.FC<AppointmentVitalsSectionProps> = ({
  canUpdateVitals,
  vitals,
  vitalErrors,
  isSavingVitals,
  isActionBusy,
  fieldClassNames: FIELD_CN,
  handleAutoFillVitals,
  handleVitalChange,
  handleSaveVitals,
}) => {
  if (!canUpdateVitals) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-[#273244] dark:bg-[#111726]">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-[#273244]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-[#172033] dark:text-white dark:ring-1 dark:ring-[#46beae]/35">
            <FiActivity size={17} />
          </div>
          <h2 className="truncate text-[13px] font-bold text-slate-900 dark:text-white">
            Patient Vitals
          </h2>
        </div>

        <Button
          size="sm"
          radius="full"
          variant="flat"
          onPress={handleAutoFillVitals}
          className="h-8 min-w-0 border border-teal-200 bg-white px-3 text-[12px] font-semibold text-teal-700 hover:bg-teal-50 dark:border-[#46beae]/45 dark:bg-[#172033] dark:text-white dark:hover:bg-[#1d2a42]"
          isDisabled={isSavingVitals || isActionBusy}
        >
          Auto-Fill
        </Button>
      </div>

      <div className="mt-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* BP Sys */}
          <div>
            <Input
              label="BP (Sys)"
              placeholder="Enter bp"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">mmHg</span>
              }
              value={vitals.bpSys?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("bpSys", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.bpSys}
            />
            {vitalErrors.bpSys && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.bpSys}
              </div>
            )}
          </div>

          {/* BP Dia */}
          <div>
            <Input
              label="BP (Dia)"
              placeholder="Enter bp"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">mmHg</span>
              }
              value={vitals.bpDia?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("bpDia", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.bpDia}
            />
            {vitalErrors.bpDia && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.bpDia}
              </div>
            )}
          </div>

          {/* Pulse */}
          <div>
            <Input
              label="Pulse"
              placeholder="Enter pulse"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">bpm</span>
              }
              value={vitals.pulse?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("pulse", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.pulse}
            />
            {vitalErrors.pulse && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.pulse}
              </div>
            )}
          </div>

          {/* SpO2 */}
          <div>
            <Input
              label="SpO₂"
              placeholder="Enter"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">%</span>
              }
              value={vitals.spo2?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("spo2", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.spo2}
            />
            {vitalErrors.spo2 && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.spo2}
              </div>
            )}
          </div>

          {/* Temperature */}
          <div>
            <Input
              label="Temperature"
              placeholder="Enter"
              type="number"
              step="0.1"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">°C</span>
              }
              value={vitals.temperatureC?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("temperatureC", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.temperatureC}
            />
            {vitalErrors.temperatureC && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.temperatureC}
              </div>
            )}
          </div>

          {/* Height */}
          <div>
            <Input
              label="Height"
              placeholder="Enter"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">cm</span>
              }
              value={vitals.heightCm?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("heightCm", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.heightCm}
            />
            {vitalErrors.heightCm && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.heightCm}
              </div>
            )}
          </div>

          {/* Weight */}
          <div>
            <Input
              label="Weight"
              placeholder="Enter"
              type="number"
              endContent={
                <span className="text-[11px] font-medium text-slate-500 dark:text-white">kg</span>
              }
              value={vitals.weightKg?.toString() ?? ""}
              onValueChange={(v) => handleVitalChange("weightKg", v)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isSavingVitals || isActionBusy}
              isInvalid={!!vitalErrors.weightKg}
            />
            {vitalErrors.weightKg && (
              <div className="mt-1 text-[11px] font-medium text-danger">
                {vitalErrors.weightKg}
              </div>
            )}
          </div>

          {/* BMI */}
          <Input
            label="BMI"
            placeholder="Auto-calculated"
            isReadOnly
            value={vitals.bmi?.toString() ?? ""}
            variant="bordered"
            classNames={FIELD_CN}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            radius="full"
            className="h-9 bg-teal-600 px-5 text-[12px] font-semibold text-white hover:bg-teal-700"
            onPress={handleSaveVitals}
            isLoading={isSavingVitals}
            isDisabled={
              isSavingVitals ||
              isActionBusy ||
              Object.values(vitalErrors).some((error) => error !== null) ||
              (!vitals.bpSys &&
                !vitals.bpDia &&
                !vitals.pulse &&
                !vitals.spo2 &&
                !vitals.temperatureC &&
                !vitals.heightCm &&
                !vitals.weightKg)
            }
          >
            Save Vitals
          </Button>
        </div>
      </div>
    </section>
  );
};

export default AppointmentVitalsSection;
