import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  CreateClinicRequestDto,
  UpdateClinicRequestDto,
} from "../../schemas/clinic";
import type { DoctorProfileDto } from "../../schemas/doctor";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

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
      query: () => "/clinic/user",
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
  }),
});

export const {
  useGetAllClinicsQuery,
  useGetClinicByIdQuery,
  useCreateClinicMutation,
  useUpdateClinicMutation,
  useGetAvailableClinicsQuery,
  useGetClinicDetailQuery,
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
  useDeleteClinicReminderMutation,
} = clinicApi;
