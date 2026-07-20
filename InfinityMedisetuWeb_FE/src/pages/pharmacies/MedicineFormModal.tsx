import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Chip,
} from "@heroui/react";
import {
  useGetHSNQuery,
  useGetMedicineCategoriesQuery,
  useGetMedicineBrandsQuery,
  type AddMedicineRequest,
  type UpdateMedicineRequest,
  type Medicine,
  type HSN,
} from "../../redux/api/pharmaciesApi";
import TagsInput from "./TagsInput";
import { FiPlus, FiEdit2 } from "react-icons/fi";
import { useLazyGetMedicineDataQuery } from "../../redux/api/medicineApi";

export type MedicineFormData = {
  medicineName: string;
  category: string;
  brandName: string;
  composition: string;
  hsnId: string;
  form: string;
  shelf: string;
  reorder: number | null;
  packOf: number | null;
  status: "active" | "inactive";
  tags: string[];
};

export type MedicineFormModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: Medicine | Partial<MedicineFormData> | null;
  onSubmit: (data: AddMedicineRequest | UpdateMedicineRequest) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  submitLabel?: string;
  hideStatus?: boolean;
};

const FIELD_LIMITS = {
  medicineName: { min: 2, max: 100 },
  brandName: { min: 2, max: 50 },
  composition: { min: 2, max: 200 },
  category: { min: 2, max: 50 },
  form: { min: 2, max: 50 },
  shelf: { min: 1, max: 50 },
  tag: { min: 2, max: 50 },
} as const;

const getLengthError = (
  label: string,
  value: string,
  min: number,
  max: number,
  required = false
) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return required ? `${label} is required` : "";
  }

  if (trimmedValue.length < min) {
    return `${label} must be at least ${min} characters`;
  }

  if (trimmedValue.length > max) {
    return `${label} must not exceed ${max} characters`;
  }

  return "";
};

// Helper function to remove empty optional fields
const removeEmptyOptionalFields = <T extends Record<string, any>>(
  data: T
): Partial<T> => {
  const result: Partial<T> = {};
  const requiredFields = ["medicineName", "hsnId"];

  Object.keys(data).forEach((key) => {
    const value = data[key];
    const typedKey = key as keyof T;

    if (requiredFields.includes(key)) {
      result[typedKey] = value;
    } else if (key === "reorder") {
      if (value > 0) {
        result[typedKey] = value;
      }
    } else if (key === "packOf") {
      if (value !== null && value !== undefined && value > 0) {
        result[typedKey] = value;
      }
    } else if (
      value &&
      value !== "" &&
      value !== null &&
      value !== undefined
    ) {
      result[typedKey] = value;
    }
  });

  return result;
};

const MedicineFormModal: React.FC<MedicineFormModalProps> = ({
  isOpen,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading = false,
  title,
  submitLabel,
  hideStatus = false,
}) => {
  const [formData, setFormData] = useState<MedicineFormData>({
    medicineName: "",
    category: "",
    brandName: "",
    composition: "",
    hsnId: "",
    form: "",
    shelf: "",
    reorder: null,
    packOf: null,
    status: "active",
    tags: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category states
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  const [categoryInputValue, setCategoryInputValue] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Brand states
  const [brandSearch, setBrandSearch] = useState("");
  const [debouncedBrandSearch, setDebouncedBrandSearch] = useState("");
  const [brandInputValue, setBrandInputValue] = useState("");
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);

  // HSN states
  const [_isHsnDropdownOpen, setIsHsnDropdownOpen] = useState(false);

  // DB medicine suggestions states
  const [triggerGetMedicineData] = useLazyGetMedicineDataQuery();
  const [dbSuggestions, setDbSuggestions] = useState<any[]>([]);
  const [showDbSuggestions, setShowDbSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const suggestionsRef = React.useRef<HTMLDivElement | null>(null);

  const [dbSuggestionsPage, setDbSuggestionsPage] = useState(1);
  const [dbSuggestionsHasMore, setDbSuggestionsHasMore] = useState(true);
  const [dbSuggestionsLoading, setDbSuggestionsLoading] = useState(false);

  // Click outside suggestions list to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowDbSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced database suggestions fetcher
  const handleMedicineNameChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    handleInputChange("medicineName", uppercaseVal);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (uppercaseVal.trim().length < 2) {
      setDbSuggestions([]);
      setShowDbSuggestions(false);
      setDbSuggestionsPage(1);
      setDbSuggestionsHasMore(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setDbSuggestionsLoading(true);
      setDbSuggestionsPage(1);
      setDbSuggestionsHasMore(true);
      try {
        const res = await triggerGetMedicineData({
          medicine_name: uppercaseVal.trim(),
          page: 1,
          limit: 5,
        }).unwrap();

        if (res?.success && res?.data?.length > 0) {
          setDbSuggestions(res.data);
          setShowDbSuggestions(true);
          const pagination = res?.pagination;
          if (pagination) {
            setDbSuggestionsHasMore(pagination.currentPage < pagination.totalPages);
          } else {
            setDbSuggestionsHasMore(res.data.length === 5);
          }
        } else {
          setDbSuggestions([]);
          setShowDbSuggestions(false);
          setDbSuggestionsHasMore(false);
        }
      } catch (err) {
        console.error("Error fetching medicine suggestions:", err);
        setDbSuggestions([]);
        setShowDbSuggestions(false);
        setDbSuggestionsHasMore(false);
      } finally {
        setDbSuggestionsLoading(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSuggestionsScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    if (!dbSuggestionsHasMore || dbSuggestionsLoading) return;
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight <= 60) {
      const nextPage = dbSuggestionsPage + 1;
      setDbSuggestionsLoading(true);
      try {
        const res = await triggerGetMedicineData({
          medicine_name: formData.medicineName.trim(),
          page: nextPage,
          limit: 5,
        }).unwrap();

        if (res?.success) {
          const items = res?.data || [];
          setDbSuggestions((prev) => [...prev, ...items]);
          setDbSuggestionsPage(nextPage);
          const pagination = res?.pagination;
          if (pagination) {
            setDbSuggestionsHasMore(pagination.currentPage < pagination.totalPages);
          } else {
            setDbSuggestionsHasMore(items.length === 5);
          }
        }
      } catch (err) {
        console.error("Error fetching more medicine suggestions:", err);
      } finally {
        setDbSuggestionsLoading(false);
      }
    }
  };

  const handleSelectSuggestion = (item: any) => {
    const medName = item.medicine_name.toUpperCase();
    const manufacturer = item.manufacturer_name || "";
    const comp = item.composition || "";

    setFormData((prev) => ({
      ...prev,
      medicineName: medName,
      brandName: manufacturer,
      composition: comp,
    }));

    setBrandInputValue(manufacturer);

    setDbSuggestions([]);
    setShowDbSuggestions(false);
  };

  /**
   * HSN API - ONLY call when modal open AND HSN dropdown open
   */
  const { data: hsnData, isLoading: isHSNLoading } = useGetHSNQuery(
    undefined,
    {
      skip: !isOpen,
    }
  );

  /**
   * Category API (10 items)
   * ONLY call when modal open AND category dropdown open
   */
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
  } = useGetMedicineCategoriesQuery(
    {
      pageNumber: 1,
      pageSize: 10,
      search: debouncedCategorySearch,
    },
    {
      skip: !isOpen || !isCategoryDropdownOpen,
    }
  );

  const {
    data: brandsData,
    isLoading: isBrandsLoading,
  } = useGetMedicineBrandsQuery(
    {
      pageNumber: 1,
      pageSize: 10,
      search: debouncedBrandSearch,
    },
    {
      skip: !isOpen || !isBrandDropdownOpen,
    }
  );

  const hsnOptions = hsnData?.data || [];
  const categoryOptions = categoriesData?.data || [];
  const brandOptions = brandsData?.data || [];

  useEffect(() => {
    if (initialData) {
      // Check if it's a full Medicine object or partial data
      const isFullMedicine = 'id' in initialData && 'pharmacyId' in initialData;
      
      if (isFullMedicine) {
        const medicine = initialData as Medicine;
        setFormData({
          medicineName: medicine.medicineName.toUpperCase(),
          category: medicine.category || "",
          brandName: medicine.brandName || "",
          composition: medicine.composition || "",
          hsnId: medicine.hsnId,
          form: medicine.form || "",
          shelf: medicine.shelf || "",
          reorder: medicine.reorder ?? null,
          packOf: medicine.packOf ?? null,
          status: medicine.status,
          tags: medicine.tags || [],
        });
      } else {
        const data = initialData as Partial<MedicineFormData>;
        setFormData({
          medicineName: (data.medicineName || "").toUpperCase(),
          category: data.category || "",
          brandName: data.brandName || "",
          composition: data.composition || "",
          hsnId: data.hsnId || "",
          form: data.form || "",
          shelf: data.shelf || "",
          reorder: data.reorder ?? null,
          packOf: data.packOf ?? null,
          status: data.status || "active",
          tags: data.tags || [],
        });
      }

      setCategoryInputValue((initialData as any)?.category || "");
      setBrandInputValue((initialData as any)?.brandName || "");
    } else {
      setFormData({
        medicineName: "",
        category: "",
        brandName: "",
        composition: "",
        hsnId: "",
        form: "",
        shelf: "",
        reorder: null,
        packOf: null,
        status: "active",
        tags: [],
      });

      setCategoryInputValue("");
      setBrandInputValue("");
    }

    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const textFields = [
      ["medicineName", "Medicine name", true],
      ["brandName", "Brand name", false],
      ["composition", "Composition", false],
      ["category", "Category", false],
      ["form", "Form", false],
      ["shelf", "Shelf", false],
    ] as const;

    textFields.forEach(([field, label, required]) => {
      const limits = FIELD_LIMITS[field];
      const error = getLengthError(
        label,
        formData[field],
        limits.min,
        limits.max,
        required
      );

      if (error) newErrors[field] = error;
    });

    if (
      formData.reorder !== null &&
      (!Number.isInteger(formData.reorder) ||
        formData.reorder < 0 ||
        formData.reorder > 100000)
    ) {
      newErrors.reorder = "Reorder must be an integer between 0 and 100000";
    }

    if (
      formData.packOf !== null &&
      (!Number.isInteger(formData.packOf) ||
        formData.packOf < 1 ||
        formData.packOf > 10000)
    ) {
      newErrors.packOf = "Pack Of must be an integer between 1 and 10000";
    }

    if (
      formData.tags.some(
        (tag) =>
          tag.trim().length < FIELD_LIMITS.tag.min ||
          tag.trim().length > FIELD_LIMITS.tag.max
      )
    ) {
      newErrors.tags = "Each tag must contain 2 to 50 characters";
    }

    if (!formData.hsnId) {
      newErrors.hsnId = "HSN is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const prepareUpdateData = (data: MedicineFormData) => {
    const result: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key === "medicineName" || key === "hsnId") {
        result[key] = value;
        return;
      }

      if (typeof value === "string") {
        result[key] = value.trim() === "" ? null : value;
        return;
      }

      if (Array.isArray(value)) {
        result[key] = value.length ? value : null;
        return;
      }

      result[key] = value;
    });

    return result;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const isEditMode = initialData && "id" in initialData;

    const payload = isEditMode
      ? prepareUpdateData(formData)
      : removeEmptyOptionalFields(formData);

    try {
      await onSubmit(payload as AddMedicineRequest | UpdateMedicineRequest);
      onOpenChange(false);
    } catch {
    }
  }, [
    validateForm,
    formData,
    onSubmit,
    onOpenChange,
    initialData,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCategorySearch(categorySearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBrandSearch(brandSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [brandSearch]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading && isOpen) {
        const activeElement = document.activeElement;
        const isInputField =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (isInputField) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, isLoading, handleSubmit]);

  const handleInputChange = (
    field: keyof MedicineFormData,
    value: any
  ) => {
    if (field === "reorder") {
      if (value === "" || value === null || value === undefined) {
        setFormData((prev) => ({
          ...prev,
          reorder: null,
        }));

        if (errors.reorder) {
          setErrors((prev) => ({
            ...prev,
            reorder: "",
          }));
        }

        return;
      }

      const digits = String(value);
      if (!/^\d*$/.test(digits)) return;

      const numValue = Math.min(Number(digits), 100000);
      if (numValue < 1) return;

      setFormData((prev) => ({
        ...prev,
        [field]: numValue,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }

      return;
    }

    if (field === "packOf") {
      if (value === "" || value === null || value === undefined) {
        setFormData((prev) => ({
          ...prev,
          [field]: null,
        }));
        return;
      }

      const digits = String(value);
      if (!/^\d*$/.test(digits)) return;

      const numValue = Math.min(Number(digits), 10000);
      
      if (!digits || numValue < 1) {
        setFormData((prev) => ({
          ...prev,
          [field]: null,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field]: numValue,
      }));

      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }

      return;
    }

    if (
      field === "medicineName" ||
      field === "brandName" ||
      field === "composition" ||
      field === "category" ||
      field === "form" ||
      field === "shelf"
    ) {
      value = String(value).slice(0, FIELD_LIMITS[field].max);
      if (field === "medicineName") {
        value = value.toUpperCase();
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const isEditMode = initialData && "id" in initialData;
  const modalTitle = title || (isEditMode ? "Edit Medicine" : "Add New Medicine");
  const submitButtonLabel = submitLabel || (isEditMode ? "Update" : "Add");

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
      isDismissable={false}
      scrollBehavior="inside"
      hideCloseButton={true}
      classNames={{
        base: "rounded-2xl overflow-hidden",
        body: "p-0",
        header: "border-b border-slate-200 dark:border-slate-700 pb-4",
        footer: "border-t border-slate-200 dark:border-slate-700 pt-4",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            {/* ── Header ── */}
            <ModalHeader className="p-0">
              <div className="relative w-full px-6 pt-6 pb-5">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 cursor-pointer right-4 hover:text-slate-400 transition-colors text-xl leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>

                {/* Icon + title */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a6b6b] flex items-center justify-center flex-shrink-0">
                    {isEditMode ? (
                      <FiEdit2 className="text-white text-xl" />
                    ) : (
                      <FiPlus className="text-white text-xl" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl leading-tight font-semibold text-slate-900">
                      {modalTitle}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {isEditMode
                        ? "Update medicine details in your inventory"
                        : "Enter medicine details to add to your inventory"}
                    </p>
                  </div>
                </div>
              </div>
            </ModalHeader>

            {/* ── Body ── */}
            <ModalBody>
              <div className="px-6 pt-5 pb-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                {/* Medicine Name - Full width */}
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Medicine Name <span className="text-red-500">*</span>
                  </label>
                  <div
                    ref={suggestionsRef}
                    className={`relative flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      errors.medicineName
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <input
                      autoFocus
                      maxLength={FIELD_LIMITS.medicineName.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter medicine name"
                      value={formData.medicineName}
                      onChange={(e) => handleMedicineNameChange(e.target.value)}
                      onFocus={() => {
                        if (dbSuggestions.length > 0) {
                          setShowDbSuggestions(true);
                        }
                      }}
                    />

                    {showDbSuggestions && dbSuggestions.length > 0 && (
                      <div
                        onScroll={handleSuggestionsScroll}
                        className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                      >
                        {dbSuggestions.map((item, idx) => (
                          <div
                            key={`suggest-${idx}`}
                            onClick={() => handleSelectSuggestion(item)}
                            className="cursor-pointer px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors"
                          >
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {item.medicine_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-wrap gap-x-2 mt-0.5">
                              {item.manufacturer_name && (
                                <span><b className="text-slate-600 dark:text-slate-200">Brand:</b> {item.manufacturer_name}</span>
                              )}
                              {item.composition && (
                                <span>| <b className="text-slate-600 dark:text-slate-200">Composition:</b> {item.composition}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {dbSuggestionsLoading && (
                          <div className="text-center py-2 text-xs text-slate-400 dark:text-slate-300">
                            Loading more suggestions...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {errors.medicineName && (
                    <p className="text-xs text-red-500">{errors.medicineName}</p>
                  )}
                </div>

                {/* HSN Code */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    HSN Code <span className="text-red-500">*</span>
                  </label>
                  <div 
                    className={`flex items-center rounded-xl bg-white transition-colors ${
                      errors.hsnId 
                        ? "border-2 border-red-400" 
                        : "border border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <div className="flex-1">
                      <Autocomplete
                        placeholder="Search HSN by code or description"
                        selectedKey={formData.hsnId ? String(formData.hsnId) : null}
                        onSelectionChange={(key) => {
                          handleInputChange("hsnId", key);
                          // Clear error when selection changes
                          if (errors.hsnId) {
                            setErrors((prev) => ({ ...prev, hsnId: "" }));
                          }
                        }}
                        isLoading={isHSNLoading}
                        className="w-full"
                        onOpenChange={(open) => {
                          setIsHsnDropdownOpen(open);
                        }}
                        classNames={{
                          base: "w-full",
                          listboxWrapper: "max-h-[300px]",
                          selectorButton: "p-0",
                          clearButton: "p-0",
                          endContentWrapper: "p-0",
                          popoverContent: "z-[9999]",
                        }}
                      >
                        {hsnOptions.map((hsn: HSN) => (
                          <AutocompleteItem 
                            key={hsn.id} 
                            textValue={`${hsn.hsnCode} - ${hsn.gstPercentage}%`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {hsn.hsnCode}
                              </span>
                              <span className="text-small text-default-500">
                                GST: {hsn.gstPercentage}% | {hsn.description}
                              </span>
                            </div>
                          </AutocompleteItem>
                        ))}
                      </Autocomplete>
                    </div>
                  </div>
                  {/* Error message displayed outside */}
                  {errors.hsnId && (
                    <p className="text-xs text-red-500 mt-1">{errors.hsnId}</p>
                  )}
                </div>

                {/* Brand Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Brand Name{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center border rounded-xl bg-white overflow-hidden transition-colors ${
                    errors.brandName
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <div className="flex-1">
                      <Autocomplete
                        placeholder="Select brand or add custom brand"
                        inputValue={brandInputValue}
                        selectedKey={null}
                        onInputChange={(value) => {
                          const nextValue = value.slice(0, FIELD_LIMITS.brandName.max);
                          setBrandInputValue(nextValue);
                          setBrandSearch(nextValue);
                          handleInputChange("brandName", nextValue);
                        }}
                        onSelectionChange={(key) => {
                          const value = String(key || "").slice(
                            0,
                            FIELD_LIMITS.brandName.max
                          );
                          setBrandInputValue(value);
                          handleInputChange("brandName", value);
                        }}
                        isLoading={isBrandsLoading}
                        className="w-full"
                        allowsCustomValue
                        isClearable
                        onOpenChange={(open) => {
                          setIsBrandDropdownOpen(open);
                          if (!open) {
                            setBrandSearch("");
                          }
                        }}
                        onClear={() => {
                          setBrandInputValue("");
                          setBrandSearch("");
                          handleInputChange("brandName", "");
                        }}
                        classNames={{
                          base: "w-full",
                          listboxWrapper: "max-h-[300px]",
                          selectorButton: "p-0",
                          clearButton: "p-0",
                          endContentWrapper: "p-0",
                          popoverContent: "z-[9999]",
                        }}
                      >
                        {brandOptions.map((brand: string) => (
                          <AutocompleteItem key={brand}>
                            {brand}
                          </AutocompleteItem>
                        ))}
                      </Autocomplete>
                    </div>
                  </div>
                  {errors.brandName && (
                    <p className="text-xs text-red-500">{errors.brandName}</p>
                  )}
                </div>

                {/* Composition */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Composition{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.composition
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 01-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.611L5 14.5" />
                    </svg>
                    <input
                      maxLength={FIELD_LIMITS.composition.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="e.g., Paracetamol 500mg"
                      value={formData.composition}
                      onChange={(e) => handleInputChange("composition", e.target.value)}
                    />
                  </div>
                  {errors.composition && (
                    <p className="text-xs text-red-500">{errors.composition}</p>
                  )}
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Category{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center border rounded-xl bg-white overflow-hidden transition-colors ${
                    errors.category
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <div className="flex-1">
                      <Autocomplete
                        placeholder="Select category or add custom category"
                        inputValue={categoryInputValue}
                        onInputChange={(value) => {
                          const nextValue = value.slice(0, FIELD_LIMITS.category.max);
                          setCategoryInputValue(nextValue);
                          setCategorySearch(nextValue);
                          handleInputChange("category", nextValue);
                        }}
                        selectedKey={null}
                        onSelectionChange={(key) => {
                          const value = String(key || "").slice(
                            0,
                            FIELD_LIMITS.category.max
                          );
                          setCategoryInputValue(value);
                          handleInputChange("category", value);
                        }}
                        isLoading={isCategoriesLoading}
                        className="w-full"
                        allowsCustomValue
                        isClearable
                        onOpenChange={(open) => {
                          setIsCategoryDropdownOpen(open);
                          if (!open) {
                            setCategorySearch("");
                          }
                        }}
                        onClear={() => {
                          setCategoryInputValue("");
                          setCategorySearch("");
                          handleInputChange("category", "");
                        }}
                        classNames={{
                          base: "w-full",
                          listboxWrapper: "max-h-[300px]",
                          selectorButton: "p-0",
                          clearButton: "p-0",
                          endContentWrapper: "p-0",
                          popoverContent: "z-[9999]",
                        }}
                      >
                        {categoryOptions.map((category: string) => (
                          <AutocompleteItem key={category}>
                            {category}
                          </AutocompleteItem>
                        ))}
                      </Autocomplete>
                    </div>
                  </div>
                  {errors.category && (
                    <p className="text-xs text-red-500">{errors.category}</p>
                  )}
                </div>

                {/* Form */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Form{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.form
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                    <input
                      maxLength={FIELD_LIMITS.form.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="e.g., Tablet, Capsule, Syrup"
                      value={formData.form}
                      onChange={(e) => handleInputChange("form", e.target.value)}
                    />
                  </div>
                  {errors.form && (
                    <p className="text-xs text-red-500">{errors.form}</p>
                  )}
                </div>

                {/* Shelf Location */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Shelf Location{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.shelf
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
                    </svg>
                    <input
                      maxLength={FIELD_LIMITS.shelf.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="e.g., A-15"
                      value={formData.shelf}
                      onChange={(e) => handleInputChange("shelf", e.target.value)}
                    />
                  </div>
                  {errors.shelf && (
                    <p className="text-xs text-red-500">{errors.shelf}</p>
                  )}
                </div>

                {/* Reorder Level */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Reorder Level{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      errors.reorder
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10.5l9-5.5 9 5.5M3 10.5v11m18-11v11m-9-5.5V21m-9-5.5v-2m18 2v-2M12 3.75V5.25" />
                    </svg>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter reorder level"
                      value={formData.reorder !== null ? String(formData.reorder) : ""}
                      onChange={(e) => handleInputChange("reorder", e.target.value)}
                    />
                  </div>
                  {errors.reorder && (
                    <p className="text-xs text-red-500">{errors.reorder}</p>
                  )}
                  <p className="text-xs text-slate-400">Minimum stock level to trigger reorder</p>
                </div>

                {/* Pack Of */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Pack Of{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.packOf
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="e.g., 10, 30, 100"
                      value={formData.packOf !== null && formData.packOf !== undefined ? String(formData.packOf) : ""}
                      onChange={(e) => handleInputChange("packOf", e.target.value)}
                    />
                  </div>
                  {errors.packOf && (
                    <p className="text-xs text-red-500">{errors.packOf}</p>
                  )}
                  <p className="text-xs text-slate-400">Number of qty per pack/strip</p>
                </div>

                {/* Status - if not hidden */}
                {!hideStatus && (
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#1a6b6b] transition-colors">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <Select
                        aria-label="Status"
                        selectedKeys={formData.status ? [formData.status] : new Set()}
                        onSelectionChange={(keys) => {
                          const value = Array.from(keys)[0] as string;
                          handleInputChange("status", value as "active" | "inactive");
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "border-none shadow-none min-h-0 h-auto bg-transparent px-0",
                          value: "text-sm text-slate-800",
                          popoverContent: "z-[9999]",
                        }}
                      >
                        <SelectItem key="active" textValue="Active">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success-500" />
                            Active
                          </div>
                        </SelectItem>
  
                        <SelectItem key="inactive" textValue="Inactive">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-danger-500" />
                            Inactive
                          </div>
                        </SelectItem>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Tags - Full width */}
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    Tags{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus-within:border-[#1a6b6b] transition-colors">
                    <TagsInput
                      value={formData.tags || []}
                      onChange={(tags) => handleInputChange("tags", tags)}
                      placeholder="Add tags and press Enter (e.g., antibiotic, prescription)"
                      maxTags={20}
                      minTagLength={FIELD_LIMITS.tag.min}
                      maxTagLength={FIELD_LIMITS.tag.max}
                      isInvalid={!!errors.tags}
                      errorMessage={errors.tags}
                    />
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs text-slate-400 mb-1">Suggested tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Fullstrip",
                        "On-Demand",
                        "Prescription Required", 
                        "Refrigeration Required", 
                        "Controlled Substance", 
                        "Schedule H Drug", 
                        "High Alert Medication", 
                        "Pregnancy Warning"
                      ]
                        .filter(suggestion => !formData.tags?.includes(suggestion))
                        .map((suggestion) => (
                          <Chip
                            key={suggestion}
                            size="sm"
                            variant="flat"
                            className="cursor-pointer hover:bg-[#1a6b6b]/10 text-slate-600 border border-slate-200"
                            onClick={() => {
                              if (!formData.tags?.includes(suggestion) && (formData.tags?.length || 0) < 20) {
                                handleInputChange("tags", [...(formData.tags || []), suggestion]);
                              }
                            }}
                          >
                            + {suggestion}
                          </Chip>
                        ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-1">
                    Add up to 20 tags to help categorize and search medicines
                  </p>
                </div>
              </div>
            </ModalBody>

            {/* ── Footer ── */}
            <ModalFooter>
              <Button
                color="default"
                variant="bordered"
                onPress={onClose}
                isDisabled={isLoading}
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                isLoading={isLoading}
                className="rounded-xl bg-[#1a6b6b] text-white hover:bg-[#155858] font-medium"
              >
                {submitButtonLabel} Medicine
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default MedicineFormModal;
