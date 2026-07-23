import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  CreatePrescriptionDto,
  Prescription,
} from "../../schemas/prescription";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { TransportLayer } from "../../services/TransportLayer";

export type DoctorPrescriptionType = "Digital" | "Manual";

export type DoctorPrescriptionTypeResponse = {
  success: boolean;
  message?: string;
  prescriptionType: DoctorPrescriptionType;
};

export const prescriptionApi = createApi({
  reducerPath: "prescriptionApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Prescription", "DoctorPrescriptionType"],

  endpoints: (b) => ({
    // POST /prescriptions
    createPrescription: b.mutation<
      { success: boolean; result: Prescription },
      CreatePrescriptionDto
    >({
      queryFn: async (body) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'prescription.create',
            ipcPayload: body,
            restConfig: {
              url: "/prescriptions",
              method: "POST",
              data: body,
            }
          });
          return { data: { success: true, result: response.data }, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Prescription", id: `appt-${arg.appointmentId}` },
      ],
    }),

    // GET /prescriptions/appointment/:id
    getPrescriptionByAppointment: b.query<Prescription | null, string>({
      queryFn: async (appointmentId) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'prescription.getByAppointment',
            ipcPayload: appointmentId,
            restConfig: {
              url: `/prescriptions/appointment/${appointmentId}`,
              method: "GET",
            }
          });
          const transformedData = response.data?.result ?? response.data ?? null;
          return { data: transformedData, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: (_r, _e, id) => [
        { type: "Prescription", id: `appt-${id}` },
      ],
    }),

    // PUT /prescriptions/appointment/:id
    updatePrescription: b.mutation<
      { success: boolean; result: Prescription },
      { appointmentId: string; data: Partial<CreatePrescriptionDto> }
    >({
      queryFn: async ({ appointmentId, data }) => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'prescription.update',
            ipcPayload: { appointmentId, data },
            restConfig: {
              url: `/prescriptions/appointment/${appointmentId}`,
              method: "PUT",
              data,
            }
          });
          return { data: { success: true, result: response.data }, meta: { source: response.meta.source } };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "Prescription", id: `appt-${arg.appointmentId}` },
      ],
    }),

    // GET /doctor/doctor-prescription-type
    getDoctorPrescriptionType: b.query<DoctorPrescriptionTypeResponse, void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const current = localStorage.getItem('offline_prescription_type') || 'Manual';
            return { data: { success: true, prescriptionType: current as any } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ["DoctorPrescriptionType"],
    }),

    // POST /doctor/doctor-prescription-type
    // No payload/body will be sent
    setDoctorPrescriptionType: b.mutation<DoctorPrescriptionTypeResponse, void>({
      queryFn: async () => {
        try {
          if (typeof window !== 'undefined' && (window as any).ipcAPI) {
            const current = localStorage.getItem('offline_prescription_type') || 'Manual';
            const next = current === 'Manual' ? 'Digital' : 'Manual';
            localStorage.setItem('offline_prescription_type', next);
            return { data: { success: true, prescriptionType: next as any } };
          }
          throw new Error('Not supported in web mode');
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ["DoctorPrescriptionType"],
    }),
  }),
});

export const {
  useCreatePrescriptionMutation,
  useGetPrescriptionByAppointmentQuery,
  useUpdatePrescriptionMutation: useUpdateRxMutation,
  useGetDoctorPrescriptionTypeQuery,
  useSetDoctorPrescriptionTypeMutation,
} = prescriptionApi;