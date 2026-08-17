import { Button, Input } from "@heroui/react";
import type React from "react";
import {
  FIELD_CN,
  type VitalErrors,
  type VitalFieldKey,
} from "./constants";
import {
  calcBmi,
  normalizeVitals,
  sanitizeInt,
  sanitizeTemp,
  validateVital,
} from "./helpers";
import { RightDrawer } from "./shared-ui";
import type { Vitals } from "./types";

type VitalsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  vitalsTemp: Vitals;
  setVitalsTemp: React.Dispatch<React.SetStateAction<Vitals>>;
  vitalErrors: VitalErrors;
  setVitalErrors: React.Dispatch<React.SetStateAction<VitalErrors>>;
  autoFillVitals: () => void;
  saveVitals: () => void;
};

const VITAL_FIELDS: Array<{
  key: VitalFieldKey;
  label: string;
  placeholder: string;
  inputMode: "numeric" | "decimal";
  maxLength: number;
  unit: string;
}> = [
  {
    key: "bpSys",
    label: "BP (Sys)",
    placeholder: "e.g. 120",
    inputMode: "numeric",
    maxLength: 3,
    unit: "mmHg",
  },
  {
    key: "bpDia",
    label: "BP (Dia)",
    placeholder: "e.g. 80",
    inputMode: "numeric",
    maxLength: 3,
    unit: "mmHg",
  },
  {
    key: "pulse",
    label: "Pulse",
    placeholder: "e.g. 78",
    inputMode: "numeric",
    maxLength: 3,
    unit: "bpm",
  },
  {
    key: "spo2",
    label: "SpO2",
    placeholder: "e.g. 98",
    inputMode: "numeric",
    maxLength: 3,
    unit: "%",
  },
  {
    key: "temperatureC",
    label: "Temperature",
    placeholder: "e.g. 36.8",
    inputMode: "decimal",
    maxLength: 4,
    unit: "°C",
  },
  {
    key: "heightCm",
    label: "Height",
    placeholder: "e.g. 170",
    inputMode: "numeric",
    maxLength: 3,
    unit: "cm",
  },
  {
    key: "weightKg",
    label: "Weight",
    placeholder: "e.g. 65",
    inputMode: "numeric",
    maxLength: 3,
    unit: "kg",
  },
];

const VitalsDrawer = ({
  isOpen,
  onClose,
  isLocked,
  vitalsTemp,
  setVitalsTemp,
  vitalErrors,
  setVitalErrors,
  autoFillVitals,
  saveVitals,
}: VitalsDrawerProps) => {
  const setFieldValue = (key: VitalFieldKey, raw: string) => {
    const sanitized =
      key === "temperatureC" ? sanitizeTemp(raw) : sanitizeInt(raw, 3);
    const value = sanitized === "" ? null : Number(sanitized);

    setVitalsTemp((prev) => ({ ...prev, [key]: value }));
    setVitalErrors((prev) => ({ ...prev, [key]: validateVital(key, value) }));
  };

  const normalizeFieldValue = (key: VitalFieldKey) => {
    const norm = normalizeVitals(vitalsTemp);
    const value = norm[key] ?? null;
    setVitalsTemp((prev) => ({ ...prev, [key]: value }));
    setVitalErrors((prev) => ({ ...prev, [key]: validateVital(key, value) }));
  };

  return (
    <RightDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Vitals"
      subtitle="Current health measurements"
      footer={
        <div className="flex justify-end gap-3">
          <Button radius="full" variant="bordered" onPress={onClose}>
            Cancel
          </Button>
          <Button
            radius="full"
            color="primary"
            onPress={saveVitals}
            isDisabled={
              isLocked ||
              Object.values(vitalErrors).some((error) => error !== null)
            }
          >
            Save Vitals
          </Button>
        </div>
      }
    >
      <div className="flex justify-start">
        <Button
          radius="full"
          size="sm"
          onPress={autoFillVitals}
          className="bg-primary text-white"
          isDisabled={isLocked}
        >
          Auto-Fill
        </Button>
      </div>

      <div className="mt-4 grid gap-4">
        {VITAL_FIELDS.map((field) => (
          <div key={field.key}>
            <Input
              label={field.label}
              placeholder={field.placeholder}
              type="text"
              inputMode={field.inputMode}
              maxLength={field.maxLength}
              endContent={
                <span className="text-xs text-text-muted">
                  {field.unit}
                </span>
              }
              value={vitalsTemp[field.key]?.toString() ?? ""}
              onValueChange={(raw) => setFieldValue(field.key, raw)}
              onBlur={() => normalizeFieldValue(field.key)}
              variant="bordered"
              classNames={FIELD_CN}
              isDisabled={isLocked}
              isInvalid={!!vitalErrors[field.key]}
            />
            {vitalErrors[field.key] ? (
              <div className="mt-1 text-xs text-danger">
                {vitalErrors[field.key]}
              </div>
            ) : null}
          </div>
        ))}

        <Input
          label="BMI"
          isReadOnly
          value={
            calcBmi(vitalsTemp.heightCm, vitalsTemp.weightKg)?.toString() ?? ""
          }
          variant="bordered"
          classNames={FIELD_CN}
        />
      </div>
    </RightDrawer>
  );
};

export default VitalsDrawer;
