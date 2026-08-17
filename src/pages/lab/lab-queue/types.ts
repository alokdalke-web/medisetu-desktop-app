import type {
  LabTestsSortBy,
} from "../../../redux/api/labApi";
import type {
  LabResultTemplate,
  LabResultTemplateParameter,
} from "../../../redux/api/labAssistantApi";

export type LabTestStatus = "active" | "deactive";

export type DepartmentOption = {
  label: string;
  value: string;
};

export type Row = {
  key: string;
  id?: string;
  name: string;
  testCode?: string;
  masterTestId?: string;
  templateId?: string | null;
  reportTemplateId?: string | null;
  resultTemplateId?: string | null;
  labOrderId?: string | null;
  appointmentTestId?: string | null;
  templateName?: string | null;
  departmentId: string;
  departmentName: string;
  sampleType: string;
  price: number;
  status: LabTestStatus;
  source: string;
  raw: any;
};

export type ResolvedLabTestTemplate = {
  templateId: string;
  templateName: string;
  testName: string;
  appointmentTestId?: string;
  initialTemplate?: LabResultTemplate | null;
  initialParameters?: LabResultTemplateParameter[];
};

export type SortKey = Extract<
  LabTestsSortBy,
  "testName" | "departmentName" | "sampleType" | "price" | "status" | "source"
>;

export type FilterOption = {
  label: string;
  value: string;
};

export type CatalogStats = {
  totalTests: number;
  departmentCount: number;
  departmentPreview: string;
  sampleTypeCount: number;
  sampleTypePreview: string;
  customTestCount: number;
  sourcePreview: string;
};
