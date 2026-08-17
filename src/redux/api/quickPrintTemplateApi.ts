import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type {
    QuickPrintTemplateId,
    TemplateBlock,
} from "../../pages/profile/quick-print-templates/types";
import type { TableStyle } from "../../types/profile";

export type ElementConfig = {
    showClinicHeader?: boolean;
    showClinicLogo?: boolean;
    showPatientName?: boolean;
    showPatientUhid?: boolean;
    showPatientAge?: boolean;
    showPatientGender?: boolean;
    showPatientMobile?: boolean;
    showPatientAddress?: boolean;
    showVisitDate?: boolean;
    showDiagnosis?: boolean;
    showMedicineTable?: boolean;
    showMedicineComposition?: boolean;
    showMedicineQuantity?: boolean;
    showMedicineInstructions?: boolean;
    showAdvice?: boolean;
    showFollowUp?: boolean;
    showDoctorName?: boolean;
    showDoctorQualification?: boolean;
    showDoctorRegistration?: boolean;
    showDoctorSignature?: boolean;
    showQrCode?: boolean;
    showFooter?: boolean;
    showChiefComplaints?: boolean;
    showVitals?: boolean;
    showAllergies?: boolean;
    showTests?: boolean;
    showClinicalNotes?: boolean;
    sectionOrder?: string[];
    // Drag-and-drop layout saved by the Quick Print page designer. Only the
    // per-doctor fields are persisted; static label/group come from the defaults.
    blockLayout?: Pick<TemplateBlock, "id" | "visible" | "position">[];
    pageSize?: string;
    tableStyle?: TableStyle;
};

export type GetQuickPrintTemplateResponse = {
    success: boolean;
    data: {
        selectedTemplate: QuickPrintTemplateId;
        fontFamily?: string;
        accentColor?: string;
        elementConfig?: ElementConfig;
        isDefault?: boolean;
        updatedAt?: string;
    };
};

export type SaveQuickPrintTemplateRequest = {
    selectedTemplate: QuickPrintTemplateId;
    fontFamily?: string;
    accentColor?: string;
    elementConfig?: ElementConfig;
};

export type SaveQuickPrintTemplateResponse = {
    success: boolean;
    message: string;
    data: {
        action: "created" | "updated";
        template: any;
    };
};

export type PreviewQuickPrintTemplateRequest = {
    selectedTemplate: QuickPrintTemplateId;
    fontFamily?: string;
    accentColor?: string;
    elementConfig?: ElementConfig;
};

export const quickPrintTemplateApi = createApi({
    reducerPath: "quickPrintTemplateApi",
    baseQuery: baseQueryWithAutoLogout,
    tagTypes: ["QuickPrintTemplate"],
    endpoints: (builder) => ({
        getQuickPrintTemplate: builder.query<GetQuickPrintTemplateResponse, void>({
            query: () => ({
                url: "quick-print-templates",
                method: "GET",
            }),
            providesTags: ["QuickPrintTemplate"],
        }),

        saveQuickPrintTemplate: builder.mutation<
            SaveQuickPrintTemplateResponse,
            SaveQuickPrintTemplateRequest
        >({
            query: (body) => ({
                url: "quick-print-templates",
                method: "POST",
                body,
            }),
            invalidatesTags: ["QuickPrintTemplate"],
        }),

        previewQuickPrintTemplate: builder.mutation<
            { success: boolean; html: string },
            PreviewQuickPrintTemplateRequest
        >({
            query: (body) => ({
                url: "quick-print-templates/preview",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useGetQuickPrintTemplateQuery,
    useSaveQuickPrintTemplateMutation,
    usePreviewQuickPrintTemplateMutation,
} = quickPrintTemplateApi;
