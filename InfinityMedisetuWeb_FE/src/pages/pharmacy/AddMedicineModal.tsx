// src/pages/pharmacy/AddMedicineModal.tsx
import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  Button,
} from "@heroui/react";

export type MedicineStatus = "active" | "inactive";

export type MedicineFormValues = {
  name: string;
  expiryDate: string;
  price: string;
  status: MedicineStatus;
};

type AddMedicineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (values: MedicineFormValues) => void;
};

const initialForm: MedicineFormValues = {
  name: "",
  expiryDate: "",
  price: "",
  status: "active",
};

const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<MedicineFormValues>(initialForm);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = (close: () => void) => {
    setForm(initialForm);
    close();
    onClose();
  };

  const handleSubmit = (close: () => void) => {
    if (!form.name.trim()) return;
    onSubmit?.(form);
    setForm(initialForm);
    close();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      size="lg"
      hideCloseButton
      classNames={{
        base: "rounded-[32px] max-w-md",
      }}
    >
      <ModalContent>
        {(close) => (
          <div className="relative px-8 pt-8 pb-7">
            {/* Top-right X  */}
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              onClick={() => handleCancel(close)}
            >
              ✕
            </button>

            {/* Icon + Title */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                {/* pill icon - placeholder */}
                <span className="text-xl">💊</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Add New Medicine
              </h2>
            </div>

            {/* Form fields */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter name"
                  className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  placeholder="DD/MM/YYYY"
                  className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price
                </label>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Enter price"
                  className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Footer buttons */}           
            <div className="mt-8 flex items-center gap-3">
              <Button
                fullWidth
                variant="bordered"
                className="rounded-full border-emerald-500 text-emerald-600"
                onPress={() => handleCancel(close)}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                color="primary"
                className="rounded-full bg-emerald-600 text-white"
                onPress={() => handleSubmit(close)}
              >
                Add Medicine
              </Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddMedicineModal;
