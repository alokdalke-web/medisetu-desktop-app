import { Button, Input, Modal, ModalBody, ModalContent, Textarea } from "@heroui/react";
import { FiSave, FiX } from "react-icons/fi";

type MedicalCertificateFormModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  restDays: string;
  restrictions: string;
  fieldClassNames: Record<string, string>;
  onReasonChange: (value: string) => void;
  onRestDaysChange: (value: string) => void;
  onRestrictionsChange: (value: string) => void;
  onPreview: () => void;
  isSaving: boolean;
};

const MedicalCertificateFormModal = ({
  isOpen,
  onOpenChange,
  reason,
  restDays,
  restrictions,
  fieldClassNames,
  onReasonChange,
  onRestDaysChange,
  onRestrictionsChange,
  onPreview,
  isSaving,
}: MedicalCertificateFormModalProps) => (
  <Modal
    hideCloseButton
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    placement="center"
    scrollBehavior="inside"
    size="5xl"
    classNames={{
      wrapper: "items-center p-3 sm:p-4",
      base: "m-0 max-h-[88dvh] w-[calc(100vw-24px)] max-w-[680px] overflow-hidden rounded-[22px] bg-[#E8F6F4] shadow-xl sm:max-h-[86dvh] sm:rounded-[26px]",
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
                  Medical Certificate
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Fill the details before preview and print.
                </p>
              </div>

              <button
                aria-label="Close medical certificate form"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
                type="button"
                onClick={handleClose}
              >
                <FiX size={20} />
              </button>
            </div>

            <ModalBody className="flex min-h-0 flex-col p-0">
              <div className="min-h-0 max-h-[calc(88dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-[#E8F6F4] sm:max-h-[calc(86dvh-68px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9ECBC4] [&::-webkit-scrollbar-thumb]:hover:bg-primary">
                <div className="p-2.5 sm:p-3">
                  <div className="rounded-[20px] border border-[#D7ECE7] bg-white p-4 pr-12 shadow-sm sm:rounded-[22px] sm:p-5 sm:pr-14 lg:p-6 lg:pr-14">
                    <div className="space-y-4">
                      <Input
                        label="Medical Condition"
                        placeholder="Enter medical condition"
                        value={reason}
                        onValueChange={onReasonChange}
                        variant="bordered"
                        radius="lg"
                        classNames={{
                          inputWrapper: "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                          label: "text-slate-700 text-xs font-semibold",
                          input: "text-slate-700",
                          ...fieldClassNames,
                        }}
                      />

                      <Input
                        type="number"
                        label="Rest Days"
                        min={0}
                        placeholder="Enter rest days"
                        value={restDays}
                        onValueChange={onRestDaysChange}
                        variant="bordered"
                        radius="lg"
                        classNames={{
                          inputWrapper: "border-[#D7ECE7] bg-white shadow-none data-[hover=true]:border-[#BFE0D9]",
                          label: "text-slate-700 text-xs font-semibold",
                          input: "text-slate-700",
                          ...fieldClassNames,
                        }}
                      />

                      <Textarea
                        label="Notes"
                        placeholder={`Avoid heavy lifting\nNo prolonged standing for more than 2 hours\nLight desk duties preferred`}
                        value={restrictions}
                        onValueChange={onRestrictionsChange}
                        minRows={4}
                        variant="bordered"
                        radius="lg"
                        classNames={{
                          inputWrapper: "bg-white border-[#D7ECE7] shadow-none data-[hover=true]:border-[#BFE0D9]",
                          input: "text-slate-700",
                          label: "text-slate-700 text-xs font-semibold",
                          ...fieldClassNames,
                        }}
                      />
                    </div>
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
                  startContent={<FiSave size={16} />}
                  variant="flat"
                  className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                  onPress={onPreview}
                  isLoading={isSaving}
                  isDisabled={isSaving}
                >
                  Save & Preview
                </Button>
              </div>
            </ModalBody>
          </>
        );
      }}
    </ModalContent>
  </Modal>
);

export default MedicalCertificateFormModal;