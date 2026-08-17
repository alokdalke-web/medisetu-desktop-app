import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type RequestDoctor = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string | null;
  speciality?: string | null;
  registrationNumber?: string | null;
  profileImage?: string | null;
  isArchive?: boolean | null;
  userStatus?: string | null;
  userType?: string | null;
  gender?: string | null;
  qualification?: string | null;
  yearsOfExperience?: number | null;
  licenseNumber?: string | null;
};

export type ClinicWithDoctors = {
  id?: string;
  _id?: string;
  clinicName?: string;
  name?: string;
  tagline?: string | null;
  Tagline?: string | null;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
  City?: string | null;
  State?: string | null;
  Country?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: number | string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  clinicLogo?: string | null;
  adminProfile?: RequestDoctor | null;
  profile?: RequestDoctor | null;
  doctors?: RequestDoctor[];
  doctorProfiles?: RequestDoctor[];
  users?: RequestDoctor[];
};

export type RequestDoctorStatus =
  | "Pending"
  | "Active"
  | "Reviewing"
  | "Rejected"
  | "Archive";

export type GetClinicsWithDoctorsParams = {
  startDate?: string;
  endDate?: string;
};

export type ProfileUpdateDoctorProfile = {
  name?: string | null;
  mobile?: string | null;
  speciality?: string | null;
  qualification?: string | null;
  alternateMobile?: string | null;
  registrationNumber?: string | null;
};

export type ProfileUpdateQualification = {
  id?: string;
  specialization?: string | null;
  yearOfCompletion?: number | string | null;
  boardOrUniversity?: string | null;
  qualificationType?: string | null;
  qualificationTitle?: string | null;
};

export type ProfileUpdateRequestItem = {
  id?: string;
  _id?: string;
  requestId?: string;
  userId?: string;
  doctorId?: string;
  clinicId?: string;
  status?: string | null;
  rejectionReason?: string | null;
  requestStatus?: string | null;
  approvalStatus?: string | null;
  userStatus?: string | null;
  reason?: string | null;
  requestReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  requestedAt?: string | null;
  updatedAt?: string | null;
  user?: RequestDoctor | null;
  doctor?: RequestDoctor | null;
  doctorProfile?: RequestDoctor | null;
  adminProfile?: RequestDoctor | null;
  profile?: RequestDoctor | null;
  clinic?: ClinicWithDoctors | null;
  doctorName?: string | null;
  doctorEmail?: string | null;
  doctorMobile?: string | null;
  doctorSpeciality?: string | null;
  doctorRegistrationNumber?: string | null;
  clinicName?: string | null;
  clinicEmail?: string | null;
  requestedData?: {
    doctorProfile?: ProfileUpdateDoctorProfile | null;
    qualifications?: ProfileUpdateQualification[] | null;
    reason?: string | null;
    [key: string]: unknown;
  } | null;
  changes?: unknown;
  changedFields?: unknown;
  requestedChanges?: unknown;
  updateData?: unknown;
  newData?: unknown;
  payload?: unknown;
  [key: string]: unknown;
};

export type ProfileUpdateRequestStatus = "approved" | "rejected";

export type ProfileUpdateRequestListStatus =
  | "pending"
  | "approved"
  | "rejected";

export type GetProfileUpdateRequestsParams = {
  page?: number;
  limit?: number;
  status?: ProfileUpdateRequestListStatus;
  doctorId?: string;
};

export type GetMyProfileUpdateRequestsParams = Omit<
  GetProfileUpdateRequestsParams,
  "doctorId"
>;

export type ProfileUpdateRequestsPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type ProfileUpdateRequestsStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type ProfileUpdateRequestsResult = {
  requests: ProfileUpdateRequestItem[];
  pagination: ProfileUpdateRequestsPagination;
  stats?: ProfileUpdateRequestsStats;
};

type ClinicsWithDoctorsResponse =
  | ClinicWithDoctors[]
  | {
      success?: boolean;
      data?:
        | ClinicWithDoctors[]
        | { data?: ClinicWithDoctors[]; clinics?: ClinicWithDoctors[] };
      filters?: { startDate?: string | null; endDate?: string | null };
      total?: number;
    }
  | {
      result?:
        | ClinicWithDoctors[]
        | { data?: ClinicWithDoctors[]; clinics?: ClinicWithDoctors[] };
    }
  | { clinics?: ClinicWithDoctors[] };

type ProfileUpdateRequestsResponse =
  | ProfileUpdateRequestItem[]
  | {
      success?: boolean;
      data?: unknown;
      result?: unknown;
      pagination?: unknown;
      metadata?: unknown;
      meta?: unknown;
      stats?: unknown;
      summary?: unknown;
      counts?: unknown;
      total?: number;
      totalRecords?: number;
      totalCount?: number;
      totalPages?: number;
      page?: number;
      pageNumber?: number;
      currentPage?: number;
      pageSize?: number;
      limit?: number;
      requests?: ProfileUpdateRequestItem[];
      profileUpdateRequests?: ProfileUpdateRequestItem[];
    };

const pickClinicArray = (res: ClinicsWithDoctorsResponse): ClinicWithDoctors[] => {
  const source = res as any;
  const candidates = [
    source,
    source?.data,
    source?.result,
    source?.clinics,
    source?.data?.data,
    source?.data?.clinics,
    source?.result?.data,
    source?.result?.clinics,
  ];

  return (
    candidates.find((candidate) => Array.isArray(candidate)) ??
    []
  ) as ClinicWithDoctors[];
};

const pickProfileUpdateRequestArray = (
  res: ProfileUpdateRequestsResponse,
): ProfileUpdateRequestItem[] => {
  const source = res as any;
  const candidates = [
    source,
    source?.data,
    source?.result,
    source?.requests,
    source?.profileUpdateRequests,
    source?.data?.data,
    source?.data?.requests,
    source?.data?.profileUpdateRequests,
    source?.result?.data,
    source?.result?.requests,
    source?.result?.profileUpdateRequests,
  ];

  return (
    candidates.find((candidate) => Array.isArray(candidate)) ?? []
  ) as ProfileUpdateRequestItem[];
};

const getRecordValue = (source: unknown, key: string) =>
  source && typeof source === "object"
    ? (source as Record<string, unknown>)[key]
    : undefined;

const toNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const pickFirstObject = (candidates: unknown[]) =>
  candidates.find(
    (candidate) =>
      candidate !== null &&
      typeof candidate === "object" &&
      !Array.isArray(candidate),
  ) as Record<string, unknown> | undefined;

const pickProfileUpdatePagination = (
  res: ProfileUpdateRequestsResponse,
  requests: ProfileUpdateRequestItem[],
  params?: GetProfileUpdateRequestsParams | GetMyProfileUpdateRequestsParams,
): ProfileUpdateRequestsPagination => {
  const source = res as Record<string, unknown>;
  const data = getRecordValue(source, "data");
  const result = getRecordValue(source, "result");
  const pagination = pickFirstObject([
    getRecordValue(source, "pagination"),
    getRecordValue(source, "metadata"),
    getRecordValue(source, "meta"),
    getRecordValue(data, "pagination"),
    getRecordValue(data, "metadata"),
    getRecordValue(data, "meta"),
    getRecordValue(result, "pagination"),
    getRecordValue(result, "metadata"),
    getRecordValue(result, "meta"),
    data,
    result,
    source,
  ]);

  const pageSize = Math.max(
    1,
    toNumber(
      getRecordValue(pagination, "pageSize") ??
        getRecordValue(pagination, "limit") ??
        params?.limit,
      requests.length || 10,
    ),
  );
  const totalRecords = Math.max(
    0,
    toNumber(
      getRecordValue(pagination, "totalRecords") ??
        getRecordValue(pagination, "total") ??
        getRecordValue(pagination, "totalCount") ??
        getRecordValue(pagination, "count"),
      requests.length,
    ),
  );
  const totalPages = Math.max(
    1,
    toNumber(
      getRecordValue(pagination, "totalPages") ??
        getRecordValue(pagination, "pages"),
      Math.ceil(totalRecords / pageSize) || 1,
    ),
  );
  const currentPageFromPagination = toNumber(
    getRecordValue(pagination, "currentPage") ??
      getRecordValue(pagination, "pageNumber") ??
      getRecordValue(pagination, "page"),
    NaN,
  );

  return {
    totalRecords,
    totalPages,
    currentPage: Math.max(
      1,
      Number.isFinite(currentPageFromPagination)
        ? (currentPageFromPagination as number)
        : toNumber(params?.page, 1),
    ),
    pageSize,
    hasNextPage: getRecordValue(pagination, "hasNextPage") as
      | boolean
      | undefined,
    hasPreviousPage: getRecordValue(pagination, "hasPreviousPage") as
      | boolean
      | undefined,
  };
};

const pickProfileUpdateStats = (
  res: ProfileUpdateRequestsResponse,
): ProfileUpdateRequestsStats | undefined => {
  const source = res as Record<string, unknown>;
  const data = getRecordValue(source, "data");
  const result = getRecordValue(source, "result");
  const stats = pickFirstObject([
    getRecordValue(source, "stats"),
    getRecordValue(source, "summary"),
    getRecordValue(source, "counts"),
    getRecordValue(data, "stats"),
    getRecordValue(data, "summary"),
    getRecordValue(data, "counts"),
    getRecordValue(result, "stats"),
    getRecordValue(result, "summary"),
    getRecordValue(result, "counts"),
  ]);

  if (!stats) return undefined;

  return {
    total: toNumber(
      getRecordValue(stats, "total") ??
        getRecordValue(stats, "totalRequests") ??
        getRecordValue(stats, "totalProfileRequests"),
      0,
    ),
    pending: toNumber(
      getRecordValue(stats, "pending") ??
        getRecordValue(stats, "pendingRequests") ??
        getRecordValue(stats, "pendingProfileRequests"),
      0,
    ),
    approved: toNumber(
      getRecordValue(stats, "approved") ??
        getRecordValue(stats, "approvedRequests") ??
        getRecordValue(stats, "accepted") ??
        getRecordValue(stats, "acceptedRequests"),
      0,
    ),
    rejected: toNumber(
      getRecordValue(stats, "rejected") ??
        getRecordValue(stats, "rejectedRequests") ??
        getRecordValue(stats, "rejectedProfileRequests"),
      0,
    ),
  };
};

const normalizeProfileUpdateRequestsResponse = (
  res: ProfileUpdateRequestsResponse,
  params?: GetProfileUpdateRequestsParams | GetMyProfileUpdateRequestsParams,
): ProfileUpdateRequestsResult => {
  const requests = pickProfileUpdateRequestArray(res);

  return {
    requests,
    pagination: pickProfileUpdatePagination(res, requests, params),
    stats: pickProfileUpdateStats(res),
  };
};

const cleanQueryParams = <T extends Record<string, unknown>>(params?: T) => {
  if (!params) return undefined;

  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  return Object.keys(cleaned).length ? cleaned : undefined;
};

export const requestApi = createApi({
  reducerPath: "requestApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Requests"],
  endpoints: (builder) => ({
    getClinicsWithDoctors: builder.query<
      ClinicWithDoctors[],
      GetClinicsWithDoctorsParams | void
    >({
      query: (params) => ({
        url: "clinic/clinics-with-doctors",
        params: params || undefined,
      }),
      transformResponse: (res: ClinicsWithDoctorsResponse) =>
        pickClinicArray(res),
      providesTags: [{ type: "Requests", id: "CLINICS_WITH_DOCTORS" }],
    }),
    getProfileUpdateRequests: builder.query<
      ProfileUpdateRequestsResult,
      GetProfileUpdateRequestsParams | void
    >({
      query: (params) => ({
        url: "/doctor/profile-update-requests",
        params: cleanQueryParams(params || undefined),
      }),
      transformResponse: (
        res: ProfileUpdateRequestsResponse,
        _meta,
        arg,
      ) => normalizeProfileUpdateRequestsResponse(res, arg || undefined),
      providesTags: [{ type: "Requests", id: "PROFILE_UPDATE_REQUESTS" }],
    }),
    getMyProfileUpdateRequests: builder.query<
      ProfileUpdateRequestsResult,
      GetMyProfileUpdateRequestsParams | void
    >({
      query: (params) => ({
        url: "/doctor/my-profile-update-requests",
        method: "GET",
        params: cleanQueryParams(params || undefined),
      }),
      transformResponse: (
        res: ProfileUpdateRequestsResponse,
        _meta,
        arg,
      ) => normalizeProfileUpdateRequestsResponse(res, arg || undefined),
      providesTags: [{ type: "Requests", id: "MY_PROFILE_UPDATE_REQUESTS" }],
    }),
    updateProfileUpdateRequestStatus: builder.mutation<
      any,
      {
        requestId: string;
        status: ProfileUpdateRequestStatus;
        rejectionReason?: string;
      }
    >({
      query: ({ requestId, rejectionReason, status }) => {
        const body =
          status === "rejected"
            ? { status, rejectionReason }
            : { status };

        return {
          url: `/doctor/update-profile-request-status/${requestId}`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: [
        { type: "Requests", id: "PROFILE_UPDATE_REQUESTS" },
        { type: "Requests", id: "MY_PROFILE_UPDATE_REQUESTS" },
      ],
    }),
    updateRequestDoctorStatus: builder.mutation<
      any,
      { doctorId: string; userStatus: RequestDoctorStatus }
    >({
      query: ({ doctorId, userStatus }) => ({
        url: `/users/status-change/${doctorId}`,
        method: "PATCH",
        body: { userStatus },
      }),
      invalidatesTags: [{ type: "Requests", id: "CLINICS_WITH_DOCTORS" }],
    }),
    archiveUser: builder.mutation<any, { userId: string }>({
      query: ({ userId }) => ({
        url: `/users/archive/${userId}`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "Requests", id: "CLINICS_WITH_DOCTORS" }],
    }),
    bulkUpdateProfileRequestStatus: builder.mutation<
      any,
      {
        requestIds: string[];
        status: ProfileUpdateRequestStatus;
        rejectionReason?: string;
      }
    >({
      query: ({ requestIds, status, rejectionReason }) => {
        const body =
          status === "rejected"
            ? { requestIds, status, rejectionReason }
            : { requestIds, status };

        return {
          url: `/doctor/bulk-update-profile-request-status`,
          method: "PUT",
          body,
        };
      },
      invalidatesTags: [
        { type: "Requests", id: "PROFILE_UPDATE_REQUESTS" },
        { type: "Requests", id: "MY_PROFILE_UPDATE_REQUESTS" },
      ],
    }),
    bulkUpdateRequestDoctorStatus: builder.mutation<
      any,
      { doctorIds: string[]; userStatus: RequestDoctorStatus }
    >({
      query: ({ doctorIds, userStatus }) => ({
        url: `/users/bulk-status-change`,
        method: "PATCH",
        body: { doctorIds, userStatus },
      }),
      invalidatesTags: [{ type: "Requests", id: "CLINICS_WITH_DOCTORS" }],
    }),
    bulkAssignRequests: builder.mutation<
      any,
      { requestIds: string[]; assignedTo: string; notes?: string }
    >({
      query: ({ requestIds, assignedTo, notes }) => ({
        url: `/doctor/bulk-assign-requests`,
        method: "PUT",
        body: { requestIds, assignedTo, notes },
      }),
      invalidatesTags: [
        { type: "Requests", id: "PROFILE_UPDATE_REQUESTS" },
        { type: "Requests", id: "MY_PROFILE_UPDATE_REQUESTS" },
      ],
    }),
  }),
});

export const {
  useArchiveUserMutation,
  useGetClinicsWithDoctorsQuery,
  useGetMyProfileUpdateRequestsQuery,
  useGetProfileUpdateRequestsQuery,
  useUpdateProfileUpdateRequestStatusMutation,
  useUpdateRequestDoctorStatusMutation,
  useBulkUpdateProfileRequestStatusMutation,
  useBulkUpdateRequestDoctorStatusMutation,
  useBulkAssignRequestsMutation,
} = requestApi;
