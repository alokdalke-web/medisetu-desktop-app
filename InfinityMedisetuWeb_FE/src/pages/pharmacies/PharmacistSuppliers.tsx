import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Chip,
  addToast,
  useDisclosure,
  Tooltip,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  FiEdit2,
  FiPlus,
  FiDownload,
  FiUpload,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiCheckSquare,
  FiChevronDown,
  FiCheck,
} from "react-icons/fi";
import {
  useGetAllSuppliersQuery,
  useAddSupplierMutation,
  useUpdatePharmacySupplierMutation,
  useDownloadSupplierSampleTemplateMutation,
  useImportSupplierMutation,
  type AddSupplierRequest,
  type UpdatePharmacySupplierRequest,
  useExportSuppliersMutation,
  useGetSupplierStatsQuery,
  useGetSubscriptionNotificationsQuery,
  useMarkSubscriptionNotificationReadMutation,
} from "../../redux/api/pharmaciesApi";
import SubscriptionNotificationModal from "./SubscriptionNotificationModal";
import SearchField from "../../components/shared/SearchField";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { supplierTips } from "../../constants/featureTips";

interface Supplier {
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

type PageSize = 6 | 10 | 15;

const SUPPLIER_FIELD_LIMITS = {
  supplierName: { min: 2, max: 100 },
  contactPerson: { min: 3, max: 50 },
  address: { min: 3, max: 200 },
  gstNumber: { min: 5, max: 30 },
  email: { min: 5, max: 50 },
  panNumber: { min: 5, max: 20 },
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
      ["gstNumber", "GST number", false],
      ["email", "Email", false],
      ["panNumber", "PAN number", false],
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
    } else if (
      field === "supplierName" ||
      field === "address" ||
      field === "gstNumber" ||
      field === "email" ||
      field === "panNumber"
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
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as "active" | "inactive";
                        handleInputChange("status", value);
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

const PharmacistSuppliers: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Status filter
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 10 as PageSize,
  });

  // Rows per page dropdown state
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedSupplierFile, setSelectedSupplierFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    show: boolean;
    data?: {
      totalInserted: number;
      totalUpdated: number;
      totalSkipped: number;
      totalErrors: number;
      insertedSuppliers?: string[];
      updatedSuppliers?: string[];
      skippedSuppliers?: string[];
      errors?: string[];
    };
  }>({ show: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Click outside handlers ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { 
    data: suppliersData, 
    isLoading: isFetching,
    refetch
  } = useGetAllSuppliersQuery({
    pageNumber: pagination.pageNumber,
    pageSize: pagination.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter as "active" | "inactive" | undefined,
  });

  const [addSupplier, { isLoading: isAddingSupplier }] = useAddSupplierMutation();
  const [updateSupplier, { isLoading: isUpdatingSupplier }] = useUpdatePharmacySupplierMutation();
  const [downloadSupplierSampleTemplate, { isLoading: isDownloadingTemplate }] = useDownloadSupplierSampleTemplateMutation();
  const [importSupplier, { isLoading: isImporting }] = useImportSupplierMutation();
  const [exportSuppliers, { isLoading: isExporting }] = useExportSuppliersMutation();

  const suppliers = suppliersData?.data || [];
  const paginationInfo = suppliersData?.pagination || {
    totalRecords: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  };

  const {
    data: supplierStats,
    isLoading: isStatsLoading,
  } = useGetSupplierStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const percentageChange = supplierStats?.totalSuppliers?.percentageChange ?? 0;
  const isIncrease = percentageChange >= 0;

  const stats = [
    {
      title: "Total Suppliers",
      value: supplierStats?.totalSuppliers?.count ?? 0,
      subText: percentageChange === 0
        ? "No change from previous week"
        : `${isIncrease ? "↑" : "↓"} ${Math.abs(percentageChange)}% from previous week`,
      icon: FiUsers,
      iconBg: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      subColor: percentageChange === 0
        ? "text-slate-500"
        : isIncrease
        ? "text-emerald-600"
        : "text-red-600",
      trend: percentageChange === 0 ? "neutral" as const : isIncrease ? "increase" as const : "decrease" as const,
    },
    {
      title: "Active Suppliers",
      value: supplierStats?.activeSuppliers?.count ?? 0,
      subText: `${supplierStats?.activeSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiCheckCircle,
      iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600",
      subColor: "text-emerald-600",
      trend: "increase" as const,
    },
    {
      title: "Inactive Suppliers",
      value: supplierStats?.inactiveSuppliers?.count ?? 0,
      subText: `${supplierStats?.inactiveSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiXCircle,
      iconBg: "bg-red-100 dark:bg-red-900/20",
      iconColor: "text-red-600",
      subColor: "text-red-600",
      trend: "decrease" as const,
    },
    {
      title: "GST Registered",
      value: supplierStats?.gstRegisteredSuppliers?.count ?? 0,
      subText: `${supplierStats?.gstRegisteredSuppliers?.percentageOfTotal ?? 0}% of total`,
      icon: FiCheckSquare,
      iconBg: "bg-amber-100 dark:bg-amber-900/20",
      iconColor: "text-amber-600",
      subColor: "text-amber-600",
      trend: "increase" as const,
    },
  ];

  const handleAddSupplier = async (data: AddSupplierRequest) => {
    try {
      await addSupplier(data).unwrap();
      addToast({
        title: "Success",
        description: "Supplier added successfully",
        color: "success",
      });
      setPagination({ pageNumber: 1, pageSize: 10 });
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to add supplier",
        color: "danger",
      });
      throw error;
    }
  };

  const handleUpdateSupplier = async (data: UpdatePharmacySupplierRequest) => {
    if (!selectedSupplier) return;

    try {
      await updateSupplier({
        supplierId: selectedSupplier.id,
        body: data,
      }).unwrap();
      addToast({
        title: "Success",
        description: "Supplier updated successfully",
        color: "success",
      });
      setSelectedSupplier(null);
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to update supplier",
        color: "danger",
      });
      throw error;
    }
  };

  const handleDownloadSupplierSampleTemplate = async () => {
    try {
      const blob = await downloadSupplierSampleTemplate().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `supplier-sample-template-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Success",
        description: "Sample template downloaded successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to download sample template",
        color: "danger",
      });
    }
  };

  const handleExportSuppliers = async () => {
    try {
      const blob = await exportSuppliers().unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `suppliers-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Success",
        description: "Suppliers exported successfully",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to export suppliers",
        color: "danger",
      });
    }
  };

  const handleOpenUploadModal = () => {
    setSelectedSupplierFile(null);
    setUploadResult({ show: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setUploadModalOpen(true);
  };

  const handleSupplierFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        addToast({
          title: "Error",
          description: "Please upload a valid Excel or CSV file",
          color: "danger",
        });
        return;
      }
      setSelectedSupplierFile(file);
    }
  };

  const handleUploadBulkSuppliers = async () => {
    if (!selectedSupplierFile) {
      addToast({
        title: "Error",
        description: "Please select a file to upload",
        color: "danger",
      });
      return;
    }

    try {
      const result = await importSupplier(selectedSupplierFile).unwrap();
      setUploadResult({
        show: true,
        data: result.data,
      });

      const { totalInserted, totalUpdated, totalSkipped, totalErrors } = result.data;
      let toastColor: "success" | "warning" | "danger" = "success";
      let message = "";

      if (totalInserted > 0 && totalUpdated === 0 && totalErrors === 0 && totalSkipped === 0) {
        message = `Successfully imported ${totalInserted} suppliers`;
      } else if (totalUpdated > 0 && totalInserted === 0 && totalErrors === 0) {
        message = `Successfully updated ${totalUpdated} suppliers`;
      } else {
        message = `Inserted: ${totalInserted}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`;
        toastColor = totalErrors > 0 ? "warning" : "success";
      }

      addToast({
        title: "Import Complete",
        description: message,
        color: toastColor,
      });
      await refetch();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to import suppliers",
        color: "danger",
      });
    }
  };

  useEffect(() => {
    if (!uploadModalOpen) {
      setSelectedSupplierFile(null);
      setUploadResult({ show: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [uploadModalOpen]);

  const handleOpenAddModal = () => {
    setSelectedSupplier(null);
    onOpen();
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    onOpen();
  };

  const handleFormSubmit = async (
    data: AddSupplierRequest | UpdatePharmacySupplierRequest
  ) => {
    if (selectedSupplier) {
      await handleUpdateSupplier(data as UpdatePharmacySupplierRequest);
    } else {
      await handleAddSupplier(data as AddSupplierRequest);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, pageNumber: page }));
  };

  const handleRowsPerPageChange = (size: PageSize) => {
    setPagination(prev => ({ ...prev, pageSize: size, pageNumber: 1 }));
    setIsPageSizeOpen(false);
  };

  const handleStatusFilterChange = (statusKey: string) => {
    setStatusFilter(statusKey);
    setIsStatusOpen(false);
    setPagination(prev => ({ ...prev, pageNumber: 1 }));
  };

  const statusOptions = [
    { key: "", label: "Status - All" },
    { key: "active", label: "Status - Active" },
    { key: "inactive", label: "Status - Inactive" },
  ];

  const statusLabel = (key: string): string => {
    const option = statusOptions.find(opt => opt.key === key);
    return option ? option.label : "Status - All";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { color: "success" as const, label: "Active" };
      case "inactive":
        return { color: "danger" as const, label: "Inactive" };
      default:
        return { color: "default" as const, label: status };
    }
  };

  const isLoading = isFetching;

  // ── Notification code ──────────────────────────────────────────────────────
  const {
    isOpen: isNotificationOpen,
    onOpen: onNotificationOpen,
    onOpenChange: onNotificationOpenChange,
    onClose: onNotificationClose,
  } = useDisclosure();

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
  } = useGetSubscriptionNotificationsQuery(undefined, {
    pollingInterval: 300000,
    refetchOnMountOrArgChange: true,
  });

  const [markNotificationRead] = useMarkSubscriptionNotificationReadMutation();

  const notifications = notificationsData?.data || [];

  const previousUnreadCountRef = useRef(0);

  useEffect(() => {
    const unreadCount = notifications.length;

    if (previousUnreadCountRef.current === 0 && unreadCount > 0) {
      onNotificationOpen();
    }

    if (unreadCount > previousUnreadCountRef.current) {
      onNotificationOpen();
    }

    previousUnreadCountRef.current = unreadCount;
  }, [notifications, onNotificationOpen]);

  useEffect(() => {
    if (!notifications.length) return;

    const interval = setInterval(() => {
      if (!isNotificationOpen) {
        onNotificationOpen();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [notifications.length, isNotificationOpen, onNotificationOpen]);

  const handleMarkAsRead = async () => {
    try {
      await markNotificationRead().unwrap();
      previousUnreadCountRef.current = 0;
      onNotificationClose();

      addToast({
        title: "Success",
        description: "All notifications marked as read",
        color: "success",
      });
    } catch (error) {
      addToast({
        title: "Error",
        description: "Failed to mark notifications as read",
        color: "danger",
      });
    }
  };

  const handleCloseNotificationModal = () => {
    onNotificationClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      id="tour-pharmacy-suppliers-page"
      className="w-full min-w-0 scroll-mt-6 px-0 py-0"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Suppliers
            </h2>
            <FeatureInfoTip
              title="Suppliers Guide"
              tips={supplierTips}
              guideSection="pharmacy-guide-suppliers"
              linkLabel="Read suppliers guide"
            />
          </div>
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
            Manage medicine suppliers and contact information
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap xl:justify-end mb-2">
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 border border-green-400 text-green-800 text-[13px] font-semibold rounded-lg"
            onPress={handleDownloadSupplierSampleTemplate}
            isLoading={isDownloadingTemplate}
          >
            Sample Template
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiUpload />}
            className="h-10 shrink-0 border border-blue-400 text-blue-800 text-[13px] font-semibold rounded-lg"
            onPress={handleOpenUploadModal}
            isLoading={isImporting}
          >
            Bulk Supplier
          </Button>
          <Button
            color="secondary"
            variant="bordered"
            startContent={<FiDownload />}
            className="h-10 shrink-0 text-[13px] font-semibold rounded-lg"
            onPress={handleExportSuppliers}
            isLoading={isExporting}
          >
            Export
          </Button>
          <Button
            color="primary"
            startContent={<FiPlus />}
            onPress={handleOpenAddModal}
            className="h-10 shrink-0 whitespace-nowrap bg-primary px-5 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* ── Stat cards - Updated for better mobile responsiveness ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-3 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const trendColor = stat.subColor;

          return (
            <div 
              key={index} 
              className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:px-4 sm:py-4"
            >
              <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
                <div className={["grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12", stat.iconBg].join(" ")}>
                  <Icon className={["text-lg sm:text-xl", stat.iconColor].join(" ")} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-white sm:text-[13px]">
                    {stat.title}
                  </p>
                  <p className="mt-0.5 text-[18px] font-bold leading-none text-slate-900 dark:text-white sm:text-[24px]">
                    {isStatsLoading ? "..." : stat.value}
                  </p>
                  <p className={["mt-0.5 truncate text-[10px] font-semibold sm:mt-1 sm:text-[12px]", trendColor].join(" ")}>
                    {stat.subText}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar - Updated for better mobile responsiveness ── */}
      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search - Using SearchField component */}
          <div className="w-full sm:w-[320px]">
            <SearchField
              type="text"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search suppliers by name or contact..."
              maxLength={50}
              className="w-full"
              classNames={{
                inputWrapper:
                  "h-11 rounded-lg border border-slate-200 bg-white px-3 shadow-sm " +
                  "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                  "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                input:
                  "text-[14px] text-slate-700 placeholder:text-[14px] placeholder:text-slate-400 dark:text-white dark:placeholder:text-white",
              }}
            />
          </div>

          {/* Status filter dropdown - Matching subscription style */}
          <div ref={statusDropdownRef} className="relative w-full sm:w-[190px]">
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsStatusOpen(false); }}
              aria-expanded={isStatusOpen}
              aria-label="Supplier status filter"
              className={[
                "flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white",
                "px-3 text-[13px] font-semibold text-slate-700 shadow-sm",
                "dark:border-[#273244] dark:bg-[#111726] dark:text-white",
                "outline-none transition",
                "hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-[#151e31]",
                "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
              ].join(" ")}
            >
              <span className="truncate text-left">{statusLabel(statusFilter)}</span>
              <FiChevronDown
                className={`ml-2 shrink-0 text-slate-500 transition-transform duration-200 dark:text-white ${isStatusOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isStatusOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 dark:border-[#273244] dark:bg-[#111726] dark:shadow-black/30">
                {statusOptions.map((option) => {
                  const isActive = statusFilter === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleStatusFilterChange(option.key)}
                      className={[
                        "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition",
                        isActive
                          ? "bg-teal-50 text-teal-700 dark:bg-[#173c36] dark:text-[#9be7dc]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-white dark:hover:bg-[#151c2d]",
                      ].join(" ")}
                    >
                      <span className="line-clamp-2">{option.label}</span>
                      {isActive && <FiCheck className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 overflow-visible rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-pulse text-slate-500 dark:text-white">Loading suppliers...</div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-20 text-slate-500 dark:text-white">
              No suppliers found
            </div>
          ) : (
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-slate-50/80 dark:bg-[#111726]">
                <tr className="border-b border-slate-100 dark:border-[#273244]">
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Supplier Name
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Contact Person
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Phone
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Email
                  </th>
                  <th className="w-[12%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Address
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    GST
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    PAN
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Credit Days
                  </th>
                  <th className="w-[10%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Created At
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Status
                  </th>
                  <th className="w-[8%] px-5 py-4 text-[13px] font-bold text-slate-500 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                {suppliers.map((supplier: Supplier) => {
                  const statusConfig = getStatusConfig(supplier.status);

                  return (
                    <tr key={supplier.id} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                          {supplier.supplierName}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.contactPerson}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.phone}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.email || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.address || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.gstNumber || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.panNumber || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {supplier.creditDays || 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[14px] font-semibold text-slate-700 dark:text-white">
                          {formatDate(supplier.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Chip
                          color={statusConfig.color}
                          variant="flat"
                          size="sm"
                        >
                          {statusConfig.label}
                        </Chip>
                      </td>
                      <td className="px-5 py-4">
                        <Tooltip content="Edit Supplier">
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => handleOpenEditModal(supplier)}
                            className="min-w-0 h-8 px-2"
                          >
                            <FiEdit2 />
                          </Button>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Bottom Controls ── */}
        <div className="border-t border-slate-100 px-4 py-3 dark:border-[#273244]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-center sm:justify-start">
              <span className="text-center text-[13px] font-medium text-slate-500 dark:text-white sm:text-left">
                Showing {suppliers.length > 0 ? ((pagination.pageNumber - 1) * paginationInfo.pageSize) + 1 : 0}-
                {Math.min(pagination.pageNumber * paginationInfo.pageSize, paginationInfo.totalRecords)} of {paginationInfo.totalRecords} suppliers
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
              <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 dark:text-white sm:justify-start">
                <span className="whitespace-nowrap">Rows per page:</span>

                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPageSizeOpen((prev) => !prev)}
                    className={[
                      "flex h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                      "bg-white px-3 text-[13px] font-semibold text-primary shadow-sm",
                      "dark:bg-[#111726] dark:text-white",
                      "outline-none transition",
                      "hover:border-primary/60 hover:bg-primary/5",
                      "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    ].join(" ")}
                  >
                    <span>{pagination.pageSize}</span>

                    <FiChevronDown
                      className={`text-primary transition-transform duration-200 ${
                        isPageSizeOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isPageSizeOpen && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
                      {pageSizeOptions.map((size) => {
                        const active = pagination.pageSize === size;

                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => handleRowsPerPageChange(size)}
                            className={[
                              "flex h-9 w-full items-center px-3 text-left text-[13px] transition",
                              active
                                ? "bg-primary text-white"
                                : "bg-white text-slate-700 hover:bg-primary/5 hover:text-primary dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31] dark:hover:text-white",
                            ].join(" ")}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {paginationInfo.totalPages > 1 && (
                <div className="flex justify-center lg:justify-end">
                  <Pagination
                    isCompact
                    showControls
                    total={paginationInfo.totalPages}
                    page={pagination.pageNumber}
                    onChange={handlePageChange}
                    radius="lg"
                    classNames={{
                      wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                      item: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      prev: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      next: "min-w-9 h-9 rounded-lg border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 dark:border-[#273244] dark:bg-[#111726] dark:text-white dark:hover:bg-[#151e31]",
                      cursor: "hidden",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upload Modal ── */}
      <Modal
        isOpen={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Upload Bulk Suppliers</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {!uploadResult.show ? (
                    <>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleSupplierFileSelect}
                          className="hidden"
                          id="supplier-bulk-upload-file"
                        />
                        <label
                          htmlFor="supplier-bulk-upload-file"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <FiUpload className="text-4xl text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {selectedSupplierFile ? selectedSupplierFile.name : "Click to select Excel/CSV file"}
                          </span>
                          <span className="text-xs text-gray-500">
                            Supported formats: .xlsx, .xls, .csv
                          </span>
                        </label>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          📌 Please ensure your file follows the supplier sample template format. Download the sample template to see the required columns.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Import Summary</h3>
                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {uploadResult.data?.totalInserted || 0}
                            </div>
                            <div className="text-sm text-gray-600">Inserted</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {uploadResult.data?.totalUpdated || 0}
                            </div>
                            <div className="text-sm text-gray-600">Updated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">
                              {uploadResult.data?.totalSkipped || 0}
                            </div>
                            <div className="text-sm text-gray-600">Skipped</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {uploadResult.data?.totalErrors || 0}
                            </div>
                            <div className="text-sm text-gray-600">Errors</div>
                          </div>
                        </div>

                        {uploadResult.data?.insertedSuppliers?.length ? (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-green-600">Inserted Suppliers:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.insertedSuppliers || []).slice(0, 5).map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {(uploadResult.data?.insertedSuppliers || []).length > 5 && (
                                <li>...and {(uploadResult.data?.insertedSuppliers || []).length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        ) : null}

                        {uploadResult.data?.updatedSuppliers?.length ? (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-600">Updated Suppliers:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.updatedSuppliers || []).slice(0, 10).map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {(uploadResult.data?.updatedSuppliers || []).length > 10 && (
                                <li>...and {(uploadResult.data?.updatedSuppliers || []).length - 10} more</li>
                              )}
                            </ul>
                          </div>
                        ) : null}

                        {uploadResult.data?.skippedSuppliers?.length ? (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-yellow-600">Skipped Suppliers:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.skippedSuppliers || []).slice(0, 10).map((name, idx) => (
                                <li key={idx}>{name}</li>
                              ))}
                              {(uploadResult.data?.skippedSuppliers || []).length > 10 && (
                                <li>...and {(uploadResult.data?.skippedSuppliers || []).length - 10} more</li>
                              )}
                            </ul>
                          </div>
                        ) : null}

                        {uploadResult.data?.errors?.length ? (
                          <div>
                            <p className="text-sm font-medium text-red-600">Errors:</p>
                            <ul className="text-sm text-red-500 list-disc list-inside max-h-40 overflow-y-auto">
                              {(uploadResult.data?.errors || []).map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                {!uploadResult.show ? (
                  <>
                    <Button variant="light" onPress={onClose}>
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      onPress={handleUploadBulkSuppliers}
                      isLoading={isImporting}
                      isDisabled={!selectedSupplierFile}
                    >
                      Upload
                    </Button>
                  </>
                ) : (
                  <Button
                    color="primary"
                    onPress={() => {
                      setUploadResult({ show: false });
                      setSelectedSupplierFile(null);
                      onClose();
                    }}
                  >
                    Close
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Supplier Form Modal ── */}
      <SupplierFormModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        initialData={selectedSupplier}
        onSubmit={handleFormSubmit}
        isLoading={isAddingSupplier || isUpdatingSupplier}
      />

      {/* ── Notification Modal ── */}
      <SubscriptionNotificationModal
        isOpen={isNotificationOpen}
        onOpenChange={onNotificationOpenChange}
        notifications={notifications}
        loading={notificationsLoading}
        onMarkAsRead={handleMarkAsRead}
        onClose={handleCloseNotificationModal}
      />
    </div>
  );
};

export default PharmacistSuppliers;
