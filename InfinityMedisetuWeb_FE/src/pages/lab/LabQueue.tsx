import { addToast, Spinner, useDisclosure } from "@heroui/react";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDollarSign,
  FiDroplet,
  FiEdit2,
  FiGrid,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  useCreateLabTestMutation,
  useDeleteLabTestMutation,
  useGetLabDepartmentsQuery,
  useGetLabTestsQuery,
  useUpdateLabTestMutation,
  type LabDepartmentDto,
  type LabTestsSortBy,
  type LabTestsStatsOption,
} from "../../redux/api/labApi";
import {
  getLabApiErrorMessage,
  useLazyGetActiveReportTemplatesQuery,
  useLazyGetLabResultTemplateQuery,
  useLazyGetLabTemplateParametersQuery,
  type LabResultTemplate,
  type LabResultTemplateParameter,
} from "../../redux/api/labAssistantApi";
import { formatCurrency } from "./labData";
import { AddEditTestForm } from "./components/AddEditTestForm";
import { LabTestResultTemplatePanel } from "./components/LabTestResultTemplatePanel";

type LabTestStatus = "active" | "deactive";

type DepartmentOption = {
  label: string;
  value: string;
};

type Row = {
  key: string;
  id?: string;
  name: string;
  testCode?: string;
  masterTestId?: string;
  templateId?: string | null;
  reportTemplateId?: string | null;
  resultTemplateId?: string | null;
  labOrderId?: string | null;
  appointmentTestId?: string | null;
  templateName?: string | null;
  departmentId: string;
  departmentName: string;
  sampleType: string;
  price: number;
  status: LabTestStatus;
  source: string;
  raw: any;
};

type ResolvedLabTestTemplate = {
  templateId: string;
  templateName: string;
  testName: string;
  appointmentTestId?: string;
  initialTemplate?: LabResultTemplate | null;
  initialParameters?: LabResultTemplateParameter[];
};

type SortKey = Extract<
  LabTestsSortBy,
  "testName" | "departmentName" | "sampleType" | "price" | "status" | "source"
>;

type FilterOption = {
  label: string;
  value: string;
};

const statusFilterOptions: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Deactive", value: "deactive" },
];

const pageSizeOptions = [6, 10, 15];

function normalizeStatus(v: unknown): LabTestStatus {
  const s = String(v ?? "").toLowerCase();
  return s === "active" ? "active" : "deactive";
}

function getDepartmentOption(department: LabDepartmentDto): DepartmentOption | null {
  const value = String(department.id ?? department._id ?? "").trim();
  const label = String(
    department.departmentName ?? department.name ?? "Department",
  ).trim();

  if (!value) return null;
  return { value, label: label || "Department" };
}

function getTestDepartmentId(test: any) {
  return String(
    test?.departmentId ??
    test?.department?.id ??
    test?.department?._id ??
    test?.labDepartment?.id ??
    test?.labDepartment?._id ??
    "",
  ).trim();
}

function getTestDepartmentName(test: any) {
  return String(
    test?.departmentName ??
    test?.department?.departmentName ??
    test?.department?.name ??
    test?.labDepartment?.departmentName ??
    test?.labDepartment?.name ??
    test?.category ??
    "-",
  );
}

function getSourceLabel(value: unknown) {
  const source = String(value ?? "").toLowerCase();
  if (source === "master") return "Master";
  if (source === "custom") return "Custom";
  return "-";
}

function getStatsOptionLabel(option: LabTestsStatsOption) {
  if (typeof option === "string") return option.trim();

  return String(
    option.label ??
    option.departmentName ??
    option.name ??
    option.category ??
    option.sampleType ??
    option.value ??
    "",
  ).trim();
}

function getStatsOptionValue(option: LabTestsStatsOption, fallback?: string) {
  if (typeof option === "string") return String(fallback ?? option).trim();

  return String(
    option.departmentId ??
    option.id ??
    option._id ??
    option.value ??
    fallback ??
    "",
  ).trim();
}

function getFriendlyTestError(err: any) {
  const raw =
    err?.data?.message ||
    err?.data?.error ||
    err?.error?.message ||
    err?.message ||
    "";
  const lower = String(raw).toLowerCase();
  const statusCode = Number(err?.status ?? err?.originalStatus ?? 0);

  if (
    statusCode === 409 ||
    lower.includes("duplicate") ||
    lower.includes("already") ||
    lower.includes("exist") ||
    lower.includes("conflict")
  ) {
    return "This test already exists in this department.";
  }

  return raw || "Something went wrong";
}

function StatusBadge({ status }: { status: LabTestStatus }) {
  const active = status === "active";

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        active
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {active ? "Active" : "Deactive"}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const custom = source === "Custom";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold leading-none",
        custom
          ? "border-sky-100 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {source}
    </span>
  );
}

function getUniqueOptions(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value && value !== "-")),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
}

function formatListPreview(values: string[]) {
  const cleanValues = Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value && value !== "-")),
  ).sort((a, b) => a.localeCompare(b));

  if (cleanValues.length === 0) return "-";

  const visible = cleanValues.slice(0, 3).join(", ");
  const remaining = cleanValues.length - 3;

  return remaining > 0 ? `${visible} +${remaining}` : visible;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    options.find((option) => option.value === value) ??
    options[0] ??
    ({ label: "All", value: "all" } satisfies FilterOption);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "inline-flex h-11 w-full items-center justify-between gap-3",
          "rounded-lg border bg-white px-3 text-left text-[13px] font-semibold text-slate-700 shadow-sm",
          "transition-all duration-200 focus:outline-none",
          isOpen
            ? "border-primary/45 ring-2 ring-primary/10"
            : "border-slate-200 hover:border-primary/40 hover:bg-slate-50",
        ].join(" ")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${label} filter`}
      >
        <span className="min-w-0 truncate">
          {label} - {selectedOption.label}
        </span>
        <FiChevronDown
          className={[
            "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70">
          <div className="max-h-72 overflow-y-auto pr-1 scrollbar-hide" role="listbox">
            {options.map((option) => {
              const isSelected = option.value === selectedOption.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={[
                    "flex min-h-9 w-full items-center justify-between gap-3 rounded-lg px-3 py-2",
                    "text-left text-[13px] font-semibold transition-colors",
                    isSelected
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-900 hover:bg-slate-50",
                  ].join(" ")}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="min-w-0 truncate">
                    {label} - {option.label}
                  </span>
                  {isSelected && <FiCheck className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogMetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const toneConfig = {
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      stroke: "#10b981",
    },
    sky: {
      icon: "bg-sky-50 text-sky-600",
      stroke: "#3b82f6",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600",
      stroke: "#8b5cf6",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      stroke: "#f59e0b",
    },
  }[tone];

  return (
    <div className="min-h-[110px] overflow-hidden rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-slate-300">
      <div className="flex h-full min-w-0 items-center gap-4">
        <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full ${toneConfig.icon}`}>
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-500">
            {label}
          </p>
          <div className="mt-1 truncate text-[26px] font-semibold leading-none text-slate-950">
            {value}
          </div>
          <p className="mt-2 truncate text-[12px] font-semibold text-slate-500">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey | null;
  direction: "asc" | "desc";
  align?: "left" | "right";
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;
  const ActiveIcon = direction === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={[
        "inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 transition-colors hover:text-slate-800",
        align === "right" ? "justify-end" : "justify-start",
      ].join(" ")}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {isActive ? (
        <ActiveIcon className="h-3 w-3 text-primary" />
      ) : (
        <span className="flex flex-col text-slate-300">
          <FiArrowUp className="h-2 w-2" />
          <FiArrowDown className="-mt-1 h-2 w-2" />
        </span>
      )}
    </button>
  );
}

function PageSizeDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35 bg-white px-3 text-[13px] font-semibold text-primary shadow-sm transition-all duration-200 hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        <span>{value}</span>
        <FiChevronDown
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="py-1">
            {pageSizeOptions.map((opt) => {
              const isActive = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`flex h-9 w-full items-center px-3 text-left text-[13px] transition-colors ${isActive
                      ? "bg-[#0A6C74] text-white"
                      : "text-[#677294] hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const normalizeCode = (value: string) => {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const firstNonEmptyText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue;
    const text = String(value).trim();
    if (text && !["null", "undefined"].includes(text.toLowerCase())) {
      return text;
    }
  }

  return "";
};

const pickTemplateId = (source: any) => {
  return firstNonEmptyText(
    source?.templateId,
    source?.reportTemplateId,
    source?.resultTemplateId,
    source?.template?.id,
    source?.template?._id,
    source?.reportTemplate?.id,
    source?.reportTemplate?._id,
    source?.resultTemplate?.id,
    source?.resultTemplate?._id,
    source?.data?.templateId,
    source?.data?.reportTemplateId,
    source?.data?.resultTemplateId,
    source?.result?.templateId,
    source?.result?.reportTemplateId,
    source?.result?.resultTemplateId,
  );
};

const pickLabOrderId = (source: any) => {
  return firstNonEmptyText(
    source?.labOrderId,
    source?.orderId,
    source?.appointmentTestId,
    source?.labOrder?.id,
    source?.labOrder?._id,
    source?.order?.id,
    source?.order?._id,
    source?.appointmentTest?.id,
    source?.appointmentTest?._id,
    source?.data?.labOrderId,
    source?.data?.orderId,
    source?.data?.appointmentTestId,
    source?.result?.labOrderId,
    source?.result?.orderId,
    source?.result?.appointmentTestId,
  );
};

const pickTemplateName = (source: any, fallback: string) => {
  return firstNonEmptyText(
    source?.templateName,
    source?.reportTemplateName,
    source?.resultTemplateName,
    source?.template?.templateName,
    source?.template?.name,
    source?.reportTemplate?.templateName,
    source?.reportTemplate?.name,
    source?.resultTemplate?.templateName,
    source?.resultTemplate?.name,
    source?.data?.templateName,
    source?.data?.reportTemplateName,
    source?.data?.resultTemplateName,
    source?.result?.templateName,
    source?.result?.reportTemplateName,
    source?.result?.resultTemplateName,
  ) || `${fallback} Result Template`;
};

const pickTestId = (source: any) => {
  return firstNonEmptyText(source?.id, source?._id, source?.data?.id, source?.result?.id);
};

const getTemplateList = (response: any) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.templates)) return response.templates;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const findMatchingTemplate = (
  templates: any[],
  context: { testName: string; testCode?: string; masterTestId?: string },
) => {
  const normalizedName = normalizeCode(context.testName);
  const normalizedTestCode = normalizeCode(context.testCode ?? "");
  const testNameLower = context.testName.trim().toLowerCase();

  return templates.find((template) => {
    const templateIdMatch =
      context.masterTestId &&
      firstNonEmptyText(template?.masterTestId, template?.testId) ===
        context.masterTestId;

    if (templateIdMatch) return true;

    const templateCodes = [
      template?.code,
      template?.templateCode,
      template?.testCode,
      template?.reportCode,
    ].map((value) => normalizeCode(String(value ?? "")));

    if (normalizedTestCode && templateCodes.includes(normalizedTestCode)) {
      return true;
    }

    if (templateCodes.includes(`CUSTOM_${normalizedName}`)) {
      return true;
    }

    const templateNames = [
      template?.name,
      template?.templateName,
      template?.testName,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean);

    return templateNames.includes(testNameLower);
  });
};

const LabQueue = () => {
  const [showForm, setShowForm] = useState(false);
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sampleTypeFilter, setSampleTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!pageSizeOptions.includes(pageSize)) {
      setPageSize(10);
      setPage(1);
    }
  }, [pageSize]);

  const labTestsQueryArgs = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      departmentId: departmentFilter !== "all" ? departmentFilter : undefined,
      sampleType: sampleTypeFilter !== "all" ? sampleTypeFilter : undefined,
      sortBy: sortKey ?? undefined,
      sortOrder: sortKey ? sortDirection : undefined,
    }),
    [
      debouncedSearch,
      departmentFilter,
      page,
      pageSize,
      sampleTypeFilter,
      sortDirection,
      sortKey,
      statusFilter,
    ],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useGetLabTestsQuery(labTestsQueryArgs);

  const resetPageForQueryChange = () => {
    setPage(1);
  };

  const updatePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    resetPageForQueryChange();
  };

  const updateStatusFilter = (nextStatus: string) => {
    setStatusFilter(nextStatus);
    resetPageForQueryChange();
  };

  const updateDepartmentFilter = (nextDepartment: string) => {
    setDepartmentFilter(nextDepartment);
    resetPageForQueryChange();
  };

  const updateSampleTypeFilter = (nextSampleType: string) => {
    setSampleTypeFilter(nextSampleType);
    resetPageForQueryChange();
  };

  const { data: departments = [], isFetching: isDepartmentsFetching } =
    useGetLabDepartmentsQuery();
  const [createLabTest, { isLoading: isCreating }] = useCreateLabTestMutation();
  const [updateLabTest, { isLoading: isUpdating }] = useUpdateLabTestMutation();
  const [deleteLabTest, { isLoading: isDeleting }] =
    useDeleteLabTestMutation();

  const [mode, setMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [sampleType, setSampleType] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<LabTestStatus>("active");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [templateWorkspace, setTemplateWorkspace] =
    useState<ResolvedLabTestTemplate | null>(null);
  const [templateResolveMessage, setTemplateResolveMessage] = useState("");
  const [isResolvingTemplate, setIsResolvingTemplate] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [triggerGetTemplates] = useLazyGetActiveReportTemplatesQuery();
  const [triggerGetParams] = useLazyGetLabTemplateParametersQuery();
  const [loadResultTemplate] = useLazyGetLabResultTemplateQuery();

  const allTests = useMemo(() => data?.data ?? [], [data?.data]);

  const duplicateTest = useMemo(() => {
    if (!name.trim()) return null;
    return allTests.find((t) => {
      if (editingId && (t.id === editingId || t._id === editingId)) {
        return false;
      }
      const existingName = t.testName ?? t.name ?? "";
      return existingName.trim().toLowerCase() === name.trim().toLowerCase();
    });
  }, [name, allTests, editingId]);

  const nameError = useMemo(() => {
    if (duplicateTest) {
      const deptName = duplicateTest.departmentName ?? duplicateTest.category ?? "Department";
      return `This test is already in your lab under ${deptName} department.`;
    }
    return "";
  }, [duplicateTest]);

  // Auto-fill master test details when name is entered (only in "add" mode)
  useEffect(() => {
    if (mode !== "add" || !name.trim()) return;

    for (const dept of departments) {
      const matchingTest = dept.tests?.find(
        (t) => String(t.name ?? "").trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (matchingTest) {
        const deptId = String(dept.id ?? dept._id ?? "").trim();
        setDepartmentId(deptId);
        if (matchingTest.code) {
          setTestCode(matchingTest.code);
        }
        if (matchingTest.sampleType) {
          setSampleType(matchingTest.sampleType);
        }
        break;
      }
    }
  }, [name, mode, departments]);

  const rows: Row[] = useMemo(() => {
    const arr = Array.isArray(allTests) ? allTests : [];
    return arr.map((test: any, index: number) => ({
      key: String(test.id ?? test._id ?? index),
      id: test.id ?? test._id,
      name: test.testName ?? test.name ?? "-",
      testCode: test.testCode ?? "",
      masterTestId: firstNonEmptyText(
        test.masterTestId,
        test.masterTest?.id,
        test.masterTest?._id,
      ),
      templateId: pickTemplateId(test) || null,
      reportTemplateId: firstNonEmptyText(test.reportTemplateId) || null,
      resultTemplateId: firstNonEmptyText(test.resultTemplateId) || null,
      labOrderId: firstNonEmptyText(test.labOrderId) || null,
      appointmentTestId: firstNonEmptyText(test.appointmentTestId) || null,
      templateName: pickTemplateName(test, test.testName ?? test.name ?? "-"),
      departmentId: getTestDepartmentId(test),
      departmentName: getTestDepartmentName(test),
      sampleType: test.sampleType ?? "-",
      price: Number(test.price ?? 0),
      status: normalizeStatus(test.status),
      source: getSourceLabel(test.source),
      raw: test,
    }));
  }, [allTests]);

  const stats = data?.stats;

  const departmentNameToId = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      if (row.departmentName && row.departmentId) {
        map.set(row.departmentName, row.departmentId);
      }
    });

    return map;
  }, [rows]);

  const statsDepartmentLabels = useMemo(
    () =>
      (stats?.departments ?? [])
        .map(getStatsOptionLabel)
        .filter((label) => label && label !== "-"),
    [stats?.departments],
  );

  const statsSampleTypeLabels = useMemo(
    () =>
      (stats?.sampleTypes ?? [])
        .map(getStatsOptionLabel)
        .filter((label) => label && label !== "-"),
    [stats?.sampleTypes],
  );

  const catalogStats = useMemo(() => {
    const fallbackDepartmentLabels = rows
      .map((row) => row.departmentName)
      .filter((label) => label && label !== "-");
    const fallbackSampleTypeLabels = rows
      .map((row) => row.sampleType)
      .filter((label) => label && label !== "-");
    const fallbackPrices = rows
      .map((row) => row.price)
      .filter((value) => Number.isFinite(value) && value > 0);
    const minFallbackPrice = fallbackPrices.length > 0 ? Math.min(...fallbackPrices) : null;
    const maxFallbackPrice = fallbackPrices.length > 0 ? Math.max(...fallbackPrices) : null;
    const minPrice = stats?.priceRange?.min ?? minFallbackPrice;
    const maxPrice = stats?.priceRange?.max ?? maxFallbackPrice;

    return {
      totalTests: stats?.totalTests ?? data?.pagination?.totalRecords ?? rows.length,
      departmentCount:
        stats?.departmentCount ??
        (statsDepartmentLabels.length || getUniqueOptions(fallbackDepartmentLabels).length),
      departmentPreview: formatListPreview(
        statsDepartmentLabels.length ? statsDepartmentLabels : fallbackDepartmentLabels,
      ),
      sampleTypeCount:
        stats?.sampleTypeCount ??
        (statsSampleTypeLabels.length || getUniqueOptions(fallbackSampleTypeLabels).length),
      sampleTypePreview: formatListPreview(
        statsSampleTypeLabels.length ? statsSampleTypeLabels : fallbackSampleTypeLabels,
      ),
      priceRange:
        minPrice == null || maxPrice == null
          ? "-"
          : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`,
    };
  }, [
    data?.pagination?.totalRecords,
    rows,
    stats?.departmentCount,
    stats?.priceRange?.max,
    stats?.priceRange?.min,
    stats?.sampleTypeCount,
    stats?.totalTests,
    statsDepartmentLabels,
    statsSampleTypeLabels,
  ]);

  const catalogDepartmentFilterOptions = useMemo<FilterOption[]>(() => {
    const optionMap = new Map<string, FilterOption>();

    departments.forEach((department) => {
      const option = getDepartmentOption(department);
      if (option) {
        optionMap.set(option.value, option);
      }
    });

    (stats?.departments ?? []).forEach((department) => {
      const label = getStatsOptionLabel(department);
      if (!label) return;

      const alreadyHasLabel = Array.from(optionMap.values()).some(
        (option) => option.label === label,
      );
      if (alreadyHasLabel) return;

      const fallbackValue = departmentNameToId.get(label) ?? label;
      const value = getStatsOptionValue(department, fallbackValue);
      if (value) {
        optionMap.set(value, { value, label });
      }
    });

    const options = Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return [{ label: "All", value: "all" }, ...options];
  }, [departmentNameToId, departments, stats?.departments]);

  const sampleTypeFilterOptions = useMemo<FilterOption[]>(() => {
    const optionMap = new Map<string, FilterOption>();
    const addOption = (rawLabel: unknown, rawValue?: unknown) => {
      const label = String(rawLabel ?? "").trim();
      const value = String(rawValue ?? label).trim();
      if (!label || label === "-" || !value || value === "-") return;
      optionMap.set(value, { value, label });
    };

    (stats?.sampleTypes ?? []).forEach((sampleType) => {
      const label = getStatsOptionLabel(sampleType);
      const value = getStatsOptionValue(sampleType, label);
      addOption(label, value);
    });

    departments.forEach((department) => {
      department.tests?.forEach((test) => addOption(test.sampleType));
    });

    rows.forEach((row) => addOption(row.sampleType));

    const options = Array.from(optionMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );

    return [{ label: "All", value: "all" }, ...options];
  }, [departments, rows, stats?.sampleTypes]);

  const pagination = data?.pagination;
  const totalRows = pagination?.totalRecords ?? rows.length;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const currentPage = pagination?.currentPage ?? page;
  const firstResult = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastResult = totalRows === 0 ? 0 : Math.min(totalRows, firstResult + rows.length - 1);
  const visibleRows = rows;
  const visiblePageNumbers = useMemo(() => {
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    const start = Math.max(1, Math.min(page - halfWindow, totalPages - maxVisiblePages + 1));

    return Array.from({ length: maxVisiblePages }, (_, index) => start + index);
  }, [page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const isCustomTest = useMemo(() => {
    if (mode === "edit") {
      const editingRow = rows.find((r) => r.id === editingId);
      return editingRow?.source === "Custom";
    }
    if (!name.trim() || !departmentId.trim()) return false;
    const selectedDept = departments.find(
      (d) => String(d.id ?? d._id ?? "").trim() === departmentId.trim(),
    );
    const matchingMasterTest = selectedDept?.tests?.find(
      (t) => String(t.name ?? "").trim().toLowerCase() === name.trim().toLowerCase(),
    );
    return !matchingMasterTest;
  }, [name, departmentId, departments, mode, editingId, rows]);

  const shouldDisableDetails = useMemo(() => {
    if (mode === "edit") {
      const editingRow = rows.find((r) => r.id === editingId);
      return editingRow?.source !== "Custom";
    }
    if (!name.trim()) return false;
    for (const dept of departments) {
      const matchingTest = dept.tests?.find(
        (t) => String(t.name ?? "").trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (matchingTest) return true;
    }
    return false;
  }, [name, mode, departments, editingId, rows]);

  const globalDepartmentOptions = useMemo(
    () =>
      departments
        .map(getDepartmentOption)
        .filter((department): department is DepartmentOption =>
          Boolean(department),
        ),
    [departments],
  );

  const departmentOptions = globalDepartmentOptions;

  const resetForm = () => {
    setName("");
    setTestCode("");
    setDepartmentId("");
    setSampleType("");
    setPrice("");
    setStatus("active");
    setCustomFields([]);
    setTemplateWorkspace(null);
    setTemplateResolveMessage("");
    setIsResolvingTemplate(false);
    setHasSaved(false);
  };

  const resolveTemplateForLabTest = async ({
    savedTest,
    testName,
    testCode,
    masterTestId,
    showMissingMessage = true,
  }: {
    savedTest: any;
    testName: string;
    testCode?: string;
    masterTestId?: string;
    showMissingMessage?: boolean;
  }) => {
    setIsResolvingTemplate(true);
    setTemplateResolveMessage("");

    try {
      const orderId = pickLabOrderId(savedTest);

      if (orderId) {
        const orderTemplate = await loadResultTemplate({
          appointmentTestId: orderId,
        }).unwrap();

        if (orderTemplate?.id) {
          setTemplateWorkspace({
            templateId: orderTemplate.id,
            templateName: orderTemplate.templateName || `${testName} Result Template`,
            testName: orderTemplate.testName || testName,
            appointmentTestId: orderId,
            initialTemplate: orderTemplate,
            initialParameters: orderTemplate.parameters ?? [],
          });
          return;
        }
      }

      let templateId = pickTemplateId(savedTest);
      let resolvedTemplateName = pickTemplateName(savedTest, testName);

      if (!templateId) {
        const templatesResponse = await triggerGetTemplates().unwrap();
        const matchedTemplate = findMatchingTemplate(
          getTemplateList(templatesResponse),
          { testName, testCode, masterTestId },
        );

        if (matchedTemplate) {
          templateId = pickTemplateId(matchedTemplate);
          resolvedTemplateName = pickTemplateName(matchedTemplate, testName);
        }
      }

      if (templateId) {
        setTemplateWorkspace({
          templateId,
          templateName: resolvedTemplateName,
          testName,
          initialTemplate: null,
          initialParameters: [],
        });
        return;
      }

      setTemplateWorkspace(null);
      if (showMissingMessage) {
        setTemplateResolveMessage(
          "Result template ID was not returned after save. Please return templateId/reportTemplateId from Add Test save response.",
        );
      }
    } catch (err) {
      setTemplateWorkspace(null);
      if (showMissingMessage) {
        setTemplateResolveMessage(
          getLabApiErrorMessage(err, "Could not resolve the result template."),
        );
      }
    } finally {
      setIsResolvingTemplate(false);
    }
  };

  const openAddModal = () => {
    setMode("add");
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (row: Row) => {
    if (!row.id) {
      addToast({
        title: "Missing id",
        description: "This row does not have a test id.",
        color: "danger",
      });
      return;
    }

    setMode("edit");
    setEditingId(row.id);
    setName(row.name);
    setTestCode(row.testCode ?? "");

    setDepartmentId(row.departmentId);

    setSampleType(row.sampleType === "-" ? "" : row.sampleType);
    setPrice(String(row.price));
    setStatus(row.status);
    setCustomFields([]);
    setTemplateWorkspace(null);
    setTemplateResolveMessage("");

    if (row.source === "Custom" || row.source === "custom") {
      triggerGetTemplates()
        .unwrap()
        .then((res) => {
          const normalizedName = normalizeCode(row.name);
          const matchedTemplate = res.data?.find(
            (t: any) =>
              t.code === `CUSTOM_${normalizedName}` ||
              normalizeCode(t.name) === normalizedName
          );
          if (matchedTemplate) {
            return triggerGetParams({ templateId: matchedTemplate.id }).unwrap();
          }
        })
        .then((params) => {
          if (params) {
            setCustomFields(
              params.map((p: any) => ({
                id: p.id || p.parameterId,
                parameterName: p.parameterName,
                inputType: p.inputType || "text",
                unit: p.unit === "-" ? "" : p.unit,
                referenceRange:
                  p.referenceRange === "-" ? "" : p.referenceRange,
                isRequired: p.isRequired || false,
                sortOrder: p.sortOrder || 10,
              }))
            );
          }
        })
        .catch((err) => {
          console.error("Failed to fetch custom parameters:", err);
        });
    }

    setShowForm(true);
    void resolveTemplateForLabTest({
      savedTest: row.raw ?? row,
      testName: row.name,
      testCode: row.testCode,
      masterTestId: row.masterTestId,
      showMissingMessage: false,
    });
  };

  const isSaving = isCreating || isUpdating || isResolvingTemplate;

  const onSubmit = async () => {
    if (nameError) {
      addToast({
        title: "Test already exists",
        description: nameError,
        color: "danger",
      });
      return;
    }

    const parsedPrice = Number(price);

    if (!name.trim()) {
      addToast({ title: "Name required", color: "warning" });
      return;
    }

    if (!departmentId.trim()) {
      addToast({ title: "Department required", color: "warning" });
      return;
    }

    if (!sampleType.trim()) {
      addToast({ title: "Sample type required", color: "warning" });
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      addToast({ title: "Enter valid price", color: "warning" });
      return;
    }

    const selectedDept = departments.find(
      (d) => String(d.id ?? d._id ?? "").trim() === departmentId.trim(),
    );
    const matchingMasterTest = selectedDept?.tests?.find(
      (t) => String(t.name ?? "").trim().toLowerCase() === name.trim().toLowerCase(),
    );

    const payload = {
      testName: name.trim(),
      sampleType: sampleType.trim(),
      price: parsedPrice,
      status,
      ...(testCode.trim() ? { testCode: testCode.trim() } : {}),
      departmentId: departmentId.trim(),
      ...(matchingMasterTest ? { masterTestId: matchingMasterTest.id } : {}),
      ...(isCustomTest ? { customFields } : {}),
    };

    try {
      let savedTest: any;

      if (mode === "add") {
        savedTest = await createLabTest(payload).unwrap();
        const savedId = pickTestId(savedTest);
        if (savedId) {
          setMode("edit");
          setEditingId(savedId);
        }

        addToast({
          title: "Added",
          description: "Lab test created successfully. Result fields are ready.",
          color: "success",
        });
        setHasSaved(true);
      } else {
        if (!editingId) {
          addToast({ title: "Missing test id", color: "danger" });
          return;
        }

        savedTest = await updateLabTest({
          id: editingId,
          body: payload,
        }).unwrap();

        addToast({
          title: "Updated",
          description: "Lab test updated successfully. Result fields are ready.",
          color: "success",
        });
        setHasSaved(true);
      }

      await resolveTemplateForLabTest({
        savedTest,
        testName: payload.testName,
        testCode: payload.testCode,
        masterTestId: firstNonEmptyText(
          matchingMasterTest?.id,
          matchingMasterTest?._id,
        ),
      });

      refetch();
    } catch (err: any) {
      addToast({
        title: "Failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!deletingId) return;

    try {
      await deleteLabTest(deletingId).unwrap();

      addToast({
        title: "Deleted",
        description: "Lab test deleted successfully.",
        color: "success",
      });
      setDeletingId(null);
      setDeletingName("");
      refetch();
      onDeleteOpenChange();
    } catch (err: any) {
      addToast({
        title: "Delete failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    resetPageForQueryChange();
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      resetPageForQueryChange();
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
    resetPageForQueryChange();
  };

  return (
    <div id="tour-lab-catalog-page" className="mx-auto flex flex-col gap-5">
      {showForm ? (
        <div className="flex flex-col gap-5">
          <AddEditTestForm
            mode={mode}
            name={name}
            testCode={testCode}
            departmentId={departmentId}
            sampleType={sampleType}
            price={price}
            status={status}
            departments={departmentOptions}
            isSaving={isSaving}
            hasSaved={hasSaved}
            nameError={nameError}
            disableDetails={shouldDisableDetails}
            onNameChange={setName}
            onTestCodeChange={setTestCode}
            onDepartmentChange={setDepartmentId}
            onSampleTypeChange={setSampleType}
            onPriceChange={setPrice}
            onStatusChange={setStatus}
            onCancel={() => {
              resetForm();
              setMode("add");
              setEditingId(null);
              setShowForm(false);
            }}
            onSubmit={onSubmit}
          />

          {isResolvingTemplate && (
            <div className="flex items-center gap-2 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
              <Spinner size="sm" /> Resolving result template...
            </div>
          )}

          {templateResolveMessage && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {templateResolveMessage}
            </div>
          )}

          {templateWorkspace && (
            <LabTestResultTemplatePanel
              key={`${templateWorkspace.templateId}-${templateWorkspace.appointmentTestId ?? "template"}`}
              templateId={templateWorkspace.templateId}
              templateName={templateWorkspace.templateName}
              testName={templateWorkspace.testName}
              appointmentTestId={templateWorkspace.appointmentTestId}
              initialTemplate={templateWorkspace.initialTemplate}
              initialParameters={templateWorkspace.initialParameters}
            />
          )}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-1"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 md:text-[26px]">
                Lab Test Catalog
              </h1>
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  <Spinner size="sm" /> Updating
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Tests you have created.
            </p>
          </motion.div>

          <motion.div
            id="tour-lab-catalog-kpis"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <CatalogMetricCard
              icon={<FiClipboard className="h-5 w-5" />}
              label="Total Tests"
              value={catalogStats.totalTests}
              detail="Tests created by you"
              tone="emerald"
            />
            <CatalogMetricCard
              icon={<FiGrid className="h-5 w-5" />}
              label="Departments"
              value={catalogStats.departmentCount}
              detail={catalogStats.departmentPreview}
              tone="sky"
            />
            <CatalogMetricCard
              icon={<FiDroplet className="h-5 w-5" />}
              label="Sample Types"
              value={catalogStats.sampleTypeCount}
              detail={catalogStats.sampleTypePreview}
              tone="violet"
            />
            <CatalogMetricCard
              icon={<FiDollarSign className="h-5 w-5" />}
              label="Price Range"
              value={catalogStats.priceRange}
              detail="Min to Max"
              tone="amber"
            />
          </motion.div>

          <motion.section
            id="tour-lab-catalog-filters"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2"
          >
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[minmax(280px,1fr)_190px_210px_210px_minmax(24px,1fr)_130px] xl:items-center">
              <div className="group relative flex min-w-0 items-center w-full col-span-2 md:col-span-1">
                <FiSearch className="pointer-events-none absolute left-3.5 text-[18px] text-slate-400 transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="Search tests by name, department or sample type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-[14px] font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-[14px] placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    className="absolute right-3 grid h-5 w-5 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                  >
                    <FiX className="text-sm" />
                  </button>
                )}
              </div>

              <div className="w-full">
                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  options={statusFilterOptions}
                  onChange={updateStatusFilter}
                />
              </div>
              <div className="w-full">
                <FilterSelect
                  label="Department"
                  value={departmentFilter}
                  options={catalogDepartmentFilterOptions}
                  onChange={updateDepartmentFilter}
                />
              </div>
              <div className="w-full col-span-2 md:col-span-1">
                <FilterSelect
                  label="Sample Type"
                  value={sampleTypeFilter}
                  options={sampleTypeFilterOptions}
                  onChange={updateSampleTypeFilter}
                />
              </div>
          

              <button
                id="tour-lab-catalog-add-test"
                type="button"
                onClick={openAddModal}
                disabled={isDepartmentsFetching && departmentOptions.length === 0}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-active focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap cursor-pointer col-span-2 md:col-span-1 md:col-start-auto lg:col-start-4 xl:col-start-6"
              >
                <FiPlus />
                Add Test
              </button>
            </div>
          </motion.section>

          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>Failed to load lab tests</span>
                <button
                  onClick={() => refetch()}
                  className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-red-100"
                  type="button"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <motion.div
            id="tour-lab-catalog-table"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] md:block"
          >
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Test Name"
                      sortKey="testName"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Department"
                      sortKey="departmentName"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Sample Type"
                      sortKey="sampleType"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Price"
                      sortKey="price"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4">
                    <SortHeader
                      label="Source"
                      sortKey="source"
                      activeSortKey={sortKey}
                      direction={sortDirection}
                      onSort={toggleSort}
                    />
                  </th>
                  <th className="px-5 py-4 text-right text-[13px] font-bold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, row) => (
                    <tr key={row} className="animate-pulse">
                      {Array.from({ length: 7 }).map((__, col) => (
                        <td key={col} className="px-5 py-4">
                          <div className="h-3 rounded-full bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      No tests found
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr
                      key={row.key}
                      className="transition-colors duration-200 hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                            <FiClipboard className="h-4 w-4" />
                          </span>
                          <span className="truncate text-[14px] font-bold text-slate-950">
                            {row.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[14px] font-medium text-slate-600">
                        {row.departmentName}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-medium text-slate-600">
                        {row.sampleType}
                      </td>
                      <td className="px-5 py-4 text-[14px] font-bold text-slate-950">
                        {formatCurrency(row.price)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <SourceBadge source={row.source} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-primary transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 focus:outline-none focus:ring-4 focus:ring-primary/10 cursor-pointer"
                            title="Edit"
                            aria-label={`Edit ${row.name}`}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!row.id) {
                                addToast({
                                  title: "Missing id",
                                  description: "This row does not have a test id.",
                                  color: "danger",
                                });
                                return;
                              }
                              setDeletingId(row.id);
                              setDeletingName(row.name || "this test");
                              onDeleteOpen();
                            }}
                            className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 cursor-pointer"
                            title="Delete"
                            aria-label={`Delete ${row.name}`}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-3.5 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-medium">
                Showing {firstResult} to {lastResult} of {totalRows} results
              </span>

              <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                <span className="hidden whitespace-nowrap sm:inline-block">Rows per page:</span>
                <PageSizeDropdown value={pageSize} onChange={updatePageSize} />

                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <FiChevronLeft />
                </button>

                {visiblePageNumbers.map((pageNum) => {
                  const isActive = pageNum === page;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`grid h-9 min-w-9 place-items-center rounded-lg font-bold transition-all duration-200 ${isActive
                          ? "bg-primary text-white shadow-[0_8px_18px_rgba(0,128,128,0.18)]"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-3 md:hidden">
            {isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-10 text-sm text-slate-500">
                <Spinner size="sm" /> <span className="ml-2">Loading tests...</span>
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                No tests found
              </div>
            ) : (
              visibleRows.map((row) => (
                <motion.article
                  key={row.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <FiClipboard className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {row.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.departmentName} / {row.sampleType}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-xs font-medium text-slate-500">
                        Price
                      </span>
                      <div className="mt-1 text-sm font-bold text-slate-950">
                        {formatCurrency(row.price)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2">
                      <span className="text-xs font-medium text-slate-500">
                        Source
                      </span>
                      <div className="mt-1">
                        <SourceBadge source={row.source} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-primary cursor-pointer"
                      title="Edit"
                      aria-label={`Edit ${row.name}`}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!row.id) return;
                        setDeletingId(row.id);
                        setDeletingName(row.name || "this test");
                        onDeleteOpen();
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 cursor-pointer"
                      title="Delete"
                      aria-label={`Delete ${row.name}`}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </motion.article>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm md:hidden sm:flex-row sm:items-center sm:justify-between">
            <span className="font-semibold">
              Showing {firstResult} to {lastResult} of {totalRows} results
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#677294] font-medium whitespace-nowrap">Rows per page:</span>
              <PageSizeDropdown value={pageSize} onChange={updatePageSize} />

              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <FiChevronLeft />
              </button>

              {visiblePageNumbers.map((pageNum) => {
                const isActive = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPage(pageNum)}
                    className={`grid h-9 min-w-9 place-items-center rounded-xl font-bold transition-all duration-200 ${isActive
                        ? "bg-primary text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </>
      )}

      {isDeleteOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-950">
              Delete Lab Test
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-950">
                {deletingName}
              </span>
              ?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingId(null);
                  setDeletingName("");
                  onDeleteOpenChange();
                }}
                disabled={isDeleting}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LabQueue;
