import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Tabs,
  Tab,
  addToast,
} from "@heroui/react";
import {
  FiX,
  FiUpload,
  FiSmartphone,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
} from "react-icons/fi";
import {
  useCreateScanSessionMutation,
  useLazyGetScanStatusQuery,
} from "../../redux/api/prescriptionScannerApi";

const POLL_INTERVAL_MS = 2500;

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceSelected: (file: File) => void;
}

const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({
  isOpen,
  onOpenChange,
  onInvoiceSelected,
}) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [scannerError, setScannerError] = useState("");
  const [scannerStatus, setScannerStatus] = useState<"idle" | "session_ready" | "uploaded" | "error">("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"phone" | "local">("local");

  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const scannerStatusRef = useRef(scannerStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createScanSession] = useCreateScanSessionMutation();
  const [getScanStatus] = useLazyGetScanStatusQuery();

  useEffect(() => {
    scannerStatusRef.current = scannerStatus;
  }, [scannerStatus]);

  const clearTimers = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const createSession = async () => {
    setScannerError("");
    setScannerStatus("idle");
    setOtp("");
    setCountdown(0);

    try {
      const session = await createScanSession().unwrap();
      setOtp(session.otp);
      setCountdown(session.expiresIn);
      setScannerStatus("session_ready");
    } catch (error: any) {
      setScannerError(error?.data?.message || error?.message || "Failed to create scan session");
      setScannerStatus("error");
    }
  };

  const pollStatus = async (currentOtp: string) => {
    if (scannerStatusRef.current !== "session_ready") return;

    try {
      const statusResp = await getScanStatus(currentOtp).unwrap();

      if (scannerStatusRef.current !== "session_ready") return;

      if (statusResp.status === "invalid") {
        clearTimers();
        setScannerError("Session expired. Please create a new session.");
        setScannerStatus("error");
        return;
      }

      if (statusResp.status === "uploaded") {
        clearTimers();

        const imageSrc = statusResp.imageBase64
          ? `data:image/jpeg;base64,${statusResp.imageBase64}`
          : statusResp.imageUrl || "";

        if (!imageSrc) {
          setScannerError("Uploaded image not found.");
          setScannerStatus("error");
          return;
        }

        setIsProcessing(true);
        try {
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          const file = new File([blob], `invoice_${Date.now()}.jpg`, { type: "image/jpeg" });
          
          onInvoiceSelected(file);
          setScannerStatus("uploaded");
          setScannerError("");
          
          addToast({
            title: "Success",
            description: "Invoice uploaded successfully",
            color: "success",
          });
          
          setTimeout(() => {
            onOpenChange(false);
          }, 1500);
        } catch (error) {
          setScannerError("Failed to process scanned image.");
          setScannerStatus("error");
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error: any) {
      if (scannerStatusRef.current !== "session_ready") return;
      setScannerError(error?.data?.message || "Polling error. Will retry...");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setScannerStatus("idle");
      setOtp("");
      setCountdown(0);
      setScannerError("");
      return;
    }

    if (activeTab === "phone") {
      createSession();
    }

    return () => {
      clearTimers();
    };
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen || activeTab !== "phone" || scannerStatus !== "session_ready" || !otp) {
      clearTimers();
      return;
    }

    pollStatus(otp);

    pollTimerRef.current = window.setInterval(() => {
      pollStatus(otp);
    }, POLL_INTERVAL_MS);

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearTimers();
          setScannerError("Session expired. Please create a new session.");
          setScannerStatus("error");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearTimers();
  }, [isOpen, scannerStatus, otp, activeTab]);

  const handleLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

    if (!validTypes.includes(file.type)) {
      addToast({
        title: "Invalid File Type",
        description: "Please upload a PDF, JPG, or PNG file",
        color: "danger",
      });
      return;
    }

    if (file.size > maxSize) {
      addToast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        color: "danger",
      });
      return;
    }

    onInvoiceSelected(file);
    onOpenChange(false);
  };

  const phoneLink = typeof window !== "undefined" && otp
    ? `${window.location.origin}/app/switch-to-phone?otp=${encodeURIComponent(otp)}`
    : "";

  const qrCodeUrl = phoneLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(phoneLink)}`
    : "";

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      hideCloseButton
      size="lg"
      classNames={{
        base: "rounded-[28px] max-w-[500px]",
        body: "p-0",
      }}
    >
      <ModalContent>
        {() => (
          <ModalBody>
            <div className="relative p-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 text-slate-600 z-10"
              >
                <FiX className="text-xl" />
              </button>

              <div className="text-center mb-6">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                  <FiUpload className="text-2xl" />
                </div>

                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Upload Invoice
                </h3>
              </div>

              <Tabs
                aria-label="Upload options"
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as "phone" | "local")}
                className="mb-6"
                fullWidth
              >
                <Tab key="local" title={
                  <div className="flex items-center gap-2">
                    <FiFileText />
                    <span>Choose from Device</span>
                  </div>
                }>
                  <div className="py-20">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FiUpload className="mx-auto text-3xl text-gray-400 mb-3" />
                      <p className="text-sm text-slate-600 mb-1">
                        Click to browse files
                      </p>
                      <p className="text-xs text-slate-400">
                        PDF, JPG, PNG (Max 5MB)
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleLocalFile}
                      className="hidden"
                    />

                    <div className="mt-4 text-center text-xs text-slate-500">
                      <p>Or drag and drop file here</p>
                    </div>
                  </div>
                </Tab>

                <Tab key="phone" title={
                  <div className="flex items-center gap-2">
                    <FiSmartphone />
                    <span>Scan from Phone</span>
                  </div>
                }>
                  <div className="py-4">
                    {scannerStatus === "session_ready" && !scannerError && (
                      <div className="space-y-4">
                        {/* QR Code */}
                        <div className="flex justify-center">
                          <div className="bg-white p-4 rounded-xl border border-gray-200">
                            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                          </div>
                        </div>

                        {/* Timer */}
                        <div className="text-center">
                          <p className="text-xs text-slate-500">
                            Session expires in: <span className="font-semibold">{countdown}s</span>
                          </p>
                        </div>

                        <Button
                          className="w-full"
                          variant="bordered"
                          onPress={createSession}
                          size="sm"
                        >
                          Generate New Code
                        </Button>
                      </div>
                    )}

                    {scannerStatus === "uploaded" && (
                      <div className="text-center py-8">
                        <FiCheckCircle className="mx-auto text-5xl text-green-500 mb-3" />
                        <p className="text-green-700 font-semibold">Invoice uploaded successfully!</p>
                      </div>
                    )}

                    {scannerError && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                        <div className="flex items-start gap-2">
                          <FiAlertCircle className="text-red-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800">Error</p>
                            <p className="text-sm text-red-700">{scannerError}</p>
                            <Button
                              size="sm"
                              className="mt-2"
                              onPress={createSession}
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-700"></div>
                        <p className="text-sm text-slate-600 mt-2">Processing...</p>
                      </div>
                    )}
                  </div>
                </Tab>
              </Tabs>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  className="w-full"
                  variant="light"
                  onPress={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default InvoiceScannerModal;