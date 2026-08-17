// src/pages/medicine/MedicineSetup.tsx
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Button, Input, addToast, Popover, PopoverTrigger, PopoverContent, Spinner } from "@heroui/react";
import { FiUploadCloud } from "react-icons/fi";
import { IoArrowBack } from "react-icons/io5";
import { RiDeleteBin6Line } from "react-icons/ri";
import { LuPill } from "react-icons/lu";
import {
  useCreateMedicineMutation,
  useUpdateMedicineMutation,
  useUploadMedicinesCsvMutation,
  useGetUniqueFormsQuery,
  useToggleMedicineStatusMutation,
} from "../../redux/api/medicineApi";

// ✅ Unsaved changes
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

export type SingleMedicineValues = {
  medicine: string; // genericName
  form: string;
  composition: string;
  requiresPrescription?: boolean;
};

export type EditInitial =
  | (Partial<SingleMedicineValues> & { id?: string })
  | undefined;

// Simple SVG icons for the form select
const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const mapInitialMedicine = (initial?: any): SingleMedicineValues => ({
  medicine: initial?.genericName || initial?.name || "",
  form: initial?.form || "",
  composition: initial?.composition || "",
  requiresPrescription: Boolean(initial?.requiresPrescription ?? false),
});

const emptySingle: SingleMedicineValues = {
  medicine: "",
  form: "",
  composition: "",
  requiresPrescription: false,
};

const DEFAULT_FORM_OPTIONS = [
  // Oral Solid
  { label: "Tablet", value: "Tablet" },
  { label: "Capsule", value: "Capsule" },
  { label: "Lozenge", value: "Lozenge" },
  { label: "Sachet", value: "Sachet" },
  { label: "Granules", value: "Granules" },
  { label: "Powder", value: "Powder" },

  // Oral Liquid
  { label: "Syrup", value: "Syrup" },
  { label: "Suspension", value: "Suspension" },
  { label: "Liquid", value: "Liquid" },
  { label: "Drops", value: "Drops" },

  // Topical (Skin / Pain relief)
  { label: "Cream", value: "Cream" },
  { label: "Ointment", value: "Ointment" },
  { label: "Gel", value: "Gel" },
  { label: "Lotion", value: "Lotion" },
  { label: "Paste", value: "Paste" },
  { label: "Spray", value: "Spray" },
  { label: "Foam", value: "Foam" },

  // Dental / Oral care
  { label: "Mouthwash", value: "Mouthwash" },
  { label: "Oral Rinse", value: "Oral Rinse" },
  { label: "Dental Cement", value: "Dental Cement" },
  { label: "Dental Varnish", value: "Dental Varnish" },

  // Medical Special
  { label: "Injection", value: "Injection" },
  { label: "Inhaler", value: "Inhaler" },
  { label: "Patch", value: "Patch" },
  { label: "Suppository", value: "Suppository" },

  // Personal Care / OTC
  { label: "Shampoo", value: "Shampoo" },
  { label: "Soap", value: "Soap" },
  { label: "Facewash", value: "Facewash" },
  { label: "Conditioner", value: "Conditioner" },
  { label: "Toothpaste", value: "Toothpaste" },
  { label: "Mouth Gel", value: "Mouth Gel" },
  { label: "Handwash", value: "Handwash" },
  { label: "Sanitizer", value: "Sanitizer" },
  { label: "Oil", value: "Oil" },
];

// Form Select Component with search and custom form support + API integration
const FormSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpenPopover, setIsOpenPopover] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch unique forms from API
  const { data: uniqueFormsData, isLoading: isLoadingForms } = useGetUniqueFormsQuery(undefined, {
    skip: !isOpenPopover, // Only fetch when popover is open
  });

  // Get unique forms from API response
  const apiForms: { label: string; value: string }[] = React.useMemo(() => {
    const forms: string[] = uniqueFormsData?.forms || [];
    return forms.map((form: string) => ({ label: form, value: form }));
  }, [uniqueFormsData]);

  // Combine default forms with API forms, removing duplicates
  const allFormOptions = React.useMemo(() => {
    const existingValues = new Set(DEFAULT_FORM_OPTIONS.map(opt => opt.value));
    const newForms = apiForms.filter(form => !existingValues.has(form.value));

    // Return default forms first, then unique API forms
    return [...DEFAULT_FORM_OPTIONS, ...newForms];
  }, [apiForms]);

  // Get predefined form values for custom form detection
  // const predefinedFormValues = React.useMemo(() => {
  //   return allFormOptions.map(opt => opt.value);
  // }, [allFormOptions]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allFormOptions;

    return allFormOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allFormOptions, searchQuery]);

  // Check if search query matches any existing option
  const hasExactMatch = React.useMemo(() => {
    return allFormOptions.some(opt =>
      opt.label.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [allFormOptions, searchQuery]);

  const handleSelectOption = (selectedValue: string) => {
    onChange(selectedValue);
    setSearchQuery("");
    setIsOpenPopover(false);
  };

  const handleCreateCustom = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setSearchQuery("");
      setIsOpenPopover(false);
    }
  };

  // const isCustomForm = value && !predefinedFormValues.includes(value);

  return (
    <div className="space-y-2">
      <Popover
        isOpen={isOpenPopover}
        onOpenChange={setIsOpenPopover}
        placement="bottom-start"
        offset={4}
      >
        <PopoverTrigger>
          <div
            className="relative w-full cursor-pointer"
            onClick={() => {
              setIsOpenPopover(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
          >
            <div className="flex h-[52px] items-center justify-between rounded-full border border-slate-200 bg-white px-5 shadow-none transition-all data-[hover=true]:border-slate-300">
              <span className={`text-sm ${value ? 'text-slate-900' : 'text-slate-400'}`}>
                {value || "Search or select form..."}
                {/* {isCustomForm && value && (
                  <span className="ml-2 text-xs text-emerald-600">(Custom)</span>
                )} */}
              </span>
              <ChevronDownIcon />
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-[400px] rounded-2xl border border-slate-200 bg-white p-0 shadow-lg">
          <div className="w-full">
            {/* Search input */}
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <SearchIcon />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-emerald-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-[300px] overflow-y-auto">
              {isLoadingForms ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => handleSelectOption(opt.value)}
                    className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    {opt.label}
                    {/* Show badge for API-suggested forms */}
                    {/* {!DEFAULT_FORM_OPTIONS.some(d => d.value === opt.value) && (
                      <span className="ml-2 text-xs text-emerald-600">(Recent)</span>
                    )} */}
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-500">
                  No matching forms found
                </div>
              )}

              {/* Create custom option */}
              {searchQuery && !hasExactMatch && !isLoadingForms && (
                <div
                  onClick={handleCreateCustom}
                  className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-emerald-600 transition-colors hover:bg-emerald-50"
                >
                  <PlusIcon />
                  <span>Create "{searchQuery}"</span>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* {isCustomForm && value && (
        <p className="text-xs text-emerald-600">
          ✓ Using custom form: {value}
        </p>
      )} */}

      {/* {!isLoadingForms && apiForms.length > 0 && (
        <p className="text-xs text-slate-500">
          Showing {apiForms.length} recently used form{apiForms.length !== 1 ? 's' : ''}
        </p>
      )} */}
    </div>
  );
};

/** ✅ Single source of truth for sample template data */
function getSampleTemplate() {
  const headers = [
    "name", "form", "composition"
  ];

  const rows = [
    ["Paracetamol 500 mg", "Tablet", "Paracetamol 500 mg"],
    ["Dolo 650 mg", "Tablet", "Paracetamol 650 mg"],
    ["Azithral 500 mg", "Capsule", "Azithromycin 500 mg"],
    ["Pan D", "Capsule", "Pantoprazole, Domperidone"],
    ["Ascoril LS", "Syrup", "Ambroxol, Levosalbutamol, Guaiphenesin"],
    ["Montair LC", "Tablet", "Montelukast, Levocetirizine"],
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

async function downloadSampleExcel() {
  try {
    const { headers, rows } = getSampleTemplate();
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

async function excelToCsvFile(excelFile: File): Promise<File> {
  const XLSX = await import("xlsx");

  const buf = await excelFile.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const firstSheetName = wb.SheetNames?.[0];
  if (!firstSheetName) throw new Error("No sheets found in Excel file.");

  const ws = wb.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ",", RS: "\n" });

  const csvName = excelFile.name.replace(/\.(xlsx|xls)$/i, ".csv");
  return new File([csv], csvName, { type: "text/csv;charset=utf-8" });
}

/** Parse CSV text into header + rows for preview */
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

type LocationState = {
  mode?: "add" | "edit";
  initial?: EditInitial;
};

const MedicineSetup: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState | null };
  const params = useParams();

  // ✅ Unsaved changes
  const { setDirty } = useUnsavedChanges();

  // mode/initial from navigation (recommended)
  const mode = state?.mode ?? "add";
  const initial = state?.initial;

  const isEdit = mode === "edit";
  const [tab, setTab] = React.useState<"single" | "bulk">("single");

  const [editId, setEditId] = React.useState<string | null>(null);

  const [single, setSingle] = React.useState<SingleMedicineValues>({
    ...emptySingle,
    ...mapInitialMedicine(initial),
  });

  const [csvFile, setCsvFile] = React.useState<File | null>(null);
  const [displayFileName, setDisplayFileName] = React.useState<string | null>(
    null,
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
  const [toggleStatus, { isLoading: toggling }] = useToggleMedicineStatusMutation();

  const [medicineActive, setMedicineActive] = React.useState<boolean>(
    (initial as any)?.isActive !== undefined ? Boolean((initial as any).isActive) : true
  );

  const isLoading = creating || updating || uploading || converting || toggling;

  // ✅ baseline snapshot for dirty compare
  const baselineSingleRef = React.useRef<SingleMedicineValues>({
    ...emptySingle,
    ...mapInitialMedicine(initial),
  });

  // ✅ reset on mount / state change
  React.useEffect(() => {
    setTab("single");
    setCsvFile(null);
    setDisplayFileName(null);
    setConverting(false);
    setPreviewHeaders([]);
    setPreviewRows([]);
    setShowPreview(false);

    const id = (initial as any)?.id ?? params?.id;
    setEditId(id ? String(id) : null);

    const baseline = { ...emptySingle, ...mapInitialMedicine(initial) };
    baselineSingleRef.current = baseline;
    setSingle(baseline);

    if (fileRef.current) fileRef.current.value = "";

    // ✅ fresh load => not dirty
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  // ✅ cleanup on unmount to avoid stale dirty state
  React.useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  const required = (v: unknown) => String(v ?? "").trim().length > 0;

  const singleReady =
    required(single.medicine) && required(single.form);

  const bulkReady = !!csvFile;

  // ✅ DIRTY DETECT (single OR bulk)
  const isSingleDirty = React.useMemo(() => {
    const b = baselineSingleRef.current;
    return (
      single.medicine !== (b.medicine ?? "") ||
      single.form !== (b.form ?? "") ||
      single.composition !== (b.composition ?? "") ||
      Boolean(single.requiresPrescription ?? false) !==
      Boolean(b.requiresPrescription ?? false)
    );
  }, [single]);

  const isBulkDirty = Boolean(csvFile || displayFileName || converting);

  // ✅ push dirty to global blocker
  React.useEffect(() => {
    setDirty(Boolean(isSingleDirty || isBulkDirty));
  }, [isSingleDirty, isBulkDirty, setDirty]);

  const pickFile = () => fileRef.current?.click();

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
        setShowPreview(false);
      }
      return;
    }

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

  const onCancel = () => {
    // ✅ user intentionally discards changes
    setDirty(false);
    navigate(-1);
  };

  const submit = async () => {
    // ✅ SINGLE (or edit)
    if (tab === "single" || isEdit) {
      if (!singleReady) return;

      const payload = {
        name: single.medicine.trim().toUpperCase(),
        form: single.form,
        composition: single.composition.trim(),
        requiresPrescription: Boolean(single.requiresPrescription ?? false),
      };

      try {
        if (isEdit) {
          if (!editId) {
            addToast({
              title: "Missing ID",
              description: "Please go back and try again.",
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

          // ✅ saved => clear dirty
          baselineSingleRef.current = { ...single };
          setDirty(false);

          navigate(-1);
          return;
        }

        await createMedicine(payload).unwrap();

        addToast({
          title: "Medicine added",
          description: "Saved successfully",
          color: "success",
        });

        // ✅ saved => clear dirty
        baselineSingleRef.current = { ...single };
        setDirty(false);

        navigate(-1);
      } catch (e: any) {
        const status = e?.status ?? e?.data?.status;
        if (status === 409) {
          addToast({
            title: "Duplicate medicine",
            description: "A medicine with this name and form already exists.",
            color: "warning",
          });
        } else {
          addToast({
            title: "Failed",
            description: e?.data?.message ?? "Something went wrong",
            color: "danger",
          });
        }
      }
      return;
    }

    // ✅ BULK
    if (!csvFile) return;

    try {
      await uploadMedicinesCsv(csvFile).unwrap();
      addToast({
        title: "Bulk uploaded",
        description: "Uploaded successfully",
        color: "success",
      });

      // ✅ saved => clear dirty
      setDirty(false);

      navigate(-1);
    } catch (e: any) {
      addToast({
        title: "Failed",
        description: e?.data?.message ?? "Something went wrong",
        color: "danger",
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setDirty(false);
            navigate(-1);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100 transition dark:hover:bg-[#17233a]"
          aria-label="Go back"
        >
          <IoArrowBack className="h-4 w-4 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-[#9be7dc]">
          <LuPill className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-slate-900 dark:text-white sm:text-[18px]">
            Medicine Setup
          </h2>
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
            {isEdit ? "Edit medicine details." : "Add medicines individually or upload in bulk."}
          </p>
        </div>
      </div>
      <div className="h-px w-full bg-slate-100 dark:bg-[#273244]" />

      {/* Tabs (only for Add mode) */}
      {!isEdit && (
        <div className="overflow-x-auto border-b border-slate-200 px-4 dark:border-[#27344a]">
          <div className="flex min-w-max items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setTab("single")}
              className={`relative flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "single"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${tab === "single" ? "bg-emerald-600 dark:bg-emerald-400" : "bg-slate-400 dark:bg-slate-500"}`} />
              Single Upload
            </button>

            <button
              type="button"
              onClick={() => setTab("bulk")}
              className={`relative flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-xs sm:text-sm font-semibold transition ${tab === "bulk"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                }`}
            >
              <span className={`h-2 w-2 rounded-full ${tab === "bulk" ? "bg-emerald-600 dark:bg-emerald-400" : "bg-slate-400 dark:bg-slate-500"}`} />
              Bulk Upload (csv/xlsx)
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4 px-4 py-4 sm:px-5">

        {/* SINGLE */}
        {(tab === "single" || isEdit) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#334158] dark:bg-[#0f1728]">
            <div className="grid items-end gap-4 sm:gap-x-6 sm:gap-y-5 grid-cols-1 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Enter medicine name"
                  value={single.medicine}
                  onValueChange={(v) => {
                    setSingle((p) => ({ ...p, medicine: (v ?? "").toUpperCase() }));
                  }}
                  classNames={{
                    inputWrapper:
                      "h-[48px] sm:h-[52px] rounded-full border border-slate-200 bg-white px-4 sm:px-5 shadow-none hover:bg-white data-[hover=true]:bg-white data-[hover=true]:border-slate-300 group-data-[focus=true]:bg-white group-data-[focus=true]:border-slate-300 dark:border-[#334158] dark:bg-[#111a2c] dark:data-[hover=true]:bg-[#111a2c] dark:group-data-[focus=true]:bg-[#111a2c]",
                    input: "text-sm text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
                  }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Form <span className="text-red-500">*</span>
                </label>
                <FormSelect
                  value={single.form}
                  onChange={(value) => setSingle((p) => ({ ...p, form: value }))}
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Composition
                </label>
                <Input
                  placeholder="e.g. Paracetamol 650 mg"
                  value={single.composition}
                  onValueChange={(v) =>
                    setSingle((p) => ({ ...p, composition: v ?? "" }))
                  }
                  classNames={{
                    inputWrapper:
                      "h-[48px] sm:h-[52px] rounded-full border border-slate-200 bg-white px-4 sm:px-5 shadow-none hover:bg-white data-[hover=true]:bg-white data-[hover=true]:border-slate-300 group-data-[focus=true]:bg-white group-data-[focus=true]:border-slate-300 dark:border-[#334158] dark:bg-[#111a2c] dark:data-[hover=true]:bg-[#111a2c] dark:group-data-[focus=true]:bg-[#111a2c]",
                    input: "text-sm text-slate-900 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500",
                  }}
                />
              </div>
            </div>

            {/* Enable/Disable Toggle (Edit mode only) */}
            {isEdit && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-3 sm:px-4 py-3 dark:border-[#334158]">
                <div className="mr-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">Medicine Status</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {medicineActive ? "This medicine is currently active" : "This medicine is disabled and won't appear in prescriptions"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    if (!editId) return;
                    try {
                      await toggleStatus({ medicineId: editId, isActive: !medicineActive }).unwrap();
                      setMedicineActive(!medicineActive);
                      addToast({
                        title: medicineActive ? "Medicine disabled" : "Medicine enabled",
                        description: `Status updated successfully.`,
                        color: "success",
                      });
                    } catch (e: any) {
                      if (e?.status === 409) {
                        addToast({
                          title: "Cannot enable",
                          description: "A medicine with the same name and form already exists.",
                          color: "danger",
                        });
                      } else {
                        addToast({
                          title: "Failed",
                          description: e?.data?.message ?? "Failed to update status",
                          color: "danger",
                        });
                      }
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${medicineActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                    } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${medicineActive ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* BULK */}
        {!isEdit && tab === "bulk" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#334158] dark:bg-[#0f1728]">
            {/* Hidden file input - always in DOM */}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                void setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />

            {/* ✅ Show preview if file is loaded */}
            {showPreview && csvFile ? (
              <div className="flex flex-col gap-3">
                {/* Header with back, file info, and remove */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full hover:bg-gray-100 transition"
                      aria-label="Back to upload"
                      title="Back to upload"
                    >
                      <IoArrowBack className="text-lg text-slate-600" />
                    </button>
                    <div className="text-sm font-medium text-slate-700 truncate">
                      {displayFileName}
                      <span className="ml-2 text-xs text-slate-400">
                        ({previewRows.length} record{previewRows.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeFile}
                    className="flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                    title="Remove file"
                  >
                    <RiDeleteBin6Line className="text-sm" />
                    Remove
                  </button>
                </div>

                {/* Scrollable table preview */}
                <div className="max-h-[250px] sm:max-h-[320px] overflow-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className="whitespace-nowrap border-b border-gray-200 px-2 sm:px-3 py-2 font-semibold text-slate-500">
                          #
                        </th>
                        {previewHeaders.map((h, i) => (
                          <th
                            key={i}
                            className="whitespace-nowrap border-b border-gray-200 px-2 sm:px-3 py-2 font-semibold text-slate-600"
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
                          <td className="whitespace-nowrap border-b border-gray-100 px-2 sm:px-3 py-1.5 text-slate-400">
                            {ri + 1}
                          </td>
                          {previewHeaders.map((_, ci) => (
                            <td
                              key={ci}
                              className="max-w-[120px] sm:max-w-[180px] truncate border-b border-gray-100 px-2 sm:px-3 py-1.5 text-slate-700"
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
              <div className="space-y-4 sm:space-y-5">
                {/* Download template buttons */}
                <div>
                  <p className="mb-2 text-xs sm:text-sm text-slate-600">
                    Download a sample template to fill in your medicines:
                  </p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <Button
                      variant="bordered"
                      className="rounded-xl border-primary text-primary px-4 sm:px-6 text-sm dark:border-emerald-400 dark:text-emerald-300"
                      onPress={downloadSampleCSV}
                    >
                      Download CSV
                    </Button>
                    <Button
                      variant="bordered"
                      className="rounded-xl border-primary text-primary px-4 sm:px-6 text-sm dark:border-emerald-400 dark:text-emerald-300"
                      onPress={downloadSampleExcel}
                    >
                      Download Excel
                    </Button>
                  </div>
                </div>

                {/* Drop zone - full width */}
                <div
                  className="flex min-h-[160px] sm:min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#334158] bg-slate-50/50 dark:bg-[#111a2c]/50 px-4 sm:px-6 py-6 sm:py-8 text-center transition hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/5"
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onClick={pickFile}
                >
                  <div className="mb-3 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
                    <FiUploadCloud className="text-lg sm:text-xl text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-white">
                    Drag your CSV or XLSX file here
                  </div>
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    or{" "}
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 underline">
                      click to browse
                    </span>
                  </div>

                  {displayFileName && !showPreview && (
                    <div className="mt-4 rounded-full bg-white px-3 sm:px-4 py-1.5 text-xs text-slate-600 shadow-sm border border-slate-200">
                      Selected:{" "}
                      <span className="font-medium">{displayFileName}</span>
                      {converting && (
                        <span className="ml-2 text-slate-400">(converting…)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
          <Button
            variant="bordered"
            className="rounded-xl px-6 sm:px-8 border-slate-200 text-slate-700 dark:border-[#334158] dark:text-white w-full sm:w-auto"
            onPress={onCancel}
            isDisabled={isLoading}
          >
            Cancel Changes
          </Button>

          <Button
            className="rounded-xl bg-primary px-8 sm:px-10 text-white font-semibold shadow-sm disabled:bg-gray-200 disabled:text-gray-500 w-full sm:w-auto"
            isDisabled={
              isLoading
                ? true
                : isEdit
                  ? !singleReady
                  : tab === "single"
                    ? !singleReady
                    : !bulkReady
            }
            onPress={submit}
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
        </div>
      </div>
    </>
  );
};

export default MedicineSetup;
