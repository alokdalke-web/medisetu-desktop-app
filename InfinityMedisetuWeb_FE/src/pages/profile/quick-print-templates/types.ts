// Quick Print Templates - Type Definitions

export type PaperSize = "a4" | "a5" | "thermal80mm" | "letter" | "custom";

export type QuickPrintTemplateId =
    | "compact-medicine-slip"
    | "standard-medicine-sheet"
    | "minimal-prescription"
    | "pharmacy-copy"
    | "detailed-prescription"
    | "clinic-branded";

export interface QuickPrintTemplate {
    id: QuickPrintTemplateId;
    name: string;
    description: string;
    paperSizes: PaperSize[];
    category: string;
}

// Element positioning on the page (absolute coordinates in mm)
export interface ElementPosition {
    x: number; // mm from left
    y: number; // mm from top
    width: number; // mm width
    height: number; // auto or fixed
}

// Each draggable block on the page
export type BlockType =
    | "patientInfo"
    | "diagnosis"
    | "rxSymbol"
    | "medicineTable"
    | "advice"
    | "followUp"
    | "doctorSignature"
    | "clinicHeader"
    | "visitDate";

export interface TemplateBlock {
    id: BlockType;
    label: string;
    visible: boolean;
    position: ElementPosition;
}

// Page size dimensions in mm
export interface PageDimensions {
    width: number; // mm
    height: number; // mm
    label: string;
}

export const PAGE_SIZES: Record<PaperSize, PageDimensions> = {
    a4: { width: 210, height: 297, label: "A4 (210×297mm)" },
    a5: { width: 148, height: 210, label: "A5 (148×210mm)" },
    thermal80mm: { width: 80, height: 200, label: "Thermal 80mm" },
    letter: { width: 216, height: 279, label: "Letter (8.5×11in)" },
    custom: { width: 210, height: 297, label: "Custom" },
};

export const QUICK_PRINT_TEMPLATES: QuickPrintTemplate[] = [
    {
        id: "compact-medicine-slip",
        name: "Compact Slip",
        description: "Quick OPD, small paper",
        paperSizes: ["a5", "thermal80mm"],
        category: "compact",
    },
    {
        id: "standard-medicine-sheet",
        name: "Standard Sheet",
        description: "Everyday clinic use",
        paperSizes: ["a4", "a5"],
        category: "standard",
    },
    {
        id: "minimal-prescription",
        name: "Minimal",
        description: "Only essentials",
        paperSizes: ["a4", "a5"],
        category: "minimal",
    },
    {
        id: "pharmacy-copy",
        name: "Pharmacy Copy",
        description: "For pharmacy dispensing",
        paperSizes: ["a4", "a5", "thermal80mm"],
        category: "pharmacy",
    },
    {
        id: "detailed-prescription",
        name: "Detailed",
        description: "Full prescription info",
        paperSizes: ["a4", "letter"],
        category: "detailed",
    },
    {
        id: "clinic-branded",
        name: "Clinic Branded",
        description: "With clinic logo & footer",
        paperSizes: ["a4", "a5", "letter"],
        category: "branded",
    },
];

// Default block layout for a clean white prescription (like the uploaded image)
export const DEFAULT_BLOCKS: TemplateBlock[] = [
    {
        id: "patientInfo",
        label: "Patient Info",
        visible: true,
        position: { x: 10, y: 10, width: 190, height: 20 },
    },
    {
        id: "visitDate",
        label: "Visit Date",
        visible: true,
        position: { x: 160, y: 10, width: 40, height: 10 },
    },
    {
        id: "diagnosis",
        label: "Diagnosis",
        visible: true,
        position: { x: 10, y: 32, width: 190, height: 12 },
    },
    {
        id: "rxSymbol",
        label: "℞ Symbol",
        visible: true,
        position: { x: 10, y: 46, width: 15, height: 12 },
    },
    {
        id: "medicineTable",
        label: "Medicine Table",
        visible: true,
        position: { x: 10, y: 60, width: 190, height: 80 },
    },
    {
        id: "advice",
        label: "Advice",
        visible: false,
        position: { x: 10, y: 145, width: 190, height: 15 },
    },
    {
        id: "followUp",
        label: "Next Visit",
        visible: true,
        position: { x: 10, y: 162, width: 100, height: 10 },
    },
    {
        id: "doctorSignature",
        label: "Doctor Signature",
        visible: true,
        position: { x: 120, y: 200, width: 80, height: 30 },
    },
    {
        id: "clinicHeader",
        label: "Clinic Header",
        visible: false,
        position: { x: 10, y: 0, width: 190, height: 18 },
    },
];
