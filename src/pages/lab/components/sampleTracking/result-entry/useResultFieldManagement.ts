import { addToast } from "@heroui/react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getLabApiErrorMessage,
  useAddLabCustomFieldMutation,
  useDeleteLabCustomFieldMutation,
  useHideLabDefaultFieldMutation,
  useLazyGetLabResultReportQuery,
  useLazyGetLabTemplateParametersQuery,
  useOverrideLabDefaultFieldMutation,
  useResetLabDefaultFieldOverrideMutation,
  useUnhideLabDefaultFieldMutation,
  useUpdateLabCustomFieldMutation,
  type LabReportActions,
  type LabResultReport,
  type LabResultTemplate,
  type LabResultTemplateParameter,
} from "../../../../../redux/api/labAssistantApi";
import {
  buildChangedOverrideInput,
  formToFieldInput,
  isCustomParameter,
  managedParameterActionKey,
  type FieldFormState,
  type ManageFieldFilter,
} from "./fieldHelpers";

type UseResultFieldManagementArgs = {
  template: LabResultTemplate | null;
  appointmentTestId: string;
  report: LabResultReport | null;
  savedResultId: string | null;
  isEditable: boolean;
  onTemplateUpdated?: () => void | Promise<void>;
  setReport: Dispatch<SetStateAction<LabResultReport | null>>;
  setReportActions: Dispatch<SetStateAction<LabReportActions | null>>;
  setUploadedReportUrl: Dispatch<SetStateAction<string | null>>;
};

export function useResultFieldManagement({
  template,
  appointmentTestId,
  report,
  savedResultId,
  isEditable,
  onTemplateUpdated,
  setReport,
  setReportActions,
  setUploadedReportUrl,
}: UseResultFieldManagementArgs) {
  const [isManagingFields, setIsManagingFields] = useState(false);
  const [parameterToDelete, setParameterToDelete] =
    useState<LabResultTemplateParameter | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldFormState | null>(null);
  const [fieldActionId, setFieldActionId] = useState<string | null>(null);
  const [managedParameters, setManagedParameters] = useState<
    LabResultTemplateParameter[]
  >([]);
  const [isLoadingManagedParameters, setIsLoadingManagedParameters] =
    useState(false);
  const [isRefreshingFields, setIsRefreshingFields] = useState(false);
  const [manageFieldSearch, setManageFieldSearch] = useState("");
  const [manageFieldFilter, setManageFieldFilter] =
    useState<ManageFieldFilter>("all");

  const [loadTemplateParameters] = useLazyGetLabTemplateParametersQuery();
  const [loadReport] = useLazyGetLabResultReportQuery();
  const [addCustomField, { isLoading: isAddingCustomField }] =
    useAddLabCustomFieldMutation();
  const [updateCustomField, { isLoading: isUpdatingCustomField }] =
    useUpdateLabCustomFieldMutation();
  const [deleteCustomField, { isLoading: isDeletingCustomField }] =
    useDeleteLabCustomFieldMutation();
  const [overrideDefaultField, { isLoading: isOverridingDefaultField }] =
    useOverrideLabDefaultFieldMutation();
  const [hideDefaultField, { isLoading: isHidingDefaultField }] =
    useHideLabDefaultFieldMutation();
  const [unhideDefaultField, { isLoading: isUnhidingDefaultField }] =
    useUnhideLabDefaultFieldMutation();
  const [resetDefaultFieldOverride, { isLoading: isResettingDefaultField }] =
    useResetLabDefaultFieldOverrideMutation();

  const isSavingField =
    isAddingCustomField || isUpdatingCustomField || isOverridingDefaultField;
  const isMutatingField =
    isSavingField ||
    isDeletingCustomField ||
    isHidingDefaultField ||
    isUnhidingDefaultField ||
    isResettingDefaultField;

  const reloadManagedParameters = useCallback(
    async (templateId?: string, options: { silent?: boolean } = {}) => {
      const id = templateId ?? template?.id;
      if (!id) return;

      if (options.silent) {
        setIsRefreshingFields(true);
      } else {
        setIsLoadingManagedParameters(true);
      }

      try {
        const parameters = await loadTemplateParameters({
          templateId: id,
          appointmentTestId,
        }).unwrap();
        setManagedParameters(parameters);
      } catch (err) {
        addToast({
          title: "Fields load failed",
          description: getLabApiErrorMessage(
            err,
            "Could not load the template fields.",
          ),
          color: "danger",
        });
      } finally {
        if (options.silent) {
          setIsRefreshingFields(false);
        } else {
          setIsLoadingManagedParameters(false);
        }
      }
    },
    [appointmentTestId, loadTemplateParameters, template?.id],
  );

  useEffect(() => {
    if (!isManagingFields || !template?.id) return;
    void reloadManagedParameters(template.id);
  }, [isManagingFields, reloadManagedParameters, template?.id]);

  useEffect(() => {
    if (!isEditable) {
      setIsManagingFields(false);
    }
  }, [isEditable]);

  const refreshOpenResultReport = async () => {
    if (!savedResultId) return;

    try {
      const nextReport = await loadReport({ resultId: savedResultId }).unwrap();
      setReport(nextReport);
      setReportActions(nextReport.reportActions);
      setUploadedReportUrl(
        nextReport.reportActions?.currentFileUrl ?? nextReport.pdfUrl ?? null,
      );
    } catch (err) {
      addToast({
        title: "Saved result refresh failed",
        description: getLabApiErrorMessage(
          err,
          "Could not refresh the saved result preview.",
        ),
        color: "danger",
      });
    }
  };

  const refreshFieldData = async () => {
    if (template?.id) {
      await reloadManagedParameters(template.id, { silent: true });
    }
    await refreshOpenResultReport();
    if (onTemplateUpdated) {
      await onTemplateUpdated();
    }
  };

  const openManageFields = useCallback(() => {
    setIsManagingFields(true);
    setFieldForm(null);
    setManageFieldSearch("");
    setManageFieldFilter("all");
  }, []);

  const closeManageFields = useCallback(() => {
    setIsManagingFields(false);
    setFieldForm(null);
    setManageFieldSearch("");
    setManageFieldFilter("all");
  }, []);

  const handleFieldFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!template || !fieldForm) return;

    const parsedSortOrder = Number(fieldForm.sortOrder);
    if (
      fieldForm.sortOrder &&
      (!Number.isInteger(parsedSortOrder) ||
        parsedSortOrder < 0 ||
        parsedSortOrder > 99999)
    ) {
      addToast({
        title: "Invalid sort order",
        description: "Sort order must be an integer between 0 and 99999.",
        color: "warning",
      });
      return;
    }

    if (fieldForm.sectionName && fieldForm.sectionName.length > 50) {
      addToast({
        title: "Section name too long",
        description: "Section name must be 50 characters or less.",
        color: "warning",
      });
      return;
    }

    if (fieldForm.parameterName && fieldForm.parameterName.length > 100) {
      addToast({
        title: "Field name too long",
        description: "Field name must be 100 characters or less.",
        color: "warning",
      });
      return;
    }

    if (fieldForm.unit && fieldForm.unit.length > 20) {
      addToast({
        title: "Unit too long",
        description: "Unit must be 20 characters or less.",
        color: "warning",
      });
      return;
    }

    if (fieldForm.referenceRange && fieldForm.referenceRange.length > 50) {
      addToast({
        title: "Reference range too long",
        description: "Reference range must be 50 characters or less.",
        color: "warning",
      });
      return;
    }

    const field = formToFieldInput(fieldForm);

    if (!field.parameterName || field.parameterName === "-") {
      addToast({
        title: "Parameter Name required",
        description: "Please enter a valid parameter name.",
        color: "warning",
      });
      return;
    }

    if (!field.unit || field.unit === "-") {
      addToast({
        title: "Unit required",
        description: "Please enter a valid unit.",
        color: "warning",
      });
      return;
    }

    if (!field.referenceRange || field.referenceRange === "-") {
      addToast({
        title: "Reference Range required",
        description: "Please enter a valid reference range.",
        color: "warning",
      });
      return;
    }

    try {
      if (fieldForm.mode === "add-custom") {
        await addCustomField({
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
          field,
        }).unwrap();
      } else if (fieldForm.mode === "edit-custom" && fieldForm.parameterId) {
        await updateCustomField({
          fieldId: fieldForm.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
          field,
        }).unwrap();
      } else if (
        fieldForm.mode === "override-default" &&
        fieldForm.parameterId
      ) {
        const override = buildChangedOverrideInput(fieldForm, template.id);

        if (!override) {
          addToast({
            title: "No changes to save",
            description: "Update at least one field before saving an override.",
            color: "warning",
          });
          return;
        }

        await overrideDefaultField({
          parameterId: fieldForm.parameterId,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
          override,
        }).unwrap();
      }

      addToast({
        title: "Field saved",
        description: "The result template fields were updated.",
        color: "success",
      });
      setFieldForm(null);
      await refreshFieldData();
    } catch (err) {
      addToast({
        title: "Field save failed",
        description: getLabApiErrorMessage(err, "Could not save this field."),
        color: "danger",
      });
    }
  };

  const runFieldAction = async (
    parameter: LabResultTemplateParameter,
    action: () => Promise<unknown>,
    successTitle: string,
    optimisticUpdate?: (
      parameters: LabResultTemplateParameter[],
    ) => LabResultTemplateParameter[],
  ) => {
    if (!template) return;

    const previousManagedParameters = managedParameters;
    const actionKey = managedParameterActionKey(parameter);

    try {
      setFieldActionId(actionKey);

      if (optimisticUpdate) {
        setManagedParameters((prev) => optimisticUpdate(prev));
      }

      await action();

      addToast({
        title: successTitle,
        description: "The result template fields were updated.",
        color: "success",
      });

      setFieldForm(null);
      await refreshFieldData();
    } catch (err) {
      if (optimisticUpdate) {
        setManagedParameters(previousManagedParameters);
      }

      addToast({
        title: "Field update failed",
        description: getLabApiErrorMessage(err, "Could not update this field."),
        color: "danger",
      });
    } finally {
      setFieldActionId(null);
    }
  };

  const deleteCustomParameter = (parameter: LabResultTemplateParameter) => {
    setParameterToDelete(parameter);
  };

  const performDeleteCustomParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        deleteCustomField({
          fieldId: parameter.id,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Custom field deleted",
      (parameters) => parameters.filter((item) => item.id !== parameter.id),
    );
  };

  const hideDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        hideDefaultField({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default field hidden",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, isHidden: true }
            : item,
        ),
    );
  };

  const unhideDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        unhideDefaultField({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default field restored",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, isHidden: false }
            : item,
        ),
    );
  };

  const resetDefaultParameter = (parameter: LabResultTemplateParameter) => {
    if (!template) return;

    void runFieldAction(
      parameter,
      () =>
        resetDefaultFieldOverride({
          parameterId: parameter.parameterId,
          templateId: template.id,
          appointmentTestId,
          resultId: report ? savedResultId ?? undefined : undefined,
        }).unwrap(),
      "Default override reset",
      (parameters) =>
        parameters.map((item) =>
          item.parameterId === parameter.parameterId
            ? { ...item, hasOverride: false, isHidden: false }
            : item,
        ),
    );
  };

  const managedFieldStats = useMemo(() => {
    const custom = managedParameters.filter(isCustomParameter).length;
    const override = managedParameters.filter(
      (parameter) => parameter.hasOverride,
    ).length;
    const hidden = managedParameters.filter(
      (parameter) => parameter.isHidden,
    ).length;
    const defaultCount = managedParameters.length - custom;

    return {
      custom,
      override,
      hidden,
      defaultCount,
    };
  }, [managedParameters]);

  const managedStatsText = useMemo(() => {
    const defaultLabel =
      managedFieldStats.defaultCount === 1 ? "default field" : "default fields";
    const overrideLabel =
      managedFieldStats.override === 1 ? "override" : "overrides";
    const customLabel =
      managedFieldStats.custom === 1 ? "custom field" : "custom fields";
    const hiddenPart =
      managedFieldStats.hidden > 0 ? `, ${managedFieldStats.hidden} hidden` : "";

    return `${managedFieldStats.defaultCount} ${defaultLabel}, ${managedFieldStats.override} ${overrideLabel}, ${managedFieldStats.custom} ${customLabel}${hiddenPart}`;
  }, [managedFieldStats]);

  const visibleManagedParameters = useMemo(() => {
    const search = manageFieldSearch.trim().toLowerCase();

    return managedParameters.filter((parameter) => {
      const isCustom = isCustomParameter(parameter);
      const matchesFilter =
        manageFieldFilter === "all" ||
        (manageFieldFilter === "default" && !isCustom) ||
        (manageFieldFilter === "override" && parameter.hasOverride) ||
        (manageFieldFilter === "custom" && isCustom) ||
        (manageFieldFilter === "hidden" && parameter.isHidden);

      if (!matchesFilter) return false;
      if (!search) return true;

      const searchText = [
        parameter.parameterName,
        parameter.originalParameterName,
        parameter.sectionName,
        parameter.unit,
        parameter.referenceRange,
        parameter.sourceType,
        parameter.inputType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(search);
    });
  }, [manageFieldFilter, manageFieldSearch, managedParameters]);

  return {
    isManagingFields,
    openManageFields,
    closeManageFields,
    parameterToDelete,
    setParameterToDelete,
    fieldForm,
    setFieldForm,
    fieldActionId,
    managedParameters,
    isLoadingManagedParameters,
    isRefreshingFields,
    manageFieldSearch,
    setManageFieldSearch,
    manageFieldFilter,
    setManageFieldFilter,
    isSavingField,
    isMutatingField,
    managedStatsText,
    visibleManagedParameters,
    handleFieldFormSubmit,
    deleteCustomParameter,
    performDeleteCustomParameter,
    hideDefaultParameter,
    unhideDefaultParameter,
    resetDefaultParameter,
  };
}
