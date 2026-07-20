import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { limitationsApi } from "./limitationsApi";
import { TransportLayer } from "../../services/TransportLayer";

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
  userStatus: "Active" | "Inactive";
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
        (root?.data ?? root?.users ?? root?.allUser ?? []);

      const pg = root?.pagination ?? {};
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
  }),
});

export const {
  useGetAllUsersQuery,
  useUpdateUserMutation,
  useUpdateAddUserMutation,
  useSearchPatientsQuery,
} = usersApi;
