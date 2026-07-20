import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalBody,
  Button,
} from "@heroui/react";
import { FiX, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";

interface UPIQRCodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  serviceName: string;
  amountText: string;
  amountNumber?: number;
  upiIds?: string[];
}

const UPIQRCodeModal: React.FC<UPIQRCodeModalProps> = ({
  isOpen,
  onOpenChange,
  serviceName,
  amountText,
  amountNumber,
  upiIds = [],
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Reset selected UPI ID when list changes
  useEffect(() => {
    setCurrentIdx(0);
  }, [upiIds]);

  const activeUpiId = upiIds[currentIdx];

  // Format the UPI URI
  const upiUri = `upi://pay?pa=${activeUpiId || ""}&pn=MediSetu&cu=INR${
    amountNumber ? `&am=${amountNumber}` : ""
  }&tn=${encodeURIComponent(serviceName || "Appointment")}`;

  // Generate QR Code using the public qrserver.com API
  const qrCodeUrl = activeUpiId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`
    : "";

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev === 0 ? upiIds.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev === upiIds.length - 1 ? 0 : prev + 1));
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      isDismissable={true}
      hideCloseButton={true}
      classNames={{
        base: "rounded-2xl overflow-hidden bg-white dark:bg-[#111726]",
        body: "p-6",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <ModalBody className="flex flex-col items-center text-center">
            {/* Header close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <FiX className="h-5 w-5" />
            </button>

            {/* Title */}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
              Pay via UPI QR Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]">
              Scan the QR code below using any UPI application (GPay, PhonePe, Paytm, BHIM, etc.) to complete your transaction.
            </p>

            {/* Service & Amount */}
            <div className="w-full mt-4 bg-slate-50 dark:bg-[#1a2335] rounded-xl p-3 flex flex-col items-center">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {serviceName || "Selected Service"}
              </span>
              <div className="flex items-center text-2xl font-extrabold text-teal-600 dark:text-[#46beae] mt-1">
                <FaRupeeSign className="h-5 w-5 mr-0.5" />
                {amountNumber || amountText.replace(/[^\d.]/g, "") || "0"}
              </div>
            </div>

            {/* QR Code Container with Navigation */}
            <div className="relative flex items-center justify-between w-full mt-6 px-2">
              <div>
                {upiIds.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1728] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2535] active:scale-95 transition-all shadow-sm flex-shrink-0"
                    aria-label="Previous QR Code"
                  >
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* QR Image Box */}
              <div className="w-[240px] h-[240px] border border-slate-200 dark:border-slate-700 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-sm relative overflow-hidden">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt={`UPI QR Code - ID ${currentIdx + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-slate-400">Loading QR...</div>
                )}
              </div>

              <div>
                {upiIds.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1728] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2535] active:scale-95 transition-all shadow-sm flex-shrink-0"
                    aria-label="Next QR Code"
                  >
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {upiIds.length > 1 && (
              <div className="mt-4 flex flex-col items-center">
                <span className="text-[11px] font-bold tracking-wider text-teal-600 dark:text-[#46beae] uppercase bg-teal-50 dark:bg-[#1a3a35] px-2.5 py-1 rounded-full">
                  UPI ID {currentIdx + 1} of {upiIds.length}
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2 select-all select-none cursor-pointer">
                  {activeUpiId}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="w-full mt-6 flex gap-2">
              <Button
                color="default"
                variant="flat"
                className="flex-1 rounded-xl text-slate-600 dark:text-slate-300 font-semibold"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UPIQRCodeModal;
