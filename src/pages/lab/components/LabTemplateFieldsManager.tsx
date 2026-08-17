import { addToast, Button, Spinner } from "@heroui/react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiRotateCcw,
  FiSave,
  FiSearch,
  FiSettings,
  FiTrash2,
} from "react-icons/fi";
import CompactSelectDropdown from "../../../components/shared/CompactSelectDropdown";
import { LabUnitSelect } from "./LabUnitSelect";

import {
  getLabApiErrorMessage,
  useAddLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useHideLabDefaultFieldMutation,
  useLazyGetLabTemplateParametersQuery,
  useOverrideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
  useUnhideLabDefaultFieldMutation,
  useUpdateLabCustomFieldMutation,
  type LabDefaultFieldOverrideInput,
  type LabResultFieldInput,
  type LabResultInputType,
  type LabResultTemplateParameter,
} from "../../../redux/api/labAssistantApi";

type FieldFormMode = "add-custom" | "edit-custom" | "override-default";
type ManageFieldFilter = "all" | "default" | "override" | "custom" | "hidden";

type FieldFormBaseline = {
  sectionName: string;
  parameterName: string;
  unit: string;
  referenceRange: string;
  inputType: LabResultInputType;
  sortOrder: number;
  isRequired: boolean;
};

type FieldFormState = {
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

const inputTypes: LabResultInputType[] = [
  "number",
  "text",
  "textarea",
  "date",
  "boolean",
  "select",
];

const filters: Array<{ key: ManageFieldFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "default", label: "Default" },
  { key: "override", label: "Override" },
  { key: "custom", label: "Custom" },
  { key: "hidden", label: "Hidden" },
];

const fieldInputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

function isCustomParameter(parameter: LabResultTemplateParameter) {
  return (
    parameter.isCustom ||
    String(parameter.sourceType ?? "").toUpperCase() === "CUSTOM"
  );
}

function actionKey(parameter: LabResultTemplateParameter) {
  return isCustomParameter(parameter) ? parameter.id : parameter.parameterId;
}

function emptyFieldForm(): FieldFormState {
  return {
    mode: "add-custom",
    sectionName: "-",
    parameterName: "",
    unit: "",
    referenceRange: "",
    inputType: "text",
    sortOrder: "100",
    isRequired: false,
  };
}

function fieldBaseline(parameter: LabResultTemplateParameter): FieldFormBaseline {
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

function formFromParameter(
  parameter: LabResultTemplateParameter,
  mode: Exclude<FieldFormMode, "add-custom">,
): FieldFormState {
  const baseline = fieldBaseline(parameter);

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

function toFieldInput(form: FieldFormState): LabResultFieldInput {
  return {
    sectionName: "-",
    parameterName: form.parameterName.trim(),
    unit: form.unit.trim() || "-",
    referenceRange: form.referenceRange.trim() || "-",
    inputType: form.inputType,
    sortOrder: 100,
    isRequired: form.isRequired,
  };
}

function buildOverride(
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
  let changed = false;

  if (!baseline || next.parameterName !== baseline.parameterName) {
    override.displayNameOverride = next.parameterName;
    changed = true;
  }
  if (!baseline || next.unit !== baseline.unit) {
    override.unitOverride = next.unit;
    changed = true;
  }
  if (!baseline || next.referenceRange !== baseline.referenceRange) {
    override.referenceRangeOverride = next.referenceRange;
    changed = true;
  }
  if (!baseline || next.inputType !== baseline.inputType) {
    override.inputTypeOverride = next.inputType;
    changed = true;
  }
  if (!baseline || next.sectionName !== baseline.sectionName) {
    override.sectionNameOverride = next.sectionName;
    changed = true;
  }
  if (
    next.sortOrder !== undefined &&
    (!baseline || next.sortOrder !== baseline.sortOrder)
  ) {
    override.sortOrderOverride = next.sortOrder;
    changed = true;
  }
  if (!baseline || next.isRequired !== baseline.isRequired) {
    override.isRequiredOverride = next.isRequired;
    changed = true;
  }

  return changed ? override : null;
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "primary" | "red" | "violet" | "slate";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function FieldForm({
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

  const title =
    form.mode === "add-custom"
      ? "Add Custom Field"
      : form.mode === "edit-custom"
        ? "Edit Custom Field"
        : "Override Default Field";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-primary/15 bg-primary/5 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-950">{title}</h4>
          {form.originalParameterName && (
            <p className="mt-1 text-xs font-medium text-slate-500">
              Original: {form.originalParameterName}
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
          className="font-semibold"
        >
          Cancel
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Parameter Name</span>
          <input
            value={form.parameterName}
            onChange={(event) => setValue("parameterName", event.target.value)}
            className={fieldInputClass}
            placeholder="e.g. TLC,RBC,Platelets"
            required
            maxLength={100}
          />
        </label>

        <div className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Input Type</span>
          <CompactSelectDropdown
            ariaLabel="Input type"
            value={form.inputType}
            options={inputTypes.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            }))}
            onChange={(value) => setValue("inputType", value as LabResultInputType)}
            triggerClassName={fieldInputClass}
          />
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">Unit</span>
          <LabUnitSelect
            key={`${form.mode}-${form.parameterId ?? "new"}-unit`}
            value={form.unit}
            onChange={(unit) => setValue("unit", unit)}
            triggerClassName={fieldInputClass}
            customInputClassName={fieldInputClass}
            customPlaceholder="Unit (e.g. mg/dL)"
            maxLength={20}
          />
        </div>

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-slate-600">
            Reference Range
          </span>
          <input
            value={form.referenceRange}
            onChange={(event) =>
              setValue("referenceRange", event.target.value)
            }
            className={fieldInputClass}
            placeholder="e.g. 70 - 100"
            maxLength={50}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.isRequired}
            onChange={(event) => setValue("isRequired", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
          />
          Required field
        </label>

        <Button
          type="submit"
          color="primary"
          radius="full"
          isLoading={isSaving}
          startContent={!isSaving && <FiSave />}
          className="px-5 font-semibold text-white"
        >
          Save Field
        </Button>
      </div>
    </form>
  );
}

type LabTemplateFieldsManagerProps = {
  templateId: string;
  templateName: string;
  appointmentTestId?: string;
  isReadOnly?: boolean;
  headerAction?: ReactNode;
  onFieldsChanged?: () => void | Promise<void>;
};

export function LabTemplateFieldsManager({
  templateId,

  appointmentTestId,
  isReadOnly = false,
  headerAction,
  onFieldsChanged,
}: LabTemplateFieldsManagerProps) {
  const [parameters, setParameters] = useState<LabResultTemplateParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ManageFieldFilter>("all");
  const [form, setForm] = useState<FieldFormState | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LabResultTemplateParameter | null>(null);

  const [loadParameters] = useLazyGetLabTemplateParametersQuery();
  const [addCustomField, { isLoading: isAdding }] =
    useAddLabCustomFieldMutation();
  const [updateCustomField, { isLoading: isUpdating }] =
    useUpdateLabCustomFieldMutation();
  const [deleteCustomField, { isLoading: isDeleting }] =
    useDeleteLabCustomFieldMutation();
  const [overrideDefaultField, { isLoading: isOverriding }] =
    useOverrideLabDefaultFieldMutation();
  const [hideDefaultField, { isLoading: isHiding }] =
    useHideLabDefaultFieldMutation();
  const [unhideDefaultField, { isLoading: isUnhiding }] =
    useUnhideLabDefaultFieldMutation();
  const [resetDefaultField, { isLoading: isResetting }] =
    useResetLabDefaultFieldOverrideMutation();

  const isSavingForm = isAdding || isUpdating || isOverriding;
  const isMutating =
    isSavingForm || isDeleting || isHiding || isUnhiding || isResetting;

  const reload = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const next = await loadParameters({ templateId, appointmentTestId }).unwrap();
      setParameters(next);
    } catch (err) {
      addToast({
        title: "Fields load failed",
        description: getLabApiErrorMessage(
          err,
          "Could not load the report template fields.",
        ),
        color: "danger",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setParameters([]);
    setForm(null);
    setSearch("");
    setFilter("all");
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const stats = useMemo(() => {
    const custom = parameters.filter(isCustomParameter).length;
    const overridden = parameters.filter((parameter) => parameter.hasOverride).length;
    const hidden = parameters.filter((parameter) => parameter.isHidden).length;
    return {
      custom,
      overridden,
      hidden,
      defaults: parameters.length - custom,
    };
  }, [parameters]);

  const visibleParameters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return parameters.filter((parameter) => {
      const custom = isCustomParameter(parameter);
      const matchesFilter =
        filter === "all" ||
        (filter === "default" && !custom) ||
        (filter === "override" && parameter.hasOverride) ||
        (filter === "custom" && custom) ||
        (filter === "hidden" && parameter.isHidden);

      if (!matchesFilter) return false;
      if (!query) return true;

      return [
        parameter.parameterName,
        parameter.originalParameterName,
        parameter.sectionName,
        parameter.unit,
        parameter.referenceRange,
        parameter.inputType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filter, parameters, search]);

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    if (!form.parameterName.trim()) {
      addToast({ title: "Parameter name required", color: "warning" });
      return;
    }

    try {
      if (form.mode === "add-custom") {
        await addCustomField({
          templateId,
          appointmentTestId,
          field: toFieldInput(form),
        }).unwrap();
      } else if (form.mode === "edit-custom" && form.parameterId) {
        await updateCustomField({
          fieldId: form.parameterId,
          templateId,
          appointmentTestId,
          field: toFieldInput(form),
        }).unwrap();
      } else if (form.mode === "override-default" && form.parameterId) {
        const override = buildOverride(form, templateId);
        if (!override) {
          addToast({
            title: "No changes to save",
            description: "Change at least one value before saving.",
            color: "warning",
          });
          return;
        }
        await overrideDefaultField({
          parameterId: form.parameterId,
          override,
          appointmentTestId,
        }).unwrap();
      }

      addToast({
        title: "Field saved",
        description: "Report template fields updated successfully.",
        color: "success",
      });
      setForm(null);
      await reload(true);
      await onFieldsChanged?.();
    } catch (err) {
      addToast({
        title: "Field save failed",
        description: getLabApiErrorMessage(err, "Could not save this field."),
        color: "danger",
      });
    }
  };

  const runAction = async (
    parameter: LabResultTemplateParameter,
    request: () => Promise<unknown>,
    successTitle: string,
  ) => {
    try {
      setActionId(actionKey(parameter));
      await request();
      addToast({ title: successTitle, color: "success" });
      setForm(null);
      await reload(true);
      await onFieldsChanged?.();
    } catch (err) {
      addToast({
        title: "Field update failed",
        description: getLabApiErrorMessage(err, "Could not update this field."),
        color: "danger",
      });
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    await runAction(
      target,
      () =>
        deleteCustomField({
          fieldId: target.id,
          templateId,
          appointmentTestId,
        }).unwrap(),
      "Custom field deleted",
    );
    setDeleteTarget(null);
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FiSettings />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950">Manage Fields</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Define and organize result template fields
            </p>
          </div>
        </div>
        {(isRefreshing || headerAction) && (
          <div className="flex flex-wrap items-center gap-3">
            {isRefreshing && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <Spinner size="sm" /> Syncing
              </span>
            )}
            {headerAction}
          </div>
        )}
      </header>

      <div className="grid gap-4 p-4 sm:p-6">
        {isReadOnly && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Existing parameters are shown below. Save the test details first to
            enable Add, Override, Hide, Edit, and Delete actions.
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search fields..."
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="flex flex-1 flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item.key}
                size="sm"
                radius="full"
                variant={filter === item.key ? "solid" : "flat"}
                color={filter === item.key ? "primary" : "default"}
                onPress={() => setFilter(item.key)}
                className={`h-8 px-4 text-xs font-bold ${
                  filter === item.key ? "text-white" : "text-slate-600"
                }`}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <Button
            radius="full"
            color="primary"
            onPress={() => setForm(emptyFieldForm())}
            startContent={<FiPlus />}
            isDisabled={isMutating || isReadOnly}
            className="h-10 shrink-0 px-5 font-bold text-white"
          >
            Add Custom Field
          </Button>
        </div>

        {form && (
          <FieldForm
            form={form}
            isSaving={isSavingForm}
            onChange={setForm}
            onCancel={() => setForm(null)}
            onSubmit={handleFormSubmit}
          />
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          {isLoading ? (
            <div className="grid min-h-32 place-items-center text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Loading fields...
              </span>
            </div>
          ) : visibleParameters.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
              {/* Illustration */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 120 100"
                fill="none"
                className="h-20 w-20"
              >
                <rect x="20" y="15" width="80" height="70" rx="12" fill="#e0f2f1" />
                <rect x="30" y="30" width="50" height="6" rx="3" fill="#0d9488" opacity="0.5" />
                <rect x="30" y="42" width="35" height="6" rx="3" fill="#0d9488" opacity="0.3" />
                <rect x="30" y="54" width="45" height="6" rx="3" fill="#0d9488" opacity="0.2" />
                <circle cx="92" cy="22" r="14" fill="#0d9488" />
                <path d="M87 22l3.5 3.5L97 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="30" y="66" width="25" height="6" rx="3" fill="#0d9488" opacity="0.15" />
              </svg>

              <h4 className="text-sm font-black text-slate-800">
                No fields found
              </h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Add Custom fields.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleParameters.map((parameter) => {
                const custom = isCustomParameter(parameter);
                const key = actionKey(parameter);
                const isActionLoading = isMutating && actionId === key;
                const canReset =
                  !custom && (parameter.hasOverride || parameter.isHidden);

                return (
                  <article
                    key={key}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                      isActionLoading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-950">
                            {parameter.parameterName}
                          </strong>
                          {parameter.required && (
                            <StatusBadge tone="red">Required</StatusBadge>
                          )}
                          {parameter.hasOverride && (
                            <StatusBadge tone="primary">Override</StatusBadge>
                          )}
                          {parameter.isHidden && (
                            <StatusBadge tone="slate">Hidden</StatusBadge>
                          )}
                          <StatusBadge tone={custom ? "violet" : "slate"}>
                            {custom ? "Custom" : "Default"}
                          </StatusBadge>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Section: {parameter.sectionName ?? "-"} · Type:{" "}
                          {parameter.inputType} · Unit: {parameter.unit ?? "-"} ·
                          Range: {parameter.referenceRange ?? "-"}
                        </p>
                        {parameter.originalParameterName &&
                          parameter.originalParameterName !==
                            parameter.parameterName && (
                            <p className="mt-1 text-xs text-slate-400">
                              Original: {parameter.originalParameterName}
                            </p>
                          )}
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {custom ? (
                          <>
                            {parameter.canEdit && (
                              <Button
                                size="sm"
                                radius="full"
                                variant="flat"
                                onPress={() =>
                                  setForm(
                                    formFromParameter(parameter, "edit-custom"),
                                  )
                                }
                                isDisabled={isMutating || isReadOnly}
                                startContent={<FiEdit3 />}
                                className="h-9 px-4 font-bold text-slate-700"
                              >
                                Edit
                              </Button>
                            )}
                            {parameter.canDelete && (
                              <Button
                                size="sm"
                                radius="full"
                                variant="flat"
                                color="danger"
                                onPress={() => setDeleteTarget(parameter)}
                                isDisabled={isMutating || isReadOnly}
                                startContent={<FiTrash2 />}
                                className="h-9 px-4 font-bold"
                              >
                                Delete
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {parameter.canOverride && (
                              <Button
                                size="sm"
                                radius="full"
                                variant="flat"
                                onPress={() =>
                                  setForm(
                                    formFromParameter(
                                      parameter,
                                      "override-default",
                                    ),
                                  )
                                }
                                isDisabled={isMutating || isReadOnly}
                                startContent={<FiEdit3 />}
                                className="h-9 px-4 font-bold text-slate-700"
                              >
                                Override
                              </Button>
                            )}
                            {parameter.canHide &&
                              (parameter.isHidden ? (
                                <Button
                                  size="sm"
                                  radius="full"
                                  variant="flat"
                                  onPress={() =>
                                    void runAction(
                                      parameter,
                                      () =>
                                        unhideDefaultField({
                                          parameterId: parameter.parameterId,
                                          templateId,
                                          appointmentTestId,
                                        }).unwrap(),
                                      "Default field restored",
                                    )
                                  }
                                  isDisabled={isMutating || isReadOnly}
                                  startContent={<FiEye />}
                                  className="h-9 px-4 font-bold text-slate-700"
                                >
                                  Unhide
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  radius="full"
                                  variant="flat"
                                  onPress={() =>
                                    void runAction(
                                      parameter,
                                      () =>
                                        hideDefaultField({
                                          parameterId: parameter.parameterId,
                                          templateId,
                                          appointmentTestId,
                                        }).unwrap(),
                                      "Default field hidden",
                                    )
                                  }
                                  isDisabled={isMutating || isReadOnly}
                                  startContent={<FiEyeOff />}
                                  className="h-9 px-4 font-bold text-slate-700"
                                >
                                  Hide
                                </Button>
                              ))}
                            {canReset && (
                              <Button
                                size="sm"
                                radius="full"
                                variant="flat"
                                onPress={() =>
                                  void runAction(
                                    parameter,
                                    () =>
                                      resetDefaultField({
                                        parameterId: parameter.parameterId,
                                        templateId,
                                        appointmentTestId,
                                      }).unwrap(),
                                    "Default field reset",
                                  )
                                }
                                isDisabled={isMutating || isReadOnly}
                                startContent={<FiRotateCcw />}
                                className="h-9 px-4 font-bold text-slate-700"
                              >
                                Reset
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-right text-xs font-bold text-slate-400">
          {stats.defaults} default fields, {stats.overridden} overrides, {stats.custom}{" "}
          custom fields{stats.hidden ? `, ${stats.hidden} hidden` : ""}
        </p>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-950">
              Delete Custom Field
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Delete <strong>{deleteTarget.parameterName}</strong>? This action
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                radius="full"
                variant="bordered"
                onPress={() => setDeleteTarget(null)}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                radius="full"
                color="danger"
                onPress={confirmDelete}
                isLoading={isDeleting}
                startContent={!isDeleting && <FiTrash2 />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
