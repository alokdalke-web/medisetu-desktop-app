import {
    Button,
    Card,
    CardBody,
    Chip,
    Select,
    SelectItem,
    Spinner,
    Switch,
    addToast,
} from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    FiMove,
    FiPrinter,
    FiSave,
    FiSliders,
    FiEye,
    FiLayout,
    FiRefreshCw,
} from "react-icons/fi";
import {
    DEFAULT_BLOCKS,
    PAGE_SIZES,
    type BlockType,
    type PaperSize,
    type TemplateBlock,
} from "./types";
import {
    useGetQuickPrintTemplateQuery,
    useSaveQuickPrintTemplateMutation,
    type ElementConfig,
} from "../../../redux/api/quickPrintTemplateApi";

// ─── Table Style Variants ───
export type TableStyle = "classic" | "bordered" | "striped" | "minimal";

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
        case "diagnosis":
            return <div style={{ fontSize: 11, fontStyle: "italic" }}>{SAMPLE.diagnosis}</div>;
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
        case "diagnosis":
            return `<div style="font-size:11px;font-style:italic">${SAMPLE.diagnosis}</div>`;
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

export default function QuickPrintTemplates() {
    const [blocks, setBlocks] = useState<TemplateBlock[]>(DEFAULT_BLOCKS);
    const [pageSize, setPageSize] = useState<PaperSize>("a4");
    const [tableStyle, setTableStyle] = useState<TableStyle>("classic");
    const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number; y: number; blockX: number; blockY: number } | null>(null);

    const { data: savedPreference, isLoading: isLoadingPreference } =
        useGetQuickPrintTemplateQuery();
    const [saveTemplate, { isLoading: isSaving }] =
        useSaveQuickPrintTemplateMutation();

    useEffect(() => {
        if (savedPreference?.data?.elementConfig) {
            const saved = savedPreference.data.elementConfig;
            if (saved.blockLayout) setBlocks(saved.blockLayout as unknown as TemplateBlock[]);
            if (saved.pageSize) setPageSize(saved.pageSize as PaperSize);
            if ((saved as any).tableStyle) setTableStyle((saved as any).tableStyle as TableStyle);
            setHasUnsavedChanges(false);
        }
    }, [savedPreference]);

    const pageDims = PAGE_SIZES[pageSize];
    const canvasWidthPx = 620;
    const scale = canvasWidthPx / pageDims.width;
    const canvasHeightPx = pageDims.height * scale;

    const handleMouseDown = useCallback(
        (e: React.MouseEvent, blockId: BlockType) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedBlock(blockId);
            setIsDragging(true);
            const block = blocks.find((b) => b.id === blockId);
            if (!block) return;
            dragStartRef.current = { x: e.clientX, y: e.clientY, blockX: block.position.x, blockY: block.position.y };
        },
        [blocks],
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isDragging || !selectedBlock || !dragStartRef.current) return;
            const dx = (e.clientX - dragStartRef.current.x) / scale;
            const dy = (e.clientY - dragStartRef.current.y) / scale;
            const newX = Math.max(0, Math.min(pageDims.width - 20, dragStartRef.current.blockX + dx));
            const newY = Math.max(0, Math.min(pageDims.height - 10, dragStartRef.current.blockY + dy));
            setBlocks((prev) =>
                prev.map((b) => b.id === selectedBlock ? { ...b, position: { ...b.position, x: Math.round(newX), y: Math.round(newY) } } : b),
            );
            setHasUnsavedChanges(true);
        },
        [isDragging, selectedBlock, scale, pageDims],
    );

    const handleMouseUp = useCallback(() => { setIsDragging(false); dragStartRef.current = null; }, []);

    const toggleBlockVisibility = useCallback((blockId: BlockType, visible: boolean) => {
        setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, visible } : b)));
        setHasUnsavedChanges(true);
    }, []);

    const handleResetToDefault = useCallback(() => {
        setBlocks(DEFAULT_BLOCKS);
        setPageSize("a4");
        setTableStyle("classic");
        setSelectedBlock(null);
        setHasUnsavedChanges(true);
        addToast({ title: "Reset", description: "Layout reset to default", color: "primary" });
    }, []);

    const handleSave = useCallback(async () => {
        try {
            await saveTemplate({
                selectedTemplate: "compact-medicine-slip",
                elementConfig: {
                    blockLayout: blocks as unknown as any,
                    pageSize,
                    tableStyle,
                } as unknown as ElementConfig,
            }).unwrap();
            addToast({ title: "Saved", description: "Template layout saved", color: "success" });
            setHasUnsavedChanges(false);
        } catch {
            addToast({ title: "Error", description: "Failed to save layout", color: "danger" });
        }
    }, [blocks, pageSize, tableStyle, saveTemplate]);

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
                            <div className="flex items-center gap-2 mb-2">
                                <FiSliders size={12} className="text-primary" />
                                <span className="text-[11px] font-semibold text-default-800">Elements</span>
                            </div>
                            <div className="space-y-0.5">
                                {blocks.map((block) => (
                                    <div
                                        key={block.id}
                                        className={`flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${selectedBlock === block.id ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-default-50"}`}
                                        onClick={() => setSelectedBlock(block.id)}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <FiMove size={9} className="text-default-400 shrink-0" />
                                            <span className="text-[10px] text-default-700 truncate">{block.label}</span>
                                        </div>
                                        <Switch size="sm" color="primary" isSelected={block.visible} onValueChange={(val) => toggleBlockVisibility(block.id, val)} />
                                    </div>
                                ))}
                            </div>
                            {selectedBlock && (() => {
                                const b = blocks.find((bl) => bl.id === selectedBlock);
                                if (!b) return null;
                                return (
                                    <div className="mt-2 pt-2 border-t border-default-100">
                                        <div className="grid grid-cols-3 gap-1 text-[9px] text-default-500">
                                            <span>X:{b.position.x}mm</span><span>Y:{b.position.y}mm</span><span>W:{b.position.width}mm</span>
                                        </div>
                                    </div>
                                );
                            })()}
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
                            Drag elements on the page. Toggle switches to show/hide. Select a table style below.
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
                                className="relative bg-white border border-gray-300 shadow-md select-none shrink-0"
                                style={{ width: `${canvasWidthPx}px`, height: `${canvasHeightPx}px`, cursor: isDragging ? "grabbing" : "default" }}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                {/* Margin guides */}
                                <div className="absolute border border-dashed border-blue-100 pointer-events-none" style={{ left: `${10 * scale}px`, top: `${10 * scale}px`, right: `${10 * scale}px`, bottom: `${10 * scale}px` }} />

                                {/* Draggable Blocks */}
                                {blocks.filter((b) => b.visible).map((block) => {
                                    const isSelected = selectedBlock === block.id;
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
                                            {isSelected && (
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
