// src/pages/pharmacy/AddSupplierModal.tsx
import {
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast
} from "@heroui/react";
import React, { useEffect } from "react";

import AppButton from "../../components/shared/AppButton";
import { useCreateSupplierMutation } from "../../redux/api/supplierApi";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  // optional: update UI list instantly (if you want)
  onCreated?: (row: {
    supplierId: string;
    supplierName: string;
    companyName: string;
    location: string;
    contactNo: string;
    contactEmail?: string;
    orderAmount: number;
  }) => void;
};

const fallbackId = () => `SUP-${Date.now()}`;

// ✅ allow only digits + limit to 10
const normalizePhone = (v: string) => v.replace(/\D/g, "").slice(0, 10);

const AddSupplierModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  onCreated,
}) => {
  // ✅ EXACT fields as your API body
  const [name, setName] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");

  const [error, setError] = React.useState("");

  const [createSupplier, { isLoading }] = useCreateSupplierMutation();

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setCompanyName("");
      setLocation("");
      setContactPhone("");
      setContactEmail("");
      setError("");
    }
  }, [isOpen]);

  const isValidPhone = /^[6-9]\d{9}$/.test(contactPhone);

  const handleAdd = async () => {
    const n = name.trim();
    const cName = companyName.trim();
    const loc = location.trim();
    const phone = contactPhone.trim();
    const email = contactEmail.trim();

    if (!n) return setError("Supplier name is required");
    if (!cName) return setError("Company name is required");
    if (!loc) return setError("Location is required");
    if (!phone) return setError("Contact No. is required");
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Invalid number.");

    // optional email validation (simple)
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return setError("Please enter a valid email");
    }

    setError("");

    try {
      const res = await createSupplier({
        name: n,
        companyName: cName,
        location: loc,
        contactPhone: phone,
        contactEmail: email || undefined,
      }).unwrap();

      const created: any = res?.result ?? res?.data ?? res ?? {};
      const supplierId =
        created?.supplierId ?? created?._id ?? created?.id ?? fallbackId();

      // optional UI update
      onCreated?.({
        supplierId: String(supplierId),
        supplierName: created?.name ?? n,
        companyName: created?.companyName ?? cName,
        location: created?.location ?? loc,
        contactNo: created?.contactPhone ?? phone,
        contactEmail: created?.contactEmail ?? (email || undefined),
        orderAmount: 0,
      });

      addToast({ title: "Supplier added successfully", color: "success" });
      onOpenChange(false);
    } catch (e: any) {
      const msg =
        e?.data?.message || e?.error || e?.message || "Failed to add supplier";
      addToast({ title: msg, color: "danger" });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="opaque"
      scrollBehavior="inside"
      classNames={{
        base: "w-full max-w-lg rounded-2xl",
        closeButton:
          "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-6 pt-6 pb-2 text-lg font-semibold">
              Add New Supplier
            </ModalHeader>

            <ModalBody className="px-6 pb-2 pt-3">
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Supplier Name"
                  labelPlacement="outside"
                  size="md"
                  variant="bordered"
                  radius="full"
                  placeholder="Enter supplier name"
                  value={name}
                  onValueChange={setName}
                  classNames={{
                    label: "text-xs font-medium text-slate-600",
                    inputWrapper: "h-11",
                  }}
                />

                <Input
                  label="Company Name"
                  labelPlacement="outside"
                  size="md"
                  variant="bordered"
                  radius="full"
                  placeholder="Enter company name"
                  value={companyName}
                  onValueChange={setCompanyName}
                  classNames={{
                    label: "text-xs font-medium text-slate-600",
                    inputWrapper: "h-11",
                  }}
                />

                <Input
                  label="Location"
                  labelPlacement="outside"
                  size="md"
                  variant="bordered"
                  radius="full"
                  placeholder="Enter location"
                  value={location}
                  onValueChange={setLocation}
                  classNames={{
                    label: "text-xs font-medium text-slate-600",
                    inputWrapper: "h-11",
                  }}
                />

                <div>
                  <Input
                    label="Contact No."
                    labelPlacement="outside"
                    size="md"
                    variant="bordered"
                    radius="full"
                    placeholder="Enter 10 digit mobile number"
                    value={contactPhone}
                    onValueChange={(v) => {
                      setContactPhone(normalizePhone(v));
                      if (error) setError("");
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    classNames={{
                      label: "text-xs font-medium text-slate-600",
                      inputWrapper: "h-11",
                    }}
                  />

                  <div className="text-xs mt-1 flex items-center justify-between">
                    <span
                      className={
                        contactPhone.length === 0
                          ? "text-slate-500"
                          : isValidPhone
                          ? "text-emerald-700"
                          : "text-rose-600"
                      }
                    ></span>

                    {/* keeps layout stable when error appears */}
                    <span className="min-h-[16px]">
                      {error ? (
                        <span className="text-rose-600">{error}</span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="px-6 pb-6 pt-3 gap-3">
        <AppButton
  text="Cancel"
  buttonVariant="outlined"
  onPress={onClose}
  isDisabled={isLoading}
  className="min-w-[120px] h-11 text-sm font-medium"
 />

<AppButton
  text={isLoading ? "Adding..." : "Add Supplier"}
  buttonVariant="primary"
  onPress={handleAdd}
  isDisabled={isLoading || !isValidPhone}
  startContent={isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" /> : undefined}
  className="min-w-[140px] h-11 text-sm font-medium"
/>

            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddSupplierModal;
