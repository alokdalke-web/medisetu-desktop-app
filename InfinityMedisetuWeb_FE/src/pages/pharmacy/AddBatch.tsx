 
// src/pages/pharmacy/AddBatch.tsx
import React, { useMemo, useState } from "react";
import { addToast, Card, CardBody } from "@heroui/react";
import {
  FiArrowLeft,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiLayers,
  FiHash,
  FiCreditCard,
  FiCalendar,
  FiPackage,
  FiInfo,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";

import AddbatchMedicineModal, { type FormState } from "./AddbatchMedicineModal";

// ✅ get pharmacyId from user api
import { useGetUserQuery } from "../../redux/api/authApi";

// ✅ POST manual batch api
import { useCreateManualBatchMutation } from "../../redux/api/supplierApi";

// ✅ shared components
import AppButton from "../../components/shared/AppButton";
import InputField from "../../components/shared/InputField";

type BatchItem = FormState & { rowId: string };

type BatchForm = {
  batchNo: string;
  receivedDate: string; // UI only
};

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const AddBatch: React.FC = () => {
  const navigate = useNavigate();
  const { supplierId } = useParams();

  // ✅ Pharmacy Id from user api response
  const { data: userRes } = useGetUserQuery();
  const pharmacyId =
    (userRes as any)?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.result?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.data?.pharmacyDetails?.pharmacyId;

  // ✅ POST mutation
  const [createManualBatch, { isLoading: isSaving }] =
    useCreateManualBatchMutation();

  // ✅ Form (use InputField)
  const { control, watch, getValues, setValue } = useForm<BatchForm>({
    defaultValues: {
      batchNo: "",
      receivedDate: todayISO(),
    },
    mode: "onChange",
  });

  const generateBatchNo = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    setValue("batchNo", num.toString(), { shouldValidate: true });
  };

  const batchNo = (watch("batchNo") ?? "").toString();
  const receivedDate = (watch("receivedDate") ?? "").toString(); // UI only
  void receivedDate;

  // medicines list
  const [items, setItems] = useState<BatchItem[]>([]);

  // modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const isBatchReady = batchNo.trim().length > 0;

  const openAddModal = () => {
    if (!isBatchReady) {
      addToast({ title: "Please enter Batch Number first", color: "danger" });
      return;
    }
    setModalMode("add");
    setEditingRowId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rowId: string) => {
    setModalMode("edit");
    setEditingRowId(rowId);
    setIsModalOpen(true);
  };

  const editingItem = useMemo(
    () => items.find((x) => x.rowId === editingRowId),
    [items, editingRowId],
  );

  // modal initial must NOT include rowId
  const modalInitial: FormState | undefined = useMemo(() => {
    if (modalMode !== "edit" || !editingItem) return undefined;
    const { rowId, ...rest } = editingItem;
    return rest;
  }, [modalMode, editingItem]);

  const formatINR = (amount: number) =>
    amount ? `₹${amount.toLocaleString("en-IN")}` : "₹0";

  const totals = useMemo(() => {
    const toNum = (v: string | number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const totalQty = items.reduce((a, it) => a + toNum(it.qty || "0"), 0);

    // ✅ total amount should be based on purchasePrice (batch purchase)
    const totalAmount = items.reduce(
      (a, it) => a + toNum(it.qty || "0") * toNum(it.purchasePrice || "0"),
      0,
    );

    return { totalQty, totalAmount };
  }, [items]);

  const removeItem = (rowId: string) =>
    setItems((p) => p.filter((x) => x.rowId !== rowId));

  const validateAll = () => {
    const { batchNo: bn } = getValues();

    if (!pharmacyId) {
      addToast({
        title: "Pharmacy id not found in user response",
        color: "danger",
      });
      return false;
    }
    if (!supplierId) {
      addToast({ title: "Supplier id missing", color: "danger" });
      return false;
    }
    if (!String(bn || "").trim()) {
      addToast({ title: "Batch Number is required", color: "danger" });
      return false;
    }
    if (items.length === 0) {
      addToast({ title: "Please add at least 1 medicine", color: "danger" });
      return false;
    }

    // ✅ validate required fields for backend payload
    for (const it of items) {
      if (!String(it.productId || "").trim()) {
        addToast({
          title: `Missing productId for medicine "${it.medicine}". Re-select or create again.`,
          color: "danger",
        });
        return false;
      }
      if (!it.expiryDate) {
        addToast({
          title: `Expiry date missing for "${it.medicine}"`,
          color: "danger",
        });
        return false;
      }
      if (!it.qty || Number(it.qty) <= 0) {
        addToast({
          title: `Quantity must be > 0 for "${it.medicine}"`,
          color: "danger",
        });
        return false;
      }
      if (!it.purchasePrice || Number(it.purchasePrice) <= 0) {
        addToast({
          title: `Purchase price must be > 0 for "${it.medicine}"`,
          color: "danger",
        });
        return false;
      }
      if (!it.sellingPrice || Number(it.sellingPrice) <= 0) {
        addToast({
          title: `Selling price must be > 0 for "${it.medicine}"`,
          color: "danger",
        });
        return false;
      }
    }

    return true;
  };

  const onSaveBatch = async () => {
    if (!validateAll()) return;

    const { batchNo: bn } = getValues();

    // ✅ payload exactly like postman
    const body = {
      supplierId: String(supplierId),
      batchNo: String(bn).trim(),
      items: items.map((it) => ({
        productId: String(it.productId),
        expiryDate: it.expiryDate,
        quantity: Number(it.qty),
        mrp: Number(it.mrp),
        purchasePrice: Number(it.purchasePrice),
        gstPercentage: Number(it.gstPercentage),
        sellingPrice: Number(it.sellingPrice),
      })),
    };

    try {
      await createManualBatch({
        pharmacyId: String(pharmacyId),
        body,
      }).unwrap();

      addToast({ title: "Batch added successfully", color: "success" });
      navigate(-1);
    } catch (e: any) {
      const msg =
        e?.data?.message || e?.error || e?.message || "Failed to add batch";
      addToast({ title: msg, color: "danger" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="mx-auto max-w-[1440px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              <FiArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Add New Batch</h2>
              <p className="text-[13px] font-medium text-slate-500">Create a new inventory batch for your pharmacy</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Details */}
          <div className="lg:col-span-8 space-y-6">
            {/* Batch Configuration Card */}
            <Card className="border-none shadow-sm overflow-visible bg-white">
              <CardBody className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FiInfo size={16} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Batch Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField<BatchForm>
                    name="batchNo"
                    control={control}
                    label={
                      <span className="text-sm font-semibold text-slate-700">
                        Batch Number <span className="text-red-500">*</span>
                      </span>
                    }
                    placeholder="e.g. BATCH-001"
                    startContent={<FiHash className="text-slate-400" />}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    parse={(v) => (v || "").replace(/\D/g, "")}
                    endContent={
                      <button
                        type="button"
                        onClick={generateBatchNo}
                        className="text-[10px] font-bold text-primary hover:text-primary-hover px-2.5 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all uppercase tracking-wider"
                      >
                        Generate
                      </button>
                    }
                    classNames={{
                      inputWrapper: "h-12 border-slate-200 hover:border-primary/50 focus-within:border-primary transition-all",
                      input: "text-base",
                    }}
                  />

                  <InputField<BatchForm>
                    name="receivedDate"
                    control={control}
                    label={
                      <span className="text-sm font-semibold text-slate-700">Received Date</span>
                    }
                    type="date"
                    startContent={<FiCalendar className="text-slate-400" />}
                    classNames={{
                      inputWrapper: "h-12 border-slate-200 hover:border-primary/50 focus-within:border-primary transition-all",
                      input: "text-base",
                    }}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Medicines List Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <FiPackage size={16} />
                  </div>
                  <h3 className="font-semibold text-slate-900">Medicines in this Batch</h3>
                </div>

                <AppButton
                  text="Add Medicine"
                  buttonVariant="primary"
                  startContent={<FiPlus />}
                  onPress={openAddModal}
                  isDisabled={!isBatchReady || isSaving}
                  className="h-9 px-4 text-[13px] bg-primary hover:bg-primary-hover text-white shadow-sm transition-all active:scale-95"
                />
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                    <FiPackage size={32} />
                  </div>
                  <h4 className="text-base font-semibold text-slate-900">No medicines added yet</h4>
                  <p className="max-w-[280px] text-center text-sm text-slate-500 mt-1">
                    {isBatchReady
                      ? "Start by adding medicines to this batch using the button above."
                      : "Please enter a Batch Number to start adding medicines."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/80">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[13px] font-semibold text-slate-500">Medicine</th>
                        <th className="px-6 py-4 text-[13px] font-semibold text-slate-500">Expiry</th>
                        <th className="px-6 py-4 text-[13px] font-semibold text-slate-500">Qty</th>
                        <th className="px-6 py-4 text-[13px] font-semibold text-slate-500">Purchase</th>
                        <th className="px-6 py-4 text-[13px] font-semibold text-slate-500">Amount</th>
                        <th className="px-6 py-4 text-right text-[13px] font-semibold text-slate-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => {
                        const qty = Number(it.qty) || 0;
                        const purchasePrice = Number(it.purchasePrice) || 0;
                        const amount = qty * purchasePrice;

                        return (
                          <tr key={it.rowId} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{it.medicine || "—"}</p>
                                <p className="text-[12px] text-slate-500 truncate">{it.strength || "—"} • {it.category || "—"}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[12px] font-medium">
                                {it.expiryDate || "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[14px] font-medium text-slate-700">{it.qty}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[14px] font-medium text-slate-600">{formatINR(purchasePrice)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-[14px] font-bold text-slate-900">{formatINR(amount)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(it.rowId)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-primary hover:text-primary hover:bg-primary/5 active:scale-95"
                                >
                                  <FiEdit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(it.rowId)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 active:scale-95"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summary & Actions */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-sm bg-white sticky top-6">
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Batch Summary</h3>
                
                <div className="space-y-4">
                  {/* Total Medicines */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FiLayers size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Medicines</p>
                        <p className="text-lg font-bold text-slate-900">{items.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Quantity */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <FiHash size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider">Total Quantity</p>
                        <p className="text-lg font-bold text-slate-900">{totals.totalQty}</p>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FiCreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-primary/70 uppercase tracking-wider">Grand Total</p>
                        <p className="text-xl font-extrabold text-primary">{formatINR(totals.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <AppButton
                    text="Save Batch"
                    buttonVariant="primary"
                    onPress={onSaveBatch}
                    isDisabled={!isBatchReady || items.length === 0 || isSaving}
                    isLoading={isSaving}
                    className="w-full h-12 bg-primary hover:bg-primary-hover text-white text-base font-semibold shadow-md active:scale-[0.98] transition-all"
                  />
                  <AppButton
                    text="Cancel"
                    buttonVariant="outlined"
                    onPress={() => navigate(-1)}
                    isDisabled={isSaving}
                    className="w-full h-12 border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-all"
                  />
                </div>

                {!isBatchReady && (
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-[12px] text-rose-600">
                    <FiInfo className="shrink-0" />
                    <span>Please enter a batch number to enable saving.</span>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Modal */}
        <AddbatchMedicineModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          mode={modalMode}
          initial={modalInitial}
          onSave={(values) => {
            if (modalMode === "add") {
              setItems((p) => [...p, { rowId: makeId(), ...values }]);
              addToast({ title: "Medicine added", color: "success" });
              return;
            }

            if (!editingRowId) return;

            setItems((p) =>
              p.map((x) =>
                x.rowId === editingRowId ? { ...x, ...values } : x,
              ),
            );
            addToast({ title: "Medicine updated", color: "success" });
          }}
        />
      </div>
    </div>
  );
};

export default AddBatch;
