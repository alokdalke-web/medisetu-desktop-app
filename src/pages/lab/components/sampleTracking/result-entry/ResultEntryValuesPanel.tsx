import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiEdit,
  FiEye,
} from "react-icons/fi";

import {
  type LabResultReport,
  type LabResultTemplate,
} from "../../../../../redux/api/labAssistantApi";
import {
  ResultValueInput,
  SourceBadge,
} from "./fieldControls";

type ResultEntryValuesPanelProps = {
  effectiveReport: LabResultReport | null;
  report: LabResultReport | null;
  template: LabResultTemplate | null;
  isEditModeOverride: boolean;
  isDetailsExpanded: boolean;
  setIsDetailsExpanded: (value: boolean) => void;
  displayedTemplateName: string;
  displayedSampleType: string | null;
  displayedCount: number;
  hasReportValues: boolean;
  reportValues: LabResultReport["values"];
  isEditable: boolean;
  values: Record<string, string>;
  isVerified: boolean;
  setParameterValue: (parameterId: string, value: string) => void;
  canEnter: boolean;
  setIsPreviewModalOpen: (value: boolean) => void;
  handleRequestEditResult: () => void;
  handleSaveCompletedPress: () => void;
  isSaving: boolean;
  canUseTemplate: boolean;
  isVerifying: boolean;
  isReportActionLoading: boolean;
  isDirty: boolean;
  setIsEditModeOverride: (value: boolean) => void;
  setValues: (values: Record<string, string>) => void;
  initialLoadedValues: Record<string, string>;
  setRemarks: (value: string) => void;
  initialRemarks: string;
};

export function ResultEntryValuesPanel({
  effectiveReport,
  report,
  template,
  isEditModeOverride,
  isDetailsExpanded,
  setIsDetailsExpanded,
  displayedTemplateName,
  displayedSampleType,
  displayedCount,
  hasReportValues,
  reportValues,
  isEditable,
  values,
  isVerified,
  setParameterValue,
  canEnter,
  setIsPreviewModalOpen,
  handleRequestEditResult,
  handleSaveCompletedPress,
  isSaving,
  canUseTemplate,
  isVerifying,
  isReportActionLoading,
  isDirty,
  setIsEditModeOverride,
  setValues,
  initialLoadedValues,
  setRemarks,
  initialRemarks,
}: ResultEntryValuesPanelProps) {
  return (                <div className="space-y-4">
                  {effectiveReport && !isEditModeOverride ? (
                    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50/40 hover:bg-slate-50 transition-colors text-left focus:outline-none"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 tracking-tight">{displayedTemplateName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              Sample Type: <strong className="text-slate-700">{displayedSampleType ?? "-"}</strong>
                            </span>
                            {report?.status && (
                              <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                                Status: <strong className="text-slate-700">{report.status}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-fit inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/15 px-3 py-1 text-[11px] font-bold text-primary shadow-sm">
                            {displayedCount} {displayedCount === 1 ? 'Parameter' : 'Parameters'}
                          </span>
                          <span className="text-slate-400">
                            {isDetailsExpanded ? (
                              <FiChevronUp className="h-5 w-5" />
                            ) : (
                              <FiChevronDown className="h-5 w-5" />
                            )}
                          </span>
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isDetailsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="border-t border-slate-100 overflow-hidden bg-white"
                          >
                            <div className="p-4 bg-white">
                              <div
                                className="max-h-[460px] overflow-auto rounded-xl border border-slate-100 bg-white"
                                style={{ scrollbarWidth: "thin" }}
                              >
                                <table className="w-full min-w-[760px] text-left text-xs">
                                  <thead className="sticky top-0 z-10 bg-slate-50/85 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <tr>
                                      <th className="px-4 py-3 font-bold w-[25%]">Parameter</th>
                                      <th className="px-4 py-3 font-bold w-[35%]">Value / Input</th>
                                      <th className="px-4 py-3 font-bold w-[12%]">Unit</th>
                                      <th className="px-4 py-3 font-bold w-[15%]">Reference Range</th>
                                      <th className="px-4 py-3 font-bold w-[13%]">Type</th>
                                      {hasReportValues && <th className="px-4 py-3 font-bold">Flag</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100/80">
                                    {reportValues.map((value) => (
                                      <tr key={value.parameterId ?? value.parameterName} className="hover:bg-slate-50/30 transition-all duration-150">
                                        <td className="px-4 py-3 font-bold text-slate-800">
                                          <div className="flex flex-col gap-0.5">
                                            <span>{value.displayName || value.parameterName}</span>
                                            {value.originalParameterName &&
                                              value.originalParameterName !== (value.displayName || value.parameterName) && (
                                                <span className="text-[10px] font-medium text-slate-450">
                                                  Original: {value.originalParameterName}
                                                </span>
                                              )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            type={value.inputType === "number" ? "number" : "text"}
                                            value={value.value}
                                            disabled
                                            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-500"
                                          />
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{value.unit ?? "-"}</td>
                                        <td className="px-4 py-3 text-slate-600 font-semibold">{value.referenceRange ?? "-"}</td>
                                        <td className="px-4 py-3">
                                          <span className="inline-flex w-fit items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                            {value.isCustom ? "CUSTOM" : value.sourceType || "DEFAULT"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={[
                                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                              value.flag === "High" || value.flag === "Low"
                                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100",
                                            ].join(" ")}
                                          >
                                            {value.flag ?? "-"}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-slate-50/40 border border-slate-100 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                          <p className="text-sm font-bold text-slate-800 tracking-tight">{displayedTemplateName}</p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              Sample Type: <strong className="text-slate-700">{displayedSampleType ?? "-"}</strong>
                            </span>
                            {report?.status && (
                              <span className="flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shadow-sm">
                                Status: <strong className="text-slate-700">{report.status}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="w-fit inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/15 px-3 py-1 text-[11px] font-bold text-primary shadow-sm">
                          {displayedCount} {displayedCount === 1 ? 'Parameter' : 'Parameters'}
                        </span>
                      </div>

                      <div
                        className="max-h-[460px] overflow-auto rounded-xl border border-slate-100 bg-white shadow-sm"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        <table className="w-full min-w-[760px] text-left text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-50/85 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-3 font-bold w-[25%]">Parameter</th>
                              <th className="px-4 py-3 font-bold w-[35%]">Value / Input</th>
                              <th className="px-4 py-3 font-bold w-[12%]">Unit</th>
                              <th className="px-4 py-3 font-bold w-[15%]">Reference Range</th>
                              <th className="px-4 py-3 font-bold w-[13%]">Type</th>
                              {hasReportValues && !isEditable && <th className="px-4 py-3 font-bold">Flag</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/80">
                            {isEditable
                              ? template?.parameters.map((parameter) => (
                                <tr key={parameter.parameterId} className="hover:bg-slate-50/30 transition-all duration-150">
                                  <td className="px-4 py-3 font-bold text-slate-800">
                                    {parameter.parameterName}
                                    {parameter.required && <span className="ml-1 text-red-500 font-bold">*</span>}
                                  </td>
                                  <td className="px-4 py-3 min-w-[200px]">
                                    <ResultValueInput
                                      parameter={parameter}
                                      value={values[parameter.parameterId] ?? ""}
                                      disabled={isVerified}
                                      onChange={(value) => setParameterValue(parameter.parameterId, value)}
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.unit ?? "-"}</td>
                                  <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.referenceRange ?? "-"}</td>
                                  <td className="px-4 py-3">
                                    <SourceBadge parameter={parameter} />
                                  </td>
                                </tr>
                              ))
                              : hasReportValues
                                ? reportValues.map((value) => (
                                  <tr key={value.parameterId ?? value.parameterName} className="hover:bg-slate-50/30 transition-all duration-150">
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                      <div className="flex flex-col gap-0.5">
                                        <span>{value.displayName || value.parameterName}</span>
                                        {value.originalParameterName &&
                                          value.originalParameterName !== (value.displayName || value.parameterName) && (
                                            <span className="text-[10px] font-medium text-slate-450">
                                              Original: {value.originalParameterName}
                                            </span>
                                          )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type={value.inputType === "number" ? "number" : "text"}
                                        value={value.value}
                                        disabled
                                        className="h-9 w-full rounded-full border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-500"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{value.unit ?? "-"}</td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{value.referenceRange ?? "-"}</td>
                                    <td className="px-4 py-3">
                                      <span className="inline-flex w-fit items-center rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        {value.isCustom ? "CUSTOM" : value.sourceType || "DEFAULT"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={[
                                          "rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                                          value.flag === "High" || value.flag === "Low"
                                            ? "bg-amber-50 text-amber-700 border-amber-100"
                                            : "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        ].join(" ")}
                                      >
                                        {value.flag ?? "-"}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                                : template?.parameters.map((parameter) => (
                                  <tr key={parameter.parameterId} className="hover:bg-slate-50/30 transition-all duration-150">
                                    <td className="px-4 py-3 font-bold text-slate-800">
                                      {parameter.parameterName}
                                      {parameter.required && <span className="ml-1 text-red-500">*</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type={parameter.inputType === "number" ? "number" : "text"}
                                        value={values[parameter.parameterId] ?? ""}
                                        disabled
                                        placeholder="No result entered"
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.unit ?? "-"}</td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold">{parameter.referenceRange ?? "-"}</td>
                                    <td className="px-4 py-3">
                                      <SourceBadge parameter={parameter} />
                                    </td>
                                  </tr>
                                ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="mt-5 flex w-full flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
                    {effectiveReport && (
                      <Button
                        onPress={() => setIsPreviewModalOpen(true)}
                        startContent={<FiEye className="text-sm" />}
                        className="h-10 px-6 font-bold text-primary border border-[#BFE0D9] bg-white shadow-sm transition-all duration-200 active:scale-95 text-xs rounded-full hover:bg-slate-50"
                      >
                        Preview
                      </Button>
                    )}

                    {canEnter && effectiveReport && !isEditModeOverride && (
                      <Button
                        onPress={handleRequestEditResult}
                        startContent={<FiEdit className="text-sm" />}
                        className="h-10 px-6 font-bold text-white shadow-md bg-primary hover:bg-primary-active shadow-[0_4px_14px_rgba(10,108,116,0.2)] transition-all duration-200 active:scale-95 text-xs rounded-full"
                      >
                        Edit Result
                      </Button>
                    )}

                    {isEditable && (
                      <Button
                        onPress={handleSaveCompletedPress}
                        isLoading={isSaving}
                        isDisabled={!canUseTemplate || isVerifying || isVerified || isReportActionLoading || !isDirty}
                        startContent={!isSaving && <FiCheckCircle className="text-sm" />}
                        className={[
                          "h-10 px-6 font-bold text-white shadow-md transition-all duration-200 active:scale-95 text-xs rounded-full",
                          (!canUseTemplate || isVerifying || isVerified || isReportActionLoading || !isDirty)
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-primary hover:bg-primary-active shadow-[0_4px_14px_rgba(10,108,116,0.3)] hover:shadow-[0_6px_20px_rgba(10,108,116,0.4)]",
                        ].join(" ")}
                      >
                        Save Completed
                      </Button>
                    )}

                    {isEditModeOverride && (
                      <Button
                        onPress={() => {
                          setIsEditModeOverride(false);
                          setValues({ ...initialLoadedValues });
                          setRemarks(initialRemarks);
                        }}
                        className="h-10 px-6 font-bold text-slate-700 border border-slate-200 bg-white shadow-sm transition-all duration-200 active:scale-95 text-xs rounded-full hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
  );
}
