import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { limitationsApi } from "./limitationsApi";
import { TransportLayer } from "../../services/TransportLayer";
import { doctorApi } from "./doctorApi";

type Pagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

type AllUsersResponse = {
  users: any[];
  pagination: Pagination;
};

export type DoctorListItem = {
  id: string;
  name: string;
  status: string;
  speciality: string;
  isAdminDoctorAccess: boolean;
};

export type UpdateAddUserBody = {
  name?: string;
  email?: string | null;
  mobile?: string | null;
  alternateMobile?: string;
  gender?: string;
  address?: string;
  city?: string;
  qualification?: string;
  yearsOfExperience?: number | null;
  userStatus?: "Active" | "Inactive" | "Rejected";
};

export const usersApi = createApi({
  reducerPath: "usersApi",
baseQuery: baseQueryWithAutoLogout,

  // ✅ optional but best: auto-refetch after update
  tagTypes: ["Users"],

  endpoints: (b) => ({
    getAllUsers: b.query<
      AllUsersResponse,
      { page: number; pageSize: number; userType?: string }
    >({
      queryFn: async (args) => {
        try {
          const { data } = await TransportLayer.execute<AllUsersResponse>({
            ipcMethod: "users.getAll",
            ipcPayload: args,
            restConfig: {
              url: "/users/get-all-user",
              params: args,
            },
          });

          return {
            data: {
              users: (data as any)?.result?.allUser ?? (data as any)?.users ?? data ?? [],
              pagination: (data as any)?.result?.pagination ?? (data as any)?.pagination ?? {
                totalRecords: ((data as any)?.result?.allUser ?? (data as any)?.users ?? data ?? []).length,
                totalPages: 1,
                currentPage: 1,
                pageSize: 100,
              },
            }
          };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      // Drop an abandoned tab's cache entry immediately instead of the
      // default 60s grace period, so switching tabs aborts the previous
      // role's in-flight request rather than letting it finish in the background.
      keepUnusedDataFor: 0,
      providesTags: ["Users"],
    }),

    // GET doctor list
    getDoctorList: b.query<DoctorListItem[], void>({
      queryFn: async () => {
        try {
          const { data } = await TransportLayer.execute<any>({
            ipcMethod: "users.getAll",
            ipcPayload: { userType: "Doctor" },
            restConfig: {
              url: "/users/get-all-user",
              params: { userType: "Doctor", limit: 1000 },
            },
          });
          const users = data?.result?.allUser ?? data?.users ?? data ?? [];
          return { data: users as DoctorListItem[] };
        } catch (error: any) {
          return { error: { status: "CUSTOM_ERROR", error: error.message } };
        }
      },
      providesTags: ["Users"],
    }),

    // PATCH /users/:id (update status, name, etc.)
    updateUser: b.mutation<any, { id: string; body: UpdateAddUserBody }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
          dispatch(doctorApi.util.invalidateTags(["Doctor"]));
        } catch {
          // ignore
        }
      },
    }),

    // Alias for updateUser if needed by some components
    updateAddUser: b.mutation<any, { id: string; body: UpdateAddUserBody }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Users"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(doctorApi.util.invalidateTags(["Doctor"]));
        } catch {
          // ignore
        }
      },
    }),

// GET /users/patient/search
searchPatients: b.query<
  AllUsersResponse,
  { pageNumber: number; pageSize: number; search: string }
>({
  queryFn: async ({ pageNumber, pageSize, search }) => {
    try {
      const response = await TransportLayer.execute<any>({
        ipcMethod: 'patient.search',
        ipcPayload: search,
        restConfig: {
          url: '/patient/search',
          method: 'GET',
          params: { pageNumber, pageSize, search }
        }
      });

      const res = response.data;
      const root = res?.data ?? res?.result ?? res;

      const users =
        Array.isArray(res) ? res :
        Array.isArray(root) ? root :
        (root?.data ?? root?.users ?? root?.allUser ?? []);

      const pg = root?.pagination ?? res?.pagination ?? {};
      const safeUsers = Array.isArray(users) ? users : [];

      return {
        data: {
          users: safeUsers,
          pagination: {
            totalRecords: Number(pg?.totalRecords ?? safeUsers.length ?? 0),
            totalPages: Number(pg?.totalPages ?? 1),
            currentPage: Number(pg?.currentPage ?? 1),
            pageSize: Number(pg?.pageSize ?? 30),
          },
        },
        meta: { source: response.meta.source }
      };
    } catch (error: any) {
      return { error: { status: 'CUSTOM_ERROR', error: error.message } };
    }
  },

  providesTags: ["Users"],
}),

    getLabPharmacyOverview: b.query<any, void>({
      query: () => ({
        url: "/users/lab-pharmacy/overview",
      }),
      providesTags: ["Users"],
    }),

    getLabPharmacyActivitiesUsers: b.query<any, void>({
      query: () => ({
        url: "/users/lab-pharmacy/activities-users",
      }),
      providesTags: ["Users"],
    }),

    getLabPharmacyStats: b.query<any, void>({
      query: () => ({
        url: "/users/lab-pharmacy/stats",
      }),
      providesTags: ["Users"],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetDoctorListQuery,
  useUpdateUserMutation,
  useUpdateAddUserMutation,
  useSearchPatientsQuery,
  useGetLabPharmacyOverviewQuery,
  useGetLabPharmacyActivitiesUsersQuery,
  useGetLabPharmacyStatsQuery,
} = usersApi;
