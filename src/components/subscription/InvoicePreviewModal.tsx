import {
  addToast,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { useState, useRef, useEffect } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import { generateInvoiceHTML, InvoiceData } from "../../utils/subscriptionHelpers";

export interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
}

const InvoicePreviewModal = ({
  isOpen,
  onClose,
  invoiceData,
}: InvoicePreviewModalProps) => {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [iframeHeight, setIframeHeight] = useState("calc(100vh - 190px)");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updateIframeHeight = () => {
      const availableHeight = window.innerHeight - 215;
      setIframeHeight(`${Math.max(420, availableHeight)}px`);
    };

    updateIframeHeight();

    window.addEventListener("resize", updateIframeHeight);

    return () => {
      window.removeEventListener("resize", updateIframeHeight);
    };
  }, [isOpen, invoiceData]);

  const handleDownloadAsPDF = () => {
    try {
      setIsDownloadingPDF(true);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        addToast({
          title: "Error",
          description: "Popup blocked. Please allow popups for this site.",
          color: "danger",
        });
        setIsDownloadingPDF(false);
        return;
      }

      printWindow.document.write(generateInvoiceHTML(invoiceData));
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };

      addToast({
        title: "Info",
        description: "Print dialog opened. Select 'Save as PDF' to download.",
        color: "primary",
        timeout: 3000,
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      addToast({
        title: "Error",
        description: "Failed to open print dialog",
        color: "danger",
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generateInvoiceHTML(invoiceData));
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
      classNames={{
        wrapper: "z-[100] p-2 sm:p-4",
        base: "mx-2 max-h-[96vh] w-[calc(100vw-16px)] max-w-[1000px] overflow-hidden rounded-2xl sm:mx-4",
        body: "p-0",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <div className="flex max-h-[96vh] flex-col overflow-hidden">
            <ModalHeader className="shrink-0 border-b border-default-200 px-4 py-3 sm:px-5">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-default-900 sm:text-lg">
                    Invoice Preview
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-default-500">
                    Invoice: {invoiceData?.id?.split("-").slice(-1)[0]}
                  </p>
                </div>

                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  radius="full"
                  onPress={onClose}
                  className="shrink-0"
                >
                  <FiX className="text-lg" />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="min-h-0 flex-1 overflow-hidden bg-gray-50 p-2 sm:p-4">
              <div className="h-full overflow-hidden rounded-xl border border-default-200 bg-white shadow-sm">
                <iframe
                  ref={iframeRef}
                  srcDoc={generateInvoiceHTML(invoiceData)}
                  className="block w-full border-0 bg-white"
                  style={{
                    height: iframeHeight,
                    minHeight: "420px",
                  }}
                  title="Invoice Preview"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                />
              </div>
            </ModalBody>

            <ModalFooter className="shrink-0 border-t border-default-200 px-4 py-3 sm:px-5">
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={onClose}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  color="primary"
                  variant="flat"
                  onPress={handlePrint}
                  startContent={<FiDownload />}
                  className="w-full sm:w-auto"
                >
                  Print
                </Button>

                <Button
                  size="sm"
                  color="primary"
                  onPress={handleDownloadAsPDF}
                  isLoading={isDownloadingPDF}
                  startContent={!isDownloadingPDF && <FiDownload />}
                  className="w-full sm:w-auto"
                >
                  PDF
                </Button>
              </div>
            </ModalFooter>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default InvoicePreviewModal;
