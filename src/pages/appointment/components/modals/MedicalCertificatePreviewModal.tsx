import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiDownload, FiFileText, FiX } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";

type MedicalCertificatePreviewModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  previewHtml: string;
  isPrinting: boolean;
  onDownload: () => void;
  onPrint: () => void;
};

const MedicalCertificatePreviewModal = ({
  isOpen,
  onOpenChange,
  previewHtml,
  isPrinting,
  onDownload,
  onPrint,
}: MedicalCertificatePreviewModalProps) => {
  const [iframeHeight, setIframeHeight] = useState("500px");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    const iframe = iframeRef.current;
    let resizeTimer: number | undefined;

    const updateIframeHeight = () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const height = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight,
          doc.body.offsetHeight,
          doc.documentElement.offsetHeight,
        );

        setIframeHeight(`${Math.max(height, 500)}px`);
      } catch {
        setIframeHeight("500px");
      }
    };

    const handleLoad = () => {
      updateIframeHeight();
      window.requestAnimationFrame(updateIframeHeight);
      resizeTimer = window.setTimeout(updateIframeHeight, 250);
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [isOpen, previewHtml]);

  return (
    <Modal
      hideCloseButton
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper: "items-center p-3 sm:p-4",
        base: "m-0 max-h-[88dvh] w-[calc(100vw-24px)] max-w-[980px] overflow-hidden rounded-[22px] bg-[#E8F6F4] shadow-xl sm:max-h-[86dvh] sm:rounded-[26px]",
        body: "min-h-0 overflow-hidden p-0",
      }}
    >
      <ModalContent>
        {(onClose) => {
          const handleClose = () => {
            onOpenChange(false);
            onClose();
          };

          return (
            <>
              <div className="flex items-center justify-between border-b border-[#CFEAE5] bg-white px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    Medical Certificate Preview
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Review the certificate before printing
                  </p>
                </div>

                <button
                  aria-label="Close certificate preview"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
                  type="button"
                  onClick={handleClose}
                >
                  <FiX size={20} />
                </button>
              </div>

              <ModalBody className="flex min-h-0 flex-col p-0">
                <div className="min-h-0 max-h-[calc(88dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-[#E8F6F4] sm:max-h-[calc(86dvh-68px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9ECBC4] [&::-webkit-scrollbar-thumb]:hover:bg-primary">
                  <div>
                    <div className="shadow-sm sm:rounded-[22px] sm:p-5 lg:p-6">
                      <iframe
                        ref={iframeRef}
                        title="Medical Certificate Preview"
                        srcDoc={previewHtml}
                        className="w-full rounded-lg"
                        style={{ height: iframeHeight, minHeight: "500px" }}
                        scrolling="no"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col-reverse gap-2 border-t border-[#CFEAE5] bg-white/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-4">
                  <Button
                    radius="full"
                    variant="flat"
                    className="h-10 min-w-[108px] border border-[#D7ECE7] bg-white px-5 text-slate-700 shadow-none sm:w-auto"
                    onPress={handleClose}
                  >
                    Close
                  </Button>

                  <Button
                    radius="full"
                    startContent={<FiDownload size={16} />}
                    variant="flat"
                    className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                    onPress={onDownload}
                  >
                    Download
                  </Button>

                  <Button
                    radius="full"
                    startContent={!isPrinting ? <FiFileText size={16} /> : undefined}
                    variant="flat"
                    className="h-10 bg-primary px-5 text-white shadow-sm sm:w-auto"
                    onPress={onPrint}
                    isLoading={isPrinting}
                    isDisabled={isPrinting}
                  >
                    Print
                  </Button>
                </div>
              </ModalBody>
            </>
          );
        }}
      </ModalContent>
    </Modal>
  );
};

export default MedicalCertificatePreviewModal;