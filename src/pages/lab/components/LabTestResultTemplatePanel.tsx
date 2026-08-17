import { Button, Spinner } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { FiEdit3, FiSettings } from "react-icons/fi";

import {
  getLabApiErrorMessage,
  useLazyGetLabResultTemplateQuery,
  useLazyGetLabTemplateParametersQuery,
  type LabResultTemplate,
  type LabResultTemplateParameter,
} from "../../../redux/api/labAssistantApi";
import { LabTemplateFieldsManager } from "./LabTemplateFieldsManager";

type TemplatePanelTab = "result" | "manage";

type LabTestResultTemplatePanelProps = {
  templateId: string;
  templateName?: string;
  testName: string;
  appointmentTestId?: string;
  initialTemplate?: LabResultTemplate | null;
  initialParameters?: LabResultTemplateParameter[];
};

const resultInputClass =
  "min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-slate-500";

function parameterKey(parameter: LabResultTemplateParameter) {
  return (
    parameter.parameterId ||
    parameter.id ||
    `${parameter.sectionName ?? "General"}-${parameter.parameterName}`
  );
}

function groupedBySection(parameters: LabResultTemplateParameter[]) {
  return parameters.reduce<Record<string, LabResultTemplateParameter[]>>(
    (acc, parameter) => {
      const section = parameter.sectionName?.trim() || "General";
      if (!acc[section]) acc[section] = [];
      acc[section].push(parameter);
      return acc;
    },
    {},
  );
}

function ResultInput({
  parameter,
  value,
  onChange,
  disabled,
}: {
  parameter: LabResultTemplateParameter;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  if (parameter.inputType === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${resultInputClass} min-h-24 resize-y`}
        disabled={disabled}
        placeholder="Enter value"
      />
    );
  }

  if (parameter.inputType === "boolean") {
    return (
      <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onChange(event.target.checked ? "true" : "false")}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
        />
        Positive
      </label>
    );
  }

  if (parameter.inputType === "select" && parameter.options.length > 0) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={resultInputClass}
        disabled={disabled}
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

  const inputType =
    parameter.inputType === "number"
      ? "number"
      : parameter.inputType === "date"
        ? "date"
        : "text";

  return (
    <input
      type={inputType}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={resultInputClass}
      disabled={disabled}
      placeholder="Enter value"
    />
  );
}

export function LabTestResultTemplatePanel({
  templateId,
  templateName,
  testName,
  appointmentTestId,
  initialTemplate = null,
  initialParameters = [],
}: LabTestResultTemplatePanelProps) {
  const [activeTab, setActiveTab] = useState<TemplatePanelTab>("result");
  const [template, setTemplate] = useState<LabResultTemplate | null>(
    initialTemplate,
  );
  const [parameters, setParameters] =
    useState<LabResultTemplateParameter[]>(initialParameters);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsRefreshing] = useState(false);
  const [loadResultTemplate] = useLazyGetLabResultTemplateQuery();
  const [loadTemplateParameters] = useLazyGetLabTemplateParametersQuery();
  const [loadError, setLoadError] = useState("");

  const resolvedTemplateId = templateId || template?.id || "";
  const resolvedTemplateName =
    template?.templateName || templateName || testName || "Result Template";
  const hasOrderContext = Boolean(appointmentTestId);

  const sectionEntries = useMemo(
    () => Object.entries(groupedBySection(parameters)),
    [parameters],
  );

  useEffect(() => {
    setValues((current) => {
      const next = { ...current };
      parameters.forEach((parameter) => {
        const key = parameterKey(parameter);
        if (next[key] === undefined) next[key] = parameter.value ?? "";
      });
      return next;
    });
  }, [parameters]);

  const refreshTemplateData = async (silent = false) => {
    if (!resolvedTemplateId && !appointmentTestId) return;

    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError("");

    try {
      if (appointmentTestId) {
        const nextTemplate = await loadResultTemplate({ appointmentTestId }).unwrap();
        setTemplate(nextTemplate);
        setParameters(nextTemplate.parameters ?? []);
        return;
      }

      const nextParameters = await loadTemplateParameters({
        templateId: resolvedTemplateId,
      }).unwrap();
      setParameters(nextParameters);
    } catch (err) {
      setLoadError(
        getLabApiErrorMessage(
          err,
          "Could not load this result template.",
        ),
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setTemplate(initialTemplate);
    setParameters(initialParameters);
    setValues({});
    void refreshTemplateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, appointmentTestId]);

  const tabControls = (
    <div className="inline-grid grid-cols-2 rounded-full border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => setActiveTab("result")}
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
          activeTab === "result"
            ? "bg-primary text-white shadow-sm"
            : "text-slate-600 hover:bg-white"
        }`}
      >
        <FiEdit3 />
        Result Entry
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("manage")}
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition ${
          activeTab === "manage"
            ? "bg-primary text-white shadow-sm"
            : "text-slate-600 hover:bg-white"
        }`}
      >
        <FiSettings />
        Manage Fields
      </button>
    </div>
  );

  if (activeTab === "manage") {
    return (
      <LabTemplateFieldsManager
        templateId={resolvedTemplateId}
        templateName={resolvedTemplateName}
        appointmentTestId={appointmentTestId}
        headerAction={tabControls}
        onFieldsChanged={() => refreshTemplateData(true)}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 lg:px-8">
        {tabControls}
      </header>

      <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="grid min-h-44 place-items-center text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Loading result template...
              </span>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{loadError}</span>
                <Button
                  size="sm"
                  radius="full"
                  variant="flat"
                  color="danger"
                  onPress={() => void refreshTemplateData()}
                  className="font-bold"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : parameters.length === 0 ? (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <div>
                <h4 className="text-sm font-black text-slate-800">
                  No result parameters yet
                </h4>
                <Button
                  color="primary"
                  radius="full"
                  onPress={() => setActiveTab("manage")}
                  startContent={<FiSettings />}
                  className="mt-4 px-5 font-bold text-white"
                >
                  Manage Fields
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              {sectionEntries.map(([sectionName, sectionParameters]) => (
                <div
                  key={sectionName}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <h4 className="text-sm font-black text-slate-950">
                    {sectionName}
                  </h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sectionParameters.map((parameter) => {
                      const key = parameterKey(parameter);
                      return (
                        <label key={key} className="grid gap-1.5">
                          <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
                            <span className="truncate">
                              {parameter.parameterName}
                            </span>
                            {parameter.required && (
                              <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase text-red-600">
                                Required
                              </span>
                            )}
                          </span>
                          <ResultInput
                            parameter={parameter}
                            value={values[key] ?? ""}
                            onChange={(nextValue) =>
                              setValues((current) => ({
                                ...current,
                                [key]: nextValue,
                              }))
                            }
                            disabled={!hasOrderContext}
                          />
                          <span className="min-h-4 text-[11px] font-semibold text-slate-400">
                            {parameter.unit ? `${parameter.unit} · ` : ""}
                            {parameter.referenceRange || ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}
