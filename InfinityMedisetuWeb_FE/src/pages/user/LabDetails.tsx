import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Spinner,
  useDisclosure,
  Checkbox,
  Input,
} from "@heroui/react";
import React, { useState, useMemo, useEffect } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLayers,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiChevronDown,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";

import {
  useGetLabByIdQuery,
  useGetLabDepartmentsByLabIdQuery,
  useGetLabDepartmentsQuery,
  useGetLabTestsByLabIdQuery,
  useGetLabUsersByLabIdQuery,
  useSyncLabCatalogMutation,
  useUpdateLabDepartmentsMutation,
  useUpdateLabMutation,
  useUpdateLabTestMutation,
  useDeleteLabTestMutation,
  type LabDepartmentDto,
  type LabDepartmentTestDto,
  type LabStatus,
  type LabTestDto,
} from "../../redux/api/labApi";

import { useUpdateAddUserMutation } from "../../redux/api/usersApi";

import { FaRupeeSign } from "react-icons/fa";
import AppButton from "../../components/shared/AppButton.tsx";
import EditButton from "../../components/shared/EditButton.tsx";
import EditAssistantModal from "../../components/shared/Modals/EditAssistantModal.tsx";
import EditLabModal from "../../components/shared/Modals/EditLabModal.tsx";
import AddAssistantModal from "./components/lab/AddAssistantModal";
import type { UIStatus } from "./components/lab/labTypes";
import StatusPill from "./components/lab/StatusPill.tsx";
import { AddEditTestModal } from "../lab/components/AddEditTestModal";

/* ----------------------------- UI bits ----------------------------- */

const KNOWN_LAB_NAME_FIXES: Record<string, string> = {
  vijaynagr: "Vijay Nagar",
  vijaynagar: "Vijay Nagar",
};

const toReadableText = (value?: string | null, fallback = "—") => {
  const clean = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!clean || clean === "—") return fallback;

  const knownFix = KNOWN_LAB_NAME_FIXES[clean.toLowerCase().replace(/\s+/g, "")];
  if (knownFix) return knownFix;

  return clean
    .split(" ")
    .map((word) => {
      if (/^[A-Z0-9]{2,4}$/.test(word)) return word;
      if (/[A-Z]/.test(word) && /[a-z]/.test(word)) return word;

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const formatLabName = (name?: string | null) => {
  const clean = String(name ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const key = clean.toLowerCase().replace(/\s+/g, "");

  return KNOWN_LAB_NAME_FIXES[key] ?? toReadableText(clean, "Unnamed Lab");
};


const normalizeLabStatus = (v: any): LabStatus => {
  const s = String(v ?? "").toLowerCase();
  if (s === "inactive" || s === "deactive") return "deactive"; // ✅ not "Inactive"
  return "Active";
};

const MetricCard = ({
  title,
  value,
  icon,
  tone = "slate",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "purple";
}) => {
  const toneStyles =
    tone === "green"
      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60"
        : tone === "purple"
          ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200/60"
          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200/60";

  return (
    <div className="group rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
            toneStyles,
          ].join(" ")}
        >
          <span className="text-[16px] sm:text-[18px] leading-none">
            {icon}
          </span>
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500 sm:text-[12px]">
            {title}
          </div>
          <div className="mt-1 text-[16px] font-bold text-slate-950 sm:text-[18px]">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
};

const getDepartmentId = (department?: LabDepartmentDto | null) =>
  String(department?.id ?? department?._id ?? "").trim();

const getDepartmentName = (department?: LabDepartmentDto | null) =>
  toReadableText(department?.departmentName ?? department?.name, "Department");

const getDepartmentTestId = (
  test?: LabDepartmentTestDto | null,
  fallback = "",
) => String(test?.id ?? test?._id ?? fallback).trim();

const getDepartmentTestName = (test?: LabDepartmentTestDto | null) =>
  toReadableText(test?.testName ?? test?.name, "Unnamed Test");

const getDepartmentTestCode = (test?: LabDepartmentTestDto | null) =>
  String(test?.testCode ?? test?.code ?? "").trim();

const getCatalogTestId = (test?: LabTestDto | null, fallback = "") =>
  String(test?.id ?? test?._id ?? fallback).trim();

const getCatalogMasterTestId = (test?: LabTestDto | null) =>
  String(test?.masterTestId ?? test?.masterTest?.id ?? test?.masterTest?._id ?? "").trim();

const getCatalogTestName = (test?: LabTestDto | null) =>
  toReadableText(test?.testName ?? test?.name, "Unnamed Test");

const getCatalogDepartmentName = (test?: LabTestDto | null) =>
  toReadableText(test?.departmentName ?? test?.category, "Department");

const getCatalogStatusLabel = (status?: string) => {
  const value = String(status ?? "").toLowerCase();
  return value === "active" ? "Active" : "Inactive";
};

const getCatalogSourceLabel = (source?: string | null) => {
  const value = String(source ?? "").toLowerCase();
  if (value === "master") return "Master";
  if (value === "custom") return "Custom";
  return toReadableText(source, "—");
};

const formatPrice = (price?: number | string | null) =>
  `₹${Number(price || 0).toLocaleString("en-IN")}`;


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

function buildSelectedTestMap(
  departments: LabDepartmentDto[],
  labTests: LabTestDto[],
) {
  const selections: Record<string, string[]> = {};
  const selectedMasterTestsByDepartment = new Map<string, Set<string>>();

  labTests.forEach((test) => {
    const departmentId = getTestDepartmentId(test);
    if (!departmentId) return;

    const explicitMasterTestId = getCatalogMasterTestId(test);
    const department = departments.find(
      (dept) => getDepartmentId(dept) === departmentId,
    );
    const matchingMasterTest = department?.tests?.find((masterTest) => {
      const masterName = getDepartmentTestName(masterTest).toLowerCase();
      const masterCode = getDepartmentTestCode(masterTest).toLowerCase();
      const testName = getCatalogTestName(test).toLowerCase();
      const testCode = String(test.testCode ?? "").trim().toLowerCase();

      return (
        Boolean(testCode && masterCode && testCode === masterCode) ||
        Boolean(testName && masterName && testName === masterName)
      );
    });

    const masterTestId =
      explicitMasterTestId || getDepartmentTestId(matchingMasterTest);
    if (!masterTestId) return;

    const current = selectedMasterTestsByDepartment.get(departmentId) ?? new Set<string>();
    current.add(masterTestId);
    selectedMasterTestsByDepartment.set(departmentId, current);
  });

  departments.forEach((department) => {
    const departmentId = getDepartmentId(department);
    if (!departmentId) return;

    const allTestIds =
      department.tests
        ?.map((test, index) => getDepartmentTestId(test, `${departmentId}-${index}`))
        .filter(Boolean) ?? [];
    const selectedTestIds = selectedMasterTestsByDepartment.get(departmentId);

    selections[departmentId] =
      selectedTestIds && selectedTestIds.size > 0
        ? allTestIds.filter((testId) => selectedTestIds.has(testId))
        : allTestIds;
  });

  return selections;
}

function normalizeTestStatus(v: unknown): "active" | "deactive" {
  const s = String(v ?? "").toLowerCase();
  return s === "active" ? "active" : "deactive";
}

function getSampleTypeColor(type?: string | null) {
  const t = String(type ?? "").toLowerCase();
  if (t.includes("blood") || t.includes("serum")) {
    return "bg-rose-50 text-rose-700 border border-rose-100/50";
  }
  if (t.includes("urine")) {
    return "bg-amber-50 text-amber-700 border border-amber-100/50";
  }
  if (t.includes("stool")) {
    return "bg-orange-50 text-orange-700 border border-orange-100/50";
  }
  if (t.includes("sputum") || t.includes("saliva")) {
    return "bg-sky-50 text-sky-700 border border-sky-100/50";
  }
  return "bg-slate-50 text-slate-600 border border-slate-100";
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ----------------------------- Page ----------------------------- */

type EditLabForm = {
  name: string;
  address: string;
  contactDigits: string; // ✅ only 10 digits
  labStatus: LabStatus;
};

type EditAssistantForm = {
  id?: string;
  name: string;
  email: string;
  mobileDigits: string; // ✅ only 10 digits
  userStatus: "Active" | "Inactive";
};



const LabDetails: React.FC = () => {
  const navigate = useNavigate();
  const { labId } = useParams<{ labId: string }>();
  const [isLoading] = useState(false);

  // ✅ Lab details
  const {
    data: labRes,
    isFetching: isLabFetching,
    isError: isLabError,
    refetch: refetchLab,
  } = useGetLabByIdQuery(labId as string, { skip: !labId });

  // robust (works even if API returns {data:{...}})
  const lab: any = (labRes as any)?.data ?? labRes ?? null;

  // ✅ REAL id from response data.id (your example: 5ebba8c9-...)
  const labRealId = String(lab?.id ?? lab?._id ?? labId ?? "").trim();

  // ✅ Lab users (assistants)
  const {
    data: asstRes,
    isFetching: isAsstFetching,
    isError: isAsstError,
    refetch: refetchAssistants,
  } = useGetLabUsersByLabIdQuery(labId as string, { skip: !labId });

  const asstRaw: any = (asstRes as any)?.data ?? asstRes ?? [];
  const asstArr: any[] = Array.isArray(asstRaw) ? asstRaw : [];

  const {
    data: allDepartments = [],
    isFetching: isDepartmentsFetching,
    // refetch: refetchAllDepartments,
  } = useGetLabDepartmentsQuery();

  const {
    data: labDepartments = [],
    isFetching: isLabDepartmentsFetching,
    refetch: refetchLabDepartments,
  } = useGetLabDepartmentsByLabIdQuery(labRealId, { skip: !labRealId });

  const {
    data: labTests = [],
    isFetching: isLabTestsFetching,
    isError: isLabTestsError,
    refetch: refetchLabTests,
  } = useGetLabTestsByLabIdQuery(labRealId, { skip: !labRealId });

  const [updateLabDepartments, { isLoading: isUpdatingDepartments }] =
    useUpdateLabDepartmentsMutation();
  const [syncLabCatalog, { isLoading: isSyncingCatalog }] =
    useSyncLabCatalogMutation();

  // ✅ Assistants modal (add new assistant) - kept for AddAssistantModal component
  const { isOpen, onOpenChange } = useDisclosure();

  const departmentDisc = useDisclosure();
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>(
    [],
  );
  const [selectedDepartmentTestIds, setSelectedDepartmentTestIds] = useState<
    Record<string, string[]>
  >({});

  // ✅ Edit Lab modal
  const editDisc = useDisclosure();
  const [editForm, setEditForm] = useState<EditLabForm | null>(null);
  const [updateLab, { isLoading: isUpdatingLab }] = useUpdateLabMutation();

  // ✅ Edit Assistant modal
  const asstEditDisc = useDisclosure();
  const [editAsst, setEditAsst] = useState<EditAssistantForm | null>(null);
  const [updateAddUser, { isLoading: isUpdatingAsst }] =
    useUpdateAddUserMutation();

  // ✅ Lab test catalog mutations & state
  const [updateLabTest, { isLoading: isUpdatingTest }] = useUpdateLabTestMutation();
  const [deleteLabTest, { isLoading: isDeletingTest }] = useDeleteLabTestMutation();

  const testEditDisc = useDisclosure();
  const [testMode, setTestMode] = useState<"add" | "edit">("edit");
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testName, setTestName] = useState("");
  const [testCode, setTestCode] = useState("");
  const [testDepartmentId, setTestDepartmentId] = useState("");
  const [testSampleType, setTestSampleType] = useState("");
  const [testPrice, setTestPrice] = useState("");
  const [testStatus, setTestStatus] = useState<"active" | "deactive">("active");

  const testDeleteDisc = useDisclosure();
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);
  const [deletingTestName, setDeletingTestName] = useState("");

  // Inline edit state
  const [isEditingLab, setIsEditingLab] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editStatus, setEditStatus] = useState<LabStatus>("Active");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editTouched, setEditTouched] = useState<Record<string, boolean>>({});

  const testDepartmentOptions = useMemo(
    () =>
      allDepartments
        .map((department) => {
          const val = getDepartmentId(department);
          const lbl = getDepartmentName(department);
          if (!val) return null;
          return { value: val, label: lbl };
        })
        .filter((department): department is { label: string; value: string } =>
          Boolean(department),
        ),
    [allDepartments],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDepartmentIds, setExpandedDepartmentIds] = useState<string[]>([]);

  const departmentOptions = useMemo(
    () =>
      allDepartments
        .map((department) => ({
          id: getDepartmentId(department),
          label: getDepartmentName(department),
          code: department.code ?? "",
          status: department.status ?? "",
          tests: department.tests ?? [],
        }))
        .filter((department) => department.id),
    [allDepartments]
  );

  const { filteredDepartments, autoExpandedIds } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return { filteredDepartments: departmentOptions, autoExpandedIds: [] };
    }

    const matched: typeof departmentOptions = [];
    const autoExpand: string[] = [];

    departmentOptions.forEach((department) => {
      const deptNameMatch =
        department.label.toLowerCase().includes(q) ||
        department.code?.toLowerCase().includes(q);

      const matchingTests =
        department.tests?.filter((test) => {
          const testName = getDepartmentTestName(test).toLowerCase();
          const testCode = getDepartmentTestCode(test).toLowerCase();
          const sampleType = String(test.sampleType ?? "").toLowerCase();

          return (
            testName.includes(q) ||
            testCode.includes(q) ||
            sampleType.includes(q)
          );
        }) ?? [];

      if (deptNameMatch || matchingTests.length > 0) {
        matched.push(department);
        autoExpand.push(department.id);
      }
    });

    return { filteredDepartments: matched, autoExpandedIds: autoExpand };
  }, [searchQuery, departmentOptions]);

  const duplicateTest = useMemo(() => {
    if (!testName.trim()) return null;
    return labTests.find((t) => {
      if (editingTestId && (t.id === editingTestId || t._id === editingTestId)) {
        return false;
      }
      const existingName = t.testName ?? t.name ?? "";
      return existingName.trim().toLowerCase() === testName.trim().toLowerCase();
    });
  }, [testName, labTests, editingTestId]);

  const testNameError = useMemo(() => {
    if (duplicateTest) {
      const deptName = duplicateTest.departmentName ?? duplicateTest.category ?? "Department";
      return `This test is already in your lab under ${deptName} department.`;
    }
    return "";
  }, [duplicateTest]);

  // Auto-fill master test details when name is entered (only in "add" mode)
  useEffect(() => {
    if (testMode !== "add" || !testName.trim()) return;

    for (const dept of allDepartments) {
      const matchingTest = dept.tests?.find(
        (t) => String(t.name ?? "").trim().toLowerCase() === testName.trim().toLowerCase()
      );
      if (matchingTest) {
        const deptId = getDepartmentId(dept);
        setTestDepartmentId(deptId);
        if (matchingTest.code) {
          setTestCode(matchingTest.code);
        }
        if (matchingTest.sampleType) {
          setTestSampleType(matchingTest.sampleType);
        }
        break;
      }
    }
  }, [testName, testMode, allDepartments]);

  if (isLabFetching) {
    return (
      <div className="py-14 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isLabError || !lab) {
    return (
      <div className="p-4 sm:p-6">
        <Button
          variant="light"
          onPress={() => navigate(-1)}
          startContent={<FiArrowLeft />}
        >
          Back
        </Button>

        <div className="mt-6 text-sm text-rose-600">
          Failed to load lab details.
        </div>

        <Button className="mt-4" onPress={() => refetchLab()}>
          Retry
        </Button>
      </div>
    );
  }

  const status: UIStatus = (() => {
    const s = String(lab?.labStatus ?? "Active").toLowerCase();
    return s === "inactive" || s === "deactive" ? "Inactive" : "Active";
  })();
  const analytics = lab?.analytics ?? {};
  const totalOrdered = analytics?.totalTests ?? 0;
  const completed = analytics?.completedTestsCount ?? 0;
  const pending = analytics?.pendingTestsCount ?? 0;
  const revenue = analytics?.totalRevenue ?? 0;
  const revenueLabel = `₹${Number(revenue || 0).toLocaleString("en-IN")}`;
  const displayName = formatLabName(lab?.name);
  const displayAddress = toReadableText(lab?.address, "Address not added");
  const displayEmail = String(lab?.email ?? "").trim() || "—";
  const displayPhone = String(lab?.contactNo ?? "").trim() || "—";

  const assistants = asstArr.map((a, idx) => {
    const id = String(a?.id ?? a?._id ?? idx);
    const ts = a?.createdAt ?? a?.updatedAt;

    // status in API can be "Inactive" etc.
    const apiStatus = String(a?.status ?? a?.userStatus ?? "Active");
    const assistantStatus: UIStatus =
      apiStatus.toLowerCase() === "inactive" ||
        apiStatus.toLowerCase() === "deactive"
        ? "Inactive"
        : "Active";

    return {
      id,
      name: a?.name || "—",
      dateLabel: fmtDate(ts),
      timeLabel: fmtTime(ts),
      phone: a?.contactNo || a?.mobile || "—",
      email: a?.email || "—",
      status: assistantStatus,
    };
  });

  const selectedDepartments = labDepartments
    .map((department) => ({
      id: getDepartmentId(department),
      label: getDepartmentName(department),
      code: department.code ?? "",
      status: department.status ?? "",
      tests: department.tests ?? [],
    }))
    .filter((department) => department.id);

  const getDepartmentTestIdsById = (departmentId: string) => {
    const department = departmentOptions.find((dept) => dept.id === departmentId);
    return (
      department?.tests
        ?.map((test, index) => getDepartmentTestId(test, `${departmentId}-${index}`))
        .filter(Boolean) ?? []
    );
  };

  const setDepartmentTestSelection = (departmentId: string, testIds: string[]) => {
    const nextTestIds = Array.from(new Set(testIds.filter(Boolean)));

    setSelectedDepartmentTestIds((prev) => {
      const next = { ...prev };
      if (nextTestIds.length) {
        next[departmentId] = nextTestIds;
      } else {
        delete next[departmentId];
      }
      return next;
    });

    setSelectedDepartmentIds((prev) => {
      const hasDepartment = prev.includes(departmentId);
      if (nextTestIds.length && !hasDepartment) return [...prev, departmentId];
      if (!nextTestIds.length && hasDepartment) {
        return prev.filter((id) => id !== departmentId);
      }
      return prev;
    });

    if (nextTestIds.length) {
      setExpandedDepartmentIds((prev) =>
        prev.includes(departmentId) ? prev : [...prev, departmentId],
      );
    }
  };

  const toggleDepartmentSelection = (id: string) => {
    if (selectedDepartmentIds.includes(id)) {
      setDepartmentTestSelection(id, []);
      return;
    }

    const departmentTestIds = getDepartmentTestIdsById(id);
    if (departmentTestIds.length) {
      setDepartmentTestSelection(id, departmentTestIds);
      return;
    }

    setSelectedDepartmentTestIds((prev) => ({ ...prev, [id]: [] }));
    setSelectedDepartmentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setExpandedDepartmentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const toggleDepartmentTestSelection = (departmentId: string, testId: string) => {
    const current = selectedDepartmentTestIds[departmentId] ?? [];
    const nextTestIds = current.includes(testId)
      ? current.filter((selectedTestId) => selectedTestId !== testId)
      : [...current, testId];

    setDepartmentTestSelection(departmentId, nextTestIds);
  };

  const toggleDepartmentExpand = (id: string) => {
    setExpandedDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const catalogRows = labTests.map((test, index) => ({
    id: getCatalogTestId(test, String(index)),
    name: getCatalogTestName(test),
    testCode: test.testCode ?? "—",
    departmentName: getCatalogDepartmentName(test),
    sampleType: toReadableText(test.sampleType, "—"),
    price: formatPrice(test.price),
    status: getCatalogStatusLabel(test.status),
    source: getCatalogSourceLabel(test.source),
    rawName: test.testName ?? test.name ?? "",
    rawTestCode: test.testCode ?? "",
    rawDepartmentId: getTestDepartmentId(test),
    rawSampleType: test.sampleType ?? "",
    rawPrice: String(test.price ?? 0),
    rawStatus: normalizeTestStatus(test.status),
  }));

  const selectedTestTotal = selectedDepartmentIds.reduce(
    (total, departmentId) =>
      total + (selectedDepartmentTestIds[departmentId]?.length ?? 0),
    0,
  );

  const openDepartmentManager = () => {
    const currentDepartmentIds = selectedDepartments.map(
      (department) => department.id,
    );
    setSelectedDepartmentIds(currentDepartmentIds);
    setSelectedDepartmentTestIds(buildSelectedTestMap(labDepartments, labTests));
    setExpandedDepartmentIds((prev) =>
      Array.from(new Set([...prev, ...currentDepartmentIds])),
    );
    departmentDisc.onOpen();
  };



  /* -------------------- Lab edit handlers -------------------- */

  const openEditLab = () => {
    const digits = String(lab?.contactNo ?? "").replace(/\D/g, "").slice(-10);
    setEditName(lab?.name ?? "");
    setEditAddress(lab?.address ?? "");
    setEditContact(digits);
    setEditStatus(normalizeLabStatus(lab?.labStatus));
    setEditErrors({});
    setEditTouched({});
    setIsEditingLab(true);
  };

  const validateEdit = () => {
    const e: Record<string, string> = {};
    if (!editName.trim()) e.name = "Lab name is required";
    if (!editAddress.trim()) e.address = "Address is required";
    if (!editContact.trim()) e.contact = "Contact number is required";
    else if (!/^[6-9]\d{9}$/.test(editContact.trim())) e.contact = "Must be 10 digits starting with 6-9";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEditBlur = (field: string) => {
    setEditTouched((p) => ({ ...p, [field]: true }));
    validateEdit();
  };

  const handleSaveEdit = async () => {
    setEditTouched({ name: true, address: true, contact: true });
    if (!validateEdit()) return;
    await saveLab({
      name: editName.trim(),
      address: editAddress.trim(),
      contactDigits: editContact.trim(),
      labStatus: editStatus,
    });
    setIsEditingLab(false);
  };

  const saveLab = async (data: EditLabForm) => {
    const dataToSave = data;
    if (!labRealId || !dataToSave) return;

    if (dataToSave.contactDigits && dataToSave.contactDigits.length !== 10) {
      addToast({
        title: "Invalid contact",
        description: "Contact number must be exactly 10 digits.",
        color: "danger",
      });
      return;
    }

    try {
      const contactNo =
        dataToSave.contactDigits.length === 10
          ? `+91 ${dataToSave.contactDigits}`
          : "";

      await updateLab({
        id: labRealId, // ✅ response id
        body: {
          name: dataToSave.name.trim(),
          address: dataToSave.address.trim(),
          contactNo,
          labStatus: dataToSave.labStatus,
        },
      }).unwrap();

      addToast({
        title: "Lab updated",
        description: "Changes saved successfully.",
        color: "success",
      });

      editDisc.onClose();
      setEditForm(null);
      refetchLab();

      refetchAssistants();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description: e?.data?.message || e?.message || "Unable to update lab.",
        color: "danger",
      });
    }
  };

  const saveDepartments = async () => {
    if (!labRealId) return;

    try {
      const departmentTestIds = selectedDepartmentIds.reduce<Record<string, string[]>>(
        (acc, departmentId) => {
          acc[departmentId] = selectedDepartmentTestIds[departmentId] ?? [];
          return acc;
        },
        {},
      );

      await updateLabDepartments({
        labId: labRealId,
        departmentIds: selectedDepartmentIds,
        departmentTestIds,
      }).unwrap();

      addToast({
        title: "Departments updated",
        description: "Lab catalog has been refreshed with selected tests.",
        color: "success",
      });

      departmentDisc.onClose();
      refetchLabDepartments();
      refetchLabTests();
      refetchLab();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description:
          e?.data?.message || e?.message || "Unable to update departments.",
        color: "danger",
      });
    }
  };

  /* -------------------- Assistant edit handlers -------------------- */

  const openEditAssistant = (a: (typeof assistants)[number]) => {
    const digits = String(a.phone ?? "")
      .replace(/\D/g, "")
      .slice(-10);
    const st =
      String(a.status ?? "Active").toLowerCase() === "inactive"
        ? "Inactive"
        : "Active";

    setEditAsst({
      id: a.id,
      name: a.name === "—" ? "" : a.name,
      email: a.email === "—" ? "" : a.email,
      mobileDigits: digits,
      userStatus: st,
    });

    asstEditDisc.onOpen();
  };

  const saveAssistant = async (data: EditAssistantForm) => {
    const dataToSave = data;
    if (!dataToSave?.id) return;

    if (dataToSave.mobileDigits && dataToSave.mobileDigits.length !== 10) {
      addToast({
        title: "Invalid mobile",
        description: "Mobile number must be exactly 10 digits.",
        color: "danger",
      });
      return;
    }

    try {
      await updateAddUser({
        id: dataToSave.id, // ✅ /users/UpdateAdduser/:id
        body: {
          name: dataToSave.name.trim(),
          mobile: dataToSave.mobileDigits ? dataToSave.mobileDigits : null,
          userStatus: dataToSave.userStatus,
        },
      }).unwrap();

      addToast({
        title: "Assistant updated",
        description: "Changes saved successfully.",
        color: "success",
      });

      asstEditDisc.onClose();
      setEditAsst(null);
      refetchAssistants();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description:
          e?.data?.message || e?.message || "Unable to update assistant.",
        color: "danger",
      });
    }
  };

  /* -------------------- Lab test catalog handlers -------------------- */

  const getFriendlyTestError = (err: any) => {
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
  };

  const resetTestForm = () => {
    setTestName("");
    setTestCode("");
    setTestDepartmentId("");
    setTestSampleType("");
    setTestPrice("");
    setTestStatus("active");
  };

  const openEditTestModal = (row: (typeof catalogRows)[number]) => {
    if (!row.id || row.id.startsWith("index")) {
      addToast({
        title: "Missing id",
        description: "This test does not have a valid id.",
        color: "danger",
      });
      return;
    }

    setTestMode("edit");
    setEditingTestId(row.id);
    setTestName(row.rawName);
    setTestCode(row.rawTestCode);
    setTestDepartmentId(row.rawDepartmentId);
    setTestSampleType(row.rawSampleType);
    setTestPrice(row.rawPrice);
    setTestStatus(row.rawStatus);
    testEditDisc.onOpen();
  };

  const onSaveTest = async () => {
    if (testNameError) {
      addToast({
        title: "Test already exists",
        description: testNameError,
        color: "danger",
      });
      return;
    }

    const parsedPrice = Number(testPrice);

    if (!testName.trim()) {
      addToast({ title: "Name required", color: "warning" });
      return;
    }

    if (!testDepartmentId.trim()) {
      addToast({ title: "Department required", color: "warning" });
      return;
    }

    if (!testSampleType.trim()) {
      addToast({ title: "Sample type required", color: "warning" });
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      addToast({ title: "Enter valid price", color: "warning" });
      return;
    }

    const selectedDept = allDepartments.find(
      (d) => String(d.id ?? d._id ?? "").trim() === testDepartmentId.trim(),
    );
    const matchingMasterTest = selectedDept?.tests?.find(
      (t) => String(t.name ?? "").trim().toLowerCase() === testName.trim().toLowerCase(),
    );

    const payload = {
      testName: testName.trim(),
      sampleType: testSampleType.trim(),
      price: parsedPrice,
      status: testStatus,
      ...(testCode.trim() ? { testCode: testCode.trim() } : {}),
      departmentId: testDepartmentId.trim(),
      ...(matchingMasterTest ? { masterTestId: matchingMasterTest.id } : {}),
    };

    try {
      if (!editingTestId) {
        addToast({ title: "Missing test id", color: "danger" });
        return;
      }

      await updateLabTest({
        id: editingTestId,
        body: payload,
      }).unwrap();

      addToast({
        title: "Updated",
        description: "Lab test updated successfully.",
        color: "success",
      });

      resetTestForm();
      setEditingTestId(null);
      refetchLabTests();
      testEditDisc.onClose();
    } catch (err: any) {
      addToast({
        title: "Failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  const onConfirmDeleteTest = async () => {
    if (!deletingTestId) return;

    try {
      await deleteLabTest(deletingTestId).unwrap();

      addToast({
        title: "Deleted",
        description: "Lab test deleted successfully.",
        color: "success",
      });
      setDeletingTestId(null);
      setDeletingTestName("");
      refetchLabTests();
      testDeleteDisc.onClose();
    } catch (err: any) {
      addToast({
        title: "Delete failed",
        description: getFriendlyTestError(err),
        color: "danger",
      });
    }
  };

  return (
    <div className="mx-auto w-full">
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FiArrowLeft className="text-[13px]" />
          Back to Configuration
        </button>

        {/* Header — flat, no card */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-base font-bold text-white shadow-sm sm:h-12 sm:w-12">
              {displayName.charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[20px] font-semibold text-slate-950 dark:text-white sm:text-[24px]">
                  {displayName}
                </h1>
                <StatusPill status={status} />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-slate-500 dark:text-slate-400 sm:text-[13px]">
                <div className="flex items-center gap-1.5">
                  <FiPhone className="text-slate-400 shrink-0" />
                  <span>{displayPhone}</span>
                </div>
                <span className="hidden h-3 w-[1px] bg-slate-200 dark:bg-slate-700 sm:inline-block" />
                <div className="flex items-center gap-1.5">
                  <FiMail className="text-slate-400 shrink-0" />
                  <span>{displayEmail}</span>
                </div>
                <span className="hidden h-3 w-[1px] bg-slate-200 dark:bg-slate-700 sm:inline-block" />
                <div className="flex items-center gap-1.5">
                  <FiMapPin className="text-slate-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-[300px]" title={displayAddress}>
                    {displayAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <EditButton text="" onPress={openEditLab} disabled={isLoading || isEditingLab} />
            </div>
          </div>

        {/* Inline Edit Form */}
        {isEditingLab && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h3 className="mb-4 text-[15px] font-semibold text-slate-800 dark:text-white">
              Edit Laboratory
            </h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Lab Name"
                placeholder="Enter lab name"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={editName}
                onValueChange={setEditName}
                onBlur={() => handleEditBlur("name")}
                isDisabled={isUpdatingLab}
                isRequired
                isInvalid={editTouched.name && !!editErrors.name}
                errorMessage={editTouched.name ? editErrors.name : undefined}
                description="Displayed as your laboratory name across the system"
              />
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  Lab Status <span className="text-danger">*</span>
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as LabStatus)}
                  disabled={isUpdatingLab}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-800 outline-none transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#273244] dark:bg-[#111726] dark:text-white"
                >
                  <option value="Active">Active</option>
                  <option value="deactive">Inactive</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Inactive labs cannot accept new tests</p>
              </div>
              <Input
                label="Address"
                placeholder="Enter full address"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={editAddress}
                onValueChange={setEditAddress}
                onBlur={() => handleEditBlur("address")}
                isDisabled={isUpdatingLab}
                isRequired
                isInvalid={editTouched.address && !!editErrors.address}
                errorMessage={editTouched.address ? editErrors.address : undefined}
                description="Street, area, city"
              />
              <Input
                label="Contact Number"
                placeholder="10-digit number"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                type="tel"
                maxLength={10}
                value={editContact}
                onValueChange={(v) => setEditContact(v.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => handleEditBlur("contact")}
                isDisabled={isUpdatingLab}
                isRequired
                isInvalid={editTouched.contact && !!editErrors.contact}
                errorMessage={editTouched.contact ? editErrors.contact : undefined}
                description="10-digit Indian mobile number"
              />
            </div>
            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-[#273244]">
              <AppButton
                text="Cancel"
                buttonVariant="outlined"
                onPress={() => setIsEditingLab(false)}
                isDisabled={isUpdatingLab}
              />
              <AppButton
                text={isUpdatingLab ? "Saving..." : "Save Changes"}
                buttonVariant="primary"
                onPress={handleSaveEdit}
                isDisabled={isUpdatingLab}
              />
            </div>
          </div>
        )}

        <section className="stats-scroll">
          <MetricCard
            title="Total Tests Ordered"
            value={totalOrdered}
            icon={<FiFileText />}
            tone="slate"
          />
          <MetricCard
            title="Completed Tests"
            value={completed}
            icon={<FiCheckCircle />}
            tone="green"
          />
          <MetricCard
            title="Pending Tests"
            value={pending}
            icon={<FiClock />}
            tone="amber"
          />
          <MetricCard
            title="Total Revenue"
            value={revenueLabel}
            icon={<FaRupeeSign />}
            tone="purple"
          />
        </section>
        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-950 sm:text-[16px]">
                Lab Departments
              </h2>
              <div className="mt-0.5 text-[12px] text-slate-500">
                {selectedDepartments.length} selected
              </div>
            </div>

            <AppButton
              text={selectedDepartments.length ? "Manage Departments" : "Add Department"}
              onPress={openDepartmentManager}
              buttonVariant="primary"
              className="h-10 w-full rounded-lg px-4 font-semibold sm:w-auto"
              startContent={<FiPlus className="text-[14px]" />}
              isDisabled={status === "Inactive"}
            />
          </div>

          <div className="px-4 py-4 sm:px-5">
            {isLabDepartmentsFetching ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" />
                Loading departments...
              </div>
            ) : selectedDepartments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No departments selected for this lab yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedDepartments.map((department) => (
                  <span
                    key={department.id}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {department.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-950 sm:text-[16px]">
                Lab Test Catalog
              </h2>
              <div className="mt-0.5 text-[12px] text-slate-500">
                {catalogRows.length} selected tests synced to this lab
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AppButton
                text="Sync Catalog"
                onPress={async () => {
                  if (!labRealId) return;
                  try {
                    await syncLabCatalog(labRealId).unwrap();
                    addToast({
                      title: "Lab catalog synced successfully",
                      description: "Selected test entries have been refreshed from master data.",
                      color: "success",
                    });
                    refetchLabTests();
                  } catch (e: any) {
                    addToast({
                      title: "Sync failed",
                      description:
                        e?.data?.message || e?.message || "Unable to sync lab catalog.",
                      color: "danger",
                    });
                  }
                }}
                isDisabled={isSyncingCatalog || isLabTestsFetching || status === "Inactive"}
                buttonVariant="primary"
                className="h-9 rounded-lg px-4 text-[13px] font-semibold"
              />
            </div>
          </div>

          <div>
            <div className="hidden grid-cols-[1.1fr_.75fr_.85fr_.85fr_.6fr_.65fr_.65fr_.55fr] gap-3 bg-slate-50 px-5 py-3 text-[12px] font-semibold text-slate-500 lg:grid">
              <div>Test Name</div>
              <div>Test Code</div>
              <div>Department</div>
              <div>Sample Type</div>
              <div>Price</div>
              <div>Status</div>
              <div>Source</div>
              <div className="text-right">Action</div>
            </div>

            {isLabTestsFetching ? (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                <Spinner size="sm" />
                Loading lab catalog...
              </div>
            ) : isLabTestsError ? (
              <div className="flex flex-col gap-3 px-5 py-8 text-sm text-rose-600 sm:flex-row sm:items-center">
                <span>Failed to load lab catalog.</span>
                <Button size="sm" onPress={() => refetchLabTests()}>
                  Retry
                </Button>
              </div>
            ) : catalogRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                  <FiFileText className="text-[22px]" />
                </div>
                <div className="mt-3 text-sm font-bold text-slate-950">
                  No tests in catalog
                </div>
                <div className="mt-1 max-w-sm text-[13px] text-slate-500">
                  Select departments and tests to sync them into this lab catalog.
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 lg:hidden">
                  {catalogRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold text-slate-950">
                            {row.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {row.departmentName} • {row.sampleType}
                          </div>
                          {row.testCode !== "—" && (
                            <div className="mt-1">
                              <span className="inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                {row.testCode}
                              </span>
                            </div>
                          )}
                        </div>
                        <StatusPill status={row.status as UIStatus} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            Price
                          </div>
                          <div className="mt-0.5 font-semibold text-slate-900">
                            {row.price}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            Source
                          </div>
                          <div className="mt-0.5 font-semibold text-slate-900">
                            {row.source}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openEditTestModal(row)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 cursor-pointer"
                          title="Edit"
                          aria-label={`Edit ${row.name}`}
                          disabled={status === "Inactive"}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!row.id) return;
                            setDeletingTestId(row.id);
                            setDeletingTestName(row.name || "this test");
                            testDeleteDisc.onOpen();
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 cursor-pointer"
                          title="Delete"
                          aria-label={`Delete ${row.name}`}
                          disabled={status === "Inactive"}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden divide-y divide-slate-100 lg:block">
                  {catalogRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.1fr_.75fr_.85fr_.85fr_.6fr_.65fr_.65fr_.55fr] items-center gap-3 px-5 py-4 text-[13px] transition-colors hover:bg-slate-50/80"
                    >
                      <div className="truncate font-bold text-slate-950">
                        {row.name}
                      </div>
                      <div>
                        <span className="inline-flex rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          {row.testCode}
                        </span>
                      </div>
                      <div className="truncate text-slate-900">
                        {row.departmentName}
                      </div>
                      <div className="truncate text-slate-900">
                        {row.sampleType}
                      </div>
                      <div className="font-semibold text-slate-950">
                        {row.price}
                      </div>
                      <div>
                        <StatusPill status={row.status as UIStatus} />
                      </div>
                      <div>
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {row.source}
                        </span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditTestModal(row)}
                          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 cursor-pointer"
                          title="Edit"
                          aria-label={`Edit ${row.name}`}
                          disabled={status === "Inactive"}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!row.id) return;
                            setDeletingTestId(row.id);
                            setDeletingTestName(row.name || "this test");
                            testDeleteDisc.onOpen();
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full border border-red-100 bg-red-50 text-red-600 transition-all duration-200 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 cursor-pointer"
                          title="Delete"
                          aria-label={`Delete ${row.name}`}
                          disabled={status === "Inactive"}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-950 sm:text-[16px]">
                Lab Assistants
              </h2>
              <div className="mt-0.5 text-[12px] text-slate-500">
                {assistants.length} {assistants.length === 1 ? "member" : "members"}
              </div>
            </div>

            <AppButton
              text="Add New Assistant"
              onPress={() => navigate(`/user/new?type=Lab_Assistant&labId=${labRealId}`)}
              buttonVariant="primary"
              className="h-10 w-full rounded-lg px-4 font-semibold sm:w-auto"
              startContent={<FiPlus className="text-[14px]" />}
              isDisabled={status === "Inactive"}
            />
          </div>

          <div>
            <div className="hidden grid-cols-[1.25fr_1fr_1fr_1.35fr_.75fr_.55fr] gap-3 bg-slate-50 px-5 py-3 text-[12px] font-semibold text-slate-500 lg:grid">
              <div>Name</div>
              <div>Date &amp; Time</div>
              <div>Phone</div>
              <div>Email</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>

            {isAsstFetching ? (
              <div className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500">
                <Spinner size="sm" />
                Loading assistants...
              </div>
            ) : isAsstError ? (
              <div className="flex flex-col gap-3 px-5 py-8 text-sm text-rose-600 sm:flex-row sm:items-center">
                <span>Failed to load assistants.</span>
                <Button size="sm" onPress={() => refetchAssistants()}>
                  Retry
                </Button>
              </div>
            ) : assistants.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-emerald-100">
                  <FiUserPlus className="text-[22px]" />
                </div>
                <div className="mt-3 text-sm font-bold text-slate-950">
                  No assistants found
                </div>
                <div className="mt-1 max-w-sm text-[13px] text-slate-500">
                  Add an assistant to manage lab work and report updates.
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 lg:hidden">
                  {assistants.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold text-slate-950">
                            {a.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {a.dateLabel} • {a.timeLabel}
                          </div>
                        </div>
                        <StatusPill status={a.status} />
                      </div>

                      <div className="mt-3 grid gap-2 text-[13px]">
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            Phone
                          </div>
                          <div className="max-w-[70%] truncate font-semibold text-slate-900">
                            {a.phone}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[11px] font-medium text-slate-500">
                            Email
                          </div>
                          <div className="max-w-[70%] truncate font-semibold text-slate-900">
                            {a.email}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <EditButton
                          onPress={() => openEditAssistant(a)}
                          isDisabled={isLoading}
                          text={""}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden divide-y divide-slate-100 lg:block">
                  {assistants.map((a) => (
                    <div
                      key={a.id}
                      className="grid grid-cols-[1.25fr_1fr_1fr_1.35fr_.75fr_.55fr] items-center gap-3 px-5 py-4 text-[13px] transition-colors hover:bg-slate-50/80"
                    >
                      <div className="truncate font-bold text-slate-950">
                        {a.name}
                      </div>

                      <div className="min-w-0">
                        <div className="text-slate-900">{a.dateLabel}</div>
                        <div className="text-[11px] text-slate-500">
                          {a.timeLabel}
                        </div>
                      </div>

                      <div className="truncate text-slate-900">{a.phone}</div>
                      <div className="truncate text-slate-900">{a.email}</div>

                      <div>
                        <StatusPill status={a.status} />
                      </div>

                      <div className="flex justify-end">
                        <EditButton
                          onPress={() => openEditAssistant(a)}
                          isDisabled={isLoading}
                          text={""}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={departmentDisc.isOpen}
        onOpenChange={(open) => {
          departmentDisc.onOpenChange();
          if (!open) {
            setSearchQuery("");
          }
        }}
        placement="center"
        size="2xl"
        hideCloseButton
        isDismissable={!isUpdatingDepartments}
        classNames={{ base: "rounded-[22px] max-w-[800px] overflow-hidden", body: "p-0" }}
      >
        <ModalContent>
          {() => (
            <ModalBody className="px-8 pt-8 pb-8 flex flex-col max-h-[85vh]">
              <style>{`
                .modal-scroll-area::-webkit-scrollbar {
                  width: 5px;
                }
                .modal-scroll-area::-webkit-scrollbar-track {
                  background: transparent;
                }
                .modal-scroll-area::-webkit-scrollbar-thumb {
                  background-color: #e2e8f0;
                  border-radius: 999px;
                }
                .modal-scroll-area::-webkit-scrollbar-thumb:hover {
                  background-color: #cbd5e1;
                }
              `}</style>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  departmentDisc.onClose();
                }}
                className="absolute right-6 top-6 grid place-items-center h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors z-10 focus:outline-none"
                aria-label="Close"
                disabled={isUpdatingDepartments}
              >
                <FiX className="text-lg" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-55/10 text-primary shadow-xs border border-emerald-100">
                  <FiLayers className="text-[22px]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900 leading-tight">
                    Manage Lab Departments
                  </h3>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500">
                    Select departments and choose the master tests to keep in this lab catalog.
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 shrink-0">
                <Input
                  isClearable
                  placeholder="Search departments or master tests..."
                  value={searchQuery}
                  onValueChange={(val) => setSearchQuery(val)}
                  onClear={() => setSearchQuery("")}
                  startContent={<FiSearch className="text-slate-400 text-lg mr-1 shrink-0" />}
                  radius="full"
                  variant="bordered"
                  classNames={{
                    inputWrapper: "border-slate-200 bg-slate-50/50 hover:border-slate-300 focus-within:!border-emerald-600/40 min-h-11 shadow-none",
                    input: "text-sm text-slate-900 placeholder:text-slate-400",
                  }}
                />
              </div>

              {/* Scrollable Departments Area */}
              <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 min-h-[350px] max-h-[50vh] modal-scroll-area">
                {isDepartmentsFetching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                    <Spinner size="md" color="success" />
                    <span className="text-sm font-medium">Loading lab departments...</span>
                  </div>
                ) : filteredDepartments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-3">
                      <FiSearch className="text-[20px]" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No departments found</h4>
                    <p className="mt-1 text-xs text-slate-500 max-w-xs">
                      Try searching with a different term, or verify that active departments exist.
                    </p>
                  </div>
                ) : (
                  filteredDepartments.map((department) => {
                    const isSelected = selectedDepartmentIds.includes(department.id);
                    const isExpanded = expandedDepartmentIds.includes(department.id) || autoExpandedIds.includes(department.id);
                    const testCount = department.tests?.length ?? 0;
                    const selectedTestIds = selectedDepartmentTestIds[department.id] ?? [];
                    const selectedTestCount = selectedTestIds.length;
                    const allTestIds = getDepartmentTestIdsById(department.id);
                    const areAllTestsSelected =
                      testCount > 0 && selectedTestCount === allTestIds.length;

                    return (
                      <div
                        key={department.id}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isSelected
                            ? "border-slate-200 border-l-4 border-l-emerald-600 bg-primary/10/5 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                          }`}
                      >
                        {/* Department Header */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer select-none gap-3 hover:bg-slate-50/30 transition-colors"
                          onClick={() => toggleDepartmentSelection(department.id)}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Checkbox */}
                            <Checkbox
                              isSelected={isSelected}
                              color="success"
                              radius="sm"
                              className="pointer-events-none"
                              aria-label={`Select ${department.label}`}
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900 truncate">
                                  {department.label}
                                </span>
                                {department.code && (
                                  <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-550 tracking-wide uppercase">
                                    {department.code}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                                {isSelected
                                  ? `${selectedTestCount}/${testCount} tests selected`
                                  : `${testCount} ${testCount === 1 ? "master test" : "master tests"} available`}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // prevent select toggle
                              toggleDepartmentExpand(department.id);
                            }}
                            className="grid place-items-center h-8 w-8 cursor-pointer rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 active:scale-90 bg-slate-50 border border-slate-100"
                            aria-label={isExpanded ? "Collapse tests list" : "Expand tests list"}
                          >
                            <FiChevronDown
                              className={`transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? "rotate-180" : ""
                                }`}
                            />
                          </button>
                        </div>

                        {/* Collapsible Tests Section */}
                        <motion.div
                          initial={false}
                          animate={{
                            height: isExpanded ? "auto" : 0,
                            opacity: isExpanded ? 1 : 0,
                          }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                            {testCount === 0 ? (
                              <p className="text-xs italic text-slate-400 px-1">
                                No master tests/templates configured for this department yet.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Choose the tests to keep in this department.
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDepartmentTestSelection(department.id, allTestIds)
                                      }
                                      className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10"
                                      disabled={areAllTestsSelected}
                                    >
                                      Select all
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDepartmentTestSelection(department.id, [])
                                      }
                                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100"
                                      disabled={!selectedTestCount}
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {department.tests?.map((test, index) => {
                                    const testId = getDepartmentTestId(
                                      test,
                                      `${department.id}-${index}`,
                                    );
                                    const testName = getDepartmentTestName(test);
                                    const testCode = getDepartmentTestCode(test);
                                    const isTestSelected = selectedTestIds.includes(testId);
                                    const searchQ = searchQuery.toLowerCase().trim();
                                    const isNameMatch =
                                      searchQ && testName.toLowerCase().includes(searchQ);
                                    const isCodeMatch =
                                      searchQ && testCode.toLowerCase().includes(searchQ);
                                    const isTypeMatch =
                                      searchQ &&
                                      test.sampleType?.toLowerCase().includes(searchQ);

                                    return (
                                      <div
                                        key={testId}
                                        role="checkbox"
                                        tabIndex={0}
                                        aria-checked={isTestSelected}
                                        onClick={() =>
                                          toggleDepartmentTestSelection(
                                            department.id,
                                            testId,
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key !== "Enter" && event.key !== " ") {
                                            return;
                                          }
                                          event.preventDefault();
                                          toggleDepartmentTestSelection(
                                            department.id,
                                            testId,
                                          );
                                        }}
                                        className={`flex min-h-[76px] cursor-pointer items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isTestSelected
                                            ? "border-emerald-300 bg-primary/10/60 shadow-xs"
                                            : isNameMatch || isCodeMatch || isTypeMatch
                                              ? "border-emerald-300 bg-primary/10/20 shadow-xs"
                                              : "border-slate-100 bg-white hover:border-slate-200"
                                          }`}
                                      >
                                        <Checkbox
                                          isSelected={isTestSelected}
                                          color="success"
                                          radius="sm"
                                          className="pointer-events-none mt-0.5 shrink-0"
                                          aria-label={`Select ${testName}`}
                                        />

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <span className={`text-xs font-bold leading-tight ${isNameMatch ? "text-primary bg-primary/100/10 px-0.5 rounded" : "text-slate-800"
                                              }`}>
                                              {testName}
                                            </span>
                                            {test.sampleType && (
                                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${isTypeMatch
                                                  ? "bg-emerald-100 text-emerald-800"
                                                  : getSampleTypeColor(test.sampleType)
                                                }`}>
                                                {test.sampleType}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                            {testCode && (
                                              <span className={`text-[10px] font-semibold font-mono uppercase ${isCodeMatch ? "text-primary bg-primary/10 rounded" : "text-slate-400"
                                                }`}>
                                                {testCode}
                                              </span>
                                            )}
                                            {test.description && (
                                              <>
                                                {testCode && (
                                                  <span className="text-slate-300 text-[10px]">•</span>
                                                )}
                                                <span className="text-[10px] text-slate-500 truncate max-w-[150px]" title={test.description}>
                                                  {test.description}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="mt-6 border-t border-slate-100 pt-5 flex items-center justify-between gap-3 shrink-0">
                <div className="text-xs font-semibold text-slate-500">
                  {selectedDepartmentIds.length} {selectedDepartmentIds.length === 1 ? "department" : "departments"} selected
                  {selectedTestTotal > 0
                    ? ` • ${selectedTestTotal} ${selectedTestTotal === 1 ? "test" : "tests"}`
                    : ""}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    radius="full"
                    variant="bordered"
                    className="border-slate-300 text-slate-600 font-semibold px-6 hover:bg-slate-50"
                    onPress={() => {
                      setSearchQuery("");
                      departmentDisc.onClose();
                    }}
                    disabled={isUpdatingDepartments}
                  >
                    Cancel
                  </Button>

                  <Button
                    radius="full"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-8"
                    onPress={() => {
                      setSearchQuery("");
                      saveDepartments();
                    }}
                    isLoading={isUpdatingDepartments}
                    isDisabled={isUpdatingDepartments}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>



      {/* Assistant Modal (Add new assistant) */}
      <AddAssistantModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        labId={labId as string}
        existingAssistants={asstArr}
        onCreated={() => {
          refetchLab();
          refetchAssistants();
        }}
      />

      {/* ✅ Edit Lab Modal */}

      <Modal
        isOpen={editDisc.isOpen}
        onOpenChange={editDisc.onOpenChange}
        placement="center"
        size="lg"
        classNames={{
          base: "rounded-2xl",
          footer: "[&_button]:rounded-xl",
        }}
      >
        <EditLabModal
          editForm={editForm}
          isUpdating={isUpdatingLab}
          closeEdit={() => {
            editDisc.onClose();
            setEditForm(null);
          }}
          saveEdit={saveLab}
        />
      </Modal>

      {/* ✅ Edit Assistant Modal */}

      <Modal
        isOpen={asstEditDisc.isOpen}
        onOpenChange={asstEditDisc.onOpenChange}
        placement="center"
        size="lg"
      >
        <EditAssistantModal
          editForm={editAsst}
          isUpdating={isUpdatingAsst}
          closeEdit={() => {
            asstEditDisc.onClose();
            setEditAsst(null);
          }}
          saveEdit={saveAssistant}
        />
      </Modal>

      <AddEditTestModal
        isOpen={testEditDisc.isOpen}
        mode={testMode}
        name={testName}
        testCode={testCode}
        departmentId={testDepartmentId}
        sampleType={testSampleType}
        price={testPrice}
        status={testStatus}
        departments={testDepartmentOptions}
        isSaving={isUpdatingTest}
        nameError={testNameError}
        onOpenChange={(open) => {
          testEditDisc.onOpenChange();
          if (!open) {
            resetTestForm();
            setEditingTestId(null);
          }
        }}
        onNameChange={setTestName}
        onTestCodeChange={setTestCode}
        onDepartmentChange={setTestDepartmentId}
        onSampleTypeChange={setTestSampleType}
        onPriceChange={setTestPrice}
        onStatusChange={setTestStatus}
        onCancel={() => {
          resetTestForm();
          setEditingTestId(null);
          testEditDisc.onClose();
        }}
        onSubmit={onSaveTest}
      />

      {testDeleteDisc.isOpen && (
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
                {deletingTestName}
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
                  setDeletingTestId(null);
                  setDeletingTestName("");
                  testDeleteDisc.onClose();
                }}
                disabled={isDeletingTest}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteTest}
                disabled={isDeletingTest}
                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeletingTest ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LabDetails;
