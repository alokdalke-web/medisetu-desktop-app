import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

type Row = any;
type PaymentMethod = "CASH" | "UPI";

const PaymentModal = ({
  isOpen,
  onOpenChange,
  paymentRow,
  payMethod,
  setPayMethod,
  isLoading,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentRow: Row | null;
  payMethod: PaymentMethod;
  setPayMethod: (v: PaymentMethod) => void;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="sm"
      backdrop="opaque"
      classNames={{
        backdrop: "bg-slate-950/45 backdrop-blur-sm",
        base: "rounded-3xl border border-slate-200 shadow-2xl",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
          <span className="text-lg font-bold text-slate-950">Mark Paid</span>
          <span className="text-xs font-normal text-slate-500">
            Confirm payment before report upload.
          </span>
        </ModalHeader>
        <ModalBody className="gap-4 px-6">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {paymentRow?.testName ?? "Selected test"}
            </p>
            {paymentRow?.id && (
              <p className="mt-1 text-xs text-slate-500">
                Order: {paymentRow.id}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPayMethod("CASH")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                payMethod === "CASH"
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Cash
            </button>

            <button
              type="button"
              onClick={() => setPayMethod("UPI")}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                payMethod === "UPI"
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              UPI
            </button>
          </div>
        </ModalBody>

        <ModalFooter className="px-6 pb-6">
          <Button
            variant="bordered"
            radius="full"
            onPress={onCancel}
            isDisabled={isLoading}
            className="border-slate-200 px-5 font-semibold text-slate-600"
          >
            Cancel
          </Button>
          <Button
            color="primary"
            radius="full"
            onPress={onConfirm}
            isLoading={isLoading}
            className="px-6 font-semibold text-white"
          >
            Confirm Paid
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PaymentModal;
