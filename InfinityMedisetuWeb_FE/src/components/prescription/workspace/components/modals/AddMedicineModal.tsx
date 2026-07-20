import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Spinner,
} from "@heroui/react";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGetUniqueFormsQuery } from "../../../../../redux/api/medicineApi";


// Simple SVG icons as components
const SearchIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="h-4 w-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Type definitions
interface FormOption {
  label: string;
  value: string;
}

// Default form options
const DEFAULT_FORM_OPTIONS: FormOption[] = [
  // Oral Solid
  { label: "Tablet", value: "Tablet" },
  { label: "Capsule", value: "Capsule" },
  { label: "Lozenge", value: "Lozenge" },
  { label: "Sachet", value: "Sachet" },
  { label: "Granules", value: "Granules" },
  { label: "Powder", value: "Powder" },

  // Oral Liquid
  { label: "Syrup", value: "Syrup" },
  { label: "Suspension", value: "Suspension" },
  { label: "Liquid", value: "Liquid" },
  { label: "Drops", value: "Drops" },

  // Topical (Skin / Pain relief)
  { label: "Cream", value: "Cream" },
  { label: "Ointment", value: "Ointment" },
  { label: "Gel", value: "Gel" },
  { label: "Lotion", value: "Lotion" },
  { label: "Paste", value: "Paste" },
  { label: "Spray", value: "Spray" },
  { label: "Foam", value: "Foam" },

  // Dental / Oral care
  { label: "Mouthwash", value: "Mouthwash" },
  { label: "Oral Rinse", value: "Oral Rinse" },
  { label: "Dental Cement", value: "Dental Cement" },
  { label: "Dental Varnish", value: "Dental Varnish" },

  // Medical Special
  { label: "Injection", value: "Injection" },
  { label: "Inhaler", value: "Inhaler" },
  { label: "Patch", value: "Patch" },
  { label: "Suppository", value: "Suppository" },

  // Personal Care / OTC
  { label: "Shampoo", value: "Shampoo" },
  { label: "Soap", value: "Soap" },
  { label: "Facewash", value: "Facewash" },
  { label: "Conditioner", value: "Conditioner" },
  { label: "Toothpaste", value: "Toothpaste" },
  { label: "Mouth Gel", value: "Mouth Gel" },
  { label: "Handwash", value: "Handwash" },
  { label: "Sanitizer", value: "Sanitizer" },
  { label: "Oil", value: "Oil" },
];

interface AddMedicineModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  createForm: any;
  setCreateForm: any;
  creatingMedicine: boolean;
  submitCreateMedicine: () => void;
  fieldWrapperClassName?: string;
}

const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onOpenChange,
  createForm,
  setCreateForm,
  creatingMedicine,
  submitCreateMedicine,
  // fieldWrapperClassName = "col-span-2",
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOpenPopover, setIsOpenPopover] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch unique forms from API (only when modal opens)
  const { data: uniqueFormsData, isLoading: isLoadingForms } = useGetUniqueFormsQuery(undefined, {
    skip: !isOpen, // Only fetch when modal is open
  });

  // Get unique forms from API response
  const apiForms: FormOption[] = useMemo(() => {
    const forms: string[] = uniqueFormsData?.forms || [];
    return forms.map((form: string) => ({ label: form, value: form }));
  }, [uniqueFormsData]);

  // Combine default forms with API forms, removing duplicates
  const allFormOptions: FormOption[] = useMemo(() => {
    const existingValues = new Set(DEFAULT_FORM_OPTIONS.map(opt => opt.value));
    const newForms = apiForms.filter(form => !existingValues.has(form.value));

    // Return default forms first, then unique API forms
    return [...DEFAULT_FORM_OPTIONS, ...newForms];
  }, [apiForms]);

  // Get predefined form values for custom form detection
  // const predefinedFormValues: string[] = useMemo(() => {
  //   return allFormOptions.map(opt => opt.value);
  // }, [allFormOptions]);

  // Filter options based on search
  const filteredOptions: FormOption[] = useMemo(() => {
    if (!searchQuery) return allFormOptions;

    return allFormOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allFormOptions, searchQuery]);

  // Check if search query matches any existing option
  const hasExactMatch: boolean = useMemo(() => {
    return allFormOptions.some(opt =>
      opt.label.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [allFormOptions, searchQuery]);

  const handleSelectOption = (value: string): void => {
    setCreateForm((p: any) => ({
      ...p,
      form: value,
      strength: value === "Tablet" || value === "Capsule" ? p.strength : "",
    }));
    setSearchQuery("");
    setIsOpenPopover(false);
  };

  const handleCreateCustom = (): void => {
    if (searchQuery.trim()) {
      setCreateForm((p: any) => ({
        ...p,
        form: searchQuery.trim(),
        strength: "",
      }));
      setSearchQuery("");
      setIsOpenPopover(false);
    }
  };

  // const isCustomForm: boolean = createForm.form && !predefinedFormValues.includes(createForm.form);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setIsOpenPopover(false);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      placement="center"
      classNames={{
        base: "rounded-2xl",
        body: "p-0",
        header: "p-0",
        footer: "p-0",
        closeButton:
          "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="px-5 pt-5 pb-3">
              <div className="text-[17px] font-semibold text-slate-900">
                Add Medicine
              </div>
            </ModalHeader>

            <ModalBody className="px-5 pb-4">
              <div className="grid gap-3">
                {/* Change this div to use grid with 2 columns instead of using fieldWrapperClassName */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label={
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                          Medicine Name{" "}
                          <span className="text-rose-500">*</span>
                        </span>
                      }
                      labelPlacement="outside"
                      placeholder="Enter medicine name"
                      value={createForm.name}
                      onValueChange={(v) =>
                        setCreateForm((p: any) => ({ ...p, name: (v ?? "").toUpperCase() }))
                      }
                      radius="sm"
                      variant="bordered"
                      classNames={{
                        inputWrapper:
                          "h-11 rounded-lg border border-slate-200 bg-white px-4 shadow-none " +
                          "data-[hover=true]:border-slate-300 group-data-[focus=true]:border-primary",
                        input: "text-slate-900 placeholder:text-slate-400",
                      }}
                    />
                  </div>

                  <div>
                    <div>
                      <label className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                        Form <span className="text-rose-500">*</span>
                      </label>

                      <Popover
                        isOpen={isOpenPopover}
                        onOpenChange={setIsOpenPopover}
                        placement="bottom-start"
                        offset={4}
                      >
                        <PopoverTrigger>
                          <div
                            className="relative w-full cursor-pointer"
                            onClick={() => {
                              setIsOpenPopover(true);
                              setTimeout(() => inputRef.current?.focus(), 100);
                            }}
                          >
                            <div className="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 shadow-none transition-all data-[hover=true]:border-slate-300">
                              <span className={`text-base ${createForm.form ? 'text-slate-900' : 'text-slate-400'}`}>
                                {createForm.form || "Search or select form..."}
                              </span>
                              <ChevronDownIcon />
                            </div>
                          </div>
                        </PopoverTrigger>

                        <PopoverContent className="w-[400px] rounded-2xl border border-slate-200 bg-white p-0 shadow-lg">
                          <div className="w-full">
                            {/* Search input */}
                            <div className="border-b border-slate-100 p-3">
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                  <SearchIcon />
                                </div>
                                <input
                                  ref={inputRef}
                                  type="text"
                                  placeholder="Search forms..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-primary"
                                  autoFocus
                                />
                              </div>
                            </div>

                            {/* Options list */}
                            <div className="max-h-[300px] overflow-y-auto">
                              {isLoadingForms ? (
                                <div className="flex items-center justify-center py-8">
                                  <Spinner size="sm" />
                                </div>
                              ) : filteredOptions.length > 0 ? (
                                filteredOptions.map((opt: FormOption) => (
                                  <div
                                    key={opt.value}
                                    onClick={() => handleSelectOption(opt.value)}
                                    className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                                  >
                                    {opt.label}
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-slate-500">
                                  No matching forms found
                                </div>
                              )}

                              {/* Create custom option */}
                              {searchQuery && !hasExactMatch && !isLoadingForms && (
                                <div
                                  onClick={handleCreateCustom}
                                  className="flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm text-emerald-600 transition-colors hover:bg-emerald-50"
                                >
                                  <PlusIcon />
                                  <span>Create "{searchQuery}"</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Input
                      label={
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                          Composition
                        </span>
                      }
                      labelPlacement="outside"
                      placeholder="Enter composition (e.g. Amoxycillin (250mg))"
                      value={createForm.composition || ""}
                      onValueChange={(v) =>
                        setCreateForm((p: any) => ({ ...p, composition: v }))
                      }
                      radius="sm"
                      variant="bordered"
                      classNames={{
                        inputWrapper:
                          "h-11 rounded-lg border border-slate-200 bg-white px-4 shadow-none " +
                          "data-[hover=true]:border-slate-300 group-data-[focus=true]:border-primary",
                        input: "text-slate-900 placeholder:text-slate-400",
                      }}
                    />
                  </div>
                </div>
              </div>
            </ModalBody>

            <ModalFooter className="px-5 pb-5 pt-1">
              <div className="flex w-full items-center justify-end gap-3">
                <Button
                  radius="sm"
                  variant="bordered"
                  onPress={onClose}
                  isDisabled={creatingMedicine}
                  className="h-9 px-5 rounded-lg border-primary text-primary text-[13px] font-semibold"
                >
                  Cancel
                </Button>

                <Button
                  radius="sm"
                  onPress={submitCreateMedicine}
                  isDisabled={creatingMedicine || !createForm.name || !createForm.form}
                  className="h-9 px-6 rounded-lg bg-primary text-white text-[13px] font-semibold"
                >
                  {creatingMedicine ? "Adding…" : "Add Medicine"}
                </Button>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddMedicineModal;