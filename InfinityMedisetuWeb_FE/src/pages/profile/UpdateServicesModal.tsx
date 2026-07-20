import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Button,
} from "@heroui/react";
import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";

type ClinicServiceItem = {
  serviceName: string;
  price: number;
  currency: string;
  additionalServices?: string;

  // ✅ REQUIRED (your TS error says this is required)
  durationDays: number;

  // ✅ OPTIONAL (keep if your backend also supports months)
  durationMonths?: number | string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicService: ClinicServiceItem[]; // already sanitized from ServicesPrice
  onSaved: () => void; // calls refetch in parent
};

const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const UpdateServicesModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  clinicService,
  onSaved,
}) => {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();

  // ✅ exact arg type expected by updateDoctor trigger
  type UpdateDoctorArg = Parameters<typeof updateDoctor>[0];

  const [rows, setRows] = useState<ClinicServiceItem[]>([]);

  // ✅ Har baar modal open hone par latest values se reset karo
  useEffect(() => {
    if (!isOpen) return;

    if (clinicService && clinicService.length > 0) {
      setRows(
        clinicService.map((s) => ({
          serviceName: s.serviceName || "",
          price: toNum(s.price, 0),
          currency: s.currency || "INR",
          additionalServices: s.additionalServices || "",

          // ✅ FIX: include durationDays
          durationDays: toNum((s as any).durationDays ?? (s as any).durationDay ?? 0, 0),

          // ✅ keep months if present
          durationMonths: (s as any).durationMonths ?? (s as any).durationMonth ?? "",
        }))
      );
    } else {
      setRows([
        {
          serviceName: "",
          price: 0,
          currency: "INR",
          additionalServices: "",

          // ✅ FIX: required
          durationDays: 0,

          // ✅ optional
          durationMonths: "",
        },
      ]);
    }
  }, [isOpen, clinicService]);

  const updateRow = (index: number, patch: Partial<ClinicServiceItem>) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        serviceName: "",
        price: 0,
        currency: "INR",
        additionalServices: "",

        // ✅ FIX: required
        durationDays: 0,

        // ✅ optional
        durationMonths: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // ✅ keep required durationDays in payload too
    const clinicServicePayload: ClinicServiceItem[] = rows
      .map((r) => ({
        serviceName: String(r.serviceName ?? "").trim(),
        price: toNum(r.price, 0),
        currency: String(r.currency ?? "INR").trim() || "INR",
        additionalServices: String(r.additionalServices ?? "").trim(),
        durationDays: toNum(r.durationDays ?? 0, 0),
        durationMonths: r.durationMonths ?? "",
      }))
      .filter((r) => r.serviceName && r.price > 0);

    // ✅ remove empty additionalServices to keep payload clean
    const cleaned = clinicServicePayload.map((r) => ({
      serviceName: r.serviceName,
      price: r.price,
      currency: r.currency,
      durationDays: r.durationDays,
      ...(String(r.durationMonths ?? "").trim()
        ? { durationMonths: r.durationMonths }
        : {}),
      ...(r.additionalServices ? { additionalServices: r.additionalServices } : {}),
    }));

    const payload = { clinicService: cleaned };

    try {
      await updateDoctor(payload as unknown as UpdateDoctorArg).unwrap();
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Update clinicService failed", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader>Edit Services &amp; Price</ModalHeader>

            <ModalBody>
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-b border-slate-100 pb-3 mb-3"
                >
                  <Input
                    label="Service Name"
                    value={row.serviceName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { serviceName: e.target.value })
                    }
                  />

                  <Input
                    type="number"
                    label="Price"
                    value={Number.isNaN(row.price) ? "" : row.price?.toString() ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { price: Number(e.target.value || 0) })
                    }
                  />

                  <Input
                    label="Currency"
                    value={row.currency}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { currency: e.target.value })
                    }
                  />

                  {/* ✅ NEW: Duration Days (required field for TS + backend) */}
                  <Input
                    type="number"
                    label="Duration (Days)"
                    value={Number.isNaN(row.durationDays) ? "" : String(row.durationDays ?? 0)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { durationDays: Number(e.target.value || 0) })
                    }
                    className="md:col-span-1"
                  />

                  {/* Optional months if you want to keep it editable (remove if you don’t need) */}
                  <Input
                    type="number"
                    label="Duration (Months)"
                    value={
                      row.durationMonths === "" || row.durationMonths === null || row.durationMonths === undefined
                        ? ""
                        : String(row.durationMonths)
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { durationMonths: Number(e.target.value || 0) })
                    }
                    className="md:col-span-2"
                  />

                  <Input
                    className="md:col-span-3"
                    label="Additional Services"
                    value={row.additionalServices || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, { additionalServices: e.target.value })
                    }
                  />

                  {rows.length > 1 && (
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => removeRow(index)}
                      className="text-red-500"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}

              <Button size="sm" variant="light" onPress={addRow}>
                + Add Service
              </Button>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={() => close()}>
                Cancel
              </Button>
              <Button color="primary" isLoading={isLoading} onPress={handleSave}>
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default UpdateServicesModal;
