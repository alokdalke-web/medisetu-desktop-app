import React, { useState, useEffect } from "react";
import { I18nProvider } from "@react-aria/i18n";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Autocomplete,
  AutocompleteItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  addToast,
  Spinner,
  DatePicker,
  SelectItem,
  Select,
  Card,
  CardBody,
} from "@heroui/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { FiPlus, FiTrash2, FiSearch, FiUser, FiPhone, FiMapPin, FiCalendar, FiClock, FiFileText, FiPackage, FiEdit2 } from "react-icons/fi";
import {
  useAddMedicineMutation,
  useGetAllMedicinesQuery,
} from "../../redux/api/pharmaciesApi";
import {
  AddMedicineRequest,
  Medicine,
  Subscription,
  SubscriptionMedicine,
} from "../../redux/api/pharmaciesApi";
import MedicineFormModal from "./MedicineFormModal";

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Subscription | null;
  isEditing?: boolean;
}

// Validation functions
const validateName = (name: string): string => {
  if (!name || name.trim() === "") {
    return "Customer name is required";
  }
  if (name.length > 50) {
    return "Name cannot exceed 50 characters";
  }
  return "";
};

const validateMobile = (mobile: string): string => {
  if (!mobile || mobile.trim() === "") {
    return "Mobile number is required";
  }
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return "Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9";
  }
  return "";
};

const validateAddress = (address: string): string => {
  if (!address || address.trim() === "") {
    return "Customer address is required";
  }
  if (address.length > 100) {
    return "Address cannot exceed 100 characters";
  }
  return "";
};

const validateFrequencyDays = (days: number): string => {
  if (!days || days < 1) {
    return "Frequency days must be at least 1";
  }
  if (days > 365) {
    return "Frequency days must be between 1 and 365";
  }
  return "";
};

const validateMedicines = (medicines: any[]): string => {
  if (!medicines || medicines.length === 0) {
    return "At least one medicine is required";
  }
  return "";
};

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerMobile: "",
    customerAddress: "",
    frequencyDays: 30,
    nextDeliveryDate: "",
    remarks: "",
    status: "active" as "active" | "paused" | "cancelled",
    medicines: [] as Array<{ pharmacyMedicineId: string; quantity: number; medicineName?: string }>,
  });

  // Error states
  const [errors, setErrors] = useState({
    customerName: "",
    customerMobile: "",
    customerAddress: "",
    frequencyDays: "",
    nextDeliveryDate: "",
    medicines: "",
  });

  const [medicineSearch, setMedicineSearch] = useState("");
  const [debouncedMedicineSearch, setDebouncedMedicineSearch] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [medicineQuantity, setMedicineQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldFetchMedicines, setShouldFetchMedicines] = useState(false);
  const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState("");
  const [addMedicine, { isLoading: isAddingMedicine }] =
    useAddMedicineMutation();

  // Debounce medicine search (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMedicineSearch(medicineSearch);
    }, 500);

    return () => clearInterval(timer);
  }, [medicineSearch]);

  // Fetch medicines only when modal is open and search is triggered
  const {
    data: medicinesData,
    isLoading: medicinesLoading,
    refetch: refetchMedicines,
  } = useGetAllMedicinesQuery(
    {
      pageNumber: 1,
      pageSize: 20,
      search: debouncedMedicineSearch || undefined,
      status: "active",
    },
    {
      skip: !shouldFetchMedicines || !isOpen,
    }
  );

  const medicines = medicinesData?.data || [];

  const openAddMedicineModal = () => {
    const trimmedName = medicineSearch.trim();
    if (!trimmedName) return;

    setNewMedicineName(trimmedName.toUpperCase());
    setIsMedicineModalOpen(true);
  };

  const handleCreateMedicine = async (data: AddMedicineRequest) => {
    try {
      const response = await addMedicine(data).unwrap();
      const responseMedicine = (response.data || response.result) as
        | Medicine
        | undefined;

      let createdMedicine =
        responseMedicine?.id && responseMedicine?.medicineName
          ? responseMedicine
          : undefined;

      if (!createdMedicine) {
        const refreshedResult = await refetchMedicines();
        createdMedicine = refreshedResult.data?.data?.find(
          (medicine) =>
            medicine.medicineName.trim().toLowerCase() ===
            data.medicineName.trim().toLowerCase()
        );
      }

      if (!createdMedicine) {
        throw new Error("Created medicine could not be loaded");
      }

      setSelectedMedicine(createdMedicine);
      setMedicineSearch(createdMedicine.medicineName);
      setDebouncedMedicineSearch(createdMedicine.medicineName);
      setIsMedicineModalOpen(false);

      addToast({
        title: "Success",
        description: "Medicine added and selected",
        color: "success",
      });
    } catch (error: any) {
      addToast({
        title: "Error",
        description:
          error?.data?.message ||
          error?.message ||
          "Failed to add medicine",
        color: "danger",
      });
      throw error;
    }
  };

  // Enable medicine fetching when modal opens
  useEffect(() => {
    if (isOpen) {
      setShouldFetchMedicines(true);
    } else {
      // Reset when modal closes
      setShouldFetchMedicines(false);
      setMedicineSearch("");
      setDebouncedMedicineSearch("");
      setSelectedMedicine(null);
    }
  }, [isOpen]);

  // Load initial data for editing
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        customerName: initialData.customerName || "",
        customerMobile: initialData.customerMobile || "",
        customerAddress: initialData.customerAddress || "",
        frequencyDays: initialData.frequencyDays || 30,
        nextDeliveryDate: initialData.nextDeliveryDate || "",
        remarks: initialData.remarks || "",
        status: initialData.status || "active",
        medicines: initialData.medicines?.map((m: SubscriptionMedicine) => ({
          pharmacyMedicineId: m.pharmacyMedicineId,
          quantity: m.quantity,
          medicineName: m.medicineName,
        })) || [],
      });
      
      // Clear errors when loading data
      setErrors({
        customerName: "",
        customerMobile: "",
        customerAddress: "",
        frequencyDays: "",
        nextDeliveryDate: "",
        medicines: "",
      });
    } else if (isOpen && !initialData) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 30);

        const utcDate = new Date(
            Date.UTC(
                defaultDate.getFullYear(),
                defaultDate.getMonth(),
                defaultDate.getDate(),
                0,
                0,
                0,
                0
            )
        );

        setFormData({
            customerName: "",
            customerMobile: "",
            customerAddress: "",
            frequencyDays: 30,
            nextDeliveryDate: utcDate.toISOString(),
            remarks: "",
            status: "active",
            medicines: [],
        });

        setErrors({
            customerName: "",
            customerMobile: "",
            customerAddress: "",
            frequencyDays: "",
            nextDeliveryDate: "",
            medicines: "",
        });

        setSelectedMedicine(null);
        setMedicineQuantity(1);
    }
  }, [initialData, isOpen]);

  // Real-time validation handlers
  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerName: value }));
    setErrors(prev => ({ ...prev, customerName: validateName(value) }));
  };

  const handleMobileChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, customerMobile: digitsOnly }));
    setErrors(prev => ({ ...prev, customerMobile: validateMobile(digitsOnly) }));
  };

  const handleAddressChange = (value: string) => {
    setFormData(prev => ({ ...prev, customerAddress: value }));
    setErrors(prev => ({ ...prev, customerAddress: validateAddress(value) }));
  };

  const handleFrequencyDaysChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, frequencyDays: numValue }));
    setErrors(prev => ({ ...prev, frequencyDays: validateFrequencyDays(numValue) }));
  };

  const handleDateChange = (date: CalendarDate | null) => {
    if (date) {
        const utcDate = new Date(
        Date.UTC(
            date.year,
            date.month - 1,
            date.day,
            0,
            0,
            0,
            0
        )
        );

        setFormData((prev) => ({
        ...prev,
        nextDeliveryDate: utcDate.toISOString(),
        }));

        setErrors((prev) => ({
        ...prev,
        nextDeliveryDate: "",
        }));
    } else {
        setFormData((prev) => ({
        ...prev,
        nextDeliveryDate: "",
        }));

        setErrors((prev) => ({
        ...prev,
        nextDeliveryDate: "Please select a delivery date",
        }));
    }
  };

  const handleAddMedicine = () => {
    if (!selectedMedicine) {
      addToast({
        title: "Error",
        description: "Please select a medicine",
        color: "danger",
      });
      return;
    }

    // Check if medicine already added
    if (formData.medicines.some(m => m.pharmacyMedicineId === selectedMedicine.id)) {
      addToast({
        title: "Warning",
        description: "Medicine already added to the subscription",
        color: "warning",
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          pharmacyMedicineId: selectedMedicine.id,
          quantity: medicineQuantity,
          medicineName: selectedMedicine.medicineName,
        },
      ],
    }));

    // Clear medicines error when adding
    setErrors(prev => ({ ...prev, medicines: "" }));

    // Reset selection
    setSelectedMedicine(null);
    setMedicineQuantity(1);
    setMedicineSearch("");
    setDebouncedMedicineSearch("");
  };

  const handleRemoveMedicine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
    
    // Validate medicines after removal
    const updatedMedicines = formData.medicines.filter((_, i) => i !== index);
    setErrors(prev => ({ ...prev, medicines: validateMedicines(updatedMedicines) }));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.map((m, i) =>
        i === index ? { ...m, quantity } : m
      ),
    }));
  };

  const handleSubmit = async () => {
    // Validate all fields
    const nameError = validateName(formData.customerName);
    const mobileError = validateMobile(formData.customerMobile);
    const addressError = validateAddress(formData.customerAddress);
    const frequencyError = validateFrequencyDays(formData.frequencyDays);
    const medicinesError = validateMedicines(formData.medicines);
    
    setErrors({
      customerName: nameError,
      customerMobile: mobileError,
      customerAddress: addressError,
      frequencyDays: frequencyError,
      nextDeliveryDate: formData.nextDeliveryDate ? "" : "Please select a delivery date",
      medicines: medicinesError,
    });

    // Check if there are any errors
    if (nameError || mobileError || addressError || frequencyError || !formData.nextDeliveryDate || medicinesError) {
      addToast({
        title: "Error",
        description: "Please fix all validation errors",
        color: "danger",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        nextDeliveryDate: formData.nextDeliveryDate,
        status: formData.status,
      });
      onOpenChange(false);
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to save subscription",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total medicines count
  const totalMedicines = formData.medicines.reduce((sum, m) => sum + m.quantity, 0);

  // Get current date for DatePicker
  const todayDate = today(getLocalTimeZone());

  // Convert ISO date to CalendarDate
  const getCalendarDate = (isoDate: string) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      isDismissable={false}
      scrollBehavior="inside"
      hideCloseButton={true}
      classNames={{
        base: "max-w-4xl",
        header: "border-b border-slate-200 dark:border-slate-700 pb-4",
        footer: "border-t border-slate-200 dark:border-slate-700 pt-4",
        body: "py-6",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="p-0">
              <div className="relative w-full px-6 pt-6 pb-5">
                {/* Custom close button */}
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
                    {isEditing ? (
                      <FiEdit2 className="text-white text-xl" />
                    ) : (
                      <FiPlus className="text-white text-xl" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl leading-tight font-semibold text-slate-900">
                      {isEditing
                        ? "Edit Subscription"
                        : "Create New Subscription"}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {isEditing
                        ? "Update subscription details and manage medicines"
                        : "Add a new subscription for a customer"}
                    </p>
                  </div>
                </div>
              </div>
            </ModalHeader>
            
            <ModalBody>
              <div className="space-y-6">
                {/* Customer Details Section */}
                <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardBody className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                        <FiUser className="text-primary-600 text-lg" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Customer Details
                      </h3>
                      <span className="text-xs text-red-500 ml-1">*</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Customer Name <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                            errors.customerName
                              ? "border-red-400"
                              : "border-slate-200 focus-within:border-[#1a6b6b]"
                          }`}
                        >
                          <FiUser className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <input
                            autoFocus
                            className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                            placeholder="Enter customer name"
                            value={formData.customerName}
                            onChange={(e) => handleNameChange(e.target.value)}
                          />
                        </div>
                        {errors.customerName && (
                          <p className="text-xs text-red-500">{errors.customerName}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          {formData.customerName.length}/50 characters
                        </p>
                      </div>

                      {/* Customer Mobile */}
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Customer Mobile <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                            errors.customerMobile
                              ? "border-red-400"
                              : "border-slate-200 focus-within:border-[#1a6b6b]"
                          }`}
                        >
                          <FiPhone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <input
                            className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                            placeholder="Enter mobile number"
                            value={formData.customerMobile}
                            onChange={(e) => handleMobileChange(e.target.value)}
                            maxLength={10}
                            type="tel"
                          />
                        </div>
                        {errors.customerMobile && (
                          <p className="text-xs text-red-500">{errors.customerMobile}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          Enter 10-digit mobile number
                        </p>
                      </div>
                    </div>

                    {/* Customer Address */}
                    <div className="mt-4 flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">
                        Customer Address <span className="text-red-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                          errors.customerAddress
                            ? "border-red-400"
                            : "border-slate-200 focus-within:border-[#1a6b6b]"
                        }`}
                      >
                        <FiMapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                          placeholder="Enter complete address"
                          value={formData.customerAddress}
                          onChange={(e) => handleAddressChange(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      {errors.customerAddress && (
                        <p className="text-xs text-red-500">{errors.customerAddress}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {formData.customerAddress.length}/100 characters
                      </p>
                    </div>
                  </CardBody>
                </Card>

                {/* Subscription Details Section */}
                <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardBody className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <FiClock className="text-purple-600 text-lg" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Subscription Details
                      </h3>
                      <span className="text-xs text-red-500 ml-1">*</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Frequency Days */}
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Frequency Days <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white transition-colors ${
                            errors.frequencyDays
                              ? "border-red-400"
                              : "border-slate-200 focus-within:border-[#1a6b6b]"
                          }`}
                        >
                          <FiCalendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <input
                            className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                            placeholder="e.g., 30"
                            type="number"
                            min={1}
                            max={365}
                            value={formData.frequencyDays.toString()}
                            onChange={(e) => handleFrequencyDaysChange(e.target.value)}
                          />
                        </div>
                        {errors.frequencyDays && (
                          <p className="text-xs text-red-500">{errors.frequencyDays}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          Between 1-365 days
                        </p>
                      </div>

                      {/* Next Delivery Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Next Delivery Date <span className="text-red-500">*</span>
                        </label>
                        <I18nProvider locale="en-IN">
                          <DatePicker
                            value={formData.nextDeliveryDate ? getCalendarDate(formData.nextDeliveryDate) : null}
                            onChange={handleDateChange}
                            minValue={todayDate}
                            granularity="day"
                            className="w-full"
                            classNames={{
                              base: "w-full",
                              selectorButton: "text-slate-400",
                              input: "text-sm",
                            }}
                          />
                        </I18nProvider>
                        {errors.nextDeliveryDate && (
                          <p className="text-xs text-red-500">{errors.nextDeliveryDate}</p>
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="mt-4 flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">
                        Remarks
                      </label>
                      <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-white transition-colors focus-within:border-[#1a6b6b]">
                        <FiFileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <input
                          className="flex-1 text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
                          placeholder="Any additional notes or special instructions"
                          value={formData.remarks}
                          onChange={(e) =>
                            setFormData(prev => ({ ...prev, remarks: e.target.value }))
                          }
                          maxLength={255}
                        />
                      </div>
                    </div>

                    {/* Status (Edit mode only) */}
                    {isEditing && (
                      <div className="mt-4 flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <Select
                          placeholder="Select status"
                          selectedKeys={[formData.status]}
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys as Iterable<React.Key>)[0];
                            setFormData(prev => ({ ...prev, status: selectedKey as "active" | "paused" | "cancelled" }));
                          }}
                          className="w-full"
                          classNames={{
                            trigger: "border rounded-xl px-3 py-2.5 bg-white border-slate-200",
                            value: "text-sm",
                          }}
                        >
                          <SelectItem key="active" textValue="Active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-success-500" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem key="paused" textValue="Paused">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-warning-500" />
                              Paused
                            </div>
                          </SelectItem>
                          <SelectItem key="cancelled" textValue="Cancelled">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-danger-500" />
                              Cancelled
                            </div>
                          </SelectItem>
                        </Select>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Medicines Section */}
                <Card className="border border-slate-200 dark:border-slate-700 shadow-sm">
                  <CardBody className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                        <FiPackage className="text-emerald-600 text-lg" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        Medicines
                      </h3>
                      <span className="text-xs text-red-500 ml-1">*</span>
                      {formData.medicines.length > 0 && (
                        <Chip size="sm" color="primary" variant="flat">
                          {formData.medicines.length} items
                        </Chip>
                      )}
                    </div>
                    
                    {errors.medicines && (
                      <div className="text-red-500 text-sm mb-3 flex items-center gap-2">
                        <span>⚠️</span> {errors.medicines}
                      </div>
                    )}
                    
                    {/* Add Medicine */}
                    <div className="flex flex-col md:flex-row gap-3 mb-4">
                      <div className="flex-1">
                        <Autocomplete
                          placeholder="Search medicine by name..."
                          inputValue={medicineSearch}
                          onInputChange={(value) => {
                            setMedicineSearch(value);
                            if (selectedMedicine && value !== selectedMedicine.medicineName) {
                              setSelectedMedicine(null);
                            }

                            if (value.length > 0 && isOpen) {
                              setShouldFetchMedicines(true);
                            }
                          }}
                          selectedKey={selectedMedicine?.id}
                          onSelectionChange={(key) => {
                            if (key === "add-new-medicine") {
                              openAddMedicineModal();
                              return;
                            }

                            if (!key) {
                              setSelectedMedicine(null);
                              return;
                            }

                            const medicine = medicines.find(
                              (m) => String(m.id) === String(key)
                            );

                            if (medicine) {
                              setSelectedMedicine(medicine);
                              setMedicineSearch(medicine.medicineName);
                            }
                          }}
                          isLoading={medicinesLoading}
                          isClearable
                          startContent={<FiSearch className="text-slate-400 text-sm" />}
                          onOpenChange={(isAutocompleteOpen) => {
                            if (isAutocompleteOpen && isOpen) {
                              setShouldFetchMedicines(true);
                            }
                          }}
                          classNames={{
                            base: "w-full",
                            selectorButton: "text-slate-400",
                          }}
                        >
                          {medicinesLoading ? (
                            <AutocompleteItem key="loading" textValue="Loading..." isReadOnly>
                              <div className="flex items-center gap-2">
                                <Spinner size="sm" />
                                <span>Loading medicines...</span>
                              </div>
                            </AutocompleteItem>
                          ) : medicines.length === 0 && debouncedMedicineSearch ? (
                            <AutocompleteItem
                              key="add-new-medicine"
                              textValue={`${debouncedMedicineSearch}`}
                            >
                              <div className="flex items-center justify-between gap-3 py-1">
                                <span className="text-sm text-slate-500">
                                  No results found
                                </span>
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="flat"
                                  startContent={<FiPlus />}
                                  onPress={openAddMedicineModal}
                                  className="shrink-0 font-medium"
                                >
                                  Add medicine
                                </Button>
                              </div>
                            </AutocompleteItem>
                          ) : (
                            medicines.map((medicine: any) => (
                              <AutocompleteItem key={medicine.id} textValue={medicine.medicineName}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{medicine.medicineName}</span>
                                  <span className="text-xs text-default-500">
                                    {medicine.category || "No category"} • Stock: {medicine.availableQuantity || 0}
                                  </span>
                                </div>
                              </AutocompleteItem>
                            ))
                          )}
                        </Autocomplete>
                      </div>
                      <div className="w-full md:w-32">
                        <div className="flex h-10 items-center border border-slate-200 rounded-xl px-3 bg-white transition-colors focus-within:border-[#1a6b6b]">
                            <input
                              type="number"
                              placeholder="Qty"
                              min={1}
                              aria-label="Medicine quantity"
                              className="h-full w-full min-w-0 text-sm leading-none outline-none bg-transparent text-slate-800 placeholder-slate-400 text-center"
                              value={medicineQuantity.toString()}
                              onChange={(e) =>
                                setMedicineQuantity(Math.max(1, parseInt(e.target.value) || 1))
                              }
                            />
                        </div>
                      </div>
                      <Button
                        color="primary"
                        startContent={<FiPlus />}
                        onPress={handleAddMedicine}
                        className="h-10 px-6 font-medium bg-[#1a6b6b] hover:bg-[#155555]"
                      >
                        Add
                      </Button>
                    </div>

                    {/* Medicines List */}
                    {formData.medicines.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <Table 
                          removeWrapper
                          classNames={{
                            table: "min-w-full",
                            th: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold text-sm",
                            td: "py-3",
                          }}
                        >
                          <TableHeader>
                            <TableColumn>Medicine Name</TableColumn>
                            <TableColumn>Quantity</TableColumn>
                            <TableColumn width={80}>Action</TableColumn>
                          </TableHeader>
                          <TableBody>
                            {formData.medicines.map((medicine, index) => (
                              <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <TableCell className="font-medium text-slate-900 dark:text-white">
                                  {medicine.medicineName || "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex h-9 w-24 items-center border border-slate-200 rounded-xl px-3 bg-white transition-colors focus-within:border-[#1a6b6b]">
                                    <input
                                      type="number"
                                      min={1}
                                      aria-label={`Quantity for ${medicine.medicineName || "medicine"}`}
                                      className="h-full w-full min-w-0 text-sm leading-none outline-none bg-transparent text-slate-800 placeholder-slate-400 text-center"
                                      value={medicine.quantity.toString()}
                                      onChange={(e) =>
                                        handleQuantityChange(index, parseInt(e.target.value) || 1)
                                      }
                                    />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    isIconOnly
                                    color="danger"
                                    variant="light"
                                    size="sm"
                                    onPress={() => handleRemoveMedicine(index)}
                                    className="hover:bg-danger-50"
                                  >
                                    <FiTrash2 className="text-lg" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/30 flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Total Items: <span className="font-semibold text-slate-900 dark:text-white">{formData.medicines.length}</span>
                          </span>
                          <Chip color="primary" variant="flat" size="sm" className="font-medium">
                            Total Quantity: {totalMedicines}
                          </Chip>
                        </div>
                      </div>
                    ) : (
                      <div className={`text-center py-8 border-2 border-dashed rounded-lg transition-colors ${
                        errors.medicines 
                          ? 'border-danger-300 bg-danger-50 dark:bg-danger-900/10' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}>
                        {errors.medicines ? (
                          <div className="flex flex-col items-center gap-2 text-danger-500">
                            <span className="text-2xl">⚠️</span>
                            <span className="font-medium">{errors.medicines}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                            <FiPackage className="text-3xl text-slate-300 dark:text-slate-600" />
                            <span>No medicines added yet</span>
                            <span className="text-sm">Search and add medicines above</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button 
                variant="light" 
                onPress={onClose}
                className="font-medium"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={isSubmitting}
                className="font-medium px-6 bg-[#1a6b6b] hover:bg-[#155555]"
              >
                {isEditing ? "Update Subscription" : "Create Subscription"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>

    <MedicineFormModal
      isOpen={isMedicineModalOpen}
      onOpenChange={setIsMedicineModalOpen}
      initialData={{
        medicineName: newMedicineName,
        status: "active",
        tags: ["On-Demand"],
      }}
      onSubmit={(data) => handleCreateMedicine(data as AddMedicineRequest)}
      isLoading={isAddingMedicine}
      title="Add On-Demand Medicine"
      submitLabel="Add"
    />
    </>
  );
};

export default SubscriptionModal;
