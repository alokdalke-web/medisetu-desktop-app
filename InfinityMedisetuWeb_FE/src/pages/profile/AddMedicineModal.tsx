import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import React from "react";
import { FiUploadCloud } from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import { RiDeleteBin6Line } from "react-icons/ri";
import {
  useCreateMedicineMutation,
  useUpdateMedicineMutation,
  useUploadMedicinesCsvMutation,
  useLazyGetMedicineBrandsQuery,
  useLazyGetMedicineCategoriesQuery,
  useLazyGetMedicineGenericsQuery,
  useLazyGetMedicineManufacturersQuery,
} from "../../redux/api/medicineApi";

export type SingleMedicineValues = {
  medicine: string; // genericName
  brandName: string; // name
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;

  // ✅ keep to avoid accidentally setting true -> false on edit
  requiresPrescription?: boolean;
};

// ✅ Edit needs id
export type EditInitial =
  | (Partial<SingleMedicineValues> & { id?: string })
  | undefined;

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  mode?: "add" | "edit";
  initial?: EditInitial;
};

const tabBtn =
  "flex items-center gap-2 pb-2 text-sm font-medium transition border-b-2";
const tabActive = "border-primary text-primary";
const tabIdle = "border-transparent text-slate-500 hover:text-slate-700";

const emptySingle: SingleMedicineValues = {
  medicine: "",
  brandName: "",
  manufacturer: "",
  composition: "",
  form: "",
  strength: "",
  category: "",
  requiresPrescription: false,
};

/** ✅ Single source of truth for sample template data */
function getSampleTemplate() {
  const headers = [
    "name",
    "generic name",
    "form",
    "composition",
    "category",
    "strength",
    "manufacturer",
  ];

  const rows = [
    ["Paracetamol 500", "Paracetamol", "Tablet", "Paracetamol 500 mg", "Pain Relief", "500mg", "GSK"],
    ["Dolo 650", "Paracetamol", "Tablet", "Paracetamol 650 mg", "Pain Relief", "650mg", "Micro Labs"],
    [
      "Azithral 500",
      "Azithromycin",
      "Tablet",
      "Azithromycin 500 mg",
      "Antibiotic",
      "500mg",
      "Alembic",
    ],
    [
      "Augmentin 625",
      "Amoxycillin + Clavulanic Acid",
      "Tablet",
      "Amoxycillin, Clavulanic Acid",
      "Antibiotic",
      "625mg",
      "GSK",
    ],
    ["Pan D", "Pantoprazole + Domperidone", "Capsule", "Pantoprazole, Domperidone", "Gastric", "", "Alkem"],
    ["Bekadex", "Multivitamin", "Capsule", "Multivitamin", "Supplements", "", "Dr Reddy"],
    [
      "Ascoril LS",
      "Ambroxol + Levosalbutamol + Guaiphenesin",
      "Syrup",
      "Ambroxol, Levosalbutamol, Guaiphenesin",
      "Cough",
      "",
      "Glenmark",
    ],
    ["Telma 40", "Telmisartan", "Tablet", "Telmisartan 40 mg", "Cardiac", "40mg", "Glenmark"],
    [
      "Shellcal 500",
      "Calcium + Vitamin D3",
      "Tablet",
      "Calcium, Vitamin D3",
      "Supplements",
      "500mg",
      "Torrent",
    ],
    [
      "Montair LC",
      "Montelukast + Levocetirizine",
      "Tablet",
      "Montelukast, Levocetirizine",
      "Allergy",
      "",
      "Cipla",
    ],
  ];

  return { headers, rows };
}

function downloadSampleCSV() {
  const { headers, rows } = getSampleTemplate();

  const escape = (v: string) => `"${String(v ?? "").replaceAll('"', '""')}"`;

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "medicine-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

/** ✅ Excel (.xlsx) download */
async function downloadSampleExcel() {
  try {
    const { headers, rows } = getSampleTemplate();

    // ✅ Install: npm i xlsx
    const XLSX = await import("xlsx");

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Medicines");

    XLSX.writeFile(wb, "medicine-template.xlsx");
  } catch (_e) {
    addToast({
      title: "Excel download failed",
      description: "Please install xlsx: npm i xlsx",
      color: "danger",
    });
  }
}

// ✅ normalize response (array or wrapped)
function normalizeList(data: any, key: string): string[] {
  if (!data) return [];
  if (Array.isArray(data))
    return data.map((x) => String(x ?? "")).filter(Boolean);

  const arr = data[key] || data.data || data.result || data.items || [];
  if (!Array.isArray(arr)) return [];
  return arr.map((x: any) => String(x ?? "")).filter(Boolean);
}

/** ✅ Convert Excel (.xlsx/.xls) -> CSV File (so backend can keep CSV endpoint) */
async function excelToCsvFile(excelFile: File): Promise<File> {
  const XLSX = await import("xlsx");

  const buf = await excelFile.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const firstSheetName = wb.SheetNames?.[0];
  if (!firstSheetName) throw new Error("No sheets found in Excel file.");

  const ws = wb.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });

  // make a CSV file (upload to same API)
  const csvName = excelFile.name.replace(/\.(xlsx|xls)$/i, ".csv");
  return new File([csv], csvName, { type: "text/csv;charset=utf-8" });
}

/** ✅ Parse CSV text into header + rows for preview */
function parseCsvForPreview(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        // Simple CSV parse (handles quoted fields)
        const parseLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseLine(lines[0]);
        const rows = lines.slice(1).map(parseLine);
        resolve({ headers, rows });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

type AutoBoxProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  idx: number;
  setIdx: (v: number | ((p: number) => number)) => void;
  suggestions: string[];
  isFetching: boolean;
  onPick: (v: string) => void;
  query: string;
  boxRef: React.RefObject<HTMLDivElement | null>;
};

function AutoBox({
  open,
  setOpen,
  idx,
  setIdx,
  suggestions,
  isFetching,
  onPick,
  query,
  boxRef,
}: AutoBoxProps) {
  if (!open || query.trim().length < 1) return null;

  return (
    <div
      ref={boxRef}
      className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="max-h-56 overflow-auto py-1">
        {isFetching ? (
          <div className="px-4 py-2 text-sm text-slate-500">Searching...</div>
        ) : suggestions.length === 0 ? (
          <div className="px-4 py-2 text-sm text-slate-500">No match found</div>
        ) : (
          suggestions.map((s, i) => (
            <button
              key={s + i}
              type="button"
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                i === idx ? "bg-primary/10" : ""
              }`}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                onPick(s);
                setOpen(false);
                setIdx(-1);
              }}
              title={s}
            >
              <div className="truncate">{s}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const AddMedicineModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  mode = "add",
  initial,
}) => {
  const isEdit = mode === "edit";
  const [tab, setTab] = React.useState<"single" | "bulk">("single");

  // ✅ keep editing id separately for PATCH
  const [editId, setEditId] = React.useState<string | null>(null);

  const [single, setSingle] = React.useState<SingleMedicineValues>({
    ...emptySingle,
    ...(initial ?? {}),
  });

  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [displayFileName, setDisplayFileName] = React.useState<string | null>(
    null
  );
  const [converting, setConverting] = React.useState(false);

  // ✅ File preview state
  const [previewHeaders, setPreviewHeaders] = React.useState<string[]>([]);
  const [previewRows, setPreviewRows] = React.useState<string[][]>([]);
  const [showPreview, setShowPreview] = React.useState(false);

  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const [createMedicine, { isLoading: creating }] = useCreateMedicineMutation();
  const [updateMedicine, { isLoading: updating }] = useUpdateMedicineMutation();
  const [uploadMedicinesCsv, { isLoading: uploading }] =
    useUploadMedicinesCsvMutation();

  const isLoading = creating || updating || uploading || converting;

  // ✅ Generics
  const [genericOpen, setGenericOpen] = React.useState(false);
  const [genericIdx, setGenericIdx] = React.useState(-1);
  const genericWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [fetchGenerics, { data: genData, isFetching: genFetching }] =
    useLazyGetMedicineGenericsQuery();
  const genAll = React.useMemo(
    () => normalizeList(genData, "generics"),
    [genData]
  );
  const genSuggestions = React.useMemo(() => {
    const q = single.medicine.trim().toLowerCase();
    if (!q) return [];
    return genAll.filter((x) => x.toLowerCase().includes(q)).slice(0, 8);
  }, [genAll, single.medicine]);

  // ✅ Brands
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [brandIdx, setBrandIdx] = React.useState(-1);
  const brandWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [fetchBrands, { data: brandData, isFetching: brandFetching }] =
    useLazyGetMedicineBrandsQuery();
  const brandAll = React.useMemo(
    () => normalizeList(brandData, "brands"),
    [brandData]
  );
  const brandSuggestions = React.useMemo(() => {
    const q = single.brandName.trim().toLowerCase();
    if (!q) return [];
    return brandAll.filter((x) => x.toLowerCase().includes(q)).slice(0, 8);
  }, [brandAll, single.brandName]);

  // ✅ Manufacturers
  const [manOpen, setManOpen] = React.useState(false);
  const [manIdx, setManIdx] = React.useState(-1);
  const manWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [fetchManufacturers, { data: manData, isFetching: manFetching }] =
    useLazyGetMedicineManufacturersQuery();
  const manAll = React.useMemo(
    () => normalizeList(manData, "manufacturers"),
    [manData]
  );
  const manSuggestions = React.useMemo(() => {
    const q = single.manufacturer.trim().toLowerCase();
    if (!q) return [];
    return manAll.filter((x) => x.toLowerCase().includes(q)).slice(0, 8);
  }, [manAll, single.manufacturer]);

  // ✅ Categories
  const [catOpen, setCatOpen] = React.useState(false);
  const [catIdx, setCatIdx] = React.useState(-1);
  const catWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [fetchCategories, { data: catData, isFetching: catFetching }] =
    useLazyGetMedicineCategoriesQuery();
  const catAll = React.useMemo(
    () => normalizeList(catData, "categories"),
    [catData]
  );
  const catSuggestions = React.useMemo(() => {
    const q = single.category.trim().toLowerCase();
    if (!q) return [];
    return catAll.filter((x) => x.toLowerCase().includes(q)).slice(0, 8);
  }, [catAll, single.category]);

  // ✅ reset on open
  React.useEffect(() => {
    if (!isOpen) return;

    setTab("single");
    setCsvFile(null);
    setDisplayFileName(null);
    setConverting(false);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowPreview(false);

    // ✅ store edit id
    const id = (initial as any)?.id;
    setEditId(id ? String(id) : null);

    // ✅ prefill single form
    setSingle({ ...emptySingle, ...(initial ?? {}) });

    setGenericOpen(false);
    setGenericIdx(-1);
    setBrandOpen(false);
    setBrandIdx(-1);
    setManOpen(false);
    setManIdx(-1);
    setCatOpen(false);
    setCatIdx(-1);

    if (fileRef.current) fileRef.current.value = "";
  }, [isOpen, initial]);

  // ✅ close dropdowns on outside click
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;

      const inside =
        genericWrapRef.current?.contains(t) ||
        brandWrapRef.current?.contains(t) ||
        manWrapRef.current?.contains(t) ||
        catWrapRef.current?.contains(t);

      if (inside) return;

      setGenericOpen(false);
      setGenericIdx(-1);
      setBrandOpen(false);
      setBrandIdx(-1);
      setManOpen(false);
      setManIdx(-1);
      setCatOpen(false);
      setCatIdx(-1);
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ✅ debounce API calls
  React.useEffect(() => {
    const q = single.medicine.trim();
    if (!isOpen || q.length < 2) return;
    const t = setTimeout(() => fetchGenerics({ q }), 250);
    return () => clearTimeout(t);
  }, [single.medicine, fetchGenerics, isOpen]);

  React.useEffect(() => {
    const q = single.brandName.trim();
    if (!isOpen || q.length < 2) return;
    const t = setTimeout(() => fetchBrands({ q }), 250);
    return () => clearTimeout(t);
  }, [single.brandName, fetchBrands, isOpen]);

  React.useEffect(() => {
    const q = single.manufacturer.trim();
    if (!isOpen || q.length < 2) return;
    const t = setTimeout(() => fetchManufacturers({ q }), 250);
    return () => clearTimeout(t);
  }, [single.manufacturer, fetchManufacturers, isOpen]);

  React.useEffect(() => {
    const q = single.category.trim();
    if (!isOpen || q.length < 2) return;
    const t = setTimeout(() => fetchCategories({ q }), 250);
    return () => clearTimeout(t);
  }, [single.category, fetchCategories, isOpen]);

  const required = (v: unknown) => String(v ?? "").trim().length > 0;

  const singleReady =
    required(single.medicine) &&
    required(single.brandName) &&
    required(single.manufacturer) &&
    required(single.composition) &&
    required(single.form) &&
    required(single.strength) &&
    required(single.category);
  const bulkReady = !!csvFile;

  const pickFile = () => fileRef.current?.click();

  // ✅ NOW supports: .csv OR .xlsx/.xls (Excel converted to CSV)
  const setFile = async (f?: File | null) => {
    if (!f) return;

    const name = f.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      addToast({
        title: "Invalid file",
        description: "Please select a .csv or .xlsx file",
        color: "warning",
      });
      return;
    }

    setDisplayFileName(f.name);

    if (isCsv) {
      setCsvFile(f);
      // ✅ Parse for preview
      try {
        const parsed = await parseCsvForPreview(f);
        setPreviewHeaders(parsed.headers);
        setPreviewRows(parsed.rows);
        if (parsed.headers.length > 0) {
          setShowPreview(true);
        }
      } catch (err) {
        console.warn("CSV preview parse failed:", err);
        // preview failed, still allow upload
        setShowPreview(false);
      }
      return;
    }

    // ✅ Excel → CSV conversion
    setConverting(true);
    try {
      const csv = await excelToCsvFile(f);
      setCsvFile(csv);

      // ✅ Parse converted CSV for preview
      try {
        const parsed = await parseCsvForPreview(csv);
        setPreviewHeaders(parsed.headers);
        setPreviewRows(parsed.rows);
        if (parsed.headers.length > 0) {
          setShowPreview(true);
        }
      } catch (err) {
        console.warn("Excel preview parse failed:", err);
        setShowPreview(false);
      }

      addToast({
        title: "Excel ready",
        description: "Converted Excel to CSV for upload.",
        color: "success",
      });
    } catch (e: any) {
      setCsvFile(null);

      addToast({
        title: "Excel upload failed",
        description:
          e?.message ??
          "Could not read Excel. Install xlsx: npm i xlsx (or check sheet format).",
        color: "danger",
      });
    } finally {
      setConverting(false);
    }
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    void setFile(e.dataTransfer.files?.[0] ?? null);
  };
  

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  // ✅ Remove uploaded file and go back to upload area
  const removeFile = () => {
    setCsvFile(null);
    setDisplayFileName(null);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (close: () => void) => {
    // ✅ SINGLE (or edit)
    if (tab === "single" || isEdit) {
      if (!singleReady) return;

      const payload = {
        name: single.brandName,
        genericName: single.medicine,
        manufacturer: single.manufacturer,
        composition: single.composition,
        form: single.form,
        strength: single.strength,
        category: single.category,
        requiresPrescription: Boolean(single.requiresPrescription ?? false),
      };

      try {
        if (isEdit) {
          if (!editId) {
            addToast({
              title: "Missing ID",
              description:
                "Please refresh and try again.",
              color: "danger",
            });
            return;
          }

          await updateMedicine({ medicineId: editId, body: payload }).unwrap();

          addToast({
            title: "Medicine updated",
            description: "Updated successfully",
            color: "success",
          });
          close();
          return;
        }

        // ✅ ADD
        await createMedicine(payload).unwrap();
        addToast({
          title: "Medicine added",
          description: "Saved successfully",
          color: "success",
        });
        close();
      } catch (e: any) {
        addToast({
          title: "Failed",
          description: e?.data?.message ?? "Something went wrong",
          color: "danger",
        });
      }
      return;
    }

    // ✅ BULK (CSV / Excel->CSV)
    if (!csvFile) return;

    try {
      await uploadMedicinesCsv(csvFile).unwrap();
      addToast({
        title: "Bulk uploaded",
        description: "Uploaded successfully",
        color: "success",
      });
      close();
    } catch (e: any) {
      addToast({
        title: "Failed",
        description: e?.data?.message ?? "Something went wrong",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                {isEdit ? "Edit Medicine" : "Add New Medicine"}
              </div>

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-gray-50"
                onClick={close}
                aria-label="Close"
              />
            </ModalHeader>

            <ModalBody>
              {/* ✅ Tabs only for Add mode */}
              {!isEdit && (
                <div className="flex items-end gap-8 border-b border-gray-200">
                  <button
                    type="button"
                    className={`${tabBtn} ${
                      tab === "single" ? tabActive : tabIdle
                    }`}
                    onClick={() => setTab("single")}
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Single Upload
                  </button>

                  <button
                    type="button"
                    className={`${tabBtn} ${
                      tab === "bulk" ? tabActive : tabIdle
                    }`}
                    onClick={() => setTab("bulk")}
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Bulk Upload (csv/xlsx)
                  </button>
                </div>
              )}

              {(tab === "single" || isEdit) && (
                <div className="pt-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* ✅ Generic */}
                    <div className="relative">
                      <Input
                        label="Medicine (Generic Name)"
                        placeholder="Type & search e.g. Paracetamol"
                        value={single.medicine}
                        onValueChange={(v) => {
                          setSingle((p) => ({ ...p, medicine: v }));
                          setGenericOpen(true);
                          setGenericIdx(-1);
                        }}
                        onFocus={() => {
                          setGenericOpen(true);
                          const q = single.medicine.trim();
                          if (q.length >= 2) fetchGenerics({ q });
                        }}
                        onKeyDown={(e) => {
                          if (!genericOpen || genSuggestions.length === 0)
                            return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setGenericIdx((p) =>
                              Math.min(p + 1, genSuggestions.length - 1)
                            );
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setGenericIdx((p) => Math.max(p - 1, 0));
                          }
                          if (e.key === "Enter" && genericIdx >= 0) {
                            e.preventDefault();
                            const v = genSuggestions[genericIdx];
                            setSingle((p) => ({ ...p, medicine: v }));
                            setGenericOpen(false);
                            setGenericIdx(-1);
                          }
                          if (e.key === "Escape") {
                            setGenericOpen(false);
                            setGenericIdx(-1);
                          }
                        }}
                        classNames={{ inputWrapper: "rounded-full" }}
                      />
                      <AutoBox
                        open={genericOpen}
                        setOpen={setGenericOpen}
                        idx={genericIdx}
                        setIdx={setGenericIdx}
                        suggestions={genSuggestions}
                        isFetching={genFetching}
                        onPick={(v) =>
                          setSingle((p) => ({ ...p, medicine: v }))
                        }
                        query={single.medicine}
                        boxRef={genericWrapRef}
                      />
                    </div>

                    {/* ✅ Brand */}
                    <div className="relative">
                      <Input
                        label="Brand Name"
                        placeholder="Type & search e.g Dolo"
                        value={single.brandName}
                        onValueChange={(v) => {
                          setSingle((p) => ({ ...p, brandName: v }));
                          setBrandOpen(true);
                          setBrandIdx(-1);
                        }}
                        onFocus={() => {
                          setBrandOpen(true);
                          const q = single.brandName.trim();
                          if (q.length >= 2) fetchBrands({ q });
                        }}
                        onKeyDown={(e) => {
                          if (!brandOpen || brandSuggestions.length === 0)
                            return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setBrandIdx((p) =>
                              Math.min(p + 1, brandSuggestions.length - 1)
                            );
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setBrandIdx((p) => Math.max(p - 1, 0));
                          }
                          if (e.key === "Enter" && brandIdx >= 0) {
                            e.preventDefault();
                            const v = brandSuggestions[brandIdx];
                            setSingle((p) => ({ ...p, brandName: v }));
                            setBrandOpen(false);
                            setBrandIdx(-1);
                          }
                          if (e.key === "Escape") {
                            setBrandOpen(false);
                            setBrandIdx(-1);
                          }
                        }}
                        classNames={{ inputWrapper: "rounded-full" }}
                      />
                      <AutoBox
                        open={brandOpen}
                        setOpen={setBrandOpen}
                        idx={brandIdx}
                        setIdx={setBrandIdx}
                        suggestions={brandSuggestions}
                        isFetching={brandFetching}
                        onPick={(v) =>
                          setSingle((p) => ({ ...p, brandName: v }))
                        }
                        query={single.brandName}
                        boxRef={brandWrapRef}
                      />
                    </div>

                    {/* ✅ Manufacturer */}
                    <div className="relative">
                      <Input
                        label="Manufacturer"
                        placeholder="Type & search manufacturer"
                        value={single.manufacturer}
                        onValueChange={(v) => {
                          setSingle((p) => ({ ...p, manufacturer: v }));
                          setManOpen(true);
                          setManIdx(-1);
                        }}
                        onFocus={() => {
                          setManOpen(true);
                          const q = single.manufacturer.trim();
                          if (q.length >= 2) fetchManufacturers({ q });
                        }}
                        onKeyDown={(e) => {
                          if (!manOpen || manSuggestions.length === 0) return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setManIdx((p) =>
                              Math.min(p + 1, manSuggestions.length - 1)
                            );
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setManIdx((p) => Math.max(p - 1, 0));
                          }
                          if (e.key === "Enter" && manIdx >= 0) {
                            e.preventDefault();
                            const v = manSuggestions[manIdx];
                            setSingle((p) => ({ ...p, manufacturer: v }));
                            setManOpen(false);
                            setManIdx(-1);
                          }
                          if (e.key === "Escape") {
                            setManOpen(false);
                            setManIdx(-1);
                          }
                        }}
                        classNames={{ inputWrapper: "rounded-full" }}
                      />
                      <AutoBox
                        open={manOpen}
                        setOpen={setManOpen}
                        idx={manIdx}
                        setIdx={setManIdx}
                        suggestions={manSuggestions}
                        isFetching={manFetching}
                        onPick={(v) =>
                          setSingle((p) => ({ ...p, manufacturer: v }))
                        }
                        query={single.manufacturer}
                        boxRef={manWrapRef}
                      />
                    </div>

                    {/* ✅ Category */}
                    <div className="relative">
                      <Input
                        label="Category"
                        placeholder="Type & search category"
                        value={single.category}
                        onValueChange={(v) => {
                          setSingle((p) => ({ ...p, category: v }));
                          setCatOpen(true);
                          setCatIdx(-1);
                        }}
                        onFocus={() => {
                          setCatOpen(true);
                          const q = single.category.trim();
                          if (q.length >= 2) fetchCategories({ q });
                        }}
                        onKeyDown={(e) => {
                          if (!catOpen || catSuggestions.length === 0) return;

                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setCatIdx((p) =>
                              Math.min(p + 1, catSuggestions.length - 1)
                            );
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setCatIdx((p) => Math.max(p - 1, 0));
                          }
                          if (e.key === "Enter" && catIdx >= 0) {
                            e.preventDefault();
                            const v = catSuggestions[catIdx];
                            setSingle((p) => ({ ...p, category: v }));
                            setCatOpen(false);
                            setCatIdx(-1);
                          }
                          if (e.key === "Escape") {
                            setCatOpen(false);
                            setCatIdx(-1);
                          }
                        }}
                        classNames={{ inputWrapper: "rounded-full" }}
                      />
                      <AutoBox
                        open={catOpen}
                        setOpen={setCatOpen}
                        idx={catIdx}
                        setIdx={setCatIdx}
                        suggestions={catSuggestions}
                        isFetching={catFetching}
                        onPick={(v) =>
                          setSingle((p) => ({ ...p, category: v }))
                        }
                        query={single.category}
                        boxRef={catWrapRef}
                      />
                    </div>

                    <Input
                      label="Composition"
                      placeholder="e.g. Paracetamol 650mg"
                      value={single.composition}
                      onValueChange={(v) =>
                        setSingle((p) => ({ ...p, composition: v }))
                      }
                      classNames={{ inputWrapper: "rounded-full" }}
                    />

                    <Input
                      label="Form"
                      placeholder="e.g. Tablet / Syrup / Capsule"
                      value={single.form}
                      onValueChange={(v) =>
                        setSingle((p) => ({ ...p, form: v }))
                      }
                      classNames={{ inputWrapper: "rounded-full" }}
                    />

                    <Input
                      label="Strength"
                      placeholder="e.g. 650"
                      value={single.strength}
                      onValueChange={(v) =>
                        setSingle((p) => ({ ...p, strength: v }))
                      }
                      endContent={
                        <span className="text-sm text-slate-500">mg</span>
                      }
                      classNames={{ inputWrapper: "rounded-full" }}
                    />
                  </div>
                </div>
              )}

              {/* BULK */}
              {!isEdit && tab === "bulk" && (
                <div className="pt-5">
                  {/* Hidden file input - always in DOM */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      void setFile(e.target.files?.[0] ?? null);
                      // Reset so same file can be re-selected
                      e.target.value = "";
                    }}
                  />

                  {/* ✅ Show preview if file is loaded */}
                  {showPreview && csvFile ? (
                    <div className="flex flex-col gap-3">
                      {/* Header with back, file info, and remove */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPreview(false)}
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 transition"
                            aria-label="Back to upload"
                            title="Back to upload"
                          >
                            <IoArrowBack className="text-lg text-slate-600" />
                          </button>
                          <div className="text-sm font-medium text-slate-700">
                            {displayFileName}
                            <span className="ml-2 text-xs text-slate-400">
                              ({previewRows.length} record{previewRows.length !== 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={removeFile}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                          title="Remove file"
                        >
                          <RiDeleteBin6Line className="text-sm" />
                          Remove
                        </button>
                      </div>

                      {/* Scrollable table preview */}
                      <div className="max-h-[320px] overflow-auto rounded-xl border border-gray-200">
                        <table className="w-full text-left text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-50">
                            <tr>
                              <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 font-semibold text-slate-500">
                                #
                              </th>
                              {previewHeaders.map((h, i) => (
                                <th
                                  key={i}
                                  className="whitespace-nowrap border-b border-gray-200 px-3 py-2 font-semibold text-slate-600"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, ri) => (
                              <tr
                                key={ri}
                                className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                              >
                                <td className="whitespace-nowrap border-b border-gray-100 px-3 py-1.5 text-slate-400">
                                  {ri + 1}
                                </td>
                                {previewHeaders.map((_, ci) => (
                                  <td
                                    key={ci}
                                    className="max-w-[180px] truncate border-b border-gray-100 px-3 py-1.5 text-slate-700"
                                    title={row[ci] ?? ""}
                                  >
                                    {row[ci] ?? ""}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {previewRows.length > 50 && (
                        <div className="text-xs text-slate-400 text-center">
                          Showing all {previewRows.length} records (scroll to view more)
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* ✅ CSV + Excel buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          className="rounded-full bg-blue-600 text-white"
                          onPress={downloadSampleCSV}
                        >
                          Download CSV
                        </Button>

                        <Button
                          className="rounded-full bg-emerald-600 text-white"
                          onPress={downloadSampleExcel}
                        >
                          Download Excel
                        </Button>
                      </div>

                      <div
                        className="mt-4 flex min-h-[150px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 text-center"
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                      >
                        <FiUploadCloud className="mb-2 text-2xl text-slate-400" />
                        <div className="text-sm text-slate-700">
                          Drag your CSV/XLSX file here, or{" "}
                          <button
                            type="button"
                            onClick={pickFile}
                            className="font-semibold text-primary underline"
                          >
                            browse
                          </button>
                        </div>

                        {displayFileName && !showPreview && (
                          <div className="mt-3 text-xs text-slate-500">
                            Selected:{" "}
                            <span className="font-medium">{displayFileName}</span>
                            {converting && (
                              <span className="ml-2 text-slate-400">
                                (converting…)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Note: If you upload{" "}
                        <span className="font-medium">.xlsx</span>, we convert it to{" "}
                        <span className="font-medium">.csv</span> and then upload
                        (backend remains CSV only).
                      </div>
                    </>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="flex items-center gap-3">
              <Button
                variant="bordered"
                className="rounded-lg px-8"
                onPress={close}
                isDisabled={isLoading}
              >
                Cancel
              </Button>

              <Button
                className="flex-1 rounded-lg bg-primary px-10 text-white disabled:bg-gray-200 disabled:text-gray-500"
                isDisabled={
                  isLoading
                    ? true
                    : isEdit
                    ? !singleReady
                    : tab === "single"
                    ? !singleReady
                    : !bulkReady
                }
                onPress={() => submit(close)}
              >
                {isLoading
                  ? converting
                    ? "Preparing file..."
                    : tab === "bulk"
                    ? "Uploading..."
                    : "Saving..."
                  : isEdit
                  ? "Update Medicine"
                  : "Add Medicine"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddMedicineModal;
