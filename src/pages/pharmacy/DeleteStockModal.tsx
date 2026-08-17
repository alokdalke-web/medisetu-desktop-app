import React, { useState } from "react";
import { FiTrash2, FiX } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
  onConfirm: () => Promise<void> | void;
};

const DeleteStockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  title = "Delete Stock",
  description = "Are you sure you want to delete this stock? This action cannot be undone.",
  isLoading = false,
  onConfirm,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting || isLoading) return;
    onClose();
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await Promise.resolve(onConfirm());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const busy = submitting || isLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full">
              <FiTrash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={busy}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <AppButton
            text={busy ? "Deleting..." : "Delete Stock"}
            type="button"
            onClick={handleConfirm as any}
            className="flex-1 h-12 bg-red-600 hover:opacity-90"
            disabled={busy}
          />
        </div>
      </div>
    </div>
  );
};

export default DeleteStockModal;
