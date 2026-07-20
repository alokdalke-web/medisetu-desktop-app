import { createApi } from "@reduxjs/toolkit/query/react";
import type { CreateTestDto, TestDto } from "../../schemas/test";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

/* ----------------------------- Types ----------------------------- */
type AssignAppointmentTestPayload = {
  patientId: string;
  appointmentId: string;
  testIds: string[];
  reportPdf?: File | null;
  doctorId: string;
};

type UpdateReportPayload = {
  id: string;
  reportPdf: File;
  paymentStatus?: string;
};

type UpdateReportStatusPayload = {
  id: string;
  reportStatus:
    | "Initiated"
    | "Pending"
    | "InProgress"
    | "Completed"
    | "Rejected";
};

type UpdatePaymentStatusPayload = {
  id: string;
  paymentStatus: "paid" | "pending";
};

export type ApiPagination = {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type GetTestsArgs = {
  clinicId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

export type GetTestsResponse = {
  success: boolean;
  result: TestDto[];
  pagination?: ApiPagination;
};

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text && !["null", "undefined"].includes(text.toLowerCase())) {
      return text;
    }
  }

  return null;
};

const pickAppointmentTestArray = (response: any): any[] =>
  Array.isArray(response?.result)
    ? response.result
    : Array.isArray(response)
      ? response
      : [];

const normalizeAppointmentTestItem = (item: any) => {
  const appointmentTest = item?.appointmentTest ?? item?.appointment_test ?? {};
  const merged = { ...appointmentTest, ...item };
  const rawTest = merged?.test ?? appointmentTest?.test ?? item?.patientsTest ?? {};
  const test = rawTest && typeof rawTest === "object" ? rawTest : {};
  const patient =
    merged?.patient ??
    appointmentTest?.patient ??
    merged?.patientDetails ??
    appointmentTest?.patientDetails ??
    {};
  const lab =
    merged?.lab ??
    appointmentTest?.lab ??
    merged?.laboratory ??
    appointmentTest?.laboratory ??
    {};

  return {
    ...merged,
    appointmentTestId:
      firstText(
        merged?.appointmentTestId,
        appointmentTest?.appointmentTestId,
        appointmentTest?.id,
        appointmentTest?._id,
        merged?.Id,
        merged?.id,
        merged?._id,
      ) ?? merged?.appointmentTestId,
    Id:
      firstText(merged?.Id, merged?.id, merged?._id, appointmentTest?.id) ??
      merged?.Id,
    id:
      firstText(merged?.id, merged?.Id, merged?._id, appointmentTest?.id) ??
      merged?.id,
    test:
      test && Object.keys(test).length
        ? test
        : {
            id: firstText(merged?.testId, appointmentTest?.testId),
            name: firstText(merged?.testName, merged?.name),
            category: firstText(merged?.category, merged?.testCategory),
          },
    patientName:
      firstText(
        merged?.patientName,
        appointmentTest?.patientName,
        patient?.name,
        patient?.fullName,
        patient?.displayName,
      ) ?? merged?.patientName,
    patientAge:
      firstText(
        merged?.patientAge,
        merged?.age,
        appointmentTest?.patientAge,
        patient?.age,
      ) ?? merged?.patientAge,
    patientGender:
      firstText(
        merged?.patientGender,
        merged?.gender,
        appointmentTest?.patientGender,
        patient?.gender,
      ) ?? merged?.patientGender,
    patientEmail:
      firstText(
        merged?.patientEmail,
        merged?.email,
        appointmentTest?.patientEmail,
        patient?.email,
      ) ?? merged?.patientEmail,
    patientMobile:
      firstText(
        merged?.patientMobile,
        merged?.patientPhone,
        merged?.mobile,
        merged?.phone,
        appointmentTest?.patientMobile,
        patient?.mobile,
        patient?.phone,
        patient?.contactNumber,
      ) ?? merged?.patientMobile,
    patientDob:
      firstText(
        merged?.patientDob,
        merged?.dob,
        appointmentTest?.patientDob,
        patient?.dob,
        patient?.dateOfBirth,
      ) ?? merged?.patientDob,
    labName:
      firstText(
        merged?.labName,
        merged?.laboratoryName,
        lab?.name,
        lab?.labName,
      ) ?? merged?.labName,
    labAddress:
      firstText(
        merged?.labAddress,
        merged?.laboratoryAddress,
        lab?.address,
        lab?.labAddress,
      ) ?? merged?.labAddress,
    labContactNumber:
      firstText(
        merged?.labContactNumber,
        merged?.laboratoryContactNumber,
        merged?.contactNumber,
        appointmentTest?.labContactNumber,
        appointmentTest?.laboratoryContactNumber,
        lab?.contactNumber,
        lab?.mobile,
        lab?.phone,
      ) ?? merged?.labContactNumber,
    reportPdf:
      firstText(
        merged?.reportPdf,
        merged?.report_pdf,
        merged?.pdfUrl,
        merged?.downloadUrl,
        merged?.report?.reportPdf,
        merged?.report?.pdfUrl,
        merged?.report?.downloadUrl,
        appointmentTest?.reportPdf,
        appointmentTest?.report_pdf,
      ) ?? null,
    workflowStatus:
      firstText(
        merged?.workflowStatus,
        merged?.workflow_status,
        appointmentTest?.workflowStatus,
        appointmentTest?.status,
      ) ?? merged?.workflowStatus,
    reportStatus:
      firstText(
        merged?.reportStatus,
        merged?.report_status,
        merged?.resultStatus,
        appointmentTest?.reportStatus,
        appointmentTest?.resultStatus,
      ) ?? merged?.reportStatus,
    resultStatus:
      firstText(
        merged?.resultStatus,
        merged?.labResultStatus,
        appointmentTest?.resultStatus,
        appointmentTest?.labResultStatus,
      ) ?? merged?.resultStatus,
    labResultStatus:
      firstText(
        merged?.labResultStatus,
        appointmentTest?.labResultStatus,
        merged?.resultStatus,
      ) ?? merged?.labResultStatus,
    sampleStatus:
      firstText(
        merged?.sampleStatus,
        merged?.sample_status,
        appointmentTest?.sampleStatus,
        appointmentTest?.sample_status,
      ) ?? merged?.sampleStatus,
  };
};

const normalizeAppointmentTestArray = (response: any): any[] =>
  pickAppointmentTestArray(response).map(normalizeAppointmentTestItem);

export const testApi = createApi({
  reducerPath: "testApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Tests", "AppointmentTests", "PatientTestHistory"],
  endpoints: (builder) => ({
    getAllTestsByClinicId: builder.query<GetTestsResponse, GetTestsArgs>({
      query: ({ clinicId, page = 1, pageSize = 10, search, status }) => {
        const params: Record<string, string | number> = {
          clinicId,
          page,
          pageSize,
        };

        if (search && search.trim()) params.search = search.trim();
        if (status) params.status = status;

        return {
          url: "/test/patients-test",
          params,
        };
      },
      transformResponse: (response: any): GetTestsResponse => {
        if (!response) {
          return { success: false, result: [], pagination: undefined };
        }

        const result: TestDto[] = Array.isArray(response?.result)
          ? response.result
          : Array.isArray(response)
            ? response
            : [];

        const pagination: ApiPagination | undefined =
          response?.pagination && typeof response.pagination === "object"
            ? response.pagination
            : undefined;

        return {
          success: Boolean(response?.success ?? true),
          result,
          pagination,
        };
      },
      providesTags: ["Tests"],
    }),

    createTest: builder.mutation<any, CreateTestDto>({
      query: (body) => ({
        url: "/test/patients-test",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tests"],
    }),

    updateTest: builder.mutation<
      any,
      {
        id: string;
        name: string;
        category: string;
        price: number;
        status: "active" | "deactive";
        clientId: string;
      }
    >({
      query: ({ id, ...rest }) => ({
        url: `/test/patients-test/${id}`,
        method: "PATCH",
        body: { id, ...rest },
      }),
      invalidatesTags: ["Tests"],
    }),

    deleteTest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/test/patients-test/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Tests"],
    }),

    assignAppointmentTest: builder.mutation<any, AssignAppointmentTestPayload>({
      query: ({ patientId, appointmentId, testIds, reportPdf, doctorId }) => {
        const form = new FormData();
        form.append("patientId", patientId);
        form.append("appointmentId", appointmentId);
        form.append("doctorId", doctorId);

        testIds.forEach((id) => {
          form.append("testIds[]", id);
        });

        if (reportPdf) form.append("reportPdf", reportPdf);

        return {
          url: "/test/appointment-test/assign",
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: ["AppointmentTests", "PatientTestHistory"],
    }),

    getAppointmentTestsByAppointmentId: builder.query<any[], string>({
      query: (appointmentId) =>
        `/test/appointment-test/appointment/${appointmentId}`,
      transformResponse: normalizeAppointmentTestArray,
      providesTags: ["AppointmentTests"],
    }),

    getPatientTestHistoryByPatientId: builder.query<any[], string>({
      query: (patientId) => `/test/appointment-test/patient/${patientId}`,
      transformResponse: normalizeAppointmentTestArray,
      providesTags: ["PatientTestHistory"],
    }),

    updateAppointmentTestReport: builder.mutation<any, UpdateReportPayload>({
      query: ({ id, reportPdf, paymentStatus }) => {
        const fd = new FormData();
        fd.append("reportPdf", reportPdf);
        fd.append("paymentStatus", paymentStatus ?? "paid");

        return {
          url: `/test/appointment-test/report/${id}`,
          method: "PUT",
          body: fd,
        };
      },
      invalidatesTags: ["AppointmentTests", "PatientTestHistory"],
    }),

    updateAppointmentTestStatus: builder.mutation<
      any,
      UpdateReportStatusPayload
    >({
      query: ({ id, reportStatus }) => ({
        url: `/test/appointment-test/report/${id}`,
        method: "PUT",
        body: { reportStatus },
      }),
      invalidatesTags: ["AppointmentTests", "PatientTestHistory"],
    }),

    updateAppointmentTestPaymentStatus: builder.mutation<
      any,
      UpdatePaymentStatusPayload
    >({
      query: ({ id, paymentStatus }) => ({
        url: `/test/appointment-test/report/${id}`,
        method: "PUT",
        body: { paymentStatus },
      }),
      invalidatesTags: ["AppointmentTests", "PatientTestHistory"],
    }),
  }),
});

export const {
  useGetAllTestsByClinicIdQuery,
  useLazyGetAllTestsByClinicIdQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
  useAssignAppointmentTestMutation,
  useGetAppointmentTestsByAppointmentIdQuery,
  useGetPatientTestHistoryByPatientIdQuery,
  useUpdateAppointmentTestReportMutation,
  useUpdateAppointmentTestStatusMutation,
  useUpdateAppointmentTestPaymentStatusMutation,
} = testApi;
