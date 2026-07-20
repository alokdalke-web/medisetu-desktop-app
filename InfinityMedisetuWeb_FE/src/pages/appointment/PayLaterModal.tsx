import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import { FiX, FiCreditCard } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";

interface PayLaterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: {
    paymentMode: string;
    paymentNotes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const PAYMENT_MODES = ["Cash", "UPI", "Card"];

const PayLaterModal: React.FC<PayLaterModalProps> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading = false,
}) => {
  const [paymentMode, setpaymentMode] = useState<string>("Cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [errors, setErrors] = useState<{
    paymentMode?: string;
    paymentNotes?: string;
  }>({});

  const showNotesField = paymentMode === "UPI" || paymentMode === "Card";

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!paymentMode.trim()) {
      newErrors.paymentMode = "Please select a payment mode";
    }

    if (showNotesField && !paymentNotes.trim()) {
      newErrors.paymentNotes = "Please enter payment notes";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setpaymentMode("Cash");
    setPaymentNotes("");
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmit({
        paymentMode,
        paymentNotes: showNotesField ? paymentNotes.trim() : "",
      });
      resetForm();
      onOpenChange(false);
    } catch {
      // parent handles error toast
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleClose}
      hideCloseButton
      size="md"
      classNames={{ base: "rounded-2xl" }}
    >
      <ModalContent>
        {(onClose) => (
          <ModalBody className="relative p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              <FiX size={18} />
            </button>

            <div className="mt-2 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <FiCreditCard className="text-amber-600" size={22} />
              </div>
            </div>

            <h2 className="mt-4 text-center text-xl font-semibold">
              Confirm Payment
            </h2>

            <p className="mt-1 text-center text-sm text-slate-500">
              Change payment status to Paid and select payment mode.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Payment Mode <span className="text-red-500">*</span>
                </label>

                <Select
                  selectedKeys={paymentMode ? [paymentMode] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setpaymentMode(value);

                    setErrors((prev) => ({
                      ...prev,
                      paymentMode: undefined,
                    }));

                    if (value !== "UPI" && value !== "Card") {
                      setPaymentNotes("");
                      setErrors((prev) => ({
                        ...prev,
                        paymentNotes: undefined,
                      }));
                    }
                  }}
                  radius="lg"
                  variant="bordered"
                  className="mt-2"
                  placeholder="Select payment mode"
                  isInvalid={!!errors.paymentMode}
                  errorMessage={errors.paymentMode}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode}>{mode}</SelectItem>
                  ))}
                </Select>
              </div>

              {showNotesField && (
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Payment Notes <span className="text-red-500">*</span>
                  </label>
<Input
  value={paymentNotes}
  onChange={(e) => {
    const limitedValue = e.target.value.slice(0, 40);

    setPaymentNotes(limitedValue);

    if (limitedValue.trim()) {
      setErrors((prev) => ({
        ...prev,
        paymentNotes: undefined,
      }));
    }
  }}
  radius="lg"
  variant="bordered"
  className="mt-2"
  maxLength={40}
  placeholder={
    paymentMode === "UPI"
      ? "Enter UPI payment note"
      : "Enter card payment note"
  }
  isInvalid={!!errors.paymentNotes}
  errorMessage={errors.paymentNotes}
/>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <AppButton
                text="Cancel"
                onPress={onClose}
                disabled={isLoading}
                className="w-1/2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              />

              <AppButton
                text="Mark Paid"
                buttonVariant="primary"
                onPress={handleSubmit}
                isLoading={isLoading}
                className="w-1/2"
              />
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default PayLaterModal;
