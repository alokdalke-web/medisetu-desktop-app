
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
  Pagination,
} from "@heroui/react";
import React, { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiUser,
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router";

import { useDebounce } from "use-debounce";
import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import {
  useGetSupplierBatchesQuery,
  useUpdateSupplierMutation,
  type UpdateSupplierRequest,
} from "../../redux/api/supplierApi";

// ✅ NEW: RHF + InputField
import { useForm, useWatch } from "react-hook-form";
import InputField from "../../components/shared/InputField";

/* ----------------------------- Types ----------------------------- */

type SupplierStateRow = {
  supplierId?: string;
  id?: string;
  _id?: string;

  supplierName?: string;
  name?: string;
  companyName?: string;
  location?: string;

  contactNo?: string;
  contactPhone?: string;
  contactEmail?: string;
};

type UiBatchRow = {
  id: string;
  batchNo: string;
  supplierName: string;
  itemCount: number;
  totalAmount: string;
  batchDate: string;
  updatedAt: string;
};

/* ----------------------------- Helpers ----------------------------- */

const PAGE_SIZE = 10;

function safeString(v: any) {
  return v == null ? "" : String(v);
}

function normalizeArray(res: any): any[] {
  const raw = res?.result ?? res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result?.data)) return raw.result.data;
  if (Array.isArray(raw?.result)) return raw.result;
  return [];
}

function formatDate(v: any) {
  const s = safeString(v).trim();
  if (!s || s === "—") return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function formatApiDateTime(v: any) {
  const s = safeString(v).trim();
  return s ? s : "—";
}

function getRtkErrorMessage(err: any) {
  return (
    err?.data?.message ||
    err?.data?.error ||
    err?.error ||
    err?.message ||
    "Failed to load batches"
  );
}

const only10Digits = (v: string) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

/* ----------------------------- Component ----------------------------- */

const SupplierDetails: React.FC = () => {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const location = useLocation();

  const supplierFromState = (location.state as any)?.supplier as
    | SupplierStateRow
    | undefined;

  const supplierIdStr = supplierId ? String(supplierId) : "";

  // keep supplier in local state so UI updates after edit
  const [supplierLocal, setSupplierLocal] = useState<
    SupplierStateRow | undefined
  >(supplierFromState);

  // ✅ track if user edited supplier on this screen (so we don't override with batches response)
  const [didEditSupplier, setDidEditSupplier] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);

  const {
    data: batchesRes,
    isLoading,
    error,
  } = useGetSupplierBatchesQuery(
    {
      supplierId: supplierIdStr,
      search: debouncedQuery?.trim() || undefined,
    },
    { skip: !supplierIdStr },
  );

  // ✅ supplierName from backend batches response (source of truth on first load)
  const backendSupplierName = useMemo(() => {
    const list = normalizeArray(batchesRes);
    const first = list?.[0];
    const n = safeString(first?.supplierName).trim();
    return n || "";
  }, [batchesRes]);

  // ✅ display name logic:
  // - if user edited on this screen -> use local
  // - else prefer backend (so UI matches API response)
  const displaySupplierName = useMemo(() => {
    const localName = safeString(
      supplierLocal?.name ?? supplierLocal?.supplierName,
    ).trim();

    if (didEditSupplier && localName) return localName;
    return backendSupplierName || localName || "—";
  }, [backendSupplierName, didEditSupplier, supplierLocal]);

  // ✅ keep local state synced from backend on first load (only if not edited)
  React.useEffect(() => {
    if (!backendSupplierName) return;
    if (didEditSupplier) return;

    setSupplierLocal((prev) => {
      const prevName = safeString(prev?.name ?? prev?.supplierName).trim();
      if (prevName === backendSupplierName) return prev;
      return {
        ...(prev || {}),
        name: backendSupplierName,
        supplierName: backendSupplierName,
      };
    });
  }, [backendSupplierName, didEditSupplier]);

  const title = supplierLocal?.companyName || displaySupplierName || "Supplier";

  const [page, setPage] = useState(1);

  /* -------------------- Edit Supplier Modal -------------------- */

  const editModal = useDisclosure();
  const [updateSupplier, { isLoading: isUpdatingSupplier }] =
    useUpdateSupplierMutation();

  // ✅ RHF form for modal
  const {
    control: editControl,
    setValue: setEditValue,
    getValues: getEditValues,
  } = useForm<UpdateSupplierRequest>({
    defaultValues: {
      name: "",
      companyName: "",
      location: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  const contactPhoneVal = useWatch({
    control: editControl,
    name: "contactPhone",
  });

  // ✅ instant phone validation like before
  const phoneError = useMemo(() => {
    const v = (contactPhoneVal || "").trim();
    if (!v) return "Contact phone is required";
    if (!/^[6-9]\d{9}$/.test(v)) return "Invalid number.";
    return "";
  }, [contactPhoneVal]);

  const openEdit = () => {
    const name = safeString(displaySupplierName);
    const companyName = safeString(supplierLocal?.companyName);
    const locationStr = safeString(supplierLocal?.location);

    const contactPhoneRaw = safeString(
      supplierLocal?.contactPhone ?? supplierLocal?.contactNo,
    );
    const contactPhone = only10Digits(contactPhoneRaw);

    const contactEmail = safeString(supplierLocal?.contactEmail);

    setEditValue("name", name);
    setEditValue("companyName", companyName);
    setEditValue("location", locationStr);
    setEditValue("contactPhone", contactPhone);
    setEditValue("contactEmail", contactEmail || "");

    editModal.onOpen();
  };

  const saveSupplier = async (onClose: () => void) => {
    if (!supplierIdStr) return;

    const payload: UpdateSupplierRequest = {
      name: safeString(getEditValues("name")).trim(),
      companyName: safeString(getEditValues("companyName")).trim(),
      location: safeString(getEditValues("location")).trim(),
      contactPhone: only10Digits(safeString(getEditValues("contactPhone"))).trim(),
      contactEmail: safeString(getEditValues("contactEmail"))?.trim() || undefined,
    };

    if (
      !payload.name ||
      !payload.companyName ||
      !payload.location ||
      !payload.contactPhone
    ) {
      addToast({
        title: "Please fill all required fields",
        description: "Name, Company, Location, Phone are required.",
        color: "warning",
      });
      return;
    }

    // ✅ enforce validation before API call
    if (!/^[6-9]\d{9}$/.test(payload.contactPhone)) {
      addToast({
        title: "Invalid phone number",
        description: "Must be 10 digits starting with 6, 7, 8, or 9.",
        color: "warning",
      });
      return;
    }

    try {
      const res = await updateSupplier({
        supplierId: supplierIdStr,
        body: payload,
      }).unwrap();

      addToast({
        title: "Supplier updated",
        description: res?.message || "Details saved successfully",
        color: "success",
      });

      // ✅ mark edited so display name prefers local
      setDidEditSupplier(true);

      // Update local UI
      setSupplierLocal((prev) => ({
        ...(prev || {}),
        name: payload.name,
        supplierName: payload.name,
        companyName: payload.companyName,
        location: payload.location,
        contactPhone: payload.contactPhone,
        contactNo: payload.contactPhone,
        contactEmail: payload.contactEmail,
      }));

      onClose();
    } catch (e: any) {
      addToast({
        title: "Update failed",
        description: getRtkErrorMessage(e),
        color: "danger",
      });
    }
  };

  /* -------------------- Table rows mapping -------------------- */

  const allRows: UiBatchRow[] = useMemo(() => {
    const batches = normalizeArray(batchesRes);
    return batches.map((b: any, idx: number) => ({
      id: safeString(b?.id ?? b?._id ?? `${idx}`),
      batchNo: safeString(b?.batchNo ?? "—"),

      // ✅ keep consistent supplierName for search/navigation
      supplierName: displaySupplierName,

      batchDate: formatDate(b?.createdAt || b?.updatedAt),
      itemCount: Number(b?.itemCount ?? 0),
      updatedAt: formatApiDateTime(b?.updatedAt),
      totalAmount: safeString(b?.totalAmount ?? 0),
    }));
  }, [batchesRes, displaySupplierName]);

  const stats = useMemo(() => {
    const totalBatches = allRows.length;
    const updatedCount = allRows.reduce(
      (a, x) => a + (x.updatedAt !== "—" ? 1 : 0),
      0,
    );
    return { totalBatches, updatedCount };
  }, [allRows]);

  const filtered = allRows;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);

  const rows = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex],
  );

  const showingText = useMemo(() => {
    if (filtered.length === 0) return "Showing 0 entries";
    return `Showing ${startIndex + 1}-${endIndex} of ${filtered.length} entries`;
  }, [filtered.length, startIndex, endIndex]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  const openBatchDetails = (batch: UiBatchRow) => {
    if (!batch?.id) return;

    navigate(`/pharmacy/supplier/${supplierIdStr}/batch/${batch.id}`, {
      state: {
        supplier: {
          ...(supplierLocal || {}),
          supplierName: displaySupplierName,
          name: displaySupplierName,
        },
        batch,
      },
    });
  };

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Header title */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <FiArrowLeft size={18} />
          </button>
          <h2 className="text-[18px] md:text-[24px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl ">
            {title}
          </h2>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        {/* left filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center ">
          {/* Search */}
          <div className="w-full sm:w-[260px]">
            <SearchField
              type="text"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder="Search batches..."
              className="w-full"
            />
          </div>
        </div>

        {/* right controls */}
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <AppButton
            text="Edit"
            buttonVariant="outlined"
            startContent={<FiEdit2 />}
            onPress={openEdit}
            className="h-9 shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 text-[13px] text-slate-600 hover:bg-slate-50 shadow-sm"
          />
          <AppButton
            text="Add Batch"
            buttonVariant="primary"
            startContent={<FiPlus />}
            onPress={() =>
              navigate(`/pharmacy/supplier/${supplierIdStr}/add-batch`, {
                state: { supplier: supplierLocal },
              })
            }
            className="h-9 shrink-0 whitespace-nowrap rounded-full bg-primary px-4 text-[13px] text-white hover:bg-primary-hover shadow-sm"
          />
        </div>
      </div>

      {/* Compact summary bar */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {/* Supplier */}
          <div className="px-5 py-4 flex items-center gap-4 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
              <FiUser size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Supplier</p>
              <p className="text-[16px] font-bold text-slate-900 truncate">
                {displaySupplierName}
              </p>
            </div>
          </div>

          {/* Total Batches */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Total Batches</p>
              <p className="text-[20px] font-bold text-slate-900 leading-none mt-1">
                {stats.totalBatches}
              </p>
            </div>
          </div>

          {/* Updated Records */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Updated Records</p>
              <p className="text-[20px] font-bold text-slate-900 leading-none mt-1">
                {stats.updatedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-[13px] text-rose-600">
          Failed to load batches — {getRtkErrorMessage(error)}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-gray-100">
                <th className="w-[300px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Batch No
                </th>
                <th className="w-[200px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Batch Date
                </th>
                <th className="w-[200px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Total Items
                </th>
                <th className="w-[200px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Total Amount
                </th>
                <th className="w-[80px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-5 py-5 text-left">
                      <div className="h-4 w-32 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5 text-left">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5 text-left">
                      <div className="h-4 w-20 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5 text-left">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="h-8 w-8 bg-slate-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    className="h-[320px] text-center text-slate-400"
                    colSpan={5}
                  >
                    No batches found
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => openBatchDetails(b)}
                    className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openBatchDetails(b);
                      }
                    }}
                  >
                    <td className="px-5 py-4 text-left">
                      <p className="truncate text-[14px] font-semibold text-slate-900">
                        {b.batchNo || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-left">
                      <p className="text-[14px] font-medium text-slate-600">
                        {b.batchDate}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-left">
                      <p className="text-[14px] font-medium text-slate-700">
                        {b.itemCount || "0"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <p className="text-[14px] font-semibold text-slate-900">
                        {b.totalAmount || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBatchDetails(b);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          <FiChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && totalPages > 1 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-center sm:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={safePage}
                onChange={setPage}
                radius="full"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center sm:justify-end",
                  item:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  next:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  cursor: "hidden",
                }}
              />
            </div>
          </div>
        ) : !isLoading && filtered.length > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4 text-[13px] text-slate-500">
            {showingText}
          </div>
        ) : null}
      </div>

      {/* EDIT SUPPLIER MODAL */}
      <Modal
        isOpen={editModal.isOpen}
        onOpenChange={editModal.onOpenChange}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: "max-w-xl rounded-2xl overflow-hidden",
          closeButton:
            "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-6 flex items-center gap-2 border-b border-gray-100">
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-900">
                    Edit Supplier
                  </div>
                </div>
              </ModalHeader>

              <ModalBody className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label={
                      <span className="text-slate-600 font-medium">
                        Supplier Name <span className="text-red-500">*</span>
                      </span>
                    }
                    name="name"
                    control={editControl}
                    placeholder="e.g. Ajay Traders"
                    rules={{ required: "Supplier name is required" }}
                  />

                  <InputField
                    label={
                      <span className="text-slate-600 font-medium">
                        Company Name <span className="text-red-500">*</span>
                      </span>
                    }
                    name="companyName"
                    control={editControl}
                    placeholder="e.g. Ajay Pharma Pvt Ltd"
                    rules={{ required: "Company name is required" }}
                  />

                  <InputField
                    label={
                      <span className="text-slate-600 font-medium">
                        Location <span className="text-red-500">*</span>
                      </span>
                    }
                    name="location"
                    control={editControl}
                    placeholder="e.g. Jaipur"
                    rules={{ required: "Location is required" }}
                  />

                  <InputField
                    label={
                      <span className="text-slate-600 font-medium">
                        Contact Phone <span className="text-red-500">*</span>
                      </span>
                    }
                    name="contactPhone"
                    control={editControl}
                    placeholder="10-digit mobile number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    parse={(v) => only10Digits(v)}
                    error={phoneError}
                    rules={{
                      required: "Contact phone is required",
                      validate: (v) =>
                        only10Digits(String(v)).length === 10 ||
                        "Contact phone must be exactly 10 digits",
                    }}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button variant="flat" onPress={onClose} radius="full" className="px-6">
                  Cancel
                </Button>

                <Button
                  color="primary"
                  className="text-white px-8"
                  radius="full"
                  isLoading={isUpdatingSupplier}
                  onPress={() => saveSupplier(onClose)}
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SupplierDetails;
