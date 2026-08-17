import {
  type LabDefaultFieldOverrideInput,
  type LabResultFieldInput,
  type LabResultInputType,
  type LabResultTemplateParameter,
} from "../../../../../redux/api/labAssistantApi";
export type FieldFormMode = "add-custom" | "edit-custom" | "override-default";
export type ManageFieldFilter = "all" | "default" | "override" | "custom" | "hidden";

export type FieldFormState = {
  mode: FieldFormMode;
  parameterId?: string;
  baseline?: FieldFormBaseline;
  sectionName: string;
  parameterName: string;
  originalParameterName?: string | null;
  unit: string;
  referenceRange: string;
  inputType: LabResultInputType;
  sortOrder: string;
  isRequired: boolean;
};

export type FieldFormBaseline = {
  sectionName: string;
  parameterName: string;
  unit: string;
  referenceRange: string;
  inputType: LabResultInputType;
  sortOrder: number;
  isRequired: boolean;
};

export const inputTypes: LabResultInputType[] = [
  "number",
  "text",
  "textarea",
  "date",
  "boolean",
  "select",
];

export const manageFieldFilters: Array<{
  key: ManageFieldFilter;
  label: string;
}> = [
    { key: "all", label: "All" },
    { key: "default", label: "Default" },
    { key: "override", label: "Override" },
    { key: "custom", label: "Custom" },
    { key: "hidden", label: "Hidden" },
  ];

export const emptyFieldForm = (mode: FieldFormMode): FieldFormState => ({
  mode,
  sectionName: "-",
  parameterName: "",
  unit: "",
  referenceRange: "",
  inputType: "text",
  sortOrder: "100",
  isRequired: false,
});

export function fieldBaselineFromParameter(
  parameter: LabResultTemplateParameter,
): FieldFormBaseline {
  return {
    sectionName: parameter.sectionName || "-",
    parameterName: parameter.parameterName,
    unit: parameter.unit ?? "-",
    referenceRange: parameter.referenceRange ?? "-",
    inputType: parameter.inputType,
    sortOrder: parameter.sortOrder,
    isRequired: parameter.required,
  };
}

export function fieldFormFromParameter(
  parameter: LabResultTemplateParameter,
  mode: FieldFormMode,
): FieldFormState {
  const baseline = fieldBaselineFromParameter(parameter);

  return {
    mode,
    parameterId:
      mode === "override-default" ? parameter.parameterId : parameter.id,
    baseline,
    sectionName: baseline.sectionName,
    parameterName: baseline.parameterName,
    originalParameterName: parameter.originalParameterName,
    unit: baseline.unit,
    referenceRange: baseline.referenceRange,
    inputType: baseline.inputType,
    sortOrder: String(baseline.sortOrder),
    isRequired: baseline.isRequired,
  };
}

export function formToFieldInput(form: FieldFormState): LabResultFieldInput {
  const sortOrder = Number(form.sortOrder);

  return {
    sectionName: form.sectionName.trim() || "-",
    parameterName: form.parameterName.trim(),
    unit: form.unit.trim() || "-",
    referenceRange: form.referenceRange.trim() || "-",
    inputType: form.inputType,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
    isRequired: form.isRequired,
  };
}

export function isCustomParameter(parameter: LabResultTemplateParameter) {
  return (
    parameter.isCustom ||
    String(parameter.sourceType ?? "").toUpperCase() === "CUSTOM"
  );
}

export function managedParameterActionKey(parameter: LabResultTemplateParameter) {
  return isCustomParameter(parameter) ? parameter.id : parameter.parameterId;
}

export function fieldFormParameterId(
  parameter: LabResultTemplateParameter,
  mode: FieldFormMode,
) {
  return mode === "override-default" ? parameter.parameterId : parameter.id;
}

export function buildChangedOverrideInput(
  form: FieldFormState,
  templateId: string,
): LabDefaultFieldOverrideInput | null {
  const baseline = form.baseline;
  const parsedSortOrder = Number(form.sortOrder);
  const next = {
    sectionName: form.sectionName.trim() || "-",
    parameterName: form.parameterName.trim(),
    unit: form.unit.trim() || "-",
    referenceRange: form.referenceRange.trim() || "-",
    inputType: form.inputType,
    sortOrder: Number.isFinite(parsedSortOrder) ? parsedSortOrder : undefined,
    isRequired: form.isRequired,
  };
  const override: LabDefaultFieldOverrideInput = { templateId };
  let hasChanges = false;

  const changed = <K extends keyof typeof next>(key: K) =>
    !baseline || next[key] !== baseline[key];

  if (changed("parameterName")) {
    override.displayNameOverride = next.parameterName;
    hasChanges = true;
  }

  if (changed("unit")) {
    override.unitOverride = next.unit;
    hasChanges = true;
  }

  if (changed("referenceRange")) {
    override.referenceRangeOverride = next.referenceRange;
    hasChanges = true;
  }

  if (changed("inputType")) {
    override.inputTypeOverride = next.inputType;
    hasChanges = true;
  }

  if (changed("sectionName")) {
    override.sectionNameOverride = next.sectionName;
    hasChanges = true;
  }

  if (next.sortOrder !== undefined && changed("sortOrder")) {
    override.sortOrderOverride = next.sortOrder;
    hasChanges = true;
  }

  if (changed("isRequired")) {
    override.isRequiredOverride = next.isRequired;
    hasChanges = true;
  }

  return hasChanges ? override : null;
}

export function displayInputType(inputType: LabResultInputType) {
  return inputType.charAt(0).toUpperCase() + inputType.slice(1);
}

export function buildInitialValues(
  parameters: LabResultTemplateParameter[],
  previous: Record<string, string> = {},
) {
  return parameters.reduce<Record<string, string>>((acc, parameter) => {
    const nextValue =
      previous[parameter.parameterId] ??
      previous[parameter.id] ??
      parameter.value;
    acc[parameter.parameterId] =
      nextValue || (parameter.inputType === "boolean" ? "false" : "");
    return acc;
  }, {});
}


export function isTruthyResultValue(value: string | undefined) {
  return ["true", "1", "yes", "y", "checked"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}
