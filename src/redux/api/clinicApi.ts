import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type {
  CreateClinicRequestDto,
  UpdateClinicRequestDto,
} from "../../schemas/clinic";
import type { DoctorProfileDto } from "../../schemas/doctor";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { getAuthToken } from "../../utils/auth";
import type { ClinicProfileOverview } from "../../types/clinicProfileOverview";
import type {
  ClinicRouteStatus,
  BankDetails,
} from "../../types/clinicOnlineBooking";
import type {
  OnboardRouteRequestDto,
  OnboardRouteResponse,
  OnboardingStatusResponse,
  OnboardingDocumentType,
  UploadOnboardingDocumentResponse,
  UpdateBankDetailsRequestDto,
  UpdateBankDetailsResponse,
} from "../../types/razorpayOnboarding";

import { getBackendUrlAsync } from "../../utils/config";

const clinicProfileOverviewBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const v1Url = await getBackendUrlAsync();
  const baseUrl = v1Url.replace(/\/v1\/?$/, "/v2");
  
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = getAuthToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  });
  
  return rawBaseQuery(args, api, extraOptions);
};

// ─── Statistics Interface ───
export interface ClinicStats {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
}

// ─── Pagination Interface ───
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Clinic List Item Interface ───
export interface ClinicListItem {
  id: string;
  clinicName: string;
  clinicPhone: string;
  Tagline?: string;
  clinicAddress?: string;
  State: string;
  City: string;
  clinicLogo?: string | null;
  createdAt?: string;
  status: string;
  planName?: string;
}

// ─── Get Available Clinics Response ───
export interface GetAvailableClinicsResponse {
  success: boolean;
  message?: string;
  data: {
    stats: ClinicStats;
    data: ClinicListItem[];
    pagination: PaginationInfo;
  };
}

interface ClinicDetailResponse {
  success: boolean;
  data: {
    clinic: {
      id: string;
      userId: string;
      clinicName: string;
      clinicPhone: string;
      Tagline: string;
      clinicAddress: string;
      Country: string;
      State: string;
      City: string;
      ZipCode: number;
      clinicLogo: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
    profile: {
      id: string;
      userId: string;
      name: string;
      email: string;
      mobile: string | null;
      alternateMobile?: string | null;
      profileImage: string | null;
      userType: string;
      userStatus: string;
      registrationNumber?: string | null;
    };
    subscription: {
      active: boolean;
      expiresAt: string;
      planName: string;
      price: number;
      slug: string;
    };
    counts: {
      totalUsers: number;
      totalPharmacies: number;
      totalLabs: number;
    };
    users: Array<{
      id: string;
      name: string;
      email: string;
      mobile?: string | null;
      profileImage?: string | null;
      userType: string;
      createdAt: string;
    }>;
    pharmacies: Array<{
      id: string;
      name: string;
      address: string;
      phone: string;
    }>;
    labs: Array<{
      id: string;
      name: string;
      type: string;
      phone: string;
    }>;
    payments: Array<{
      id: string;
      planName: string;
      price: number;
      startsAt: string;
      expiresAt: string;
      status: string;
    }>;
    subscriptionHistory: Array<{
      planName: string;
      price: number;
      startsAt: string;
      expiresAt: string;
      active: boolean;
    }>;
  };
}

export const clinicApi = createApi({
  reducerPath: "clinicApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Clinic"],
  endpoints: (builder) => ({
    // Get all clinics (user's own clinics)
    getAllClinics: builder.query<
      {
        success: boolean;
        clinic: {
          id: string;
          userId: string;
          clinicName: string;
          clinicPhone: string;
          Tagline: string;
          clinicAddress: string;
          Country: string;
          State: string;
          City: string;
          ZipCode: number;
          clinicLogo: string | null;
          latitude?: number | null;
          longitude?: number | null;
          razorpayAccountId?: string | null;
          routeStatus?: ClinicRouteStatus | null;
          routeOnboardedAt?: string | null;
          createdAt: string;
          updatedAt: string;
        };
        profile: DoctorProfileDto & {
          onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
          approvalRequestSent?: boolean;
          currentStep?: number;
        };
        subscription: {
          active: boolean;
          expiresAt: string;
          planName: string;
          price: number;
          slug: string;
        };
        noShowPolicyActive: boolean;
      },
      void
    >({
      queryFn: async (_, _queryApi, _extraOptions, baseQuery) => {
        const isElectron = Boolean((window as any).ipcAPI);

        // If offline inside Electron, return cached clinic data
        if (isElectron && !navigator.onLine) {
          const cachedStr = localStorage.getItem("clinicData_offline");
          if (cachedStr) {
            try {
              return { data: JSON.parse(cachedStr) };
            } catch {}
          }
        }

        const result = await baseQuery("/clinic/user");

        if (result.error) {
          if (result.error.status === "FETCH_ERROR") {
            const cachedStr = localStorage.getItem("clinicData_offline");
            if (cachedStr) {
              try {
                return { data: JSON.parse(cachedStr) };
              } catch {}
            }
          }
          return { error: result.error as any };
        }

        // Cache for offline use
        if (result.data) {
          localStorage.setItem("clinicData_offline", JSON.stringify(result.data));
        }

        return { data: result.data as any };
      },
      providesTags: ["Clinic"],
    }),

    // Get clinic by ID
    getClinicById: builder.query<
      {
        success: boolean;
        clinic: {
          id: string;
          userId: string;
          clinicName: string;
          clinicPhone: string;
          Tagline: string;
          clinicAddress: string;
          Country: string;
          State: string;
          City: string;
          ZipCode: number;
          clinicLogo: string | null;
          createdAt: string;
          updatedAt: string;
        };
        profile: DoctorProfileDto;
        subscription: {
          active: boolean;
          expiresAt: string;
          planName: string;
          price: number;
          slug: string;
        };
        noShowPolicyActive: boolean;
      },
      string
    >({
      query: (clinicId) => `/clinic/${clinicId}`,
      providesTags: ["Clinic"],
    }),

    // Create a new clinic
    createClinic: builder.mutation<
      {
        success: boolean;
        data: {
          id: string;
          userId: string;
          clinicName: string;
          clinicPhone: string;
          Tagline: string;
          clinicAddress: string;
          Country: string;
          State: string;
          City: string;
          ZipCode: number;
          clinicLogo: string | null;
          createdAt: string;
          updatedAt: string;
        };
      },
      CreateClinicRequestDto | FormData
    >({
      query: (body) => ({
        url: "/clinic",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Clinic"],
    }),

    // Update a clinic
    updateClinic: builder.mutation<
      {
        success: boolean;
      },
      { clinicId: string; body: UpdateClinicRequestDto | FormData }
    >({
      query: ({ clinicId, body }) => ({
        url: `/clinic/${clinicId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Clinic"],
    }),

    // Get available clinics with pagination, search, and stats
    getAvailableClinics: builder.query<
      {
        success: boolean;
        message: string;
        data: {
          stats: ClinicStats;
          data: ClinicListItem[];
          pagination: PaginationInfo;
        };
      },
      { page?: number; limit?: number; search?: string; status?: string }
    >({
      query: (params) => ({
        url: "/clinic/available",
        params,
      }),
      providesTags: ["Clinic"],
    }),

    // Get limited clinic details by ID
    getClinicDetail: builder.query<ClinicDetailResponse, string>({
      query: (clinicId) => `/clinic/detail/${clinicId}`,
      providesTags: ["Clinic"],
    }),

    // --- Clinic Settings ---
    getClinicSettings: builder.query<{ success: boolean; result: any }, void>({
      query: () => "/clinic/settings",
      providesTags: ["Clinic"],
    }),

    upsertClinicSettings: builder.mutation<
      { success: boolean; result: any },
      { settings?: any; reminders?: any[] }
    >({
      query: (body) => ({
        url: "/clinic/settings",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Clinic"],
    }),

    deleteClinicReminder: builder.mutation<
      { success: boolean; result: any },
      string
    >({
      query: (reminderId) => ({
        url: `/clinic/delete-reminder/${reminderId}`,
        method: "PUT",
      }),
      invalidatesTags: ["Clinic"],
    }),

    // --- Clinic Information page aggregation (see clinicProfileOverviewBaseQuery above) ---
    // These two responses come from `sendOk(res, message, data)` on the backend,
    // which wraps the payload as `{ success, message, data }` — unwrap `.data`
    // here so callers get a plain `ClinicProfileOverview`.
    getClinicProfileOverview: builder.query<ClinicProfileOverview, void>({
      queryFn: async (_arg, api, extraOptions) => {
        const result = await clinicProfileOverviewBaseQuery(
          "/clinic/profile-overview",
          api,
          extraOptions,
        );
        if (result.error) return { error: result.error };
        return {
          data: (result.data as { data: ClinicProfileOverview }).data,
        };
      },
      providesTags: ["Clinic"],
    }),

    updateClinicProfile: builder.mutation<ClinicProfileOverview, FormData>({
      queryFn: async (body, api, extraOptions) => {
        const result = await clinicProfileOverviewBaseQuery(
          { url: "/clinic/profile", method: "PUT", body },
          api,
          extraOptions,
        );
        if (result.error) return { error: result.error };
        return {
          data: (result.data as { data: ClinicProfileOverview }).data,
        };
      },
      invalidatesTags: ["Clinic"],
    }),

    // Native Razorpay Route onboarding: current wizard/status state, including
    // rejection reasons and a resumable draft when status is NEEDS_CLARIFICATION.
    getOnboardingStatus: builder.query<OnboardingStatusResponse, void>({
      query: () => "/clinic/onboarding-status",
      providesTags: ["Clinic"],
    }),

    // Submit (or resubmit) the full sub-merchant onboarding registration.
    submitOnboardingRoute: builder.mutation<
      OnboardRouteResponse,
      OnboardRouteRequestDto
    >({
      query: (body) => ({
        url: "/clinic/onboard-route",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Clinic"],
    }),

    // Upload a single KYC verification document, fired as soon as it's selected.
    uploadOnboardingDocument: builder.mutation<
      UploadOnboardingDocumentResponse,
      { file: File; documentType: OnboardingDocumentType }
    >({
      query: ({ file, documentType }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("documentType", documentType);
        return {
          url: "/clinic/onboard-documents",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Clinic"],
    }),

    // Get currently active verified Razorpay bank account details for clinic
    getClinicBankDetails: builder.query<{ success: boolean; message: string; data: BankDetails | null }, void>({
      query: () => "/clinic/bank-details",
      providesTags: ["Clinic"],
    }),

    // Change the settlement bank account on an already-ACTIVE clinic; backend
    // freezes payouts and flips routeStatus back to PENDING for penny-testing.
    updateBankDetails: builder.mutation<
      UpdateBankDetailsResponse,
      UpdateBankDetailsRequestDto
    >({
      query: (body) => ({
        url: "/clinic/bank-details",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Clinic"],
    }),
  }),
});

export const {
  useGetAllClinicsQuery,
  useLazyGetAllClinicsQuery,
  useGetClinicByIdQuery,
  useCreateClinicMutation,
  useUpdateClinicMutation,
  useGetAvailableClinicsQuery,
  useGetClinicDetailQuery,
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
  useDeleteClinicReminderMutation,
  useGetClinicProfileOverviewQuery,
  useUpdateClinicProfileMutation,
  useGetOnboardingStatusQuery,
  useSubmitOnboardingRouteMutation,
  useUploadOnboardingDocumentMutation,
  useGetClinicBankDetailsQuery,
  useUpdateBankDetailsMutation,
} = clinicApi;
