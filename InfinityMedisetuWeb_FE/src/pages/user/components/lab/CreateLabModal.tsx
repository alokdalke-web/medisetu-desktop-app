import React, { useState } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import { FiX } from "react-icons/fi";
import { MdOutlineBiotech } from "react-icons/md";

import {
  useCreateLabMutation,
} from "../../../../redux/api/labApi";

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string;
};

const CreateLabModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  clinicId,
}) => {
  const [form, setForm] = useState({
    labName: "",
    address: "",
    contactNo: "",
    email: "",
    departmentIds: [] as string[],
  });

  const [createLab, { isLoading }] = useCreateLabMutation();
  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async () => {
    const name = form.labName.trim();
    const address = form.address.trim();
    const phone = form.contactNo.trim();
    const email = form.email.trim().toLowerCase();
    const departmentIds = form.departmentIds
      .map((departmentId) => departmentId.trim())
      .filter(Boolean);
    if (!clinicId) {
      addToast({
        title: "Clinic ID missing",
        description: "ClinicId not found.",
        color: "danger",
      });
      return;
    }

    if (!name || !address || !phone || !email) {
      addToast({
        title: "Missing fields",
        description:
          "Lab name, address, contact number aur email is required .",
        color: "warning",
      });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      addToast({
        title: "Invalid contact number",
        description: "Must be 10 digits starting with 6, 7, 8, or 9.",
        color: "warning",
      });
      return;
    }

    try {
      await createLab({
        clinicId,
        labName: name,
        address,
        phone,
        email,
        ...(departmentIds.length ? { departmentIds } : {}),
      }).unwrap();

      addToast({
        title: "Lab created",
        description: "New lab successfully added.",
        color: "success",
      });

      setForm({
        labName: "",
        address: "",
        contactNo: "",
        email: "",
        departmentIds: [],
      });
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.data?.message || err?.error || "Create lab failed. Try again.";
      addToast({ title: "Error", description: msg, color: "danger" });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      size="sm"
      isDismissable={!isLoading}
      classNames={{
        base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
        header: "pb-0 bg-white dark:bg-[#111726]",
        body: "pt-0 bg-white dark:bg-[#111726]",
        closeButton: "hidden",
      }}
    >
      <ModalContent className="!bg-white !text-slate-900 dark:!bg-[#111726] dark:!text-white">
        {() => (
          <>
            <ModalHeader className="relative flex flex-col items-center gap-3 bg-white pt-6 dark:bg-[#111726]">
              <button
                type="button"
                onClick={() => !isLoading && onOpenChange(false)}
                className="absolute right-4 top-4 text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white disabled:opacity-50"
                aria-label="Close"
                disabled={isLoading}
              >
                <FiX size={18} className="text-current" />
              </button>

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 dark:bg-[#1a3a35] dark:ring-[#46beae]/30">
                <MdOutlineBiotech
                  className="text-primary dark:text-[#9be7dc]"
                  size={26}
                />
              </div>

              <div className="text-[22px] font-semibold text-slate-900 dark:text-white">
                Create New Lab
              </div>
            </ModalHeader>

            <ModalBody className="bg-white px-8 pb-2 dark:bg-[#111726]">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Lab Name
                  </div>
                  <Input
                    value={form.labName}
                    onValueChange={set("labName")}
                    placeholder="Enter lab name"
                    radius="full"
                    isDisabled={isLoading}
                    classNames={{
                      inputWrapper:
                        "h-12 border border-slate-200 bg-white shadow-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Address
                  </div>
                  <Input
                    value={form.address}
                    onValueChange={set("address")}
                    placeholder="Enter address"
                    radius="full"
                    isDisabled={isLoading}
                    classNames={{
                      inputWrapper:
                        "h-12 border border-slate-200 bg-white shadow-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Contact Number
                  </div>
                  <Input
                    value={form.contactNo}
                    onValueChange={(v) => {
                      const onlyDigits = v.replace(/\D/g, "");
                      setForm((p) => ({
                        ...p,
                        contactNo: onlyDigits.slice(0, 10),
                      })); // max 10
                    }}
                    placeholder="Enter 10-digit number"
                    radius="full"
                    isDisabled={isLoading}
                    inputMode="numeric"
                    type="tel"
                    maxLength={10}
                    classNames={{
                      inputWrapper:
                        "h-12 border border-slate-200 bg-white shadow-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Email
                  </div>
                  <Input
                    value={form.email}
                    onValueChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        email: value.trim().toLowerCase(),
                      }))
                    }
                    placeholder="Enter email"
                    radius="full"
                    isDisabled={isLoading}
                    classNames={{
                      inputWrapper:
                        "h-12 border border-slate-200 bg-white shadow-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                    }}
                  />
                </div>

                {/* <div>
                  <div className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Departments
                  </div>
                  <Select
                    selectionMode="multiple"
                    placeholder={
                      isDepartmentsLoading
                        ? "Loading departments..."
                        : "Select departments"
                    }
                    selectedKeys={new Set(form.departmentIds)}
                    isDisabled={isLoading || isDepartmentsLoading}
                    onSelectionChange={(keys) => {
                      if (keys === "all") {
                        setForm((p) => ({
                          ...p,
                          departmentIds: departments
                            .map((department) =>
                              String(department.id ?? department._id ?? ""),
                            )
                            .filter(Boolean),
                        }));
                        return;
                      }

                      setForm((p) => ({
                        ...p,
                        departmentIds: Array.from(keys).map(String),
                      }));
                    }}
                    radius="full"
                    classNames={{
                      trigger:
                        "min-h-12 border border-slate-200 bg-white shadow-none dark:border-[#273244] dark:bg-[#0f1728] dark:text-white",
                    }}
                  >
                    {departments
                      .map((department) => ({
                        id: String(department.id ?? department._id ?? ""),
                        label:
                          department.departmentName ??
                          department.name ??
                          "Department",
                      }))
                      .filter((department) => department.id)
                      .map((department) => (
                        <SelectItem
                          key={department.id}
                          textValue={department.label}
                        >
                          {department.label}
                        </SelectItem>
                      ))}
                  </Select>
                </div> */}
              </div>
            </ModalBody>

            <ModalFooter className="bg-white px-8 pb-8 pt-4 dark:bg-[#111726]">
              <div className="flex w-full items-center justify-between gap-4">
                <Button
                  radius="full"
                  variant="bordered"
                  className="h-12 w-[45%] border-primary text-primary dark:border-[#46beae]/50 dark:text-[#9be7dc]"
                  onPress={() => onOpenChange(false)}
                  isDisabled={isLoading}
                >
                  Cancel
                </Button>

                <Button
                  radius="full"
                  className="h-12 w-[55%] bg-primary text-white"
                  onPress={onSubmit}
                  isDisabled={isLoading}
                  startContent={isLoading ? <Spinner size="sm" /> : undefined}
                >
                  {isLoading ? "Adding..." : "Add Lab"}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CreateLabModal;
