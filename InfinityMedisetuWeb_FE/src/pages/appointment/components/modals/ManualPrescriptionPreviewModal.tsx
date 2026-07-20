import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import { FiX } from "react-icons/fi";

type ManualPrescriptionPreviewModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
};

const ManualPrescriptionPreviewModal = ({
  isOpen,
  onOpenChange,
  imageUrl,
}: ManualPrescriptionPreviewModalProps) => (
  <Modal
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    hideCloseButton
    size="3xl"
    placement="center"
    classNames={{
      base: "rounded-[28px] overflow-hidden",
      body: "p-0",
    }}
  >
    <ModalContent>
      {(onClose) => (
        <ModalBody className="p-0">
          <div className="relative bg-white px-6 pt-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close modal"
            >
              <FiX size={18} />
            </button>

            <div className="mb-4 text-center">
              <h3 className="text-xl font-semibold text-slate-900">
                Uploaded Prescription
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                View the manual prescription image
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {imageUrl ? (
                <div className="flex max-h-[70vh] items-center justify-center overflow-auto">
                  <img
                    src={imageUrl}
                    alt="Manual Prescription"
                    className="max-h-[70vh] w-auto max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
                  No prescription image available
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                variant="flat"
                radius="full"
                className="h-11 min-w-[110px] border border-slate-200 bg-white px-6 text-slate-700 shadow-none"
                onPress={onClose}
              >
                Close
              </Button>

              {imageUrl && (
                <Button
                  as="a"
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  radius="full"
                  className="h-11 min-w-[150px] bg-teal-700 px-6 text-white"
                >
                  Open Full Image
                </Button>
              )}
            </div>
          </div>
        </ModalBody>
      )}
    </ModalContent>
  </Modal>
);

export default ManualPrescriptionPreviewModal;
