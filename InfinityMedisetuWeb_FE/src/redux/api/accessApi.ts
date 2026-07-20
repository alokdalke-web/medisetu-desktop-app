import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  AssignAccessDto,
  AssignRoleDto,
  CreateAccessDto,
} from "../../schemas/access";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

interface Permission {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface AccessPermissionsResponse {
  message: string;
  permissions: Permission[];
}

interface AssignedAccessResponse {
  message: string;
  permissionsPlan: {
    plan: Plan;
    permission: Permission;
  }[];
}

interface CreateAccessPermissionsResponse {
  permission: Permission;
}

export const accessApi = createApi({
  reducerPath: "accessApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Access"],
  endpoints: (builder) => ({
    // Get access permissions
    getAccessPermissions: builder.query<AccessPermissionsResponse, void>({
      query: () => "/users/access/permissions",
      providesTags: ["Access"],
    }),

    // Create access permissions
    createAccessPermissions: builder.mutation<
      CreateAccessPermissionsResponse,
      CreateAccessDto
    >({
      query: (body) => ({
        url: "/users/access/permissions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Access"],
    }),

    // Get assigned access
    getAssignedAccess: builder.query<AssignedAccessResponse, void>({
      query: () => "/users/access/permissions/assign-plan",
      providesTags: ["Access"],
    }),

    // Assign access
    assignAccess: builder.mutation<unknown, AssignAccessDto>({
      query: (body) => ({
        url: "/users/access/permissions/assign-plan",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Access"],
    }),

    // Assign role
    assignRole: builder.mutation<unknown, AssignRoleDto>({
      query: (body) => ({
        url: "/users/access/permissions/assign-role",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Access"],
    }),
  }),
});

export const {
  useGetAccessPermissionsQuery,
  useGetAssignedAccessQuery,
  useCreateAccessPermissionsMutation,
  useAssignAccessMutation,
  useAssignRoleMutation,
} = accessApi;
