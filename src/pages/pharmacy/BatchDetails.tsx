// src/pages/pharmacy/BatchDetails.tsx
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
  Pagination,
} from "@heroui/react";
import React, { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router";

import { useGetUserQuery } from "../../redux/api/authApi";
import {
  useGetBatchMedicinesQuery,
  useUpdateBatchMedicineMutation,
} from "../../redux/api/supplierApi";
import SearchField from "../../components/shared/SearchField";

/* ---------------- helpers ---------------- */

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

function toISODateMaybe(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))
    return v.slice(0, 10);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

function formatINR(amount: number) {
  return `₹${(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function getRtkErrorMessage(err: any) {
  return (
    err?.data?.message ||
    err?.data?.error ||
    err?.error ||
    err?.message ||
    "Failed to load medicines"
  );
}

/* ---------------- types ---------------- */

type UiMedicineRow = {
  id: string; // batchMedicineId
  batchId: string; // parent batchId

  batchNo: string;
  productId: string; // required by backend (for edit)

  medicine: string;
  brandName: string;
  strength: string;
  composition: string;

  expiryDate: string;

  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
};

/* ---------------- component ---------------- */

const BatchDetails: React.FC = () => {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const location = useLocation();

  const state = location.state as any;
  const batchFromState = state?.batch;
  const supplierFromState = state?.supplier;

  // ✅ pharmacyId from user api
  const { data: userRes } = useGetUserQuery();
  const pharmacyId =
    (userRes as any)?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.result?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.data?.pharmacyDetails?.pharmacyId ||
    "";

  const batchIdStr = batchId ? String(batchId) : "";

  const {
    data: medsRes,
    isLoading,
    error,
    refetch,
  } = useGetBatchMedicinesQuery(
    { batchId: batchIdStr, pharmacyId: String(pharmacyId) },
    { skip: !batchIdStr || !pharmacyId }
  );

  const [updateBatchMedicine, { isLoading: isUpdating }] =
    useUpdateBatchMedicineMutation();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const allRows: UiMedicineRow[] = useMemo(() => {
    const items = normalizeArray(medsRes);

    return items.map((it: any, idx: number) => {
      const batchNo = safeString(it?.batchNo ?? "");
      const productId = safeString(it?.productId ?? "");

      const medicine = safeString(it?.drugName ?? it?.productDrugName ?? "—");

      const brandName = safeString(
        it?.manufacturerName ??
          it?.productManufacturer ??
          it?.productBrandName ??
          "—"
      );

      const strength = safeString(it?.strength ?? it?.productStrength ?? "—");
      const composition = safeString(it?.composition ?? it?.productComposition ?? "—");

      const expiryISO = toISODateMaybe(it?.expiryDate);
      const expiryDate = expiryISO ?? "—";

      const quantity =
        Number(
          it?.quantity ?? it?.quantiy ?? it?.qty ?? it?.netQuantity ?? 0
        ) || 0;
      const purchasePrice = Number(it?.purchasePrice ?? 0) || 0;
      const sellingPrice = Number(it?.sellingPrice ?? 0) || 0;

      return {
        id: safeString(it?.id ?? it?._id ?? `${idx}`),
        batchId: safeString(it?.batchId ?? batchIdStr),
        batchNo,
        productId,
        medicine,
        brandName,
        strength,
        composition,
        expiryDate,
        quantity,
        purchasePrice,
        sellingPrice,
      };
    });
  }, [medsRes, batchIdStr]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((r) => {
      const hay =
        `${r.productId} ${r.medicine} ${r.brandName} ${r.strength} ${r.composition} ${r.expiryDate}`
          .toLowerCase()
          .trim();
      return hay.includes(q);
    });
  }, [allRows, query]);

  const totals = useMemo(() => {
    const totalItems = filtered.length;
    const totalQty = filtered.reduce(
      (a, x) => a + (Number(x.quantity) || 0),
      0
    );
    const totalSelling = filtered.reduce(
      (a, x) => a + (Number(x.quantity) || 0) * (Number(x.sellingPrice) || 0),
      0
    );
    return { totalItems, totalQty, totalSelling };
  }, [filtered]);

  const batchNoHeader =
    safeString(batchFromState?.batchNo) || safeString(allRows?.[0]?.batchNo);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);

  const rows = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  );

  const showingText = useMemo(() => {
    if (filtered.length === 0) return "Showing 0 entries";
    return `Showing ${startIndex + 1}-${endIndex} of ${filtered.length} entries`;
  }, [filtered.length, startIndex, endIndex]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  /* ---------------- Edit Modal State ---------------- */

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<UiMedicineRow | null>(null);

  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editPurchase, setEditPurchase] = useState("");
  const [editSelling, setEditSelling] = useState("");

  const openEdit = (row: UiMedicineRow) => {
    setEditingRow(row);
    setEditExpiryDate(row.expiryDate === "—" ? "" : row.expiryDate);
    setEditQty(String(row.quantity ?? ""));
    setEditPurchase(String(row.purchasePrice ?? ""));
    setEditSelling(String(row.sellingPrice ?? ""));
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingRow(null);
  };

  const onSaveEdit = async () => {
    if (!editingRow) return;

    const expiryDate = (editExpiryDate || "").trim();
    if (!expiryDate) {
      addToast({ title: "Expiry Date is required", color: "danger" });
      return;
    }

    const quantity = Number(editQty);
    const purchasePrice = Number(editPurchase);
    const sellingPrice = Number(editSelling);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      addToast({
        title: "Quantity must be a positive number",
        color: "danger",
      });
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      addToast({ title: "Purchase Price must be valid", color: "danger" });
      return;
    }
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
      addToast({ title: "Selling Price must be valid", color: "danger" });
      return;
    }

    const parentBatchId = editingRow.batchId || batchIdStr;
    if (!parentBatchId) {
      addToast({ title: "Batch id missing", color: "danger" });
      return;
    }

    if (!editingRow.productId) {
      addToast({
        title: "productId is missing for this item",
        color: "danger",
      });
      return;
    }

    try {
      await updateBatchMedicine({
        batchId: parentBatchId,
        body: {
          items: [
            {
              productId: editingRow.productId,
              quantity,
              purchasePrice,
              sellingPrice,
              expiryDate,
              id: editingRow.id, // optional
            },
          ],
        },
      }).unwrap();

      addToast({ title: "Medicine updated", color: "success" });
      refetch();
      closeEdit();
    } catch (e: any) {
      const msg =
        e?.data?.message || e?.error || e?.message || "Failed to update";
      addToast({ title: msg, color: "danger" });
    }
  };

  /* ---------------- Delete Modal State ---------------- */

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<UiMedicineRow | null>(null);

  const openDelete = (row: UiMedicineRow) => {
    setDeletingRow(row);
    setIsDeleteOpen(true);
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setDeletingRow(null);
  };

  const onConfirmDelete = async () => {
    if (!deletingRow) return;

    const parentBatchId = deletingRow.batchId || batchIdStr;
    if (!parentBatchId) {
      addToast({ title: "Batch id missing", color: "danger" });
      return;
    }

    try {
      await updateBatchMedicine({
        batchId: parentBatchId,
        body: {
          itemsToRemove: [deletingRow.id],
        },
      }).unwrap();

      addToast({ title: "Medicine removed", color: "success" });
      refetch();
      closeDelete();
    } catch (e: any) {
      const msg =
        e?.data?.message || e?.error || e?.message || "Failed to delete";
      addToast({ title: msg, color: "danger" });
    }
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
            Batch Details{batchNoHeader ? ` • ${batchNoHeader}` : ""}
          </h2>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        {/* left filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center ">
          <div className="w-full sm:w-[260px]">
            <SearchField
              type="text"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              placeholder="Search medicines..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Flat info strip — supplier + batch stats, no boxy cards */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-100 pb-4">
        {/* Supplier name */}
        {(supplierFromState?.name || supplierFromState?.supplierName || supplierFromState?.companyName) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Supplier</span>
            <span className="text-[13px] font-semibold text-slate-700">
              {supplierFromState?.name || supplierFromState?.supplierName}
            </span>
            {supplierFromState?.companyName && (
              <span className="text-[12px] text-slate-500">({supplierFromState.companyName})</span>
            )}
          </div>
        )}

        {/* Divider */}
        {(supplierFromState?.name || supplierFromState?.supplierName) && (
          <span className="hidden sm:block h-4 w-px bg-gray-200" />
        )}

        {/* Location */}
        {supplierFromState?.location && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Location</span>
            <span className="text-[13px] text-slate-600">{supplierFromState.location}</span>
          </div>
        )}

        {supplierFromState?.location && <span className="hidden sm:block h-4 w-px bg-gray-200" />}

        {/* Batch No */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Batch</span>
          <span className="text-[13px] font-semibold text-slate-700">{batchNoHeader || "—"}</span>
        </div>

        <span className="hidden sm:block h-4 w-px bg-gray-200" />

        {/* Total items + qty */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Items</span>
          <span className="text-[13px] font-semibold text-slate-700">{totals.totalItems}</span>
          <span className="text-[12px] text-slate-400">·</span>
          <span className="text-[12px] text-slate-500">Qty {totals.totalQty}</span>
        </div>

        <span className="hidden sm:block h-4 w-px bg-gray-200" />

        {/* Selling value */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Selling Value</span>
          <span className="text-[13px] font-bold text-slate-800">{formatINR(totals.totalSelling)}</span>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-[13px] text-rose-600">
          Failed to load medicines — {getRtkErrorMessage(error)}
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[1200px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-gray-100">
                <th className="w-[280px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">Medicine</th>
                <th className="w-[180px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">Brand</th>
                <th className="w-[120px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">Strength</th>
                <th className="w-[180px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">Composition</th>
                <th className="w-[140px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">Expiry</th>
                <th className="w-[80px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">Qty</th>
                <th className="w-[120px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">Purchase</th>
                <th className="w-[120px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">Selling</th>
                <th className="w-[100px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-5 py-5"><div className="h-4 w-48 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-20 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-24 bg-slate-100 rounded" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-10 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-5 py-5"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                    <td className="px-5 py-5"><div className="h-8 w-16 bg-slate-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td className="h-[320px] text-center text-slate-400" colSpan={9}>
                    No medicines found
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{m.medicine || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] text-slate-600">{m.brandName || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[14px] text-slate-600">{m.strength ? `${m.strength} (mg)` : "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] text-slate-600">{m.composition || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[14px] font-medium text-slate-700">
                        {m.expiryDate !== "—" 
                          ? new Date(m.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/\s/g, '-')
                          : "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-[14px] font-bold text-slate-900">{m.quantity}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-[14px] font-medium text-slate-700">{formatINR(m.purchasePrice)}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-[14px] font-semibold text-slate-900">{formatINR(m.sellingPrice)}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(m)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <FiTrash2 size={14} />
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
                  item: "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev: "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  next: "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
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

      {/* ✅ Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: "max-w-xl rounded-2xl overflow-hidden",
          closeButton: "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-6 flex flex-col gap-1 border-b border-gray-100">
                <span className="text-lg font-semibold text-slate-900">Edit Medicine</span>
                <div className="text-xs text-slate-500 font-normal">
                  {editingRow?.medicine ? `${editingRow.medicine} • ` : ""}
                  {editingRow?.brandName || ""}
                </div>
              </ModalHeader>

              <ModalBody className="px-6 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Expiry Date"
                    labelPlacement="outside"
                    type="date"
                    value={editExpiryDate}
                    onValueChange={setEditExpiryDate}
                    variant="bordered"
                    classNames={{ 
                      inputWrapper: "rounded-xl border-gray-200 hover:border-primary focus-within:border-primary",
                      label: "text-slate-600 font-medium"
                    }}
                  />

                  <Input
                    label="Quantity"
                    labelPlacement="outside"
                    type="number"
                    value={editQty}
                    onValueChange={setEditQty}
                    variant="bordered"
                    classNames={{ 
                      inputWrapper: "rounded-xl border-gray-200 hover:border-primary focus-within:border-primary",
                      label: "text-slate-600 font-medium"
                    }}
                    min={0}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Purchase Price"
                      labelPlacement="outside"
                      type="number"
                      value={editPurchase}
                      onValueChange={setEditPurchase}
                      variant="bordered"
                      classNames={{ 
                        inputWrapper: "rounded-xl border-gray-200 hover:border-primary focus-within:border-primary",
                        label: "text-slate-600 font-medium"
                      }}
                      min={0}
                      step="0.01"
                    />

                    <Input
                      label="Selling Price"
                      labelPlacement="outside"
                      type="number"
                      value={editSelling}
                      onValueChange={setEditSelling}
                      variant="bordered"
                      classNames={{ 
                        inputWrapper: "rounded-xl border-gray-200 hover:border-primary focus-within:border-primary",
                        label: "text-slate-600 font-medium"
                      }}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  variant="flat"
                  radius="full"
                  onPress={() => {
                    onClose();
                    closeEdit();
                  }}
                  isDisabled={isUpdating}
                  className="px-6"
                >
                  Cancel
                </Button>

                <Button
                  color="primary"
                  radius="full"
                  onPress={onSaveEdit}
                  isLoading={isUpdating}
                  className="text-white px-8"
                >
                  Save Changes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ✅ Delete Confirm Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        placement="center"
        backdrop="opaque"
        classNames={{
          base: "max-w-md rounded-2xl overflow-hidden",
          closeButton: "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="px-6 flex flex-col gap-1 border-b border-gray-100">
                <span className="text-lg font-semibold text-slate-900">Delete Medicine?</span>
                <div className="text-xs text-slate-500 font-normal">
                  {deletingRow?.medicine ? `${deletingRow.medicine} • ` : ""}
                  {deletingRow?.brandName || ""}
                </div>
              </ModalHeader>

              <ModalBody className="px-6 py-6">
                <div className="text-sm text-slate-700">
                  Are you sure you want to remove this item from the batch? This action cannot be undone.
                </div>
              </ModalBody>

              <ModalFooter className="px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <Button
                  variant="flat"
                  radius="full"
                  onPress={() => {
                    onClose();
                    closeDelete();
                  }}
                  isDisabled={isUpdating}
                  className="px-6"
                >
                  Cancel
                </Button>

                <Button
                  color="danger"
                  radius="full"
                  onPress={onConfirmDelete}
                  isLoading={isUpdating}
                  className="text-white px-8"
                >
                  Yes, Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default BatchDetails;
