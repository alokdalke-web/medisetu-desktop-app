import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Pagination,
  useDisclosure,
} from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import {
  FiDownload,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX
} from "react-icons/fi";
import { useNavigate } from "react-router";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import medicine from "../../../public/assets/icons/medicine.svg";


import {
  useDeleteMedicineMutation,
  useGetMedicinesQuery,
  useToggleMedicineStatusMutation,
} from "../../redux/api/medicineApi";

type MedicineRow = {
  id: string;

  medicine: string; // genericName
  brandName: string; // name
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;
  requiresPrescription?: boolean;
  isFavorite?: boolean;
  isActive?: boolean;
};

// function formatStrength(value: string) {
//   const v = String(value ?? "").trim();
//   if (!v) return "";
//   return /[a-zA-Z]/.test(v) ? v : `${v} mg`;
// }

function pad(value: string, width: number) {
  return String(value ?? "").padEnd(width, " ");
}

function toReadableText(rows: MedicineRow[]) {
  const header =
    `${pad("Medicine Name", 28)}${pad("Form", 20)}${pad("Composition", 36)}`;

  const divider =
    `${"-".repeat(28)}${"-".repeat(20)}${"-".repeat(36)}`;

  const lines = rows.map((r) =>
    `${pad(r.brandName || r.medicine || "", 28)}${pad(r.form || "", 20)}${pad(r.composition || "", 36)}`
  );

  return [header, divider, ...lines].join("\n");
}

// function toCSV(rows: MedicineRow[]) {
//   const headers = ["Medicine Name", "Strength", "Form"];

//   const escape = (v: string) => `"${String(v ?? "").replaceAll('"', '""')}"`;

//   const lines = [
//     headers.join(","),
//     ...rows.map((r) =>
//       [
//         escape(r.brandName || r.medicine || ""),
//         escape(formatStrength(r.strength)),
//         escape(r.form || ""),
//       ].join(","),
//     ),
//   ];

//   return lines.join("\n");
// }


function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Empty UI (Screenshot-like) ---------------- */

const MedicineEmptyState = ({
  title,
  description,
  primaryText,
  onPrimary,
  secondaryText,
  onSecondary,
}: {
  title: string;
  description: string;
  primaryText: string;
  onPrimary: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
}) => {
  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-4 py-12 sm:py-14">
      <div className="mx-auto flex max-w-[460px] flex-col items-center text-center">
        <div className="mb-6">
          <svg
            width="220"
            height="140"
            viewBox="0 0 220 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="opacity-95"
          >
            <rect
              x="12"
              y="26"
              width="196"
              height="96"
              rx="18"
              fill="#F5F7FA"
            />
            <circle cx="98" cy="48" r="18" fill="#E6F6F4" />
            <path
              d="M94 48l3 3 6-8"
              stroke="#0F766E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="38"
              y="72"
              width="42"
              height="40"
              rx="10"
              fill="#ffffff"
              stroke="#E5E7EB"
            />
            <rect x="45" y="79" width="28" height="6" rx="3" fill="#E5E7EB" />
            <rect x="45" y="90" width="22" height="6" rx="3" fill="#E5E7EB" />

            <rect
              x="94"
              y="64"
              width="46"
              height="48"
              rx="12"
              fill="#ffffff"
              stroke="#E5E7EB"
            />
            <rect x="104" y="73" width="26" height="6" rx="3" fill="#E5E7EB" />
            <rect x="104" y="84" width="18" height="6" rx="3" fill="#E5E7EB" />
            <rect x="104" y="95" width="22" height="6" rx="3" fill="#E5E7EB" />

            <rect
              x="154"
              y="80"
              width="28"
              height="32"
              rx="10"
              fill="#E6F6F4"
            />
            <rect
              x="159"
              y="86"
              width="18"
              height="6"
              rx="3"
              fill="#0F766E"
              opacity="0.25"
            />
          </svg>
        </div>

        <div className="text-sm font-semibold text-slate-900 sm:text-base">
          {title}
        </div>
        <div className="mt-1 text-xs text-slate-500 sm:text-sm">
          {description}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
          <Button
            startContent={<FiPlus />}
            className="rounded-lg bg-primary px-8 text-white w-full sm:w-auto"
            onPress={onPrimary}
          >
            {primaryText}
          </Button>

          {secondaryText && onSecondary ? (
            <Button
              variant="bordered"
              startContent={<FiX />}
              className="rounded-lg px-6 w-full sm:w-auto"
              onPress={onSecondary}
            >
              {secondaryText}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const Medicine: React.FC = () => {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<MedicineRow[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ✅ Delete confirm modal
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();
  const [deleting, setDeleting] = useState<MedicineRow | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ✅ IMPORTANT: ensure list refetches when you come back from setup page
  const queryArg = React.useMemo(() => {
    if (statusFilter === "active") return { isActive: true };
    if (statusFilter === "disabled") return { isActive: false };
    return undefined; // "all" — backend returns all
  }, [statusFilter]);

  const { data, isLoading, isFetching, isError, refetch } =
    useGetMedicinesQuery(queryArg, { refetchOnMountOrArgChange: true });

  const [deleteMedicine, { isLoading: deletingLoading }] =
    useDeleteMedicineMutation();

  const [toggleStatus] = useToggleMedicineStatusMutation();

  useEffect(() => {
    if (!data?.medicines) return;

    const mapped: MedicineRow[] = data.medicines.map((m: any) => ({
      id: String(m.id ?? ""),
      medicine: String(m.genericName ?? "").trim(),
      brandName: String(m.name ?? "").trim(),
      manufacturer: String(m.manufacturer ?? "").trim(),
      composition: String(m.composition ?? "").trim(),
      form: String(m.form ?? "").trim(),
      strength: String(m.strength ?? "").trim(),
      category: String(m.category ?? "").trim(),
      requiresPrescription: Boolean(m.requiresPrescription),
      isFavorite: Boolean(m.isFavorite),
      isActive: m.isActive !== undefined ? Boolean(m.isActive) : true,
    }));

    setRows(mapped);
  }, [data]);

  const filtered = useMemo(() => {
    const s = debouncedQ.trim().toLowerCase();
    if (!s) return rows;

    return rows.filter((r) =>
      [
        r.medicine,
        r.brandName,
        r.manufacturer,
        r.composition,
        r.form,
        r.strength,
        r.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [debouncedQ, rows]);

  useEffect(() => setPage(1), [debouncedQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ✅ NOW: navigate instead of modal
  const openAdd = () => navigate("/profile/medicines/setup");

  const openEdit = (r: MedicineRow) =>
    navigate(`/profile/medicines/setup/${r.id}`, {
      state: {
        mode: "edit",
        initial: {
          id: r.id,
          genericName: r.medicine,
          name: r.brandName,
          manufacturer: r.manufacturer,
          composition: r.composition,
          form: r.form,
          strength: r.strength,
          category: r.category,
          requiresPrescription: r.requiresPrescription,
          isActive: r.isActive,
        },
      },
    });
  const openDelete = (r: MedicineRow) => {
    setDeleting(r);
    onDeleteOpen();
  };

  const confirmDelete = async (close: () => void) => {
    if (!deleting?.id) {
      addToast({
        title: "Missing ID",
        description: "medicineId nahi mila.",
        color: "danger",
      });
      return;
    }

    try {
      await deleteMedicine({ medicineId: deleting.id }).unwrap();
      addToast({
        title: "Deleted",
        description: "Medicine deleted successfully",
        color: "success",
      });

      close();
      setDeleting(null);

      // refresh list
      refetch();
    } catch (e: any) {
      addToast({
        title: "Failed",
        description: e?.data?.message ?? "Something went wrong",
        color: "danger",
      });
    }
  };

  const handleToggleStatus = async (r: MedicineRow) => {
    try {
      await toggleStatus({ medicineId: r.id, isActive: !r.isActive }).unwrap();
      addToast({
        title: r.isActive ? "Medicine disabled" : "Medicine enabled",
        description: `${r.brandName || r.medicine} has been ${r.isActive ? "disabled" : "enabled"}.`,
        color: "success",
      });
      refetch();
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
          description: e?.data?.message ?? "Failed to update medicine status",
          color: "danger",
        });
      }
    }
  };

  const onDownload = () => {
    if (filtered.length === 0) {
      addToast({
        title: "Nothing to download",
        description: "No rows found.",
      });
      return;
    }

    downloadText("medicines.txt", toReadableText(filtered));
  };

  // empty-state decisions
  const isInitialEmpty = rows.length === 0 && q.trim() === "";
  const isSearchEmpty = rows.length > 0 && filtered.length === 0;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden dark:border-[#273244] dark:bg-[#111726] [&_.border-gray-200]:dark:border-[#273244] [&_.border-gray-100]:dark:border-[#273244] [&_.bg-white]:dark:bg-[#0f1728] [&_.bg-slate-50]:dark:bg-[#0f1728] [&_.bg-slate-50\\/70]:dark:bg-[#0f1728] [&_.text-slate-700]:dark:text-slate-300 [&_.text-slate-900]:dark:text-white [&_.text-slate-500]:dark:text-slate-400 [&_.hover\\:bg-gray-50]:dark:hover:bg-[#1a2535]">
        <ProfilePageHeader
          icon={<img src={medicine} alt="" className="w-4 h-4" />}
          title="Medicines"
          description="Manage medicine / composition list"
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-5 sm:px-6 py-3 dark:border-[#273244]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Input
              value={q}
              onValueChange={(val) => setQ((val ?? "").toUpperCase())}
              placeholder="Search medicine / composition"
              startContent={<FiSearch className="text-slate-500" />}
              className="w-full sm:max-w-[280px]"
              classNames={{
                inputWrapper: "rounded-full border border-gray-200 bg-white h-9 shadow-none",
                input: "text-sm",
              }}
            />

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((p) => !p)}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 pr-9 text-sm text-slate-700 outline-none cursor-pointer hover:border-slate-300 focus:border-teal-600 transition"
              >
                {statusFilter === "all" ? "All" : statusFilter === "active" ? "Active Only" : "Disabled Only"}
                <svg className="absolute right-3 h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  {([
                    { value: "all", label: "All" },
                    { value: "active", label: "Active Only" },
                    { value: "disabled", label: "Disabled Only" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition ${statusFilter === opt.value
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {statusFilter === opt.value && (
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {statusFilter !== opt.value && <span className="w-3.5" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <Button
              variant="bordered"
              startContent={<FiDownload className="h-4 w-4" />}
              className="rounded-lg h-9 text-sm w-full sm:w-auto"
              onPress={onDownload}
            >
              Download
            </Button>

            <Button
              startContent={<FiPlus className="h-4 w-4" />}
              className="rounded-lg h-9 text-sm bg-primary text-white w-full sm:w-auto"
              onPress={openAdd}
            >
              Add New Medicine
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 sm:px-6 py-4">

          {(isLoading || isFetching) && (
            <div className="mt-4 rounded-2xl border border-gray-200 p-6 text-center text-slate-500">
              Loading medicines...
            </div>
          )}

          {isError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
              Failed to load medicines
            </div>
          )}

          {!isLoading && !isFetching && !isError && (
            <>
              {/* Empty UI */}
              {isInitialEmpty && (
                <MedicineEmptyState
                  title="No Medicines Added Yet"
                  description="Start by adding medicines so you can quickly create prescriptions for your patients."
                  primaryText="Add Medicine"
                  onPrimary={openAdd}
                />
              )}

              {isSearchEmpty && (
                <MedicineEmptyState
                  title="No results found"
                  description="Try a different keyword or clear the search."
                  primaryText="Add Medicine"
                  onPrimary={openAdd}
                  secondaryText="Clear search"
                  onSecondary={() => setQ("")}
                />
              )}

              {/* DATA UI */}
              {!isInitialEmpty && !isSearchEmpty && (
                <>
                  {/* MOBILE (optional - same as before, you can keep) */}
                  <div className="mt-4 grid gap-3 sm:hidden">
                    {paginated.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-gray-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 ">
                            {/* ✅ Medicine Details look */}
                            <div className="truncate font-semibold text-slate-900">
                              {r.brandName || "—"}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {r.category || "—"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 hover:bg-gray-50"
                              onClick={() => openEdit(r)}
                              title="Edit"
                              type="button"
                            >
                              <FiEdit2 className="text-slate-700" />
                            </button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 hover:bg-gray-50"
                              onClick={() => openDelete(r)}
                              title="Delete"
                              type="button"
                            >
                              <FiTrash2 className="text-rose-500" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">Brand Name</div>
                            <div className="truncate text-slate-800">{r.brandName || "—"}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">Manufacturer</div>
                            <div className="truncate text-slate-800">
                              {r.manufacturer || "—"}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">Form & Str.</div>
                            <div className="truncate text-slate-800">
                              {(r.form || "—") + (r.strength ? ` ${r.strength}` : "")}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] text-slate-500">Composition</div>
                            <div className="truncate text-slate-800">
                              {r.composition || "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP (Screenshot like) */}
                  <div className="mt-4 hidden sm:block overflow-hidden rounded-xl border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/70">
                          <tr className="border-b border-gray-200 text-slate-500 font-normal">
                            <th className="px-5 py-3 w-[280px] font-normal">Medicine Name</th>
                            <th className="px-5 py-3 w-[160px] font-normal">Form</th>
                            <th className="px-5 py-3 min-w-[220px] font-normal">Composition</th>
                            <th className="px-5 py-3 w-[120px] font-normal">Status</th>
                            <th className="px-5 py-3 w-[120px] text-center font-normal">Action</th>
                          </tr>
                        </thead>

                        <tbody>
                          {paginated.map((r) => (
                            <tr
                              key={r.id}
                              className={`border-b border-gray-200 last:border-b-0 ${!r.isActive ? "opacity-50 bg-slate-50" : ""}`}
                            >
                              <td className="px-5 py-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-3 truncate text-slate-900" title={r.brandName}>
                                    {/* Medicine icon with form-based color and shape */}
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${r.form?.toLowerCase() === "tablet" ? "bg-emerald-50 text-emerald-600"
                                      : r.form?.toLowerCase() === "capsule" ? "bg-blue-50 text-blue-600"
                                        : r.form?.toLowerCase() === "syrup" || r.form?.toLowerCase() === "suspension" || r.form?.toLowerCase() === "liquid" ? "bg-slate-100 text-slate-600"
                                          : r.form?.toLowerCase() === "injection" ? "bg-rose-50 text-rose-600"
                                            : r.form?.toLowerCase() === "cream" || r.form?.toLowerCase() === "ointment" || r.form?.toLowerCase() === "gel" ? "bg-amber-50 text-amber-600"
                                              : r.form?.toLowerCase() === "drops" ? "bg-cyan-50 text-cyan-600"
                                                : r.form?.toLowerCase() === "inhaler" ? "bg-sky-50 text-sky-600"
                                                  : r.form?.toLowerCase() === "powder" || r.form?.toLowerCase() === "sachet" || r.form?.toLowerCase() === "granules" ? "bg-orange-50 text-orange-600"
                                                    : "bg-purple-50 text-purple-600"
                                      }`}>
                                      {/* Tablet icon */}
                                      {r.form?.toLowerCase() === "tablet" && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <circle cx="12" cy="12" r="9" />
                                          <line x1="12" y1="3" x2="12" y2="21" />
                                        </svg>
                                      )}
                                      {/* Capsule icon */}
                                      {r.form?.toLowerCase() === "capsule" && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <rect x="5" y="8" width="14" height="8" rx="4" />
                                          <line x1="12" y1="8" x2="12" y2="16" />
                                        </svg>
                                      )}
                                      {/* Syrup/Liquid icon */}
                                      {(r.form?.toLowerCase() === "syrup" || r.form?.toLowerCase() === "suspension" || r.form?.toLowerCase() === "liquid") && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <path d="M8 2h8v4l2 2v10a4 4 0 01-4 4h-4a4 4 0 01-4-4V8l2-2V2z" />
                                          <path d="M8 10h8" />
                                        </svg>
                                      )}
                                      {/* Injection icon */}
                                      {r.form?.toLowerCase() === "injection" && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M18 2l4 4M7.5 20.5L2 22l1.5-5.5M15.5 4.5l4 4-12 12-5 1 1-5 12-12z" />
                                        </svg>
                                      )}
                                      {/* Cream/Ointment/Gel icon */}
                                      {(r.form?.toLowerCase() === "cream" || r.form?.toLowerCase() === "ointment" || r.form?.toLowerCase() === "gel") && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <path d="M9 3h6l1 4H8l1-4zM8 7h8v2a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" />
                                          <rect x="7" y="10" width="10" height="11" rx="2" />
                                        </svg>
                                      )}
                                      {/* Drops icon */}
                                      {r.form?.toLowerCase() === "drops" && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <path d="M12 2c0 0-6 7-6 11a6 6 0 0012 0c0-4-6-11-6-11z" />
                                        </svg>
                                      )}
                                      {/* Inhaler icon */}
                                      {r.form?.toLowerCase() === "inhaler" && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <path d="M10 4h4v3h3v13a2 2 0 01-2 2h-6a2 2 0 01-2-2V7h3V4z" />
                                          <path d="M10 12h4" />
                                        </svg>
                                      )}
                                      {/* Powder/Sachet/Granules icon */}
                                      {(r.form?.toLowerCase() === "powder" || r.form?.toLowerCase() === "sachet" || r.form?.toLowerCase() === "granules") && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                          <path d="M4 8l4-4h8l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                                          <path d="M4 8h16" />
                                          <path d="M9 12l2 2 4-4" />
                                        </svg>
                                      )}
                                      {/* Default pill icon for other forms */}
                                      {!["tablet", "capsule", "syrup", "suspension", "liquid", "injection", "cream", "ointment", "gel", "drops", "inhaler", "powder", "sachet", "granules"].includes(r.form?.toLowerCase() ?? "") && (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M10.5 1.5l8.5 8.5a4.95 4.95 0 010 7 4.95 4.95 0 01-7 0l-8.5-8.5a4.95 4.95 0 010-7 4.95 4.95 0 017 0z" />
                                          <line x1="8" y1="8" x2="16" y2="16" />
                                        </svg>
                                      )}
                                    </span>
                                    {r.isFavorite && (
                                      <svg className="w-4 h-4 shrink-0 text-yellow-500 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                      </svg>
                                    )}
                                    <span className="truncate font-medium">{r.brandName || "—"}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Brand Name */}
                              {/* <td className="px-5 py-4">
                  <div className="truncate text-slate-800" title={r.strength}>
                    {r.strength ? `${r.strength} mg` : "—"}
                  </div>
                </td> */}

                              {/* Manufacturer */}
                              {/* <td className="px-5 py-4">
                  <div
                    className="truncate text-slate-800"
                    title={r.manufacturer}
                  >
                    {r.manufacturer || "—"}
                  </div>
                </td> */}

                              <td className="px-5 py-4">
                                <div className="truncate text-slate-800" title={r.form}>
                                  {r.form || "—"}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div
                                  className="max-w-[320px] truncate text-slate-800"
                                  title={r.composition}
                                >
                                  {r.composition || "—"}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-sm font-medium ${r.isActive
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                    }`}
                                >
                                  <span className={`h-2 w-2 rounded-full ${r.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                                  {r.isActive ? "Active" : "Disabled"}
                                </span>
                              </td>

                              {/* Composition */}
                              {/* <td className="px-5 py-4">
                  <div
                    className="truncate text-slate-800"
                    title={r.composition}
                  >
                    {r.composition || "—"}
                  </div>
                </td> */}

                              {/* Form & Str. (2 lines like screenshot) */}
                              {/* <td className="px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-slate-900" title={r.form}>
                      {r.form || "—"}
                    </div>
                    <div
                      className="truncate text-xs font-medium text-primary"
                      title={r.strength}
                    >
                      {r.strength ? `${r.strength} mg` : "—"}
                    </div>
                  </div>
                </td> */}

                              {/* Action */}
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition"
                                    onClick={() => openEdit(r)}
                                    title="Edit"
                                    type="button"
                                  >
                                    <FiEdit2 className="h-4 w-4 text-slate-600" />
                                  </button>

                                  <button
                                    className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white hover:bg-rose-50 transition"
                                    onClick={() => openDelete(r)}
                                    title="Delete"
                                    type="button"
                                  >
                                    <FiTrash2 className="h-4 w-4 text-rose-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* pagination footer */}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 pt-4">
                    <div className="text-sm text-slate-500">
                      Showing{" "}
                      {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}
                      {" "}to{" "}
                      {Math.min(page * pageSize, filtered.length)}
                      {" "}of{" "}
                      {filtered.length} entries
                    </div>

                    {totalPages > 1 && (
                      <Pagination
                        isCompact
                        showControls
                        page={page}
                        total={totalPages}
                        onChange={setPage}
                        classNames={{ cursor: "bg-primary text-white" }}
                      />
                    )}
                  </div>
                </>
              )}

            </>
          )}
        </div>
      </div>

      {/* ✅ Delete Confirm Modal (same) */}
      <Modal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteOpenChange}
        placement="center"
        size="md"
      >
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="text-lg font-semibold">
                Delete Medicine
              </ModalHeader>
              <ModalBody>
                <div className="text-sm text-slate-700">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">
                    {deleting?.brandName || "this medicine"}
                  </span>
                  {deleting?.medicine ? (
                    <>
                      {" "}
                      (<span className="font-medium">{deleting.medicine}</span>)
                    </>
                  ) : null}
                  ?
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  This will deactivate the medicine. You can re-add it later with the same name and it will be restored. Alternatively, you can disable it using the toggle to keep it in your list.
                </div>
              </ModalBody>

              <ModalFooter className="flex items-center gap-3">
                <Button
                  variant="bordered"
                  className="rounded-lg px-8"
                  onPress={() => {
                    setDeleting(null);
                    close();
                  }}
                  isDisabled={deletingLoading}
                >
                  Cancel
                </Button>

                {deleting?.isActive && (
                  <Button
                    variant="bordered"
                    className="rounded-lg px-6 border-amber-500 text-amber-600"
                    onPress={() => {
                      if (deleting) handleToggleStatus(deleting);
                      setDeleting(null);
                      close();
                    }}
                    isDisabled={deletingLoading}
                  >
                    Disable Instead
                  </Button>
                )}

                <Button
                  className="rounded-lg bg-rose-600 px-10 text-white disabled:bg-gray-200 disabled:text-gray-500"
                  isDisabled={deletingLoading || !deleting?.id}
                  onPress={() => confirmDelete(close)}
                >
                  {deletingLoading ? "Deleting..." : "Delete"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default Medicine;
