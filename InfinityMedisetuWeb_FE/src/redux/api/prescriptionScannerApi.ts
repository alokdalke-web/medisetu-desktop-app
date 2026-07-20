import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import axios, { AxiosError } from "axios";

import { getAuthToken } from "../../utils/auth";
import {
  DummyPrescriptionResponseSchema,
  ScanOutputSchema,
  type PrescriptionData,
  type ScanInputPayload,
  type ScanOutput,
} from "../../types/prescription-scanner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const PRESCRIPTION_SCAN_RETRY_MESSAGE =
  "System vitals are a bit high. Please retry in a moment.";

type JsonRecord = Record<string, unknown>;

type ScannerApiError = {
  status: number | string;
  data?: unknown;
  error?: string;
};

export type ScanSessionResponse = {
  otp: string;
  expiresIn: number;
};

export type ScanStatusResponse =
  | { status: "invalid" }
  | {
      status: "waiting" | "uploaded";
      otp: string;
      imageBase64?: string;
      imageUrl?: string;
      createdAt: number;
    };

export type UploadPrescriptionPayload = ScanInputPayload & {
  otp: string;
};

export type UploadPrescriptionResponse = {
  success?: boolean;
  message?: string;
};

export type UpdateDoctorManualPrescriptionPayload = {
  appointmentId: string;
  file: File;
};

export type UpdateDoctorManualPrescriptionResponse = {
  success?: boolean;
  message?: string;
  result?: unknown;
};

function toRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as JsonRecord;
}

function getString(record: JsonRecord | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function parseSessionResponse(raw: unknown): ScanSessionResponse {
  const root = toRecord(raw);
  const data = toRecord(root?.data);
  const source = data ?? root;

  const otp = getString(source, "otp");
  const expiresInValue = source?.expiresIn;

  const expiresIn =
    typeof expiresInValue === "number"
      ? expiresInValue
      : typeof expiresInValue === "string"
        ? Number(expiresInValue)
        : NaN;

  if (!otp || !Number.isFinite(expiresIn)) {
    throw new Error("Invalid session response from server.");
  }

  return { otp, expiresIn };
}

function parseStatusResponse(raw: unknown): ScanStatusResponse {
  const root = toRecord(raw);
  const data = toRecord(root?.data);
  const source = data ?? root;

  const status = getString(source, "status");

  if (status === "invalid") {
    return { status: "invalid" };
  }

  if (status === "waiting" || status === "uploaded") {
    const createdAtValue = source?.createdAt;

    const createdAt =
      typeof createdAtValue === "number"
        ? createdAtValue
        : typeof createdAtValue === "string"
          ? Number(createdAtValue)
          : Date.now();

    return {
      status,
      otp: getString(source, "otp") ?? "",
      imageBase64: getString(source, "imageBase64"),
      imageUrl: getString(source, "imageUrl"),
      createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    };
  }

  throw new Error("Invalid status response from server.");
}

function parseScanResponse(raw: unknown): ScanOutput {
  const root = toRecord(raw);
  const data = toRecord(root?.data);
  const source = data ?? root;

  const parsed = ScanOutputSchema.safeParse(source);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issuePath = issue?.path?.length ? issue.path.join(".") : "response";

    throw new Error(
      `Invalid scan response at ${issuePath}: ${issue?.message ?? "unknown validation error"}`,
    );
  }

  return parsed.data;
}

function parseDummyResponse(raw: unknown): PrescriptionData {
  const root = toRecord(raw);
  const data = toRecord(root?.data);
  const source = data ? { data } : root;

  const parsed = DummyPrescriptionResponseSchema.safeParse(source);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issuePath = issue?.path?.length ? issue.path.join(".") : "response";

    throw new Error(
      `Invalid dummy response at ${issuePath}: ${issue?.message ?? "unknown validation error"}`,
    );
  }

  return parsed.data.data;
}

function getAuthHeaders() {
  const rawToken = getAuthToken() ?? "";
  const Authorization = rawToken
    ? rawToken.startsWith("Bearer ")
      ? rawToken
      : `Bearer ${rawToken}`
    : "";

  return {
    "Content-Type": "application/json",
    ...(Authorization ? { Authorization } : {}),
  };
}

function getAuthOnlyHeaders() {
  const rawToken = getAuthToken() ?? "";
  const Authorization = rawToken
    ? rawToken.startsWith("Bearer ")
      ? rawToken
      : `Bearer ${rawToken}`
    : "";

  return {
    ...(Authorization ? { Authorization } : {}),
  };
}

function buildUrl(path: string) {
  return `${API_BASE_URL.replace(/\/+$/, "")}${path}`;
}

function toScannerApiError(error: unknown): ScannerApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status ?? "FETCH_ERROR";
    const data = axiosError.response?.data;

    return {
      status,
      data,
      error: data?.message || axiosError.message || "Request failed.",
    };
  }

  if (error instanceof Error) {
    return {
      status: "CUSTOM_ERROR",
      error: error.message,
    };
  }

  return {
    status: "CUSTOM_ERROR",
    error: "Something went wrong.",
  };
}

export const prescriptionScannerApi = createApi({
  reducerPath: "prescriptionScannerApi",
  baseQuery: fakeBaseQuery<ScannerApiError>(),
  tagTypes: ["PrescriptionScanner"],
  endpoints: (builder) => ({
    createScanSession: builder.mutation<ScanSessionResponse, void>({
      async queryFn() {
        try {
          const response = await axios.post(
            buildUrl("/prescription/scan/session"),
            {},
            {
              headers: getAuthHeaders(),
            },
          );

          return { data: parseSessionResponse(response.data) };
        } catch (error) {
          return { error: toScannerApiError(error) };
        }
      },
    }),

    getScanStatus: builder.query<ScanStatusResponse, string>({
      async queryFn(otp) {
        try {
          const response = await axios.get(
            buildUrl("/prescription/scan/status"),
            {
              headers: getAuthHeaders(),
              params: { otp },
            },
          );

          return { data: parseStatusResponse(response.data) };
        } catch (error) {
          return { error: toScannerApiError(error) };
        }
      },
      keepUnusedDataFor: 0,
      providesTags: ["PrescriptionScanner"],
    }),

    runPrescriptionScan: builder.mutation<ScanOutput, ScanInputPayload>({
      async queryFn(body) {
        try {
          const response = await axios.post(
            buildUrl("/prescription/scan"),
            body,
            {
              headers: getAuthHeaders(),
            },
          );

          return { data: parseScanResponse(response.data) };
        } catch {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: PRESCRIPTION_SCAN_RETRY_MESSAGE,
            },
          };
        }
      },
    }),

    getDummyPrescription: builder.query<PrescriptionData, void>({
      async queryFn() {
        try {
          const response = await axios.get(buildUrl("/prescription/dummy"), {
            headers: getAuthHeaders(),
          });

          return { data: parseDummyResponse(response.data) };
        } catch (error) {
          return { error: toScannerApiError(error) };
        }
      },
    }),

    uploadPrescriptionToBridge: builder.mutation<
      UploadPrescriptionResponse,
      UploadPrescriptionPayload
    >({
      async queryFn({ otp, ...body }) {
        try {
          const response = await axios.post(
            buildUrl("/prescription/scan/upload"),
            body,
            {
              headers: getAuthHeaders(),
              params: { otp },
            },
          );

          return {
            data: response.data as UploadPrescriptionResponse,
          };
        } catch (error) {
          return { error: toScannerApiError(error) };
        }
      },
      invalidatesTags: ["PrescriptionScanner"],
    }),

    updateDoctorManualPrescription: builder.mutation<
      UpdateDoctorManualPrescriptionResponse,
      UpdateDoctorManualPrescriptionPayload
    >({
      async queryFn({ appointmentId, file }) {
        try {
          const formData = new FormData();
          formData.append("doctorManualPrescription", file);

          const response = await axios.post(
            buildUrl(
              `/appointments/update-doctor-manual-prescription/${appointmentId}`,
            ),
            formData,
            {
              headers: getAuthOnlyHeaders(),
            },
          );

          return {
            data: response.data as UpdateDoctorManualPrescriptionResponse,
          };
        } catch (error) {
          return { error: toScannerApiError(error) };
        }
      },
    }),
  }),
});

export const {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
  useRunPrescriptionScanMutation,
  useLazyGetDummyPrescriptionQuery,
  useUploadPrescriptionToBridgeMutation,
  useUpdateDoctorManualPrescriptionMutation,
} = prescriptionScannerApi;
