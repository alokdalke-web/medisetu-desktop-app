import { Spinner } from "@heroui/react";

import { AddEditTestForm } from "../components/AddEditTestForm";
import { LabTestResultTemplatePanel } from "../components/LabTestResultTemplatePanel";
import type {
  DepartmentOption,
  LabTestStatus,
  ResolvedLabTestTemplate,
} from "./types";

type LabQueueFormViewProps = {
  mode: "add" | "edit";
  name: string;
  testCode: string;
  departmentId: string;
  sampleType: string;
  price: string;
  status: LabTestStatus;
  departments: DepartmentOption[];
  isSaving: boolean;
  hasSaved: boolean;
  nameError: string;
  codeError: string;
  disableDetails: boolean;
  isResolvingTemplate: boolean;
  templateResolveMessage: string;
  templateWorkspace: ResolvedLabTestTemplate | null;
  onNameChange: (value: string) => void;
  onTestCodeChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onSampleTypeChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onStatusChange: (value: LabTestStatus) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function LabQueueFormView({
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
  disableDetails,
  isResolvingTemplate,
  templateResolveMessage,
  templateWorkspace,
  onNameChange,
  onTestCodeChange,
  onDepartmentChange,
  onSampleTypeChange,
  onPriceChange,
  onStatusChange,
  onCancel,
  onSubmit,
}: LabQueueFormViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <AddEditTestForm
        mode={mode}
        name={name}
        testCode={testCode}
        departmentId={departmentId}
        sampleType={sampleType}
        price={price}
        status={status}
        departments={departments}
        isSaving={isSaving}
        hasSaved={hasSaved}
        nameError={nameError}
        codeError={codeError}
        disableDetails={disableDetails}
        onNameChange={onNameChange}
        onTestCodeChange={onTestCodeChange}
        onDepartmentChange={onDepartmentChange}
        onSampleTypeChange={onSampleTypeChange}
        onPriceChange={onPriceChange}
        onStatusChange={onStatusChange}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />

      {isResolvingTemplate && (
        <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <Spinner size="sm" /> Resolving result template...
        </div>
      )}

      {templateResolveMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {templateResolveMessage}
        </div>
      )}

      {templateWorkspace && (
        <LabTestResultTemplatePanel
          key={`${templateWorkspace.templateId}-${templateWorkspace.appointmentTestId ?? "template"}`}
          templateId={templateWorkspace.templateId}
          templateName={templateWorkspace.templateName}
          testName={templateWorkspace.testName}
          appointmentTestId={templateWorkspace.appointmentTestId}
          initialTemplate={templateWorkspace.initialTemplate}
          initialParameters={templateWorkspace.initialParameters}
        />
      )}
    </div>
  );
}
