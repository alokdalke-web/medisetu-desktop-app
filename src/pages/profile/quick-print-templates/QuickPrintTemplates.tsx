import {
    Button,
    Card,
    CardBody,
    Chip,
    Input,
    Select,
    SelectItem,
    Spinner,
    Switch,
    addToast,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FiCrosshair,
    FiPrinter,
    FiSave,
    FiSliders,
    FiEye,
    FiLayout,
    FiRefreshCw,
} from "react-icons/fi";
import {
    BLOCK_GROUP_LABELS,
    BLOCK_HINTS,
    DEFAULT_BLOCKS,
    PAGE_SIZES,
    mergeSavedBlocks,
    type BlockGroup,
    type BlockType,
    type PaperSize,
    type TemplateBlock,
} from "./types";
import {
    useGetQuickPrintTemplateQuery,
    useSaveQuickPrintTemplateMutation,
    type ElementConfig,
} from "../../../redux/api/quickPrintTemplateApi";
import type { TableStyle } from "../../../types/profile";

const TABLE_STYLES: { id: TableStyle; label: string; description: string }[] = [
    { id: "classic", label: "Classic", description: "Header line, light row borders" },
    { id: "bordered", label: "Bordered", description: "Full borders on all cells" },
    { id: "striped", label: "Striped", description: "Alternating row backgrounds" },
    { id: "minimal", label: "Minimal", description: "No borders, clean spacing" },
];

// Sample data
const SAMPLE = {
    patient: "A7060 : MRS.TRIVENI PANDA (75y, Female) - 9691958656",
    visitDate: "Date: 04-Jul-2026",
    diagnosis: "Diagnosis: ?PSORIASIS, ?ECZEMA",
    medicines: [
        { num: 1, name: "TAB. DEFCORT 12MG", comp: "DEFLAZACORT 12 MG", timing: "1 - After Breakfast", dosage: "1 — 0 — 0", freq: "After Breakfast - Daily - 10 Days" },
        { num: 2, name: "CRM. MAXFEEL CREAM 200 GMS", comp: "", timing: "", dosage: "", freq: "3-4 Times/ Day - Daily - 15 Days" },
    ],
    followUp: "Next Visit : 19-Jul-2026 - Sunday",
    doctorName: "Dr.Meetesh Agrawal",
    doctorQual: "MD ( SKIN & VD)",
    clinicHeader: "MediSetu Skin & Hair Clinic | 123 Health St, City | +91 98765 43210",
    advice: "Avoid direct sunlight. Keep skin moisturized.",
    chiefComplaints: "Itching over both arms, Dry scaly patches (3 weeks)",
    vitals: "BP: 128/82 mmHg · Pulse: 78/min · SpO₂: 98% · Temp: 98.4°F · Wt: 64 kg · BMI: 24.1",
    allergies: "Sulfa drugs, Dust",
    tests: "CBC, LFT, Skin Biopsy, Vitamin D3",
    clinicalNotes: "Lesions improving since last visit. Continue topical therapy.",
};

// ─── Table style CSS for each variant ───
function getTableStyles(style: TableStyle): { table: React.CSSProperties; th: React.CSSProperties; td: React.CSSProperties; trEven: React.CSSProperties } {
    const base = { width: "100%" as const, borderCollapse: "collapse" as const, fontSize: 10 };
    switch (style) {
        case "bordered":
            return {
                table: { ...base, border: "1px solid #333" },
                th: { padding: "4px 6px", textAlign: "left" as const, fontWeight: "bold" as const, border: "1px solid #333", background: "#f5f5f5" },
                td: { padding: "4px 6px", border: "1px solid #ccc", verticalAlign: "top" as const },
                trEven: {},
            };
        case "striped":
            return {
                table: base,
                th: { padding: "4px 6px", textAlign: "left" as const, fontWeight: "bold" as const, borderBottom: "2px solid #333" },
                td: { padding: "5px 6px", verticalAlign: "top" as const },
                trEven: { background: "#f9f9f9" },
            };
        case "minimal":
            return {
                table: base,
                th: { padding: "4px 6px", textAlign: "left" as const, fontWeight: "bold" as const, color: "#666" },
                td: { padding: "6px", verticalAlign: "top" as const },
                trEven: {},
            };
        case "classic":
        default:
            return {
                table: base,
                th: { padding: "3px 6px", textAlign: "left" as const, fontWeight: "bold" as const, borderBottom: "1px solid #000" },
                td: { padding: "4px 6px", borderBottom: "1px solid #eee", verticalAlign: "top" as const },
                trEven: {},
            };
    }
}

function getBlockContent(blockId: BlockType, tableStyle: TableStyle): React.ReactNode {
    switch (blockId) {
        case "patientInfo":
            return <div style={{ fontSize: 11, fontWeight: "bold", whiteSpace: "nowrap" }}>{SAMPLE.patient}</div>;
        case "visitDate":
            return <div style={{ fontSize: 11, fontWeight: "bold", textAlign: "right" }}>{SAMPLE.visitDate}</div>;
        case "chiefComplaints":
            return <div style={{ fontSize: 10 }}><b>C/O:</b> {SAMPLE.chiefComplaints}</div>;
        case "vitals":
            return <div style={{ fontSize: 10 }}><b>Vitals:</b> {SAMPLE.vitals}</div>;
        case "allergies":
            return <div style={{ fontSize: 10, color: "#a00" }}><b>Allergies:</b> {SAMPLE.allergies}</div>;
        case "diagnosis":
            return <div style={{ fontSize: 11, fontStyle: "italic" }}>{SAMPLE.diagnosis}</div>;
        case "tests":
            return <div style={{ fontSize: 10 }}><b>Tests / Investigations:</b> {SAMPLE.tests}</div>;
        case "clinicalNotes":
            return <div style={{ fontSize: 10 }}><b>Notes:</b> {SAMPLE.clinicalNotes}</div>;
        case "rxSymbol":
            return <div style={{ fontSize: 16 }}>℞</div>;
        case "medicineTable": {
            const s = getTableStyles(tableStyle);
            return (
                <table style={s.table}>
                    <thead>
                        <tr>
                            <th style={{ ...s.th, width: 24 }}></th>
                            <th style={{ ...s.th, width: "35%" }}>Medicine</th>
                            <th style={{ ...s.th, width: "15%" }}>Dosage</th>
                            <th style={s.th}>Timing - Freq. - Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SAMPLE.medicines.map((m, i) => (
                            <tr key={m.num} style={i % 2 === 1 ? s.trEven : undefined}>
                                <td style={s.td}>{m.num})</td>
                                <td style={s.td}>
                                    <b>{m.name}</b>
                                    {m.comp && <div style={{ fontSize: 9, color: "#555", fontStyle: "italic" }}>Composition: {m.comp}</div>}
                                    {m.timing && <div style={{ fontSize: 9, fontStyle: "italic" }}>Timing: {m.timing}</div>}
                                </td>
                                <td style={s.td}>{m.dosage}</td>
                                <td style={s.td}>{m.freq}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        case "advice":
            return <div style={{ fontSize: 10 }}><b>Advice:</b> {SAMPLE.advice}</div>;
        case "followUp":
            return <div style={{ fontSize: 11, fontWeight: "bold", fontStyle: "italic" }}>{SAMPLE.followUp}</div>;
        case "doctorSignature":
            return (
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: "bold" }}>{SAMPLE.doctorName}</div>
                    <div style={{ fontSize: 11 }}>{SAMPLE.doctorQual}</div>
                </div>
            );
        case "clinicHeader":
            return <div style={{ fontSize: 10, textAlign: "center", borderBottom: "1px solid #000", paddingBottom: 3 }}>{SAMPLE.clinicHeader}</div>;
        default:
            return null;
    }
}

function getTableHtml(style: TableStyle): string {
    const styles: Record<TableStyle, { th: string; td: string; trEven: string; tableAttr: string }> = {
        classic: {
            tableAttr: `style="width:100%;border-collapse:collapse;font-size:10px"`,
            th: `style="padding:3px 6px;text-align:left;font-weight:bold;border-bottom:1px solid #000"`,
            td: `style="padding:4px 6px;border-bottom:1px solid #eee;vertical-align:top"`,
            trEven: "",
        },
        bordered: {
            tableAttr: `style="width:100%;border-collapse:collapse;font-size:10px;border:1px solid #333"`,
            th: `style="padding:4px 6px;text-align:left;font-weight:bold;border:1px solid #333;background:#f5f5f5"`,
            td: `style="padding:4px 6px;border:1px solid #ccc;vertical-align:top"`,
            trEven: "",
        },
        striped: {
            tableAttr: `style="width:100%;border-collapse:collapse;font-size:10px"`,
            th: `style="padding:4px 6px;text-align:left;font-weight:bold;border-bottom:2px solid #333"`,
            td: `style="padding:5px 6px;vertical-align:top"`,
            trEven: `style="background:#f9f9f9"`,
        },
        minimal: {
            tableAttr: `style="width:100%;border-collapse:collapse;font-size:10px"`,
            th: `style="padding:4px 6px;text-align:left;font-weight:bold;color:#666"`,
            td: `style="padding:6px;vertical-align:top"`,
            trEven: "",
        },
    };
    const s = styles[style];
    return `<table ${s.tableAttr}><thead><tr><th ${s.th} style="width:24px"></th><th ${s.th}>Medicine</th><th ${s.th}>Dosage</th><th ${s.th}>Timing - Freq. - Duration</th></tr></thead><tbody>${SAMPLE.medicines.map((m, i) => `<tr ${i % 2 === 1 ? s.trEven : ""}><td ${s.td}>${m.num})</td><td ${s.td}><b>${m.name}</b>${m.comp ? `<br><span style="font-size:9px;color:#555;font-style:italic">Composition: ${m.comp}</span>` : ""}${m.timing ? `<br><span style="font-size:9px;font-style:italic">Timing: ${m.timing}</span>` : ""}</td><td ${s.td}>${m.dosage}</td><td ${s.td}>${m.freq}</td></tr>`).join("")}</tbody></table>`;
}

function getBlockHtml(blockId: BlockType, tableStyle: TableStyle): string {
    switch (blockId) {
        case "patientInfo":
            return `<div style="font-size:11px;font-weight:bold">${SAMPLE.patient}</div>`;
        case "visitDate":
            return `<div style="font-size:11px;font-weight:bold;text-align:right">${SAMPLE.visitDate}</div>`;
        case "chiefComplaints":
            return `<div style="font-size:10px"><b>C/O:</b> ${SAMPLE.chiefComplaints}</div>`;
        case "vitals":
            return `<div style="font-size:10px"><b>Vitals:</b> ${SAMPLE.vitals}</div>`;
        case "allergies":
            return `<div style="font-size:10px;color:#a00"><b>Allergies:</b> ${SAMPLE.allergies}</div>`;
        case "diagnosis":
            return `<div style="font-size:11px;font-style:italic">${SAMPLE.diagnosis}</div>`;
        case "tests":
            return `<div style="font-size:10px"><b>Tests / Investigations:</b> ${SAMPLE.tests}</div>`;
        case "clinicalNotes":
            return `<div style="font-size:10px"><b>Notes:</b> ${SAMPLE.clinicalNotes}</div>`;
        case "rxSymbol":
            return `<div style="font-size:16px">℞</div>`;
        case "medicineTable":
            return getTableHtml(tableStyle);
        case "advice":
            return `<div style="font-size:10px"><b>Advice:</b> ${SAMPLE.advice}</div>`;
        case "followUp":
            return `<div style="font-size:11px;font-weight:bold;font-style:italic">${SAMPLE.followUp}</div>`;
        case "doctorSignature":
            return `<div style="text-align:right"><div style="font-size:12px;font-weight:bold">${SAMPLE.doctorName}</div><div style="font-size:11px">${SAMPLE.doctorQual}</div></div>`;
        case "clinicHeader":
            return `<div style="font-size:10px;text-align:center;border-bottom:1px solid #000;padding-bottom:4px">${SAMPLE.clinicHeader}</div>`;
        default:
            return "";
    }
}

// Fixed watermark - not movable, not toggleable
const POWERED_BY_TEXT = "Powered by Infinity MediSetu";
const POWERED_BY_URL = "www.infinitymedisetu.com";

const BLOCK_GROUP_ORDER: BlockGroup[] = ["header", "clinical", "treatment", "footer"];

const POSITION_FIELDS: { key: "x" | "y" | "width"; label: string }[] = [
    { key: "x", label: "X" },
    { key: "y", label: "Y" },
    { key: "width", label: "W" },
];

/** Arrow keys nudge the focused element by 1mm — 5mm with Shift held. */
const NUDGE_KEYS: Record<string, { axis: "x" | "y"; delta: number }> = {
    ArrowLeft: { axis: "x", delta: -1 },
    ArrowRight: { axis: "x", delta: 1 },
    ArrowUp: { axis: "y", delta: -1 },
    ArrowDown: { axis: "y", delta: 1 },
};

export interface QuickPrintTemplatesProps {
    /** True when this tab's template is the one prescriptions actually print with. */
    isActiveTemplate?: boolean;
    /** Lets the parent refresh the "active template" banner after a save. */
    onSaved?: () => void;
}

export default function QuickPrintTemplates({
    isActiveTemplate = false,
    onSaved,
}: QuickPrintTemplatesProps) {
    const [blocks, setBlocks] = useState<TemplateBlock[]>(DEFAULT_BLOCKS);
    const [pageSize, setPageSize] = useState<PaperSize>("a4");
    const [tableStyle, setTableStyle] = useState<TableStyle>("classic");
    // Multi-select: plain click replaces the selection, Ctrl/Cmd/Shift-click
    // adds to it. Everything selected drags and nudges as one rigid group.
    const [selectedBlocks, setSelectedBlocks] = useState<BlockType[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{
        x: number;
        y: number;
        origins: Map<BlockType, { x: number; y: number }>;
    } | null>(null);

    const { data: savedPreference, isLoading: isLoadingPreference } =
        useGetQuickPrintTemplateQuery();
    const [saveTemplate, { isLoading: isSaving }] =
        useSaveQuickPrintTemplateMutation();

    useEffect(() => {
        if (savedPreference?.data?.elementConfig) {
            const saved = savedPreference.data.elementConfig;
            if (saved.blockLayout) setBlocks(mergeSavedBlocks(saved.blockLayout));
            if (saved.pageSize) setPageSize(saved.pageSize as PaperSize);
            if (saved.tableStyle) setTableStyle(saved.tableStyle);
            setHasUnsavedChanges(false);
        }
    }, [savedPreference]);

    const visibleCount = blocks.filter((b) => b.visible).length;
    const pageDims = PAGE_SIZES[pageSize];
    const canvasWidthPx = 620;
    const scale = canvasWidthPx / pageDims.width;
    const canvasHeightPx = pageDims.height * scale;

    /**
     * Resolve what a click selects: additive with a modifier held, otherwise a
     * plain replace. Returns the resulting selection so callers that need to
     * act on it immediately (drag start) don't have to wait for a re-render.
     */
    const resolveSelection = useCallback(
        (blockId: BlockType, additive: boolean, current: BlockType[]): BlockType[] => {
            if (!additive) return [blockId];
            return current.includes(blockId)
                ? current.filter((id) => id !== blockId)
                : [...current, blockId];
        },
        [],
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent, blockId: BlockType) => {
            e.preventDefault();
            e.stopPropagation();

            const additive = e.ctrlKey || e.metaKey || e.shiftKey;
            // Dragging a block that's already part of a multi-selection keeps
            // the group intact — only a plain click on an unselected block
            // collapses the selection down to it.
            const nextSelection =
                !additive && selectedBlocks.includes(blockId)
                    ? selectedBlocks
                    : resolveSelection(blockId, additive, selectedBlocks);

            setSelectedBlocks(nextSelection);

            const origins = new Map<BlockType, { x: number; y: number }>();
            for (const id of nextSelection) {
                const block = blocks.find((b) => b.id === id);
                if (block) origins.set(id, { x: block.position.x, y: block.position.y });
            }
            if (origins.size === 0) return;

            dragStartRef.current = { x: e.clientX, y: e.clientY, origins };
            setIsDragging(true);
        },
        [blocks, selectedBlocks, resolveSelection],
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            const start = dragStartRef.current;
            if (!isDragging || !start || start.origins.size === 0) return;

            const rawDx = (e.clientX - start.x) / scale;
            const rawDy = (e.clientY - start.y) / scale;

            // Clamp the delta against the whole group's bounds so a multi-block
            // drag stays rigid instead of some blocks pinning at the edge while
            // others keep moving.
            const origins = [...start.origins.values()];
            const maxX = pageDims.width - 20;
            const maxY = pageDims.height - 10;
            const dx = Math.max(
                -Math.min(...origins.map((o) => o.x)),
                Math.min(rawDx, maxX - Math.max(...origins.map((o) => o.x))),
            );
            const dy = Math.max(
                -Math.min(...origins.map((o) => o.y)),
                Math.min(rawDy, maxY - Math.max(...origins.map((o) => o.y))),
            );

            setBlocks((prev) =>
                prev.map((b) => {
                    const origin = start.origins.get(b.id);
                    if (!origin) return b;

                    return {
                        ...b,
                        position: {
                            ...b.position,
                            x: Math.round(origin.x + dx),
                            y: Math.round(origin.y + dy),
                        },
                    };
                }),
            );
            setHasUnsavedChanges(true);
        },
        [isDragging, scale, pageDims],
    );

    const handleMouseUp = useCallback(() => { setIsDragging(false); dragStartRef.current = null; }, []);

    const toggleBlockVisibility = useCallback((blockId: BlockType, visible: boolean) => {
        setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, visible } : b)));
        // Selecting on enable highlights the element on the canvas, so it's
        // obvious where a newly shown section landed on the page.
        if (visible) setSelectedBlocks([blockId]);
        setHasUnsavedChanges(true);
    }, []);

    const selectAllVisible = useCallback(() => {
        setSelectedBlocks(blocks.filter((b) => b.visible).map((b) => b.id));
    }, [blocks]);

    const updateBlockPosition = useCallback(
        (blockId: BlockType, key: "x" | "y" | "width", value: number) => {
            if (Number.isNaN(value)) return;
            setBlocks((prev) =>
                prev.map((b) =>
                    b.id === blockId
                        ? { ...b, position: { ...b.position, [key]: Math.max(0, Math.round(value)) } }
                        : b,
                ),
            );
            setHasUnsavedChanges(true);
        },
        [],
    );

    const handleBlockNudgeKey = useCallback(
        (e: React.KeyboardEvent, blockId: BlockType) => {
            const nudge = NUDGE_KEYS[e.key];
            if (!nudge) return;

            e.preventDefault();

            // Nudging a block inside the current selection moves the whole
            // group; nudging one outside it selects that block alone first.
            const group = selectedBlocks.includes(blockId) ? selectedBlocks : [blockId];
            if (group.length === 1) setSelectedBlocks(group);

            // Shift is the "bigger step" modifier here, so it must not also be
            // read as an additive-selection modifier.
            const step = e.shiftKey ? 5 : 1;
            const delta = nudge.delta * step;

            setBlocks((prev) => {
                const moving = prev.filter((b) => group.includes(b.id));
                // Clamp as a group, both edges, so the arrangement stays rigid
                // and no block can be nudged off the page.
                const limit =
                    nudge.axis === "x" ? pageDims.width - 20 : pageDims.height - 10;
                const positions = moving.map((b) => b.position[nudge.axis]);
                const applied =
                    delta < 0
                        ? Math.max(delta, -Math.min(...positions))
                        : Math.min(delta, limit - Math.max(...positions));
                if (applied <= 0 && delta > 0) return prev;
                if (applied >= 0 && delta < 0) return prev;

                return prev.map((b) =>
                    group.includes(b.id)
                        ? {
                            ...b,
                            position: {
                                ...b.position,
                                [nudge.axis]: b.position[nudge.axis] + applied,
                            },
                        }
                        : b,
                );
            });
            setHasUnsavedChanges(true);
        },
        [selectedBlocks, pageDims],
    );

    const setAllBlocksVisible = useCallback((visible: boolean) => {
        setBlocks((prev) => prev.map((b) => ({ ...b, visible })));
        setHasUnsavedChanges(true);
    }, []);

    const handleResetToDefault = useCallback(() => {
        setBlocks(DEFAULT_BLOCKS);
        setPageSize("a4");
        setTableStyle("classic");
        setSelectedBlocks([]);
        setHasUnsavedChanges(true);
        addToast({ title: "Reset", description: "Layout reset to default", color: "primary" });
    }, []);

    const handleSave = useCallback(async () => {
        try {
            await saveTemplate({
                selectedTemplate: "compact-medicine-slip",
                elementConfig: {
                    // Only the per-doctor bits: label/group come from DEFAULT_BLOCKS
                    // on load, so renaming an element never needs a data migration.
                    blockLayout: blocks.map(({ id, visible, position }) => ({
                        id,
                        visible,
                        position,
                    })),
                    pageSize,
                    tableStyle,
                } satisfies ElementConfig,
            }).unwrap();
            addToast({
                title: "Saved",
                description: "Quick Print is now the active template for printing",
                color: "success",
            });
            setHasUnsavedChanges(false);
            onSaved?.();
        } catch {
            addToast({ title: "Error", description: "Failed to save layout", color: "danger" });
        }
    }, [blocks, pageSize, tableStyle, saveTemplate, onSaved]);

    const handlePrint = useCallback(() => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        const visibleBlocks = blocks.filter((b) => b.visible);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page { size: ${pageDims.width}mm ${pageDims.height}mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Inter, Arial, sans-serif; width: ${pageDims.width}mm; height: ${pageDims.height}mm; position: relative; color: #000; }
.block { position: absolute; }
.powered-by { position: absolute; bottom: 4mm; left: 0; right: 0; text-align: center; font-size: 8px; color: #999; }
</style></head><body>
${visibleBlocks.map((b) => `<div class="block" style="left:${b.position.x}mm;top:${b.position.y}mm;width:${b.position.width}mm;">${getBlockHtml(b.id, tableStyle)}</div>`).join("\n")}
<div class="powered-by">${POWERED_BY_TEXT} | ${POWERED_BY_URL}</div>
</body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    }, [blocks, pageDims, tableStyle]);

    if (isLoadingPreference) {
        return <div className="flex justify-center items-center min-h-[300px]"><Spinner size="lg" /></div>;
    }

    return (
        <div className="space-y-3">
            {/* Top toolbar */}
            <Card className="shadow-none rounded-2xl border border-default-100">
                <CardBody className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <FiLayout size={14} className="text-primary" />
                            <h3 className="text-[13px] font-semibold text-default-800">Page Layout Designer</h3>
                            {isActiveTemplate ? (
                                <Chip size="sm" color="success" variant="flat" className="text-[9px] h-5">
                                    Active for printing
                                </Chip>
                            ) : (
                                <Chip size="sm" variant="flat" className="text-[9px] h-5 text-default-500">
                                    Not active — save to use this
                                </Chip>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Select
                                size="sm"
                                selectedKeys={[pageSize]}
                                onSelectionChange={(keys) => { const v = Array.from(keys)[0] as PaperSize; if (v) { setPageSize(v); setHasUnsavedChanges(true); } }}
                                className="w-[160px]"
                                classNames={{ trigger: "text-[11px] h-8 min-h-8 rounded-lg" }}
                            >
                                {Object.entries(PAGE_SIZES).map(([key, dim]) => (
                                    <SelectItem key={key} textValue={dim.label}><span className="text-[11px]">{dim.label}</span></SelectItem>
                                ))}
                            </Select>
                            <Button size="sm" variant="bordered" className="text-[11px] h-8 border-default-200" startContent={<FiRefreshCw size={11} />} onPress={handleResetToDefault}>Reset</Button>
                            <Button size="sm" className="text-[11px] font-semibold h-8 bg-[#0a6c74] text-white hover:bg-[#095a61]" startContent={<FiSave size={11} />} onPress={handleSave} isLoading={isSaving} isDisabled={!hasUnsavedChanges}>Save</Button>
                            <Button size="sm" className="bg-primary text-white text-[11px] font-semibold h-8" startContent={<FiPrinter size={11} />} onPress={handlePrint}>Print</Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
                {/* Sidebar */}
                <div className="space-y-3">
                    {/* Elements panel */}
                    <Card className="shadow-none rounded-2xl border border-default-100">
                        <CardBody className="p-3">
                            {/* Title and bulk actions sit on separate rows — at the
                                220px sidebar width they wrap mid-label side by side. */}
                            <div className="mb-2">
                                <div className="flex items-center gap-2">
                                    <FiSliders size={12} className="text-primary" />
                                    <span className="text-[11px] font-semibold text-default-800">Elements</span>
                                </div>
                                <p className="mt-0.5 text-[9px] text-default-500">
                                    {visibleCount} of {blocks.length} elements on the page
                                </p>

                                <div
                                    role="group"
                                    aria-label="Show or hide every element"
                                    className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-lg border border-default-200"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setAllBlocksVisible(true)}
                                        disabled={visibleCount === blocks.length}
                                        className="border-r border-default-200 py-1 text-[10px] font-medium text-default-700 transition-colors hover:bg-default-100 disabled:cursor-not-allowed disabled:text-default-300 disabled:hover:bg-transparent"
                                    >
                                        Show all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAllBlocksVisible(false)}
                                        disabled={visibleCount === 0}
                                        className="py-1 text-[10px] font-medium text-default-700 transition-colors hover:bg-default-100 disabled:cursor-not-allowed disabled:text-default-300 disabled:hover:bg-transparent"
                                    >
                                        Hide all
                                    </button>
                                </div>

                                <div
                                    role="group"
                                    aria-label="Select elements to move together"
                                    className="mt-1 grid grid-cols-2 overflow-hidden rounded-lg border border-default-200"
                                >
                                    <button
                                        type="button"
                                        onClick={selectAllVisible}
                                        disabled={visibleCount === 0}
                                        className="border-r border-default-200 py-1 text-[10px] font-medium text-default-700 transition-colors hover:bg-default-100 disabled:cursor-not-allowed disabled:text-default-300 disabled:hover:bg-transparent"
                                    >
                                        Select all
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBlocks([])}
                                        disabled={selectedBlocks.length === 0}
                                        className="py-1 text-[10px] font-medium text-default-700 transition-colors hover:bg-default-100 disabled:cursor-not-allowed disabled:text-default-300 disabled:hover:bg-transparent"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {selectedBlocks.length > 1 && (
                                    <p className="mt-1.5 rounded-lg bg-primary/10 px-2 py-1 text-[9px] leading-snug text-default-600">
                                        <span className="font-semibold">{selectedBlocks.length} elements selected</span>
                                        {" — drag any one of them, or use the arrow keys, to move them all together."}
                                    </p>
                                )}
                            </div>

                            {BLOCK_GROUP_ORDER.map((group) => {
                                const groupBlocks = blocks.filter((b) => b.group === group);
                                if (groupBlocks.length === 0) return null;

                                return (
                                    <div key={group} className="mb-2 last:mb-0">
                                        <p className="text-[8px] font-semibold uppercase tracking-wide text-default-400 px-2 mb-0.5">
                                            {BLOCK_GROUP_LABELS[group]}
                                        </p>
                                        <div className="space-y-0.5">
                                            {groupBlocks.map((block) => {
                                                const isSelected = selectedBlocks.includes(block.id);

                                                return (
                                                    <div
                                                        key={block.id}
                                                        className={`rounded-lg transition-colors ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-default-50"}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 px-2 py-1">
                                                            <button
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                title="Click to select (Ctrl/Cmd-click to add to the selection), then drag on the page or nudge with the arrow keys"
                                                                onClick={(e) =>
                                                                    setSelectedBlocks((prev) =>
                                                                        resolveSelection(
                                                                            block.id,
                                                                            e.ctrlKey || e.metaKey || e.shiftKey,
                                                                            prev,
                                                                        ),
                                                                    )
                                                                }
                                                                onKeyDown={(e) => handleBlockNudgeKey(e, block.id)}
                                                                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                                            >
                                                                <FiCrosshair
                                                                    size={9}
                                                                    className={`shrink-0 ${isSelected ? "text-primary" : "text-default-400"}`}
                                                                />
                                                                <span
                                                                    className={`truncate text-[10px] ${block.visible ? "text-default-700" : "text-default-400"}`}
                                                                >
                                                                    {block.label}
                                                                </span>
                                                                {/* Coordinate readout, so the whole layout can be
                                                                    scanned without selecting each element in turn. */}
                                                                <span
                                                                    className="ml-auto shrink-0 pl-1 text-[9px] tabular-nums text-default-400"
                                                                    aria-label={`Positioned at ${block.position.x} by ${block.position.y} millimetres`}
                                                                >
                                                                    {block.position.x},{block.position.y}
                                                                </span>
                                                            </button>
                                                            <Switch
                                                                size="sm"
                                                                color="primary"
                                                                aria-label={`Show ${block.label} on the prescription`}
                                                                isSelected={block.visible}
                                                                onValueChange={(val) => toggleBlockVisibility(block.id, val)}
                                                            />
                                                        </div>

                                                        {/* Only a lone selection expands — with a group
                                                            selected, 14 open editors would bury the list. */}
                                                        {isSelected && selectedBlocks.length === 1 && (
                                                            <div className="px-2 pb-2">
                                                                <p className="mb-1 text-[9px] leading-snug text-default-500">
                                                                    {BLOCK_HINTS[block.id]}
                                                                </p>
                                                                <p className="mb-1 text-[8px] font-semibold uppercase tracking-wide text-default-400">
                                                                    Position (mm)
                                                                </p>
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    {POSITION_FIELDS.map((field) => (
                                                                        <Input
                                                                            key={field.key}
                                                                            size="sm"
                                                                            type="number"
                                                                            aria-label={`${block.label} ${field.label} in millimetres`}
                                                                            startContent={<span className="text-[9px] text-default-400">{field.label}</span>}
                                                                            value={String(block.position[field.key])}
                                                                            onValueChange={(val) => updateBlockPosition(block.id, field.key, Number(val))}
                                                                            classNames={{ inputWrapper: "h-7 min-h-7 px-1.5", input: "text-[10px] text-right" }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                        </CardBody>
                    </Card>

                    {/* Table Style selector */}
                    <Card className="shadow-none rounded-2xl border border-default-100">
                        <CardBody className="p-3">
                            <p className="text-[11px] font-semibold text-default-800 mb-2">Table Style</p>
                            <div className="space-y-1">
                                {TABLE_STYLES.map((ts) => (
                                    <button
                                        key={ts.id}
                                        type="button"
                                        onClick={() => { setTableStyle(ts.id); setHasUnsavedChanges(true); }}
                                        className={`w-full text-left rounded-lg px-2.5 py-1.5 transition-colors ${tableStyle === ts.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-default-50"}`}
                                    >
                                        <span className="text-[10px] font-semibold text-default-800">{ts.label}</span>
                                        <span className="text-[9px] text-default-400 ml-1">— {ts.description}</span>
                                    </button>
                                ))}
                            </div>
                        </CardBody>
                    </Card>

                    <div className="rounded-xl bg-default-50 border border-default-100 p-2.5">
                        <p className="text-[9px] text-default-500 leading-relaxed">
                            <FiEye size={9} className="inline mr-0.5" />
            Drag elements on the page, or nudge them with the arrow keys (hold Shift for 5mm). Ctrl/Cmd-click to select several and move them together. Sections with no data on a visit are skipped automatically when printing.
                        </p>
                    </div>
                </div>

                {/* Canvas */}
                <Card className="shadow-none rounded-2xl border border-default-100 overflow-auto">
                    <CardBody className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FiEye size={12} className="text-primary" />
                            <span className="text-[11px] font-semibold text-default-800">Preview</span>
                            <Chip size="sm" variant="flat" className="text-[8px] h-5">{PAGE_SIZES[pageSize].label}</Chip>
                        </div>

                        <div className="flex justify-center overflow-auto">
                            <div
                                ref={canvasRef}
                                className="relative bg-surface border border-gray-300 shadow-md select-none shrink-0"
                                style={{ width: `${canvasWidthPx}px`, height: `${canvasHeightPx}px`, cursor: isDragging ? "grabbing" : "default" }}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {/* Margin guides */}
                                <div className="absolute border border-dashed border-blue-100 pointer-events-none" style={{ left: `${10 * scale}px`, top: `${10 * scale}px`, right: `${10 * scale}px`, bottom: `${10 * scale}px` }} />

                                {/* Draggable Blocks */}
                                {blocks.filter((b) => b.visible).map((block) => {
                                    const isSelected = selectedBlocks.includes(block.id);
                                    const contentScale = scale / 2.95;
                                    return (
                                        <div
                                            key={block.id}
                                            className={`absolute cursor-grab active:cursor-grabbing ${isSelected ? "ring-2 ring-blue-400 bg-blue-50/20 z-20" : "hover:ring-1 hover:ring-gray-200 z-10"}`}
                                            style={{
                                                left: `${block.position.x * scale}px`,
                                                top: `${block.position.y * scale}px`,
                                                width: `${block.position.width * scale}px`,
                                                minHeight: `${Math.max(8, block.position.height) * scale}px`,
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, block.id)}
                                        >
                                            {/* With a group selected the per-block
                                                labels become noise, so only a lone
                                                selection is labelled. */}
                                            {isSelected && selectedBlocks.length === 1 && (
                                                <div className="absolute -top-3.5 left-0 text-[7px] font-bold text-blue-500 bg-blue-50 px-1 rounded whitespace-nowrap">{block.label}</div>
                                            )}
                                            <div style={{ transform: `scale(${contentScale})`, transformOrigin: "top left", width: `${(block.position.width * scale) / contentScale}px`, fontFamily: "Inter, Arial, sans-serif" }}>
                                                {getBlockContent(block.id, tableStyle)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Fixed "Powered by" footer — NOT movable, NOT toggleable */}
                                <div
                                    className="absolute left-0 right-0 text-center pointer-events-none select-none"
                                    style={{ bottom: `${4 * scale}px`, fontSize: `${8 * (scale / 2.95)}px`, color: "#aaa", fontFamily: "Inter, Arial, sans-serif" }}
                                >
                                    {POWERED_BY_TEXT} | {POWERED_BY_URL}
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
