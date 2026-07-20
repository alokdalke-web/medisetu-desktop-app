import React, { useState } from "react";
import {
    Modal,
    ModalContent,
    ModalBody,
    Textarea,
    Select,
    SelectItem,
    Input,
} from "@heroui/react";
import { FiX } from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";
import { FaRupeeSign } from "react-icons/fa";

interface RefundPaymentModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (data: { refundMode: string; refundAmount: number; refundNotes: string }) => Promise<void>;
    isLoading?: boolean;
    maxRefundAmount?: number; // Add this prop to pass the clinic service price
}

const REFUND_MODES = ["Cash", "UPI", "Card"];

// Utility function to count words
const countWords = (text: string): number => {
    return text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
};

const RefundPaymentModal: React.FC<RefundPaymentModalProps> = ({
    isOpen,
    onOpenChange,
    onSubmit,
    isLoading = false,
    maxRefundAmount = 0, // Default to 0 if not provided
}) => {
    const [refundMode, setRefundMode] = useState<string>("Cash");
    const [refundAmount, setRefundAmount] = useState<string>("");
    const [refundNotes, setRefundNotes] = useState<string>("");
    const [errors, setErrors] = useState<{
        refundMode?: string;
        refundAmount?: string;
        refundNotes?: string;
    }>({});

    const wordCount = countWords(refundNotes);
    const isNotesValid = wordCount >= 1 && wordCount <= 30;

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};

        if (!refundMode.trim()) {
            newErrors.refundMode = "Please select a refund mode";
        }

        // Validate refund amount
        if (!refundAmount.trim()) {
            newErrors.refundAmount = "Refund amount is required";
        } else {
            const amount = parseFloat(refundAmount);
            if (isNaN(amount)) {
                newErrors.refundAmount = "Please enter a valid number";
            } else if (amount < 1) {
                newErrors.refundAmount = "Minimum refund amount is 1";
            } else if (amount > maxRefundAmount) {
                newErrors.refundAmount = `Maximum refund amount is ${maxRefundAmount}`;
            }
        }

        // Only validate refund notes if mode is not Cash
        if (refundMode !== "Cash") {
            if (!refundNotes.trim()) {
                newErrors.refundNotes = "Refund notes are required";
            } else if (!isNotesValid) {
                if (wordCount === 0) {
                    newErrors.refundNotes = "Refund notes are required";
                } else if (wordCount < 1) {
                    newErrors.refundNotes = "Minimum 1 word required";
                } else {
                    newErrors.refundNotes = `Maximum 30 words allowed (current: ${wordCount})`;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            await onSubmit({
                refundMode,
                refundAmount: parseFloat(refundAmount),
                refundNotes: refundNotes.trim(),
            });

            // Reset form on success
            setRefundMode("Cash");
            setRefundAmount("");
            setRefundNotes("");
            setErrors({});
            onOpenChange(false);
        } catch (error) {
            // Error toast is handled by parent component
        }
    };

    const handleClose = () => {
        // Reset form when closing
        setRefundMode("Cash");
        setRefundAmount("");
        setRefundNotes("");
        setErrors({});
        onOpenChange(false);
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={handleClose}
            hideCloseButton
            size="md"
            classNames={{
                base: "rounded-2xl",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <ModalBody className="p-6 relative">
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                            disabled={isLoading}
                        >
                            <FiX size={18} />
                        </button>

                        {/* Icon */}
                        <div className="flex justify-center mt-2">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <FaRupeeSign className="text-green-600" size={22} />
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-xl font-semibold text-center mt-4">
                            Refund Payment
                        </h2>

                        {/* Subtitle */}
                        <p className="text-sm text-slate-500 text-center mt-1">
                            Enter required details for refund.
                        </p>

                        {/* Form */}
                        <div className="mt-6 space-y-4">
                            {/* Refund Mode */}
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Refund Mode <span className="text-red-500">*</span>
                                </label>

                                <Select
                                    selectedKeys={refundMode ? [refundMode] : []}
                                    onSelectionChange={(keys) => {
                                        const value = Array.from(keys)[0] as string;
                                        setRefundMode(value);
                                        // Clear error when user selects
                                        if (value) {
                                            setErrors((prev) => ({ ...prev, refundMode: undefined }));
                                        }
                                    }}
                                    radius="lg"
                                    variant="bordered"
                                    className="mt-2"
                                    placeholder="Select refund mode"
                                    isInvalid={!!errors.refundMode}
                                    errorMessage={errors.refundMode}
                                >
                                    {REFUND_MODES.map((mode) => (
                                        <SelectItem key={mode}>{mode}</SelectItem>
                                    ))}
                                </Select>
                            </div>

                            {/* Refund Amount */}
                            <div>
                                <label className="text-sm font-medium text-slate-700">
                                    Refund Amount <span className="text-red-500">*</span>
                                </label>
                                {/* <div className="text-xs text-slate-500 mt-1">
                                    Min: 1, Max: {maxRefundAmount}
                                </div> */}
                                <Input
                                    type="number"
                                    min="1"
                                    max={maxRefundAmount}
                                    step="1"
                                    placeholder="Enter refund amount"
                                    value={refundAmount}
                                    onValueChange={(value) => {
                                        setRefundAmount(value);
                                        // Clear error when user types
                                        if (value.trim()) {
                                            setErrors((prev) => ({ ...prev, refundAmount: undefined }));
                                        }
                                    }}
                                    radius="lg"
                                    variant="bordered"
                                    className="mt-2"
                                    isInvalid={!!errors.refundAmount}
                                    errorMessage={errors.refundAmount}
                                    startContent={
                                        <div className="pointer-events-none flex items-center">
                                            <span className="text-default-400 text-small">₹</span>
                                        </div>
                                    }
                                />
                            </div>

                            {/* Refund Notes */}
                            {refundMode !== "Cash" && (
                                <div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">
                                            Refund Noasdtes <span className="text-red-500">*</span>
                                        </label>
                                        <span className={`text-xs ${isNotesValid || !refundNotes ? "text-slate-500" : "text-red-500"}`}>
                                            {wordCount}/30 words
                                        </span>
                                    </div>

                                    <Textarea
                                        placeholder="Enter refund notes (Ex. Transaction ID)"
                                        value={refundNotes}
                                        onValueChange={(value) => {
                                            setRefundNotes(value);
                                            // Clear error when user types
                                            if (value.trim()) {
                                                setErrors((prev) => ({ ...prev, refundNotes: undefined }));
                                            }
                                        }}
                                        radius="lg"
                                        variant="bordered"
                                        className="mt-2"
                                        minRows={3}
                                        isInvalid={!!errors.refundNotes}
                                        errorMessage={errors.refundNotes}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            <AppButton
                                text="Cancel"
                                onPress={onClose}
                                disabled={isLoading}
                                className="w-1/2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            />
                            <AppButton
                                text="Refund"
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

export default RefundPaymentModal;