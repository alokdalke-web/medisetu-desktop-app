import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type LabStatus = "Active" | "deactive";

/* ----------------------------- Labs types ----------------------------- */

export type CreateLabDto = {
  clinicId: string;
  labName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string | null;
  logo?: string | null;
  reportFooter?: string | null;
  departmentIds?: string[];
};

export type UpdateLabDto = {
  name: string;
  address: string;
  contactNo: string;
  labStatus: LabStatus;
};

export type LabDto = {
  id?: string;
  _id?: string;
  clinicId?: string;
  name?: string;
  address?: string;
  contactNo?: string;
  email?: string;
  labStatus?: LabStatus;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  analytics?: any;
  labName?: string;
  phone?: string;
  departmentIds?: string[];
};

export type LabDepartmentTestDto = {
  id: string;
  _id?: string;
  name: string;
  testName?: string;
  code: string;
  testCode?: string | null;
  sampleType?: string;
  description?: string;
};

export type LabDepartmentDto = {
  id?: string;
  _id?: string;
  name?: string;
  departmentName?: string;
  code?: string;
  status?: string;
  tests?: LabDepartmentTestDto[];
};


/* ----------------------------- Lab Users (Assistants) types ----------------------------- */

export type LabAssistantDto = {
  id?: string;
  _id?: string;
  labId?: string;
  name?: string;
  email?: string;
  contactNo?: string;
  mobile: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

/* ----------------------------- Lab Tests types ----------------------------- */

export type LabTestStatus =
  | "active"
  | "deactive"
  | "Active"
  | "deactive"
  | string;

export type LabTestDto = {
  id?: string;
  _id?: string;
  masterTestId?: string;
  templateId?: string | null;
  reportTemplateId?: string | null;
  resultTemplateId?: string | null;
  labOrderId?: string | null;
  appointmentTestId?: string | null;
  reportTemplate?: {
    id?: string | null;
    _id?: string | null;
    name?: string | null;
    templateName?: string | null;
  } | null;
  resultTemplate?: {
    id?: string | null;
    _id?: string | null;
    name?: string | null;
    templateName?: string | null;
  } | null;
  masterTest?: {
    id?: string;
    _id?: string;
    name?: string;
    code?: string;
    testCode?: string | null;
  };
  name: string;
  category: string;
  testName?: string;
  testCode?: string | null;
  departmentId?: string;
  departmentName?: string;
  sampleType?: string;
  price: number;
  status: LabTestStatus;
  source?: "master" | "custom" | string;
  clinicId?: string;
  labId?: string;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// ✅ create payload for POST /lab/my-tests
export type CreateLabTestDto = {
  departmentId: string;
  testName: string;
  testCode?: string;
  sampleType: string;
  price: number;
  status?: "active" | "deactive";
  masterTestId?: string;
};

// ✅ update payload for PATCH /test/lab-tests/:id
export type UpdateLabTestDto = Partial<CreateLabTestDto>;

export type PaginationMeta = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type LabTestsSortBy =
  | "createdAt"
  | "updatedAt"
  | "testName"
  | "name"
  | "testCode"
  | "departmentName"
  | "category"
  | "sampleType"
  | "price"
  | "status"
  | "source";

export type LabTestsStatsOption =
  | string
  | {
      id?: string;
      _id?: string;
      departmentId?: string;
      name?: string;
      departmentName?: string;
      category?: string;
      sampleType?: string;
      label?: string;
      value?: string;
    };

export type LabTestsStats = {
  totalTests?: number;
  departmentCount?: number;
  departments?: LabTestsStatsOption[];
  sampleTypeCount?: number;
  sampleTypes?: LabTestsStatsOption[];
  priceRange?: {
    min?: number | null;
    max?: number | null;
  } | null;
};

export type GetLabTestsArgs = {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "deactive" | string;
  departmentId?: string;
  sampleType?: string;
  source?: "custom" | "master" | string;
  sortBy?: LabTestsSortBy;
  sortOrder?: "asc" | "desc";
};

export type UpdateLabDepartmentsArgs = {
  labId: string;
  departmentIds: string[];
  departmentTestIds?: Record<string, string[]>;
};

/* ----------------------------- Response Shapes ----------------------------- */

type LabsListResponse =
  | { data: LabDto[] }
  | { result: LabDto[] }
  | { labs: LabDto[] }
  | { data: { data: LabDto[] } }
  | LabDto[];

type LabOneResponse =
  | { data: LabDto }
  | { result: LabDto }
  | { lab: LabDto }
  | { data: { data: LabDto } }
  | LabDto[]
  | LabDto;

type AssistantsListResponse =
  | { data: LabAssistantDto[] }
  | { result: LabAssistantDto[] }
  | { assistants: LabAssistantDto[] }
  | { data: { data: LabAssistantDto[] } }
  | LabAssistantDto[];

type LabTestsListResponse =
  | { data: LabTestDto[] }
  | { result: LabTestDto[] }
  | { tests: LabTestDto[] }
  | { labTests: LabTestDto[] }
  | { data: { data: LabTestDto[] } }
  | LabTestDto[];

type DepartmentListResponse =
  | { data: LabDepartmentDto[] }
  | { result: LabDepartmentDto[] }
  | { departments: LabDepartmentDto[] }
  | { data: { data: LabDepartmentDto[] } }
  | LabDepartmentDto[];

/* ----------------------------- Response pickers ----------------------------- */

const pickLabArray = (res: any): LabDto[] => {
  if (Array.isArray(res)) return res as LabDto[];
  if (Array.isArray(res?.data)) return res.data as LabDto[];
  if (Array.isArray(res?.result)) return res.result as LabDto[];
  if (Array.isArray(res?.labs)) return res.labs as LabDto[];
  if (Array.isArray(res?.data?.data)) return res.data.data as LabDto[];
  return [];
};

const pickLabOne = (res: any): LabDto => {
  if (res && typeof res === "object") {
    if (res.data && !Array.isArray(res.data)) {
      if (res.data?.data && !Array.isArray(res.data.data)) return res.data.data;
      return res.data as LabDto;
    }
    if (res.result && !Array.isArray(res.result)) return res.result as LabDto;
    if (res.lab && !Array.isArray(res.lab)) return res.lab as LabDto;
  }
  return res as LabDto;
};

const normalizeLabDto = (lab: LabDto): LabDto => ({
  ...lab,
  name: lab.name ?? lab.labName,
  contactNo: lab.contactNo ?? lab.phone,
});

const pickAssistantArray = (res: any): LabAssistantDto[] => {
  if (Array.isArray(res)) return res as LabAssistantDto[];
  if (Array.isArray(res?.data)) return res.data as LabAssistantDto[];
  if (Array.isArray(res?.result)) return res.result as LabAssistantDto[];
  if (Array.isArray(res?.assistants))
    return res.assistants as LabAssistantDto[];
  if (Array.isArray(res?.data?.data)) return res.data.data as LabAssistantDto[];
  return [];
};

const pickLabTestsArray = (res: any): LabTestDto[] => {
  const arr = Array.isArray(res)
    ? res
    : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.result)
        ? res.result
        : Array.isArray(res?.tests)
          ? res.tests
          : Array.isArray(res?.labTests)
            ? res.labTests
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];

  return (arr as LabTestDto[]).map(normalizeLabTest);
};

const firstNonEmptyText = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text && !["null", "undefined"].includes(text.toLowerCase())) {
      return text;
    }
  }

  return null;
};

// ✅ single item picker (for create/update response)
const pickLabTestOne = (res: any): LabTestDto => {
  const one = res?.data?.data ?? res?.data ?? res?.result ?? res;
  const normalized = normalizeLabTest(one as LabTestDto);
  const reportTemplate =
    one?.reportTemplate ??
    one?.resultTemplate ??
    res?.reportTemplate ??
    res?.resultTemplate ??
    res?.data?.reportTemplate ??
    res?.data?.resultTemplate ??
    null;

  return {
    ...normalized,
    templateId:
      firstNonEmptyText(
        one?.templateId,
        one?.reportTemplateId,
        one?.resultTemplateId,
        one?.template?.id,
        one?.template?._id,
        reportTemplate?.id,
        reportTemplate?._id,
        res?.templateId,
        res?.reportTemplateId,
        res?.resultTemplateId,
        res?.data?.templateId,
        res?.data?.reportTemplateId,
        res?.data?.resultTemplateId,
      ) ?? normalized.templateId,
    reportTemplateId:
      firstNonEmptyText(
        one?.reportTemplateId,
        reportTemplate?.id,
        reportTemplate?._id,
        res?.reportTemplateId,
        res?.data?.reportTemplateId,
      ) ?? normalized.reportTemplateId,
    resultTemplateId:
      firstNonEmptyText(
        one?.resultTemplateId,
        reportTemplate?.id,
        reportTemplate?._id,
        res?.resultTemplateId,
        res?.data?.resultTemplateId,
      ) ?? normalized.resultTemplateId,
    labOrderId:
      firstNonEmptyText(
        one?.labOrderId,
        one?.orderId,
        one?.labOrder?.id,
        one?.labOrder?._id,
        res?.labOrderId,
        res?.orderId,
        res?.data?.labOrderId,
        res?.data?.orderId,
      ) ?? normalized.labOrderId,
    appointmentTestId:
      firstNonEmptyText(
        one?.appointmentTestId,
        one?.appointmentTest?.id,
        one?.appointmentTest?._id,
        res?.appointmentTestId,
        res?.data?.appointmentTestId,
      ) ?? normalized.appointmentTestId,
    reportTemplate: reportTemplate ?? normalized.reportTemplate ?? null,
    resultTemplate:
      one?.resultTemplate ?? res?.resultTemplate ?? normalized.resultTemplate ?? null,
  };
};

const pickDepartmentArray = (res: DepartmentListResponse): LabDepartmentDto[] => {
  const arr = Array.isArray(res)
    ? res
    : Array.isArray((res as any)?.data)
      ? (res as any).data
      : Array.isArray((res as any)?.result)
        ? (res as any).result
        : Array.isArray((res as any)?.departments)
          ? (res as any).departments
          : Array.isArray((res as any)?.data?.data)
            ? (res as any).data.data
            : [];

  return arr as LabDepartmentDto[];
};

function normalizeLabTest(test: LabTestDto): LabTestDto {
  const testName = test.testName ?? test.name ?? "";
  const departmentName = test.departmentName ?? test.category ?? "";

  return {
    ...test,
    name: testName,
    testName,
    testCode: test.testCode ?? null,
    category: departmentName,
    departmentName,
    sampleType: test.sampleType ?? "",
    price: Number(test.price ?? 0),
  };
}

/* ----------------------------- API Slice ----------------------------- */

export const labApi = createApi({
  reducerPath: "labApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Labs", "LabAssistants", "LabTests", "LabDepartments"],
  endpoints: (builder) => ({
    getLabDepartments: builder.query<LabDepartmentDto[], void>({
      query: () => "/lab/departments",
      transformResponse: (res: DepartmentListResponse) =>
        pickDepartmentArray(res),
      providesTags: [{ type: "LabDepartments", id: "ALL" }],
    }),



    getMasterTestsByDepartment: builder.query<LabTestDto[], string>({
      query: (departmentId) => `/lab/departments/${departmentId}/tests`,
      transformResponse: (res: LabTestsListResponse) => pickLabTestsArray(res),
      providesTags: (_r, _e, departmentId) => [
        { type: "LabTests", id: `MASTER-${departmentId}` },
      ],
    }),

    // ✅ GET /lab/clinic/:clinicId
    getLabsByClinicId: builder.query<LabDto[], string>({
      query: (clinicId) => `/lab/clinic/${clinicId}`,
      transformResponse: (res: LabsListResponse) =>
        pickLabArray(res).map(normalizeLabDto),
      providesTags: (_r, _e, clinicId) => [
        { type: "Labs", id: `CLINIC-${clinicId}` },
      ],
    }),

    // ✅ GET /lab/:labId
    getLabById: builder.query<LabDto, string>({
      query: (labId) => `/lab/${labId}`,
      transformResponse: (res: LabOneResponse) =>
        normalizeLabDto(pickLabOne(res)),
      providesTags: (_r, _e, labId) => [{ type: "Labs", id: `LAB-${labId}` }],
    }),

    getLabDepartmentsByLabId: builder.query<LabDepartmentDto[], string>({
      query: (labId) => `/lab/${labId}/departments`,
      transformResponse: (res: DepartmentListResponse) =>
        pickDepartmentArray(res),
      providesTags: (_r, _e, labId) => [
        { type: "LabDepartments", id: `LAB-${labId}` },
      ],
    }),

    updateLabDepartments: builder.mutation<
      LabDepartmentDto[],
      UpdateLabDepartmentsArgs
    >({
      query: ({ labId, departmentIds, departmentTestIds }) => {
        const cleanDepartmentIds = departmentIds
          .map((departmentId) => departmentId.trim())
          .filter(Boolean);

        const cleanDepartmentTestIds =
          departmentTestIds &&
          Object.fromEntries(
            Object.entries(departmentTestIds).map(([departmentId, testIds]) => [
              departmentId.trim(),
              testIds.map((testId) => testId.trim()).filter(Boolean),
            ]),
          );

        return {
          url: `/lab/${labId}/departments`,
          method: "PATCH",
          body: {
            departmentIds: cleanDepartmentIds,
            ...(cleanDepartmentTestIds
              ? { departmentTestIds: cleanDepartmentTestIds }
              : {}),
          },
        };
      },
      transformResponse: (res: DepartmentListResponse) =>
        pickDepartmentArray(res),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Labs", id: `LAB-${arg.labId}` },
        { type: "LabDepartments", id: `LAB-${arg.labId}` },
        { type: "LabTests", id: `LAB-${arg.labId}` },
      ],
    }),

    // ✅ GET /lab/:labId/users
    getLabUsersByLabId: builder.query<LabAssistantDto[], string>({
      query: (labId) => `/lab/${labId}/users`,
      transformResponse: (res: AssistantsListResponse) =>
        pickAssistantArray(res),
      providesTags: (_r, _e, labId) => [
        { type: "LabAssistants", id: `LAB-${labId}` },
      ],
    }),

    // ✅ POST /lab
    createLab: builder.mutation<LabDto, CreateLabDto>({
      query: ({ clinicId: _clinicId, ...body }) => {
        const gstNumber = body.gstNumber?.trim();
        const logo = body.logo?.trim();
        const reportFooter = body.reportFooter?.trim();
        const departmentIds = body.departmentIds
          ?.map((departmentId) => departmentId.trim())
          .filter(Boolean);

        return {
          url: "/lab",
          method: "POST",
          body: {
            labName: body.labName.trim(),
            phone: body.phone.trim(),
            email: body.email.trim().toLowerCase(),
            address: body.address.trim(),
            ...(gstNumber ? { gstNumber } : {}),
            ...(logo ? { logo } : {}),
            ...(reportFooter ? { reportFooter } : {}),
            ...(departmentIds?.length ? { departmentIds } : {}),
          },
        };
      },
      transformResponse: (res: LabOneResponse) =>
        normalizeLabDto(pickLabOne(res)),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Labs", id: `CLINIC-${arg.clinicId}` },
      ],
    }),

    // ✅ PUT /lab/:id
    updateLab: builder.mutation<LabDto, { id: string; body: UpdateLabDto }>({
      query: ({ id, body }) => ({
        url: `/lab/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (res: LabOneResponse) => normalizeLabDto(pickLabOne(res)),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Labs", id: `LAB-${arg.id}` },
        "Labs",
      ],
    }),

    /* ----------------------------- ✅ Lab Tests ----------------------------- */

    getLabTestsByLabId: builder.query<LabTestDto[], string>({
      query: (labId) => `/lab/${labId}/tests`,
      transformResponse: (res: LabTestsListResponse) => pickLabTestsArray(res),
      providesTags: (_r, _e, labId) => [
        { type: "LabTests", id: `LAB-${labId}` },
      ],
    }),

    // ✅ GET /lab/my-tests
    getLabTests: builder.query<
      { data: LabTestDto[]; pagination: PaginationMeta; stats: LabTestsStats },
      GetLabTestsArgs | void
    >({
      query: (params) => {
        const queryParams: Record<string, any> = {};
        const addQueryParam = (key: string, value: unknown) => {
          if (value == null) return;
          const normalizedValue =
            typeof value === "string" ? value.trim() : value;

          if (normalizedValue === "" || normalizedValue === "all") return;
          queryParams[key] = normalizedValue;
        };

        if (params) {
          addQueryParam("page", params.page);
          addQueryParam("limit", params.limit);
          addQueryParam("search", params.search);
          addQueryParam("status", params.status);
          addQueryParam("departmentId", params.departmentId);
          addQueryParam("sampleType", params.sampleType);
          addQueryParam("source", params.source);
          addQueryParam("sortBy", params.sortBy);
          addQueryParam("sortOrder", params.sortOrder);
        }
        return {
          url: `/lab/my-tests`,
          params: queryParams,
        };
      },
      transformResponse: (res: any) => {
        const data = Array.isArray(res?.data)
          ? res.data.map(normalizeLabTest)
          : Array.isArray(res?.result)
            ? res.result.map(normalizeLabTest)
            : [];
        const pagination: PaginationMeta = res?.pagination ?? {
          totalRecords: data.length,
          totalPages: 1,
          currentPage: 1,
          pageSize: data.length || 10,
          hasNextPage: false,
          hasPreviousPage: false,
        };
        const stats: LabTestsStats = res?.stats ?? res?.data?.stats ?? {};
        return { data, pagination, stats };
      },
      providesTags: () => [{ type: "LabTests", id: "MY" }],
    }),

    // ✅ POST /lab/my-tests
    createLabTest: builder.mutation<LabTestDto, CreateLabTestDto>({
      query: (body) => ({
        url: `/lab/my-tests`,
        method: "POST",
        body: {
          ...body,
          status: body.status ?? "active",
        },
      }),
      transformResponse: (res: any) => pickLabTestOne(res),
      invalidatesTags: [{ type: "LabTests", id: "MY" }],
    }),

    // ✅ PATCH /lab/tests/:id
    updateLabTest: builder.mutation<
      LabTestDto,
      { id: string; body: UpdateLabTestDto }
    >({
      query: ({ id, body }) => ({
        url: `/lab/tests/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: any) => pickLabTestOne(res),
      invalidatesTags: [{ type: "LabTests", id: "MY" }, "LabTests"],
    }),

    // ✅ DELETE /lab/tests/:id
    deleteLabTest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/lab/tests/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "LabTests", id: "MY" }, "LabTests"],
    }),

    // ✅ POST /lab/:labId/catalog/sync — Re-sync lab catalog with master data
    syncLabCatalog: builder.mutation<LabTestDto[], string>({
      query: (labId) => ({
        url: `/lab/${labId}/catalog/sync`,
        method: "POST",
      }),
      transformResponse: (res: LabTestsListResponse) => pickLabTestsArray(res),
      invalidatesTags: (_r, _e, labId) => [
        { type: "LabTests", id: `LAB-${labId}` },
      ],
    }),
  }),
});

export const {
  useGetLabDepartmentsQuery,
  useGetMasterTestsByDepartmentQuery,
  useGetLabsByClinicIdQuery,
  useGetLabByIdQuery,
  useGetLabDepartmentsByLabIdQuery,
  useUpdateLabDepartmentsMutation,
  useGetLabUsersByLabIdQuery,
  useCreateLabMutation,
  useUpdateLabMutation,

  // ✅ Lab Tests hooks
  useGetLabTestsByLabIdQuery,
  useGetLabTestsQuery,
  useCreateLabTestMutation,
  useUpdateLabTestMutation,
  useDeleteLabTestMutation,
  useSyncLabCatalogMutation,
} = labApi;
