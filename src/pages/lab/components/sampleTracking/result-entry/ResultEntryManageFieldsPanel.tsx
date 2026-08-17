import { Button, Spinner } from "@heroui/react";
import type { FormEvent } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";

import { type LabResultTemplateParameter } from "../../../../../redux/api/labAssistantApi";
import {
  FieldFormPanel,
  SourceBadge,
  StatusBadge,
} from "./fieldControls";
import {
  displayInputType,
  emptyFieldForm,
  fieldFormFromParameter,
  fieldFormParameterId,
  isCustomParameter,
  managedParameterActionKey,
  manageFieldFilters,
  type FieldFormState,
  type ManageFieldFilter,
} from "./fieldHelpers";

type ResultEntryManageFieldsPanelProps = {
  manageFieldSearch: string;
  setManageFieldSearch: (value: string) => void;
  manageFieldFilter: ManageFieldFilter;
  setManageFieldFilter: (value: ManageFieldFilter) => void;
  isRefreshingFields: boolean;
  fieldForm: FieldFormState | null;
  setFieldForm: (value: FieldFormState | null) => void;
  isSavingField: boolean;
  isMutatingField: boolean;
  handleFieldFormSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoadingManagedParameters: boolean;
  managedParameters: LabResultTemplateParameter[];
  visibleManagedParameters: LabResultTemplateParameter[];
  fieldActionId: string | null;
  deleteCustomParameter: (parameter: LabResultTemplateParameter) => void;
  hideDefaultParameter: (parameter: LabResultTemplateParameter) => void;
  unhideDefaultParameter: (parameter: LabResultTemplateParameter) => void;
  resetDefaultParameter: (parameter: LabResultTemplateParameter) => void;
  managedStatsText: string;
};

export function ResultEntryManageFieldsPanel({
  manageFieldSearch,
  setManageFieldSearch,
  manageFieldFilter,
  setManageFieldFilter,
  isRefreshingFields,
  fieldForm,
  setFieldForm,
  isSavingField,
  isMutatingField,
  handleFieldFormSubmit,
  isLoadingManagedParameters,
  managedParameters,
  visibleManagedParameters,
  fieldActionId,
  deleteCustomParameter,
  hideDefaultParameter,
  unhideDefaultParameter,
  resetDefaultParameter,
  managedStatsText,
}: ResultEntryManageFieldsPanelProps) {
  return (                <div className="grid gap-4">
                  <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative w-full lg:max-w-xs">
                        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 z-10" />
                        <input
                          value={manageFieldSearch}
                          onChange={(event) => setManageFieldSearch(event.target.value)}
                          className="h-9 w-full rounded-full border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
                          placeholder="Search fields..."
                        />
                      </div>

                      <div className="flex flex-1 flex-wrap items-center gap-1.5 justify-start text-left">
                        {manageFieldFilters.map((filter) => {
                          const isActive = manageFieldFilter === filter.key;
                          return (
                            <Button
                              key={filter.key}
                              size="sm"
                              radius="full"
                              variant={isActive ? "solid" : "flat"}
                              color={isActive ? "primary" : "default"}
                              onPress={() => setManageFieldFilter(filter.key)}
                              className={[
                                "h-8 px-4 text-[10px] font-bold transition-all duration-150 active:scale-95",
                                isActive
                                  ? "bg-primary hover:bg-primary-active text-white shadow-sm"
                                  : "bg-slate-100 hover:bg-slate-200/75 text-slate-600 hover:text-slate-800",
                              ].join(" ")}
                            >
                              {filter.label}
                            </Button>
                          );
                        })}
                      </div>

                      {isRefreshingFields && (
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 text-[10px] font-bold text-slate-500">
                          <Spinner size="sm" color="primary" />
                          Syncing...
                        </span>
                      )}

                      <Button
                        size="sm"
                        radius="full"
                        onPress={() => setFieldForm(emptyFieldForm("add-custom"))}
                        startContent={<FiPlus />}
                        isDisabled={isMutatingField}
                        className="h-9 px-4 text-[10px] font-bold text-white bg-primary hover:bg-primary-active shadow-[0_4px_14px_rgba(10,108,116,0.2)] hover:shadow-[0_6px_20px_rgba(10,108,116,0.3)] transition-all duration-200 active:scale-95"
                      >
                        Add Custom Field
                      </Button>
                    </div>

                    {fieldForm?.mode === "add-custom" && (
                      <FieldFormPanel
                        form={fieldForm}
                        isSaving={isSavingField}
                        onChange={setFieldForm}
                        onCancel={() => setFieldForm(null)}
                        onSubmit={handleFieldFormSubmit}
                      />
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                    {isLoadingManagedParameters && managedParameters.length === 0 ? (
                      <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Spinner size="sm" color="primary" />
                          Loading fields...
                        </span>
                      </div>
                    ) : visibleManagedParameters.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400 font-semibold">
                        No fields found.
                      </div>
                    ) : (
                      <div className="grid gap-2.5">
                        {visibleManagedParameters.map((parameter) => {
                          const isCustom = isCustomParameter(parameter);
                          const actionKey = managedParameterActionKey(parameter);
                          const isActionLoading = isMutatingField && fieldActionId === actionKey;
                          const canOverride = parameter.canOverride;
                          const canHide = parameter.canHide;
                          const canEdit = parameter.canEdit;
                          const canDelete = parameter.canDelete;
                          const canResetDefault = !isCustom && (parameter.hasOverride || parameter.isHidden);
                          const hasAnyAction = isCustom
                            ? canEdit || canDelete || canOverride || canHide
                            : canOverride || canHide || canResetDefault;

                          return (
                            <div
                              key={actionKey}
                              className={[
                                "rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200 text-left",
                                isActionLoading ? "pointer-events-none opacity-70" : "",
                              ].join(" ")}
                            >
                              <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-slate-400 text-xs">⋮⋮</span>
                                    <p className="truncate text-xs font-bold text-slate-800">
                                      {parameter.parameterName}
                                    </p>
                                    {parameter.hasOverride && <StatusBadge tone="primary">Override</StatusBadge>}
                                    {parameter.required && <StatusBadge tone="red">Required</StatusBadge>}
                                    {parameter.isHidden && <StatusBadge tone="slate">Hidden</StatusBadge>}
                                    {isCustom ? (
                                      <StatusBadge tone="violet">Custom</StatusBadge>
                                    ) : (
                                      <SourceBadge parameter={parameter} />
                                    )}
                                  </div>

                                  <p className="mt-1.5 truncate text-[10px] font-semibold text-slate-400">
                                    Section: <strong className="text-slate-600">{parameter.sectionName ?? "-"}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Type: <strong className="text-slate-600">{displayInputType(parameter.inputType)}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Unit: <strong className="text-slate-600">{parameter.unit ?? "-"}</strong>{" "}
                                    <span className="mx-1.5 text-slate-200">•</span>
                                    Range: <strong className="text-slate-600">{parameter.referenceRange ?? "-"}</strong>
                                  </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-1.5 xl:justify-end">
                                  {!hasAnyAction && (
                                    <span className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                                      No actions
                                    </span>
                                  )}

                                  {isCustom ? (
                                    <>
                                      {canEdit && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => setFieldForm(fieldFormFromParameter(parameter, "edit-custom"))}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      {canDelete && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          color="danger"
                                          onPress={() => deleteCustomParameter(parameter)}
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold active:scale-95"
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      {canOverride && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => setFieldForm(fieldFormFromParameter(parameter, "override-default"))}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                        >
                                          Override
                                        </Button>
                                      )}
                                      {canHide &&
                                        (parameter.isHidden ? (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() => unhideDefaultParameter(parameter)}
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                          >
                                            Unhide
                                          </Button>
                                        ) : (
                                          <Button
                                            size="sm"
                                            radius="full"
                                            variant="flat"
                                            onPress={() => hideDefaultParameter(parameter)}
                                            isLoading={isActionLoading}
                                            isDisabled={isMutatingField}
                                            className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                          >
                                            Hide
                                          </Button>
                                        ))}
                                      {canResetDefault && (
                                        <Button
                                          size="sm"
                                          radius="full"
                                          variant="flat"
                                          onPress={() => resetDefaultParameter(parameter)}
                                          isLoading={isActionLoading}
                                          isDisabled={isMutatingField}
                                          className="h-8 px-4 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95"
                                        >
                                          Reset
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {fieldForm &&
                                fieldForm.mode !== "add-custom" &&
                                fieldForm.parameterId === fieldFormParameterId(parameter, fieldForm.mode) && (
                                  <FieldFormPanel
                                    form={fieldForm}
                                    isSaving={isSavingField}
                                    onChange={setFieldForm}
                                    onCancel={() => setFieldForm(null)}
                                    onSubmit={handleFieldFormSubmit}
                                  />
                                )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3.5 text-[11px] font-semibold text-slate-400">
                    <span>{managedStatsText}</span>
                  </div>
                </div>
  );
}
