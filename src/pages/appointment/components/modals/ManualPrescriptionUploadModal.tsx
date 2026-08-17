import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import React from "react";
import { FiUpload } from "react-icons/fi";

type ManualPrescriptionUploadModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
};

const ManualPrescriptionUploadModal = ({
  isOpen,
  onOpenChange,
  files,
  onFileChange,
  onSave,
}: ManualPrescriptionUploadModalProps) => (
  <Modal
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    placement="center"
    size="lg"
    classNames={{
      base: "rounded-[24px]",
      body: "p-0",
    }}
  >
    <ModalContent>
      {(onClose) => (
        <ModalBody className="p-0">
          <div className="bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Manual Prescription
                  </h3>
                  <p className="text-sm text-slate-500">
                    Upload prescription image
                  </p>
                </div>

                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  onPress={onClose}
                >
                  âœ•
                </Button>
              </div>
            </div>

            <div className="p-5">
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-primary hover:bg-primary/5">
                <FiUpload className="mb-3 h-8 w-8 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">
                  Click to upload image
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, WEBP supported
                </p>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-700">
                    Selected file:
                  </p>
                  <p className="mt-1 text-sm text-slate-600 break-all">
                    {files[0].name}
                  </p>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <Button variant="flat" radius="full" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  radius="full"
                  className="bg-primary text-white"
                  onPress={onSave}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </ModalBody>
      )}
    </ModalContent>
  </Modal>
);

export default ManualPrescriptionUploadModal;
