import {
  Button,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { motion } from "framer-motion";
import { FiArrowLeft, FiClipboard, FiSave } from "react-icons/fi";

import { LabScreenInfoTooltip } from "./LabScreenInfoTooltip";

type DepartmentOption = {
  label: string;
  value: string;
};

const fieldLabelClass = "pb-1 text-xs font-bold text-slate-950";
const fieldInputClass =
  "h-12 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white group-data-[focus=true]:border-primary/50 group-data-[focus=true]:bg-white group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10";
const fieldTextClass =
  "text-sm placeholder:text-slate-400/80 placeholder:font-normal";
const selectTriggerClass =
  "h-12 border-slate-200 bg-slate-50/40 px-4 shadow-none transition-colors hover:border-primary/40 hover:bg-white data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:bg-white data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

export function AddEditTestForm({
  mode,
  name,
  testCode,
  departmentId,
  sampleType,
  price,
  status,
  departments,
  isSaving,
  hasSaved,
  nameError,
  codeError,
  alertMessage,
  disableDetails,
  onNameChange,
  onTestCodeChange,
  onDepartmentChange,
  onSampleTypeChange,
  onPriceChange,
  onStatusChange,
  onCancel,
  onSubmit,
}: {
  mode: "add" | "edit";
  name: string;
  testCode: string;
  departmentId: string;
  sampleType: string;
  price: string;
  status: "active" | "deactive";
  departments: DepartmentOption[];
  isSaving: boolean;
  hasSaved?: boolean;
  nameError?: string;
  codeError?: string;
  alertMessage?: string;
  disableDetails?: boolean;
  onNameChange: (value: string) => void;
  onTestCodeChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onSampleTypeChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onStatusChange: (value: "active" | "deactive") => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const defaultSampleTypes = [
    "Blood",
    "Urine",
    "Saliva",
    "Sputum",
    "Stool",
    "Swab",
    "Semen",
    "Serum",
    "Plasma",
    "CSF (Cerebrospinal Fluid)",
    "Biopsy/Tissue",
    "Hair",
    "Nail",
    "Sweat",
    "Other",
  ];
  const sampleTypesList = sampleType && !defaultSampleTypes.includes(sampleType)
    ? [sampleType, ...defaultSampleTypes]
    : defaultSampleTypes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="w-full flex flex-col gap-5"
    >
      {/* ── Page-level header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none cursor-pointer"
            title="Back to Catalog"
          >
            <FiArrowLeft className="text-sm" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-950 md:text-xl">
                {mode === "edit" ? "Edit Lab Test" : "Add Lab Test"}
              </h2>
              <LabScreenInfoTooltip
                title={mode === "edit" ? "Edit Lab Test" : "Add Lab Test"}
                description={
                  mode === "edit"
                    ? "Use this screen to update an existing catalog test when price, department, sample type, status, or report fields need correction."
                    : "Use this screen to add a test that is missing from this lab catalog or needs to be configured for your department."
                }
                items={
                  mode === "edit"
                    ? [
                        "Keep the test active only when the lab can currently process it.",
                        "After saving, manage result or report fields when a template is available.",
                      ]
                    : [
                        "Select the correct department and sample type, set the lab price, and keep the status active when it is ready for use.",
                        "After saving, add or review report fields so staff can enter results consistently.",
                      ]
                }
                placement="right"
                guideSection="test-catalog-guide"
                linkLabel="Read lab test catalog guide"
              />
              {mode === "edit" && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                    status === "active"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status === "active" ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {status === "active" ? "Active" : "Deactive"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "edit"
                ? "Modify existing lab test details and manage result template fields"
                : "Create a new lab test for your catalog"}
            </p>
          </div>
        </div>

        {!isSaving && !hasSaved && (
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="bordered"
              radius="full"
              onPress={onCancel}
              className="h-10 min-w-[100px] border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              radius="full"
              onPress={onSubmit}
              startContent={<FiSave className="text-sm" />}
              className="h-10 min-w-[140px] bg-primary px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(10,108,116,0.22)] hover:bg-primary/90 cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* ── Lab Test Details card ── */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <FiClipboard className="text-emerald-700" />
            <h3 className="text-base font-black text-slate-950">
              Lab Test Details
            </h3>
          </div>
        </header>

        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
          {alertMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{alertMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            {/* Row 1: Test Name | Test Code */}
            <div className="col-span-1">
              <Input
                label="Test Name"
                labelPlacement="outside"
                placeholder="Enter test name"
                value={name}
                onValueChange={onNameChange}
                radius="lg"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                isInvalid={!!nameError}
                errorMessage={nameError}
                classNames={{
                  label: fieldLabelClass,
                  input: fieldTextClass,
                  inputWrapper: fieldInputClass,
                  errorMessage: "text-[11px] font-medium",
                }}
              />
            </div>

            <div className="col-span-1">
              <Input
                label="Test Code"
                labelPlacement="outside"
                placeholder="Enter test code (optional, e.g. CBC)"
                value={testCode}
                onValueChange={onTestCodeChange}
                radius="lg"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                isInvalid={!!codeError}
                errorMessage={codeError}
                classNames={{
                  label: fieldLabelClass,
                  input: fieldTextClass,
                  inputWrapper: fieldInputClass,
                  errorMessage: "text-[11px] font-medium",
                }}
              />
            </div>

            {/* Row 2: Price (₹) | Department */}
            <div className="col-span-1">
              <Input
                label="Price (₹)"
                labelPlacement="outside"
                placeholder="Eg: 500"
                value={price}
                onValueChange={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 5) {
                    onPriceChange(cleaned);
                  }
                }}
                radius="lg"
                variant="bordered"
                inputMode="numeric"
                isDisabled={isSaving}
                classNames={{
                  label: fieldLabelClass,
                  input: fieldTextClass,
                  inputWrapper: fieldInputClass,
                }}
              />
            </div>

            <div className="col-span-1">
              <Select
                label="Department"
                labelPlacement="outside"
                placeholder="Select department"
                radius="lg"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                selectedKeys={departmentId ? new Set([departmentId]) : new Set([])}
                onSelectionChange={(keys) => {
                  if (keys === "all") return;
                  const value = (Array.from(keys)[0] as string | undefined) ?? "";
                  onDepartmentChange(value);
                }}
                classNames={{
                  label: fieldLabelClass,
                  value: `text-sm ${
                    departmentId
                      ? "font-semibold text-slate-950"
                      : "font-normal text-slate-400"
                  }`,
                  trigger: selectTriggerClass,
                }}
              >
                {departments.map((opt) => (
                  <SelectItem key={opt.value} textValue={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Row 3: Sample Type | Status */}
            <div className="col-span-1">
              <Select
                label="Sample Type"
                labelPlacement="outside"
                placeholder="Select sample type"
                radius="lg"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                selectedKeys={sampleType ? new Set([sampleType]) : new Set([])}
                onSelectionChange={(keys) => {
                  if (keys === "all") return;
                  const value = (Array.from(keys)[0] as string | undefined) ?? "";
                  onSampleTypeChange(value);
                }}
                classNames={{
                  label: fieldLabelClass,
                  value: `text-sm ${
                    sampleType
                      ? "font-semibold text-slate-950"
                      : "font-normal text-slate-400"
                  }`,
                  trigger: selectTriggerClass,
                }}
                popoverProps={{
                  classNames: {
                    content:
                      "rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70",
                  },
                }}
                listboxProps={{
                  itemClasses: {
                    base: [
                      "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                      "text-slate-700 data-[hover=true]:bg-slate-50 data-[hover=true]:text-slate-900",
                      "data-[selectable=true]:focus:bg-teal-50 data-[selectable=true]:focus:text-teal-700",
                      "data-[selected=true]:bg-teal-50 data-[selected=true]:font-semibold data-[selected=true]:text-teal-700",
                    ].join(" "),
                    title: "text-[13px] font-semibold",
                    selectedIcon: "h-4 w-4 shrink-0 text-teal-700",
                  },
                }}
              >
                {sampleTypesList.map((type) => (
                  <SelectItem key={type} textValue={type}>
                    {type}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="col-span-1">
              <Select
                label="Status"
                labelPlacement="outside"
                placeholder="Select status"
                radius="lg"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                selectedKeys={new Set([status])}
                onSelectionChange={(keys) => {
                  if (keys === "all") return;
                  const value =
                    (Array.from(keys)[0] as "active" | "deactive" | undefined) ??
                    "active";
                  onStatusChange(value);
                }}
                classNames={{
                  label: fieldLabelClass,
                  value: "text-sm font-semibold text-slate-950",
                  trigger: selectTriggerClass,
                }}
              >
                <SelectItem key="active" textValue="Active">
                  Active
                </SelectItem>
                <SelectItem key="deactive" textValue="Deactive">
                  Deactive
                </SelectItem>
              </Select>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
