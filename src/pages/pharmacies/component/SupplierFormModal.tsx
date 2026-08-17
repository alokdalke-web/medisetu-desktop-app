import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { FiEdit2, FiPlus } from "react-icons/fi";
import {
  type AddSupplierRequest,
  type UpdatePharmacySupplierRequest,
} from "../../../redux/api/pharmaciesApi";

export interface Supplier {
  id: string;
  pharmacyId: string;
  supplierName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
  panNumber: string;
  creditDays: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

const SUPPLIER_FIELD_LIMITS = {
  supplierName: { min: 2, max: 100 },
  contactPerson: { min: 3, max: 50 },
  address: { min: 3, max: 200 },
  gstNumber: { min: 15, max: 15 },
  email: { min: 5, max: 50 },
  panNumber: { min: 10, max: 10 },
} as const;

const getOptionalLengthError = (
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
const removeEmptyOptionalFields = <T extends Record<string, any>>(data: T): Partial<T> => {
  const result: Partial<T> = {};
  
  const requiredFields = ['supplierName', 'contactPerson', 'phone', 'status'];
  
  Object.keys(data).forEach((key) => {
    const value = data[key];
    const typedKey = key as keyof T;
    
    if (requiredFields.includes(key)) {
      result[typedKey] = value;
    }
    else if (key === 'creditDays') {
      if (value > 0) {
        result[typedKey] = value;
      }
    }
    else if (value && value !== "" && value !== null && value !== undefined) {
      result[typedKey] = value;
    }
  });
  
  return result;
};

// Phone validation function
const validatePhoneNumber = (phone: string): { isValid: boolean; errorMessage: string } => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (!cleanPhone) {
    return { isValid: false, errorMessage: "Phone number is required" };
  }
  
  if (cleanPhone.length !== 10) {
    return { isValid: false, errorMessage: "Phone number must be exactly 10 digits" };
  }
  
  const firstDigit = cleanPhone[0];
  const validStartDigits = ['6', '7', '8', '9'];
  
  if (!validStartDigits.includes(firstDigit)) {
    return { isValid: false, errorMessage: "Phone number must start with 6, 7, 8, or 9" };
  }
  
  return { isValid: true, errorMessage: "" };
};

const validateEmail = (
  email: string
): { isValid: boolean; errorMessage: string } => {
  if (!email?.trim()) {
    return { isValid: true, errorMessage: "" };
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      errorMessage: "Please enter a valid email address",
    };
  }

  return { isValid: true, errorMessage: "" };
};

// PAN validation function
const validatePanNumber = (
  pan: string
): { isValid: boolean; errorMessage: string } => {
  const trimmed = (pan || "").trim();
  if (!trimmed) {
    return { isValid: true, errorMessage: "" };
  }

  if (trimmed.length !== 10) {
    return {
      isValid: false,
      errorMessage: "PAN number must be exactly 10 characters",
    };
  }

  const panRegex = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/;
  if (!panRegex.test(trimmed)) {
    return {
      isValid: false,
      errorMessage:
        "Invalid PAN format. Must be 5 letters, 4 numbers, and 1 letter (e.g., ABCDE1234F)",
    };
  }

  return { isValid: true, errorMessage: "" };
};

// GST validation function
const validateGstNumber = (
  gst: string
): { isValid: boolean; errorMessage: string } => {
  const trimmed = (gst || "").trim();
  if (!trimmed) {
    return { isValid: true, errorMessage: "" };
  }

  if (trimmed.length !== 15) {
    return {
      isValid: false,
      errorMessage: "GST number must be exactly 15 characters",
    };
  }

  const gstRegex = /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9][A-Za-z][0-9]$/;
  if (!gstRegex.test(trimmed)) {
    return {
      isValid: false,
      errorMessage:
        "Invalid GST format. Format: 2 numbers, 5 letters, 4 numbers, 1 letter, 1 number, 1 letter, and 1 number (e.g., 12ABCDE3456F7G8)",
    };
  }

  return { isValid: true, errorMessage: "" };
};

// Format phone number to only digits
const formatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 10);
};

const validateCreditDays = (days: number): { isValid: boolean; errorMessage: string } => {
  if (!Number.isInteger(days)) {
    return { isValid: false, errorMessage: "Credit days must be an integer" };
  }
  if (days < 0) {
    return { isValid: false, errorMessage: "Credit days cannot be negative" };
  }
  if (days > 365) {
    return { isValid: false, errorMessage: "Credit days cannot exceed 365" };
  }
  return { isValid: true, errorMessage: "" };
};

// Supplier Form Modal Component
interface SupplierFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData?: Supplier | null;
  onSubmit: (data: AddSupplierRequest | UpdatePharmacySupplierRequest) => Promise<void>;
  isLoading?: boolean;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onOpenChange,
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<AddSupplierRequest>({
    supplierName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
    panNumber: "",
    creditDays: 0,
    status: "active",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        supplierName: initialData.supplierName,
        contactPerson: initialData.contactPerson,
        phone: initialData.phone,
        email: initialData.email,
        address: initialData.address,
        gstNumber: initialData.gstNumber,
        panNumber: initialData.panNumber,
        creditDays: initialData.creditDays,
        status: initialData.status,
      });
    } else {
      setFormData({
        supplierName: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        gstNumber: "",
        panNumber: "",
        creditDays: 0,
        status: "active",
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    const textFields = [
      ["supplierName", "Supplier name", true],
      ["contactPerson", "Contact person", true],
      ["address", "Address", false],
      ["email", "Email", false],
    ] as const;

    textFields.forEach(([field, label, required]) => {
      const limits = SUPPLIER_FIELD_LIMITS[field];
      const error = getOptionalLengthError(
        label,
        formData[field] || "",
        limits.min,
        limits.max,
        required
      );

      if (error) newErrors[field] = error;
    });

    if (
      formData.contactPerson?.trim() &&
      !/^[A-Za-z ]+$/.test(formData.contactPerson.trim())
    ) {
      newErrors.contactPerson =
        "Contact person can only contain alphabets and spaces";
    }
    
    const phoneValidation = validatePhoneNumber(formData.phone || "");
    if (!phoneValidation.isValid) {
      newErrors.phone = phoneValidation.errorMessage;
    }

    const emailValidation = validateEmail(formData.email || "");
    if (!newErrors.email && !emailValidation.isValid) {
      newErrors.email = emailValidation.errorMessage;
    }

    const gstValidation = validateGstNumber(formData.gstNumber || "");
    if (!gstValidation.isValid) {
      newErrors.gstNumber = gstValidation.errorMessage;
    }

    const panValidation = validatePanNumber(formData.panNumber || "");
    if (!panValidation.isValid) {
      newErrors.panNumber = panValidation.errorMessage;
    }

    if (formData.creditDays !== undefined) {
      const creditDaysValidation = validateCreditDays(formData.creditDays);
      if (!creditDaysValidation.isValid) {
        newErrors.creditDays = creditDaysValidation.errorMessage;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const prepareUpdateData = (data: AddSupplierRequest) => {
    const result: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (
        key === "supplierName" ||
        key === "contactPerson" ||
        key === "phone" ||
        key === "status"
      ) {
        result[key] = value;
        return;
      }

      if (typeof value === "string") {
        result[key] = value.trim() === "" ? null : value;
        return;
      }

      result[key] = value;
    });

    return result;
  };

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    const cleanedData = initialData
      ? prepareUpdateData(formData)
      : removeEmptyOptionalFields(formData);

    try {
      await onSubmit(
        cleanedData as AddSupplierRequest | UpdatePharmacySupplierRequest
      );
      onOpenChange(false);
    } catch {
    }
  }, [
    validateForm,
    formData,
    initialData,
    onSubmit,
    onOpenChange,
  ]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && isOpen) {
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA';
        
        if (isInputField) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isLoading, handleSubmit]);

  const handleInputChange = (field: keyof AddSupplierRequest, value: any) => {
    if (field === 'phone') {
      const formattedValue = formatPhoneNumber(value);
      setFormData((prev) => ({
        ...prev,
        [field]: formattedValue,
      }));
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
      return;
    }

    if (field === 'creditDays') {
      const digits = String(value);
      if (!/^\d*$/.test(digits)) return;

      const numValue = Math.min(Number(digits || 0), 365);
      
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

    if (field === "contactPerson") {
      value = String(value)
        .replace(/[^A-Za-z ]/g, "")
        .slice(0, SUPPLIER_FIELD_LIMITS.contactPerson.max);
    } else if (field === "panNumber" || field === "gstNumber") {
      value = String(value).toUpperCase().slice(0, SUPPLIER_FIELD_LIMITS[field].max);
    } else if (
      field === "supplierName" ||
      field === "address" ||
      field === "email"
    ) {
      value = String(value).slice(0, SUPPLIER_FIELD_LIMITS[field].max);
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

  const isEdit = !!initialData;

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
            <ModalHeader className="p-0">
              <div className="relative w-full px-6 pt-6 pb-5">
                <button
                  onClick={onClose}
                  className="absolute top-4 cursor-pointer right-4 hover:text-slate-400 transition-colors text-xl leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a6b6b] flex items-center justify-center flex-shrink-0">
                    {isEdit ? (
                      <FiEdit2 className="text-white text-xl" />
                    ) : (
                      <FiPlus className="text-white text-xl" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl leading-tight">
                      {isEdit ? "Edit Supplier" : "Add New Supplier"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {isEdit
                        ? "Update supplier details in your list"
                        : "Enter supplier details to add to your list"}
                    </p>
                  </div>
                </div>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="px-6 pt-5 pb-2 border-b-none grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      errors.supplierName
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      autoFocus
                      maxLength={SUPPLIER_FIELD_LIMITS.supplierName.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter supplier name"
                      value={formData.supplierName}
                      onChange={(e) => handleInputChange("supplierName", e.target.value)}
                    />
                  </div>
                  {errors.supplierName && (
                    <p className="text-xs text-red-500">{errors.supplierName}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      errors.contactPerson
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      maxLength={SUPPLIER_FIELD_LIMITS.contactPerson.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter contact person name"
                      value={formData.contactPerson}
                      onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    />
                  </div>
                  {errors.contactPerson && (
                    <p className="text-xs text-red-500">{errors.contactPerson}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`flex items-center border rounded-xl bg-white overflow-hidden transition-colors ${
                      errors.phone
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <div className="flex items-center gap-1 px-3 py-2.5 border-r border-slate-200 bg-slate-50 cursor-pointer select-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-sm text-slate-600 font-medium">+91</span>
                    </div>
                    <input
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter 10-digit mobile number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      maxLength={10}
                      inputMode="numeric"
                    />
                  </div>
                  {errors.phone ? (
                    <p className="text-xs text-red-500">{errors.phone}</p>
                  ) : (
                    <p className="text-xs text-slate-400">We'll use this number to stay in touch</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Email{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.email
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      maxLength={SUPPLIER_FIELD_LIMITS.email.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                  {errors.email ? (
                    <p className="text-xs text-red-500">
                      {errors.email}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Optional email address
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Address{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.address
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      maxLength={SUPPLIER_FIELD_LIMITS.address.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-xs text-red-500">{errors.address}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    GST Number{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.gstNumber
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <input
                      maxLength={SUPPLIER_FIELD_LIMITS.gstNumber.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter GST number"
                      value={formData.gstNumber}
                      onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                    />
                  </div>
                  {errors.gstNumber && (
                    <p className="text-xs text-red-500">{errors.gstNumber}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    PAN Number{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                    errors.panNumber
                      ? "border-red-400"
                      : "border-slate-200 focus-within:border-[#1a6b6b]"
                  }`}>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <input
                      maxLength={SUPPLIER_FIELD_LIMITS.panNumber.max}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="Enter PAN number"
                      value={formData.panNumber}
                      onChange={(e) => handleInputChange("panNumber", e.target.value)}
                    />
                  </div>
                  {errors.panNumber && (
                    <p className="text-xs text-red-500">{errors.panNumber}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">
                    Credit Days{" "}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div
                    className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                      errors.creditDays
                        ? "border-red-400"
                        : "border-slate-200 focus-within:border-[#1a6b6b]"
                    }`}
                  >
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      step={1}
                      className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                      placeholder="0"
                      value={String(formData.creditDays)}
                      onChange={(e) => handleInputChange("creditDays", e.target.value)}
                    />
                  </div>
                  {errors.creditDays ? (
                    <p className="text-xs text-red-500">{errors.creditDays}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Number of credit days</p>
                  )}
                </div>

                <div className="flex flex-col gap-1 ">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-[#1a6b6b] transition-colors">
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <Select
                      aria-label="Status"
                      selectedKeys={[formData.status]}
                      disallowEmptySelection={true}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as "active" | "inactive";
                        if (value) {
                          handleInputChange("status", value);
                        }
                      }}
                      variant="bordered"
                      classNames={{
                        trigger:
                          "border-none shadow-none min-h-0 h-auto bg-transparent px-0",
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
              </div>
            </ModalBody>

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
                {isEdit ? "Update Supplier" : "Add Supplier"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SupplierFormModal;
