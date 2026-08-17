import { Button, Spinner } from "@heroui/react";
import type { FormEvent } from "react";
import {
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";

import { type LabResultTemplateParameter } from "../../../../redux/api/labAssistantApi";
import {
  FieldFormPanel,
  SourceBadge,
  StatusBadge,
} from "../sampleTracking/result-entry/fieldControls";
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
} from "../sampleTracking/result-entry/fieldHelpers";

type LabResultManageFieldsPanelProps = {
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
};

export function LabResultManageFieldsPanel({
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
}: LabResultManageFieldsPanelProps) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <input
              value={manageFieldSearch}
              onChange={(event) => setManageFieldSearch(event.target.value)}
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
              placeholder="Search fields..."
            />
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
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
                    "h-8 px-4 text-xs font-bold",
                    isActive ? "text-white shadow-sm" : "text-slate-600",
                  ].join(" ")}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>

          {isRefreshingFields && (
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-500">
              <Spinner size="sm" />
              Syncing...
            </span>
          )}

          <Button
            size="sm"
            radius="full"
            color="primary"
            onPress={() => setFieldForm(emptyFieldForm("add-custom"))}
            startContent={<FiPlus />}
            isDisabled={isMutatingField}
            className="h-10 px-5 font-bold text-white"
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

      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-3">
        {isLoadingManagedParameters && managedParameters.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" />
              Loading fields...
            </span>
          </div>
        ) : visibleManagedParameters.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No fields found for this filter.
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleManagedParameters.map((parameter) => {
              const isCustom = isCustomParameter(parameter);
              const actionKey = managedParameterActionKey(parameter);
              const isActionLoading =
                isMutatingField && fieldActionId === actionKey;
              const canOverride = parameter.canOverride;
              const canHide = parameter.canHide;
              const canEdit = parameter.canEdit;
              const canDelete = parameter.canDelete;
              const canResetDefault =
                !isCustom && (parameter.hasOverride || parameter.isHidden);
              const hasAnyAction = isCustom
                ? canEdit || canDelete || canOverride || canHide
                : canOverride || canHide || canResetDefault;

              return (
                <div
                  key={actionKey}
                  className={[
                    "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]",
                    "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
                    isActionLoading ? "pointer-events-none opacity-70" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="hidden text-slate-400 sm:inline">
                          ::
                        </span>

                        <p className="truncate text-sm font-bold text-slate-950">
                          {parameter.parameterName}
                        </p>

                        {parameter.hasOverride && (
                          <StatusBadge tone="primary">Override</StatusBadge>
                        )}
                        {parameter.required && (
                          <StatusBadge tone="red">Required</StatusBadge>
                        )}
                        {parameter.isHidden && (
                          <StatusBadge tone="slate">Hidden</StatusBadge>
                        )}
                        {isCustom ? (
                          <StatusBadge tone="violet">Custom</StatusBadge>
                        ) : (
                          <SourceBadge parameter={parameter} />
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        Section: {parameter.sectionName ?? "-"}{" "}
                        <span className="mx-1 text-slate-300">-</span>
                        Type: {displayInputType(parameter.inputType)}{" "}
                        <span className="mx-1 text-slate-300">-</span>
                        Unit: {parameter.unit ?? "-"}{" "}
                        <span className="mx-1 text-slate-300">-</span>
                        Range: {parameter.referenceRange ?? "-"}
                      </p>

                      {parameter.originalParameterName &&
                        parameter.originalParameterName !==
                          parameter.parameterName && (
                          <p className="mt-1 truncate text-xs font-medium text-slate-400">
                            Original: {parameter.originalParameterName}
                          </p>
                        )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                      {!hasAnyAction && (
                        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                          No actions available
                        </span>
                      )}

                      {isCustom ? (
                        <>
                          {canEdit && (
                            <Button
                              size="sm"
                              radius="full"
                              variant="flat"
                              onPress={() =>
                                setFieldForm(
                                  fieldFormFromParameter(
                                    parameter,
                                    "edit-custom",
                                  ),
                                )
                              }
                              isDisabled={isMutatingField}
                              startContent={<FiEdit3 />}
                              className="h-9 px-4 font-bold text-slate-700"
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
                              startContent={!isActionLoading && <FiTrash2 />}
                              className="h-9 px-4 font-bold"
                            >
                              Delete
                            </Button>
                          )}

                          {canOverride && (
                            <Button
                              size="sm"
                              radius="full"
                              variant="flat"
                              onPress={() =>
                                setFieldForm(
                                  fieldFormFromParameter(
                                    parameter,
                                    "override-default",
                                  ),
                                )
                              }
                              isDisabled={isMutatingField}
                              startContent={<FiEdit3 />}
                              className="h-9 px-4 font-bold text-slate-700"
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
                                startContent={!isActionLoading && <FiEye />}
                                className="h-9 px-4 font-bold text-slate-700"
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
                                startContent={!isActionLoading && <FiEyeOff />}
                                className="h-9 px-4 font-bold text-slate-700"
                              >
                                Hide
                              </Button>
                            ))}
                        </>
                      ) : (
                        <>
                          {canOverride && (
                            <Button
                              size="sm"
                              radius="full"
                              variant="flat"
                              onPress={() =>
                                setFieldForm(
                                  fieldFormFromParameter(
                                    parameter,
                                    "override-default",
                                  ),
                                )
                              }
                              isDisabled={isMutatingField}
                              startContent={<FiEdit3 />}
                              className="h-9 px-4 font-bold text-slate-700"
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
                                startContent={!isActionLoading && <FiEye />}
                                className="h-9 px-4 font-bold text-slate-700"
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
                                startContent={!isActionLoading && <FiEyeOff />}
                                className="h-9 px-4 font-bold text-slate-700"
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
                              startContent={
                                !isActionLoading && <FiRotateCcw />
                              }
                              className="h-9 px-4 font-bold text-slate-700"
                            >
                              Reset Override
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {fieldForm &&
                    fieldForm.mode !== "add-custom" &&
                    fieldForm.parameterId ===
                      fieldFormParameterId(parameter, fieldForm.mode) && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <FieldFormPanel
                          form={fieldForm}
                          isSaving={isSavingField}
                          onChange={setFieldForm}
                          onCancel={() => setFieldForm(null)}
                          onSubmit={handleFieldFormSubmit}
                        />
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
