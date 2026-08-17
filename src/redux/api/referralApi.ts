// src/redux/api/referralApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export type ReferralData = {
  id: string;
  referredTo: string;
  referredToName: string;
  referredBy: string;
  referralCode: string;
  status: 'pending' | 'approved' | 'rejected';
  comments: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReferralResponse = {
  success: boolean;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  rejectedReferrals: number;
  allData: ReferralData[];
};

export type ReferralStatus = "pending" | "approved" | "rejected";

export type ReferralUser = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  userType: string;
};

export type SuperAdminReferralItem = {
  id: string;
  referralCode: string;
  status: ReferralStatus;
  comments: string | null;
  createdAt: string;
  updatedAt: string;
  referredBy: ReferralUser;
  referredTo: ReferralUser;
};

export type ReferralsStats = {
  totalReferrals: number;
  pendingReferrals: number;
  approvedReferrals: number;
  rejectedReferrals: number;
};

export type ReferralsPagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type GetAllReferralsParams = {
  pageSize: number;
  pageNumber: number;
  searchBy?: string;
  status?: ReferralStatus;
};

export type GetAllReferralsResponse = {
  referrals: SuperAdminReferralItem[];
  stats: ReferralsStats;
  pagination: ReferralsPagination;
};

export type UpdateReferralStatusRequest = {
  id: string;
  status: ReferralStatus;
  comments: string;
};

export type UpdateReferralStatusResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    referredTo: string;
    referredBy: string;
    referralCode: string;
    status: ReferralStatus;
    comments: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export const referralApi = createApi({
  reducerPath: "referralApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Referrals"],
  endpoints: (builder) => ({
    generateReferralCode: builder.mutation<ReferralResponse, void>({
      query: () => ({
        url: "users/generate-referral-code",
        method: "GET",
      }),
    }),
    getAllReferrals: builder.query<GetAllReferralsResponse, GetAllReferralsParams>({
      query: ({ pageNumber, pageSize, searchBy, status }) => ({
        url: "users/get-all-referrals",
        params: {
          pageNumber,
          pageSize,
          searchBy: searchBy || undefined,
          status: status || undefined,
        },
      }),
      transformResponse: (res: any): GetAllReferralsResponse => ({
        referrals: res?.result?.referrals ?? [],
        stats: res?.result?.stats ?? {
          totalReferrals: 0,
          pendingReferrals: 0,
          approvedReferrals: 0,
          rejectedReferrals: 0,
        },
        pagination: res?.result?.pagination ?? {
          totalRecords: 0,
          totalPages: 1,
          currentPage: 1,
          pageSize: 10,
        },
      }),
      providesTags: [{ type: "Referrals", id: "LIST" }],
    }),
    updateReferralStatus: builder.mutation<
      UpdateReferralStatusResponse,
      UpdateReferralStatusRequest
    >({
      query: ({ id, status, comments }) => ({
        url: `users/update-referral-status/${id}`,
        method: "PATCH",
        body: {
          status,
          comments,
        },
      }),
      invalidatesTags: [{ type: "Referrals", id: "LIST" }],
    }),
  }),
});

export const {
  useGenerateReferralCodeMutation,
  useGetAllReferralsQuery,
  useUpdateReferralStatusMutation,
} = referralApi;