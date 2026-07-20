import { useEffect, useMemo, useRef, useState } from "react";
import CompactSelectDropdown, {
  type CompactSelectOption,
} from "../../../components/shared/CompactSelectDropdown";

const CUSTOM_UNIT_VALUE = "__custom_lab_unit__";

const commonLabUnits = [
  "%",
  "g/dL",
  "g/L",
  "mg/dL",
  "mg/L",
  "mg/24 hr",
  "mmol/L",
  "umol/L",
  "mEq/L",
  "U/L",
  "IU/L",
  "mIU/L",
  "uIU/mL",
  "ng/mL",
  "ng/dL",
  "pg/mL",
  "ug/dL",
  "ug/L",
  "10^3/uL",
  "10^6/uL",
  "x10^3/uL",
  "x10^6/uL",
  "cells/uL",
  "/uL",
  "/HPF",
  "/LPF",
  "fL",
  "pg",
  "mm/hr",
  "seconds",
  "mL/min",
  "mL/min/1.73m2",
  "copies/mL",
  "Index",
  "Ratio",
  "OD",
  "S/CO",
  "-",
] as const;

const commonLabUnitSet = new Set<string>(commonLabUnits);

type LabUnitSelectProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  customPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  customInputClassName?: string;
};

function isCommonLabUnit(value: string) {
  return commonLabUnitSet.has(value.trim());
}

export function LabUnitSelect({
  value,
  onChange,
  ariaLabel = "Unit",
  disabled = false,
  maxLength = 20,
  placeholder = "Select unit",
  customPlaceholder = "Enter custom unit",
  className = "",
  triggerClassName = "",
  customInputClassName = triggerClassName,
}: LabUnitSelectProps) {
  const trimmedValue = value.trim();
  const isKnownValue = isCommonLabUnit(trimmedValue);
  const keepCustomModeOnBlank = useRef(false);
  const [isCustomUnit, setIsCustomUnit] = useState(
    Boolean(trimmedValue && !isKnownValue),
  );

  useEffect(() => {
    if (trimmedValue) {
      keepCustomModeOnBlank.current = false;
      setIsCustomUnit(!isKnownValue);
      return;
    }

    if (!keepCustomModeOnBlank.current) {
      setIsCustomUnit(false);
    }
  }, [isKnownValue, trimmedValue]);

  const unitOptions = useMemo<CompactSelectOption<string>[]>(
    () => [
      { value: "", label: placeholder },
      ...commonLabUnits.map((unit) => ({
        value: unit,
        label: unit === "-" ? "No unit (-)" : unit,
      })),
      { value: CUSTOM_UNIT_VALUE, label: "Custom unit" },
    ],
    [placeholder],
  );

  const selectedValue = isCustomUnit
    ? CUSTOM_UNIT_VALUE
    : isKnownValue
      ? trimmedValue
      : "";

  const handleUnitSelect = (nextValue: string) => {
    if (nextValue === CUSTOM_UNIT_VALUE) {
      keepCustomModeOnBlank.current = true;
      setIsCustomUnit(true);
      if (!trimmedValue || isKnownValue) onChange("");
      return;
    }

    keepCustomModeOnBlank.current = false;
    setIsCustomUnit(false);
    onChange(nextValue);
  };

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <CompactSelectDropdown
        ariaLabel={ariaLabel}
        value={selectedValue}
        options={unitOptions}
        onChange={handleUnitSelect}
        disabled={disabled}
        triggerClassName={triggerClassName}
      />

      {isCustomUnit && (
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => {
            keepCustomModeOnBlank.current = true;
            onChange(event.target.value);
          }}
          className={customInputClassName}
          placeholder={customPlaceholder}
          maxLength={maxLength}
        />
      )}
    </div>
  );
}
