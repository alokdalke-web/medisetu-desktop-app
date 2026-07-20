import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { FiCheck, FiEdit3, FiX } from "react-icons/fi";

type DepartmentOption = {
  label: string;
  value: string;
};

const fieldLabelClass = "pb-1 text-xs font-bold text-slate-600";
const fieldInputClass =
  "h-12 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 group-data-[focus=true]:border-primary/50 group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-primary/10";
const fieldTextClass =
  "text-sm font-medium text-slate-900 placeholder:text-slate-400";
const selectTriggerClass =
  "h-12 border-slate-200 bg-white px-4 shadow-none transition-colors hover:border-slate-300 data-[focus=true]:border-primary/50 data-[open=true]:border-primary/50 data-[open=true]:ring-4 data-[open=true]:ring-primary/10";

export function AddEditTestModal({
  isOpen,
  mode,
  name,
  testCode,
  departmentId,
  sampleType,
  price,
  status,
  departments,
  isSaving,
  nameError,
  alertMessage,
  disableDetails,
  onOpenChange,
  onNameChange,
  onTestCodeChange,
  onDepartmentChange,
  onSampleTypeChange,
  onPriceChange,
  onStatusChange,
  onCancel,
  onSubmit,
}: {
  isOpen: boolean;
  mode: "add" | "edit";
  name: string;
  testCode: string;
  departmentId: string;
  sampleType: string;
  price: string;
  status: "active" | "deactive";
  departments: DepartmentOption[];
  isSaving: boolean;
  nameError?: string;
  alertMessage?: string;
  disableDetails?: boolean;
  onOpenChange: (open: boolean) => void;
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
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="opaque"
      size="lg"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-[2px]",
        base: "w-[calc(100%-2rem)] max-w-[540px] overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]",
        closeButton:
          "right-5 top-5 h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-slate-200",
      }}
    >
      <ModalContent>
        <ModalHeader className="px-6 pb-4 pt-6 sm:px-7">
          <div className="flex min-w-0 items-center gap-3 pr-8">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg text-primary ring-1 ring-primary/15">
              <FiEdit3 />
            </div>
            <div className="min-w-0">
              <span className="block text-[20px] font-black leading-6 text-slate-950">
                {mode === "edit" ? "Edit Lab Test" : "Add Lab Test"}
              </span>
              {/* <span className="mt-1 block text-[12px] font-semibold leading-5 text-slate-500">
                Keep test details accurate for doctor assignments and billing.
              </span> */}
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-4 px-6 py-3 sm:px-7">
          {alertMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>{alertMessage}</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Test Name"
                labelPlacement="outside"
                placeholder="Enter test name"
                value={name}
                onValueChange={onNameChange}
                radius="full"
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
                radius="full"
                variant="bordered"
                isDisabled={isSaving || disableDetails}
                classNames={{
                  label: fieldLabelClass,
                  input: fieldTextClass,
                  inputWrapper: fieldInputClass,
                }}
              />
            </div>

            <div className="col-span-1">
              <Input
                label="Price"
                labelPlacement="outside"
                placeholder="Eg: 500"
                value={price}
                onValueChange={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.length <= 5) {
                    onPriceChange(cleaned);
                  }
                }}
                radius="full"
                variant="bordered"
                inputMode="numeric"
                isDisabled={isSaving}
                startContent={<span className="text-sm font-bold text-slate-500">₹</span>}
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
                radius="full"
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

            <div className="col-span-1">
              <Select
                label="Sample Type"
                labelPlacement="outside"
                placeholder="Select sample type"
                radius="full"
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
              >
                {sampleTypesList.map((type) => (
                  <SelectItem key={type} textValue={type}>
                    {type}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <Select
                label="Status"
                labelPlacement="outside"
                placeholder="Select status"
                radius="full"
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
        </ModalBody>

        <ModalFooter className="justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-7">
          <Button
            variant="bordered"
            radius="full"
            onPress={onCancel}
            isDisabled={isSaving}
            startContent={<FiX className="text-sm" />}
            className="h-10 min-w-[108px] border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={onSubmit}
            isLoading={isSaving}
            startContent={!isSaving && <FiCheck className="text-sm" />}
            className="h-10 min-w-[112px] bg-primary px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(10,108,116,0.22)] hover:bg-primary/90"
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
