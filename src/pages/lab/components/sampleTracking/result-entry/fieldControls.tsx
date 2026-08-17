import { Button } from "@heroui/react";
import type { FormEvent } from "react";
import { FiSave } from "react-icons/fi";

import CompactSelectDropdown from "../../../../../components/shared/CompactSelectDropdown";
import { type LabResultTemplateParameter } from "../../../../../redux/api/labAssistantApi";
import { LabUnitSelect } from "../../LabUnitSelect";
import {
  displayInputType,
  inputTypes,
  isCustomParameter,
  isTruthyResultValue,
  type FieldFormMode,
  type FieldFormState,
} from "./fieldHelpers";
export function SourceBadge({ parameter }: { parameter: LabResultTemplateParameter }) {
  const isCustom = isCustomParameter(parameter);

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        isCustom
          ? "bg-violet-50 text-violet-700"
          : "bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {isCustom ? "CUSTOM" : parameter.sourceType || "DEFAULT"}
    </span>
  );
}

export function StatusBadge({
  children,
  tone = "slate",
}: {
  children: string;
  tone?: "slate" | "primary" | "red" | "violet";
}) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-600",
    primary: "bg-primary/10 text-primary",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <span
      className={[
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        toneClass,
      ].join(" ")}
    >
      {children}
    </span>
  );
}


export function FieldFormPanel({
  form,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: FieldFormState;
  isSaving: boolean;
  onChange: (form: FieldFormState) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const setValue = <K extends keyof FieldFormState>(
    key: K,
    value: FieldFormState[K],
  ) => onChange({ ...form, [key]: value });

  function fieldFormTitle(mode: FieldFormMode) {
    if (mode === "add-custom") return "Add Custom Field";
    if (mode === "edit-custom") return "Edit Custom Field";
    return "Override Default Field";
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-primary/15 bg-primary/5 p-4 mt-3 text-left"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-950">
            {fieldFormTitle(form.mode)}
          </h4>
          {form.originalParameterName && (
            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
              Default: {form.originalParameterName}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          radius="full"
          variant="flat"
          onPress={onCancel}
          isDisabled={isSaving}
          className="font-semibold h-7 text-[10px]"
        >
          Cancel
        </Button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">

        <label className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Parameter Name</span>
          <input
            value={form.parameterName}
            onChange={(event) => setValue("parameterName", event.target.value)}
            className="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            placeholder="e.g. TLC,RBC,Platelets"
            required
            maxLength={100}
          />
        </label>

        <div className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Input Type</span>
          <CompactSelectDropdown
            ariaLabel="Input type"
            value={form.inputType}
            options={inputTypes.map((inputType) => ({
              value: inputType,
              label: displayInputType(inputType),
            }))}
            onChange={(inputType) => setValue("inputType", inputType)}
            triggerClassName="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
          />
        </div>

        <div className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">Unit</span>
          <LabUnitSelect
            key={`${form.mode}-${form.parameterId ?? "new"}-unit`}
            value={form.unit}
            onChange={(unit) => setValue("unit", unit)}
            triggerClassName="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            customInputClassName="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            customPlaceholder="Unit (e.g. mg/dL)"
            maxLength={20}
          />
        </div>

        <label className="grid gap-1">
          <span className="text-[10px] font-bold text-slate-600">
            Reference Range
          </span>
          <input
            value={form.referenceRange}
            onChange={(event) => setValue("referenceRange", event.target.value)}
            className="h-8 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none transition focus:border-primary/45 focus:bg-white"
            placeholder="e.g. 70 - 100"
            maxLength={50}
            required
          />
        </label>
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(event) => setValue("isRequired", event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
        />
        Required field
      </label>

      <div className="mt-3 flex justify-end">
        <Button
          type="submit"
          color="primary"
          radius="full"
          size="sm"
          isLoading={isSaving}
          startContent={!isSaving && <FiSave />}
          className="px-4 font-semibold text-white h-8 text-[11px]"
        >
          Save Field
        </Button>
      </div>
    </form>
  );
}

export function ResultValueInput({
  parameter,
  value,
  disabled,
  onChange,
}: {
  parameter: LabResultTemplateParameter;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (parameter.inputType === "textarea") {
    return (
      <textarea
        value={value}
        disabled={disabled}
        rows={2}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[50px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        placeholder="Enter value"
      />
    );
  }

  if (parameter.inputType === "boolean") {
    return (
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/50 hover:bg-slate-100 px-4 text-xs font-semibold text-slate-700 cursor-pointer transition-all duration-150 active:scale-95 shadow-sm">
        <input
          type="checkbox"
          checked={isTruthyResultValue(value)}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked ? "true" : "false")
          }
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20 disabled:cursor-not-allowed transition duration-150"
        />
        <span>{isTruthyResultValue(value) ? "Yes" : "No"}</span>
      </label>
    );
  }

  if (parameter.inputType === "select" && parameter.options && parameter.options.length > 0) {
    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">Select value</option>
        {parameter.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={parameter.inputType === "date" ? "date" : "text"}
      inputMode={parameter.inputType === "number" ? "decimal" : undefined}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        let val = event.target.value;
        if (parameter.inputType === "number") {
          val = val.replace(/[^0-9.-]/g, "");
          if (val.startsWith("-")) {
            val = "-" + val.slice(1).replace(/-/g, "");
          } else {
            val = val.replace(/-/g, "");
          }
          const parts = val.split(".");
          if (parts.length > 2) {
            val = parts[0] + "." + parts.slice(1).join("");
          }
        }
        onChange(val.slice(0, 10));
      }}
      maxLength={10}
      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/30 hover:border-slate-300 focus:bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      placeholder="Enter value"
    />
  );
}
