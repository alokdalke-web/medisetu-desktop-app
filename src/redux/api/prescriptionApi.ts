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

const normalizeDoctorPrescriptionTypeResponse = (
  res: any,
): DoctorPrescriptionTypeResponse => {
  const prescriptionType =
    res?.data?.prescriptionType ||
    res?.result?.prescriptionType ||
    res?.prescriptionType ||
    "Manual";

  return {
    success: Boolean(res?.success),
    message: res?.message,
    prescriptionType:
      prescriptionType === "Digital" ? "Digital" : "Manual",
  };
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
    // NOTE: switched from the local-only (localStorage, Electron-only, "Not
    // supported in web mode") stub to the team's real backend-connected
    // version, wrapped in TransportLayer for offline-first consistency with
    // the rest of this file. Flagging this in case the local-only behavior
    // was intentional for a reason not visible here.
    getDoctorPrescriptionType: b.query<DoctorPrescriptionTypeResponse, void>({
      queryFn: async () => {
        try {
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'prescription.getPrescriptionType',
            cloudOnly: true,
            restConfig: {
              url: "/doctor/doctor-prescription-type",
              method: "GET",
            }
          });
          const normalized = normalizeDoctorPrescriptionTypeResponse(response.data);
          localStorage.setItem('offline_prescription_type', normalized.prescriptionType);
          return {
            data: normalized,
            meta: { source: response.meta.source },
          };
        } catch (error: any) {
          const cached = localStorage.getItem('offline_prescription_type');
          if (cached) {
            return {
              data: { success: true, prescriptionType: cached as DoctorPrescriptionType },
              meta: { source: 'local_sqlite' as any }
            };
          }
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
          const response = await TransportLayer.execute<any>({
            ipcMethod: 'prescription.setPrescriptionType',
            cloudOnly: true,
            restConfig: {
              url: "/doctor/doctor-prescription-type",
              method: "POST",
            }
          });
          const normalized = normalizeDoctorPrescriptionTypeResponse(response.data);
          localStorage.setItem('offline_prescription_type', normalized.prescriptionType);
          return {
            data: normalized,
            meta: { source: response.meta.source },
          };
        } catch (error: any) {
          // Fallback for offline mode: toggle the cached value locally
          const cached = localStorage.getItem('offline_prescription_type');
          const newType = cached === 'Digital' ? 'Manual' : 'Digital';
          localStorage.setItem('offline_prescription_type', newType);
          return {
            data: { success: true, prescriptionType: newType },
            meta: { source: 'local_sqlite' as any }
          };
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
