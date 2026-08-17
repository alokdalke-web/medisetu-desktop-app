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
    | "chiefComplaints"
    | "vitals"
    | "allergies"
    | "diagnosis"
    | "rxSymbol"
    | "medicineTable"
    | "tests"
    | "clinicalNotes"
    | "advice"
    | "followUp"
    | "doctorSignature"
    | "clinicHeader"
    | "visitDate";

/** Grouping used only to section the Elements sidebar. */
export type BlockGroup = "header" | "clinical" | "treatment" | "footer";

export interface TemplateBlock {
    id: BlockType;
    label: string;
    group: BlockGroup;
    visible: boolean;
    position: ElementPosition;
}

/**
 * One-line "what actually prints here" per element. Kept out of `TemplateBlock`
 * on purpose — blocks are serialized into the saved `blockLayout`, and static
 * copy has no business being persisted per doctor.
 */
export const BLOCK_HINTS: Record<BlockType, string> = {
    clinicHeader: "Clinic name, address and phone across the top",
    patientInfo: "UHID, name, age, gender and mobile",
    visitDate: "Date of this visit",
    chiefComplaints: "Symptoms recorded for the visit (C/O)",
    vitals: "BP, pulse, SpO₂, temperature, height, weight, BMI",
    allergies: "Known allergies, printed in red",
    diagnosis: "Provisional diagnosis",
    rxSymbol: "The ℞ mark above the medicine list",
    medicineTable: "Medicines with dosage, timing, frequency and duration",
    tests: "Tests and investigations advised at this visit",
    clinicalNotes: "Your free-text clinical notes for the patient",
    advice: "General advice such as diet or lifestyle instructions",
    followUp: "Next visit / follow-up date",
    doctorSignature: "Doctor name and qualification at the bottom",
};

export const BLOCK_GROUP_LABELS: Record<BlockGroup, string> = {
    header: "Header",
    clinical: "Clinical",
    treatment: "Treatment",
    footer: "Footer",
};

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
        id: "clinicHeader",
        label: "Clinic Header",
        group: "header",
        visible: false,
        position: { x: 10, y: 0, width: 190, height: 18 },
    },
    {
        id: "patientInfo",
        label: "Patient Info",
        group: "header",
        visible: true,
        position: { x: 10, y: 10, width: 190, height: 20 },
    },
    {
        id: "visitDate",
        label: "Visit Date",
        group: "header",
        visible: true,
        position: { x: 160, y: 10, width: 40, height: 10 },
    },
    {
        id: "chiefComplaints",
        label: "Chief Complaints (C/O)",
        group: "clinical",
        visible: false,
        position: { x: 10, y: 20, width: 190, height: 10 },
    },
    {
        id: "vitals",
        label: "Vitals",
        group: "clinical",
        visible: false,
        position: { x: 10, y: 26, width: 190, height: 10 },
    },
    {
        id: "allergies",
        label: "Allergies",
        group: "clinical",
        visible: false,
        position: { x: 10, y: 32, width: 190, height: 10 },
    },
    {
        id: "diagnosis",
        label: "Diagnosis",
        group: "clinical",
        visible: true,
        position: { x: 10, y: 38, width: 190, height: 12 },
    },
    {
        id: "rxSymbol",
        label: "℞ Symbol",
        group: "treatment",
        visible: true,
        position: { x: 10, y: 46, width: 15, height: 12 },
    },
    {
        id: "medicineTable",
        label: "Medicine Table",
        group: "treatment",
        visible: true,
        position: { x: 10, y: 60, width: 190, height: 80 },
    },
    {
        id: "tests",
        label: "Tests / Investigations",
        group: "treatment",
        visible: false,
        position: { x: 10, y: 145, width: 190, height: 15 },
    },
    {
        id: "clinicalNotes",
        label: "Clinical Notes",
        group: "treatment",
        visible: false,
        position: { x: 10, y: 158, width: 190, height: 12 },
    },
    {
        id: "advice",
        label: "Advice",
        group: "treatment",
        visible: false,
        position: { x: 10, y: 168, width: 190, height: 15 },
    },
    {
        id: "followUp",
        label: "Next Visit",
        group: "footer",
        visible: true,
        position: { x: 10, y: 180, width: 100, height: 10 },
    },
    {
        id: "doctorSignature",
        label: "Doctor Signature",
        group: "footer",
        visible: true,
        position: { x: 120, y: 200, width: 80, height: 30 },
    },
];

/**
 * Saved layouts predate later-added blocks (and lack `group`), so a stored
 * config is merged onto the defaults rather than replacing them — otherwise a
 * doctor who saved once would never see any newly shipped element.
 */
export function mergeSavedBlocks(saved: unknown): TemplateBlock[] {
    if (!Array.isArray(saved)) return DEFAULT_BLOCKS;

    const savedById = new Map<string, Partial<TemplateBlock>>();
    for (const block of saved as Partial<TemplateBlock>[]) {
        if (block?.id) savedById.set(block.id, block);
    }

    return DEFAULT_BLOCKS.map((defaultBlock) => {
        const stored = savedById.get(defaultBlock.id);
        if (!stored) return defaultBlock;

        return {
            ...defaultBlock,
            visible:
                typeof stored.visible === "boolean"
                    ? stored.visible
                    : defaultBlock.visible,
            position: { ...defaultBlock.position, ...(stored.position ?? {}) },
        };
    });
}
