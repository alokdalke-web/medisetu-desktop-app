// src/pages/pharmacy/EditStockModal.tsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockSchema, type StockDto } from "../../schemas/stock";
import InputField from "../../components/shared/InputField";
import AppButton from "../../components/shared/AppButton";
import { FiX, FiTrash2 } from "react-icons/fi";

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    id: string;
    medicineName: string;
    supplierName: string;
    quantity: number;
    price: number;
    batchNo: string;
    expiryDate: string;
    status: "healthy" | "low_stock" | "out_of_stock";
  };
  onUpdate: (id: string, data: Partial<StockDto>) => void | Promise<void>;

  // ✅ NEW: delete handler (parent will call RTK delete mutation)
  onDelete?: (id: string) => void | Promise<void>;
}

// ✅ FIX: Date-safe type guard (prevents TS2358 without changing behavior)
const isDate = (v: unknown): v is Date => v instanceof Date;

const toComparableString = (v: unknown) =>
  isDate(v) ? v.toISOString() : String(v ?? "");

const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  onClose,
  stock,
  onUpdate,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const { control, handleSubmit, reset, register } = useForm<StockDto>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      medicineName: stock.medicineName,
      supplierName: stock.supplierName,
      quantity: stock.quantity,
      price: stock.price,
      batchNo: stock.batchNo,
      expiryDate: stock.expiryDate,
      status: stock.status,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset({
      medicineName: stock.medicineName,
      supplierName: stock.supplierName,
      quantity: stock.quantity,
      price: stock.price,
      batchNo: stock.batchNo,
      expiryDate: stock.expiryDate,
      status: stock.status,
    });
  }, [isOpen, stock, reset]);

  const handleClose = () => {
    if (isDeleting) return; // optional: block closing during delete
    onClose();
  };

  const onSubmit = async (data: StockDto) => {
    // ✅ send only changed fields
    const patch: Partial<StockDto> = {};

    const fields: (keyof StockDto)[] = [
      "medicineName",
      "supplierName",
      "quantity",
      "price",
      "batchNo",
      "expiryDate",
      "status",
    ];

    fields.forEach((k) => {
      const newVal = data[k];
      const oldVal = (stock as any)[k];

      // ✅ normalize comparison for numbers/strings/dates safely
      const a = toComparableString(newVal);
      const b = toComparableString(oldVal);

      if (a !== b) patch[k] = newVal as any;
    });

    await Promise.resolve(onUpdate(stock.id, patch));
    handleClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const ok = window.confirm("Are you sure you want to delete this stock?");
    if (!ok) return;

    try {
      setIsDeleting(true);
      await Promise.resolve(onDelete(stock.id));
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-teal-100 p-3 rounded-full">
              <svg
                className="h-6 w-6 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Edit Stock</h2>
          </div>

          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={isDeleting}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              control={control}
              name="medicineName"
              label="Medicine Name"
              isDisabled
            />
            <InputField
              control={control}
              name="supplierName"
              label="Supplier Name"
            />
            <InputField
              control={control}
              name="quantity"
              label="Quantity"
              type="number"
            />
            <InputField
              control={control}
              name="price"
              label="Price"
              type="number"
            />
            <InputField control={control} name="batchNo" label="Batch No." />
            <InputField
              control={control}
              name="expiryDate"
              label="Expiry Date"
              type="date"
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                {...register("status")}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="healthy">Healthy</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {/* ✅ Delete button instead of Cancel */}
            {onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <FiTrash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}

            <AppButton
              text="Update Stock"
              type="submit"
              className="flex-1 h-12"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStockModal;
