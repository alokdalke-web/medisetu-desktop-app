// src/components/shared/Modals/EditPharmacyDetailsModal.tsx
import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  type Selection,
} from "@heroui/react";

const STATUS = ["active", "deactive"] as const;
export type PharmacyStatus = (typeof STATUS)[number];

export type PharmacyEditValues = {
  name: string;
  address: string;
  contactNumber: string;
  status: PharmacyStatus;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: PharmacyEditValues;
  onSubmit?: (values: PharmacyEditValues) => Promise<void> | void;
  isSubmitting?: boolean;
};

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}

export default function EditPharmacyDetailsModal({
  isOpen,
  onOpenChange,
  initialValues,
  onSubmit,
  isSubmitting,
}: Props) {
  const [values, setValues] = React.useState<PharmacyEditValues>(initialValues);

  // ✅ modal open pe latest initial values set
  React.useEffect(() => {
    if (isOpen) setValues(initialValues);
  }, [isOpen, initialValues]);

  const canSave =
    values.name.trim().length > 0 &&
    values.address.trim().length > 0 &&
    values.contactNumber.trim().length > 0;

  // ✅ FIX: React.Key mat use karo (bigint issue). PharmacyStatus is string => safe.
  const selectedKeys = React.useMemo(
    () => new Set<PharmacyStatus>([values.status]),
    [values.status],
  );

  const handleStatusChange = (keys: Selection) => {
    if (keys === "all") return; // safe guard
    const first = Array.from(keys)[0] as PharmacyStatus | undefined;
    if (first) setValues((p) => ({ ...p, status: first }));
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Edit Pharmacy Details
              <span className="text-xs text-slate-500 font-normal">
                Update name, address, contact number, and status
              </span>
            </ModalHeader>

            <ModalBody className="gap-4">
              <Input
                label="Name"
                value={values.name}
                onValueChange={(v) => setValues((p) => ({ ...p, name: v }))}
                isRequired
              />

              <Textarea
                label="Address"
                minRows={3}
                value={values.address}
                onValueChange={(v) => setValues((p) => ({ ...p, address: v }))}
                isRequired
              />

              <Input
                label="Contact Number"
                value={values.contactNumber}
                onValueChange={(v) => {
                  const digits = onlyDigits(v).slice(0, 10); // ✅ max 10 digits
                  setValues((p) => ({ ...p, contactNumber: digits }));
                }}
                inputMode="numeric"
                isRequired
                description="Digits only (max 10)"
              />

              <Select
                label="Status"
                selectedKeys={selectedKeys as any}
                onSelectionChange={handleStatusChange}
                isRequired
              >
                {STATUS.map((s) => (
                  <SelectItem key={s}>{s}</SelectItem>
                ))}
              </Select>
            </ModalBody>

            <ModalFooter>
              <Button
                variant="flat"
                onPress={onClose}
                isDisabled={!!isSubmitting}
              >
                Cancel
              </Button>

              <Button
                color="success"
                className="text-white"
                isDisabled={!canSave || !!isSubmitting}
                isLoading={!!isSubmitting}
                onPress={async () => {
                  if (!canSave || isSubmitting) return;
                  await onSubmit?.(values);
                  onClose();
                }}
              >
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
