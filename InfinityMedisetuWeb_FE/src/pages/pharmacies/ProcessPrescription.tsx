import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { FiArrowLeft, FiEye, FiSave, FiSearch, FiTrash2, FiPlus, FiMinus, FiClock } from "react-icons/fi";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Select,
  SelectItem,
  Spinner,
  addToast,
  Divider,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
} from "@heroui/react";

import {
  useGetAvailableStockQuery,
  useCreateSaleMutation,
  useGetPrescriptionByIdQuery,
  useUpdatePrescriptionStatusMutation,
  useCheckMedicinesMutation,
  useAddMedicineMutation,
  type PaymentMethod,
  type PrescriptionStatus,
  type AddMedicineRequest,
} from "../../redux/api/pharmaciesApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import MedicineFormModal from "./MedicineFormModal";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const parseNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Helper function to check if medicine has Fullstrip tag
const isFullstripMedicine = (tags: string[] = []) => {
  return tags.includes("Fullstrip");
};

type BatchItem = {
  id: string;
  batch: string | null;
  expiry: string;
  quantity: number;
  mrp: number;
  cost: number;
  gstPercentage: number;
};

type MedicineItem = {
  id: string;
  medicineName: string;
  brandName: string;
  composition: string;
  category: string | null;
  form: string | null;
  shelf: string | null;
  availableQuantity: number;
  medicineAvailable: BatchItem[];
  tags?: string[];
  packOf: number | null;
};

type SaleCartItem = {
  rowId: string;
  medicineId: string;
  medicineName: string;
  brandName: string;
  composition: string;
  category: string | null;
  form: string | null;
  shelf: string | null;
  selectedBatchId: string;
  quantity: number;
  discountPercent: number;
  medicineAvailable: BatchItem[];
  tags?: string[];
  packOf: number | null;
  // New fields for days tracking
  prescribedDays?: number;
  currentDays?: number;
  frequency?: string | null;
  duration?: string | null;
  prescribedForm?: string | null;
  prescriptionMedicineName?: string;
};

type PrescriptionMedicine = {
  medicineName: string;
  prescribedForm?: string | null;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  isAvailable?: boolean;
  exists?: boolean;
  stockMedicine?: MedicineItem & {
    defaultBatchId: string;
  };
  // New field for tracking days in prescription card
  currentDays?: number;
};

const paymentMethods: Array<{
  key: PaymentMethod;
  label: string;
}> = [
  { key: "Cash", label: "Cash" },
  { key: "UPI", label: "UPI" },
  { key: "NetBanking", label: "NetBanking" },
];

const sanitizeName = (value: string) =>
  value.replace(/[^A-Za-z ]/g, "").slice(0, 50);

const getPatientNameError = (value: string) => {
  const name = value.trim();

  if (!name) return "Patient name is required";
  if (name.length < 3) return "Patient name must be at least 3 characters";
  if (name.length > 50) return "Patient name must not exceed 50 characters";
  if (!/^[A-Za-z ]+$/.test(name)) {
    return "Patient name can only contain alphabets and spaces";
  }

  return "";
};

const ProcessPrescription: React.FC = () => {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpeciality, setDoctorSpeciality] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [prescriptionMedicines, setPrescriptionMedicines] = useState<PrescriptionMedicine[]>([]);
  const [status, setStatus] = useState<PrescriptionStatus | "">("");

  const [patientNameError, setPatientNameError] = useState("");
  const [paymentMethodError, setPaymentMethodError] = useState("");

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 25,
  });

  const [stockRows, setStockRows] = useState<MedicineItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SaleCartItem[]>([]);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [autoAdded, setAutoAdded] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // New states for medicine check and add
  const [checkMedicines] = useCheckMedicinesMutation();
  const [addMedicine] = useAddMedicineMutation();
  const [isCheckingMedicines, setIsCheckingMedicines] = useState(false);
  const [_missingMedicines, setMissingMedicines] = useState<string[]>([]);
  const [selectedMissingMedicine, setSelectedMissingMedicine] = useState<string | null>(null);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  // Flag to prevent infinite loop
  const [hasCheckedMedicines, setHasCheckedMedicines] = useState(false);

  // Quantity timeout ref for debouncing
  const quantityTimeoutRef = useRef<Record<string, number>>({});

  const handleOpenPaymentModal = () => {
    let hasError = false;

    const nameError = getPatientNameError(patientName);
    if (nameError) {
      setPatientNameError(nameError);
      hasError = true;
    }

    if (patientMobile && !isValidPhone(patientMobile)) {
      setPatientMobileError("Please enter a valid mobile number");
      hasError = true;
    }

    if (selectedItems.length === 0) {
      addToast({
        title: "Add at least one medicine",
        color: "danger",
      });
      hasError = true;
    }

    if (hasError) return;

    setShowPaymentModal(true);
  };

  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;

  const isNoLossEnabled = String(user?.pharmacyDetails?.noLoss ?? "false") === "true";

  const { data: prescriptionResponse, isLoading: isPrescriptionLoading, isError: isPrescriptionError } =
    useGetPrescriptionByIdQuery(
      { id: prescriptionId || "" },
      {
        skip: !prescriptionId,
        refetchOnMountOrArgChange: true,
      }
    );

  const shouldSearch = !!debouncedSearch.trim();

  const { data, isFetching } = useGetAvailableStockQuery(
    {
      pageNumber: pagination.pageNumber,
      pageSize: pagination.pageSize,
      search: debouncedSearch?.trim() || undefined,
    },
    {
      skip: !shouldSearch,
      refetchOnMountOrArgChange: true,
    }
  );

  const [createSale, { isLoading: isCreating }] = useCreateSaleMutation();
  const [updatePrescriptionStatus] = useUpdatePrescriptionStatusMutation();
  const [isPrescriptionLoaded, setIsPrescriptionLoaded] = useState(false);

  const [_cPressCount, setCPressCount] = useState(0);
  const [showShortcutAnimation, setShowShortcutAnimation] = useState(true);

  const normalizePhone = (v: string) => v.replace(/\D/g, "").slice(0, 10);
  const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);
  const [patientMobileError, setPatientMobileError] = useState("");

  const [hoveredMedicine, setHoveredMedicine] = useState<PrescriptionMedicine | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const getInitialDiscount = (mrp: number, cost: number) => {
    if (mrp <= 0) return 0;
    const noLossDiscount = Math.max(0, ((mrp - cost) / mrp) * 100);
    return Math.min(10, noLossDiscount);
  };

  // Extract days from duration string
  const extractDaysFromDuration = (duration?: string | null): number => {
    if (!duration) return 1;
    
    const durationLower = duration.toLowerCase().trim();
    const dayMatch = durationLower.match(/(\d+)\s*day/);
    
    if (dayMatch) {
      return Number(dayMatch[1]);
    }
    
    const weeklyMatch = durationLower.match(/weekly\s*for\s*(\d+)\s*week/);
    if (weeklyMatch) {
      const weeks = Number(weeklyMatch[1]);
      return weeks * 7; // Convert weeks to days
    }
    
    return 1;
  };

  // Calculate quantity based on frequency and days
  const calculateQuantityFromDays = (
    frequency?: string | null, 
    days?: number, 
    isWeekly?: boolean,
    packOf?: number | null,
    isFullstrip?: boolean
  ): number => {
    if (!frequency || !days || days <= 0) return 1;

    const dosesPerPeriod = frequency
      .split("-")
      .map((x) => Number(x) || 0)
      .reduce((sum, val) => sum + val, 0);

    if (dosesPerPeriod <= 0) return 1;

    let quantity;
    if (isWeekly) {
      // For weekly: convert days to weeks and multiply by doses per week
      const weeks = Math.ceil(days / 7);
      quantity = dosesPerPeriod * weeks;
    } else {
      // For daily: days * doses per day
      quantity = dosesPerPeriod * days;
    }
    
    // Apply Fullstrip constraint if needed
    if (isFullstrip && packOf && packOf > 0) {
      quantity = Math.ceil(quantity / packOf) * packOf;
    }
    
    return quantity;
  };

  const matchesPrescriptionMedicine = (
    item: SaleCartItem,
    medicineName: string
  ) => {
    const prescribedName = item.prescriptionMedicineName || item.medicineName;
    return prescribedName.toLowerCase() === medicineName.toLowerCase();
  };

  // Search debounce
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPagination((prev) => ({
        ...prev,
        pageNumber: 1,
      }));
      setShowSearchResults(true);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchValue]);

  // Handle stock data
  useEffect(() => {
    if (!shouldSearch || !data) return;

    const nextRows = (data?.data || []).map((item: any) => ({
      id: item.id || item.medicineId || item.stockId,
      medicineName: item.medicineName,
      brandName: item.brandName,
      composition: item.composition,
      category: item.category,
      form: item.form,
      shelf: item.shelf,
      availableQuantity: item.availableQuantity,
      medicineAvailable: item.medicineAvailable || item.batches || [],
      tags: item.tags || [],
      packOf: item.packOf ?? null,
    })) as MedicineItem[];

    setStockRows((prev) =>
      pagination.pageNumber === 1 ? nextRows : [...prev, ...nextRows]
    );

    const currentPage = data?.pagination?.currentPage ?? 1;
    const totalPages = data?.pagination?.totalPages ?? 1;

    setHasMore(currentPage < totalPages);
  }, [data, pagination.pageNumber, shouldSearch]);

  // Clear search results when search is cleared
  useEffect(() => {
    if (!searchValue.trim()) {
      setStockRows([]);
      setDebouncedSearch("");
      setShowSearchResults(false);
    }
  }, [searchValue]);

  // Load prescription data
  useEffect(() => {
    if (!prescriptionResponse?.data) return;

    const prescription = prescriptionResponse.data;

    setPatientName(prescription.patient.name || "");
    setPatientMobile(prescription.patient.mobile || "");
    setDoctorName(prescription.doctor.name || "");
    setDoctorSpeciality(prescription.doctor.speciality || "");
    
    // Initialize prescription medicines with currentDays
    const meds = (prescription.medicines || []).map((med: PrescriptionMedicine) => {
      const prescribedDays = extractDaysFromDuration(med.duration);
      return {
        ...med,
        currentDays: prescribedDays,
      };
    });
    
    setPrescriptionMedicines(meds);
    setStatus(prescription.status);
    setIsPrescriptionLoaded(true);
    // Reset the check flag when new prescription loads
    setHasCheckedMedicines(false);
  }, [prescriptionResponse]);

  // Check medicines when prescription loads - ONLY ONCE
  useEffect(() => {
    // Skip if no medicines, already checking, or already checked
    if (!prescriptionMedicines.length || isCheckingMedicines || hasCheckedMedicines) {
      return;
    }

    const checkMedicineAvailability = async () => {
      setIsCheckingMedicines(true);
      
      try {
        const medicineNames = prescriptionMedicines.map(med => med.medicineName);
        const response = await checkMedicines({ medicineNames }).unwrap();
        
        // Update prescription medicines with availability info
        const updatedMedicines = prescriptionMedicines.map(med => {
          const checkResult = response.data.find(
            item => item.medicineName.toLowerCase() === med.medicineName.toLowerCase()
          );

          return {
            ...med,

            // inventory existence
            exists: checkResult?.exists ?? false,

            // keep original stock availability from prescription API
            isAvailable: med.isAvailable,
          };
        });
        
        setPrescriptionMedicines(updatedMedicines);
        
        // Track missing medicines
        const missing = response.data
          .filter(item => !item.exists)
          .map(item => item.medicineName);
        
        setMissingMedicines(missing);
      } catch (error: any) {
        addToast({
          title: "Error checking medicines",
          description: error?.data?.message || "Failed to verify medicine availability",
          color: "danger",
        });
      } finally {
        setIsCheckingMedicines(false);
        setHasCheckedMedicines(true);
      }
    };

    checkMedicineAvailability();
  }, [prescriptionMedicines, checkMedicines, isCheckingMedicines, hasCheckedMedicines]);

  // Handle adding a missing medicine
  const handleAddMissingMedicine = async (data: AddMedicineRequest) => {
    setIsAddingMedicine(true);
    
    try {
      await addMedicine(data).unwrap();
      
      addToast({
        title: "Success",
        description: "Medicine added successfully",
        color: "success",
      });
      
      // Now refresh the availability check
      await refreshMedicineAvailability();
      
      setIsAddMedicineModalOpen(false);
    } catch (error: any) {
      console.error("Failed to add medicine:", error);
      addToast({
        title: "Error adding medicine",
        description: error?.data?.message || "Failed to add medicine",
        color: "danger",
      });
      throw error;
    } finally {
      setIsAddingMedicine(false);
    }
  };

  // Refresh medicine availability after adding
  const refreshMedicineAvailability = async () => {
    try {
      setHasCheckedMedicines(false);
      
      const medicineNames = prescriptionMedicines.map(med => med.medicineName);
      const response = await checkMedicines({ medicineNames }).unwrap();
      
      const updatedMedicines = prescriptionMedicines.map(med => {
        const checkResult = response.data.find(
          item => item.medicineName.toLowerCase() === med.medicineName.toLowerCase()
        );

        return {
          ...med,

          exists: checkResult?.exists ?? false,

          // keep stock status
          isAvailable: med.isAvailable,
        };
      });
      
      setPrescriptionMedicines(updatedMedicines);
      
      const missing = response.data
        .filter(item => !item.exists)
        .map(item => item.medicineName);
      
      setMissingMedicines(missing);
      
      if (missing.length === 0) {
        addToast({
          title: "All medicines are now available!",
          color: "success",
        });
      }
      
      setHasCheckedMedicines(true);
    } catch (error) {
      console.error("Failed to refresh medicine check:", error);
      setHasCheckedMedicines(true);
    }
  };

  // Handle opening the modal with the missing medicine name
  const handleOpenAddMedicineModal = (medicineName: string) => {
    setSelectedMissingMedicine(medicineName.toUpperCase());
    setIsAddMedicineModalOpen(true);
  };

  // Update auto-add selected items when prescription medicines change
  useEffect(() => {
    if (!prescriptionMedicines.length) return;
    if (autoAdded) return;

    const autoItems = prescriptionMedicines
      .filter(
        (med) =>
          med.isAvailable &&
          med.stockMedicine &&
          med.stockMedicine.medicineAvailable?.length
      )
      .map((med) => {
        const stockMed = med.stockMedicine!;
        const isFullstrip = isFullstripMedicine(stockMed.tags || []);
        
        // Filter batches based on Fullstrip constraints
        let availableBatches = stockMed.medicineAvailable;
        
        if (isFullstrip && stockMed.packOf) {
          availableBatches = availableBatches.filter(
            (batch) => parseNumber(batch.quantity) >= stockMed.packOf!
          );
        }
        
        // Find the default batch or the first available batch
        let batch = availableBatches.find(
          (b) => b.id === stockMed.defaultBatchId
        );
        
        if (!batch && availableBatches.length > 0) {
          batch = availableBatches[0];
        }
        
        if (!batch) return null;

        const availableQty = Number(batch.quantity || 0);
        const isTabletOrCapsule = ["tablet", "capsule"].includes(
          (med.prescribedForm || "").trim().toLowerCase()
        );

        // Check if weekly prescription
        const durationLower = (med.duration || "").toLowerCase().trim();
        const isWeekly = durationLower.includes('week');
        
        // Calculate required quantity
        let requiredQty = isTabletOrCapsule
          ? calculateQuantityFromDays(
              med.frequency,
              extractDaysFromDuration(med.duration),
              isWeekly,
              stockMed.packOf,
              isFullstrip
            )
          : 1;
        
        // Ensure we don't exceed available quantity
        if (requiredQty > availableQty) {
          if (isFullstrip && stockMed.packOf) {
            // For Fullstrip, use max multiple within available
            const maxMultiple = Math.floor(availableQty / stockMed.packOf) * stockMed.packOf;
            if (maxMultiple >= stockMed.packOf) {
              requiredQty = maxMultiple;
            } else {
              return null;
            }
          } else {
            requiredQty = availableQty;
          }
        }

        // Calculate prescribed days
        const prescribedDays = extractDaysFromDuration(med.duration);
        
        return {
          rowId: `${stockMed.id}-${Date.now()}-${Math.random()}`,
          medicineId: stockMed.id,
          medicineName: stockMed.medicineName,
          brandName: stockMed.brandName,
          composition: stockMed.composition,
          category: stockMed.category,
          form: stockMed.form,
          shelf: stockMed.shelf,
          selectedBatchId: batch.id,
          quantity: Math.min(requiredQty, availableQty),
          discountPercent: Number(
            getInitialDiscount(
              parseNumber(batch?.mrp),
              parseNumber(batch?.cost)
            ).toFixed(2)
          ),
          medicineAvailable: stockMed.medicineAvailable,
          tags: stockMed.tags || [],
          packOf: stockMed.packOf,
          prescribedDays: prescribedDays,
          currentDays: med.currentDays || prescribedDays,
          frequency: med.frequency,
          duration: med.duration,
          prescribedForm: med.prescribedForm,
          prescriptionMedicineName: med.medicineName,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (autoItems.length) {
      setSelectedItems(autoItems);
      setAutoAdded(true);
    }
  }, [prescriptionMedicines, autoAdded]);

  // Update status to ON_HOLD
  useEffect(() => {
    const updateToOnHold = async () => {
      if (!isPrescriptionLoaded) return;
      
      if (!prescriptionId || status !== "PENDING") {
        return;
      }
      
      setStatusUpdating(true);
      
      try {
        await updatePrescriptionStatus({
          id: prescriptionId,
          body: { status: "ON_HOLD" },
        }).unwrap();
        setStatus("ON_HOLD");
        addToast({
          title: "Prescription on hold",
          description: "Prescription status set to On Hold.",
          color: "success",
        });
      } catch (error: any) {
        addToast({
          title: "Unable to update status",
          description: error?.data?.message || "Failed to set prescription status to On Hold.",
          color: "danger",
        });
      } finally {
        setStatusUpdating(false);
      }
    };

    updateToOnHold();
  }, [prescriptionId, status, updatePrescriptionStatus, isPrescriptionLoaded]);

  // Shortcut animation timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowShortcutAnimation(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Triple click handler for completing bill
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === "c") {
        setCPressCount((prev) => {
          const next = prev + 1;

          if (next === 1) {
            timer = setTimeout(() => {
              setCPressCount(0);
            }, 1000);
          }

          if (next >= 3) {
            if (isSubmittingRef.current || isCreating) {
              return 0;
            }
            setCPressCount(0);
            handleOpenPaymentModal();
            return 0;
          }

          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [selectedItems, patientName, paymentMethod]);

  const handleAddMedicine = (medicine: MedicineItem) => {
    const isFullstrip = isFullstripMedicine(medicine.tags || []);
    
    // Filter batches based on packOf constraint for Fullstrip medicines
    let availableBatches = medicine.medicineAvailable.filter(
      (batch) => parseNumber(batch.quantity) > 0
    );

    if (isFullstrip && medicine.packOf) {
      // For Fullstrip medicines, only show batches with quantity >= packOf
      availableBatches = availableBatches.filter(
        (batch) => parseNumber(batch.quantity) >= medicine.packOf!
      );
    }

    if (!availableBatches.length) {
      addToast({
        title: isFullstrip 
          ? `No batch available with minimum ${medicine.packOf} units` 
          : "No batch available",
        color: "danger",
      });
      return;
    }

    const alreadySelectedBatchIds = selectedItems
      .filter((item) => item.medicineId === medicine.id)
      .map((item) => item.selectedBatchId);

    const nextBatch = availableBatches.find(
      (batch) => !alreadySelectedBatchIds.includes(batch.id)
    );

    if (!nextBatch) {
      addToast({
        title: "All available batches already added",
        color: "warning",
      });
      return;
    }

    // Calculate initial quantity based on packOf for Fullstrip
    let initialQuantity = 1;
    if (isFullstrip && medicine.packOf) {
      initialQuantity = medicine.packOf;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        rowId: `${medicine.id}-${nextBatch.id}-${Date.now()}`,
        medicineId: medicine.id,
        medicineName: medicine.medicineName,
        brandName: medicine.brandName,
        composition: medicine.composition,
        category: medicine.category,
        form: medicine.form,
        shelf: medicine.shelf,
        selectedBatchId: nextBatch.id,
        quantity: initialQuantity,
        discountPercent: Number(
          getInitialDiscount(
            parseNumber(nextBatch.mrp),
            parseNumber(nextBatch.cost)
          ).toFixed(2)
        ),
        medicineAvailable: medicine.medicineAvailable,
        tags: medicine.tags || [],
        packOf: medicine.packOf ?? null,
        // No prescription info for manually added medicines
        prescribedDays: undefined,
        currentDays: undefined,
        frequency: undefined,
        duration: undefined,
        prescribedForm: undefined,
      },
    ]);
    
    setSearchValue("");
    setShowSearchResults(false);
  };

  const handleRemoveItem = (rowId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  const handleBatchChange = (rowId: string, batchId: string) => {
    if (!batchId) return;
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const selectedBatch = item.medicineAvailable.find(
          (batch) => batch.id === batchId
        );

        if (!selectedBatch) return item;

        // Check if batch is valid for Fullstrip medicine
        const isFullstrip = isFullstripMedicine(item.tags);
        let newQuantity = item.quantity;

        if (isFullstrip && item.packOf) {
          // Check if batch has enough quantity
          if (parseNumber(selectedBatch.quantity) < item.packOf) {
            addToast({
              title: "This batch doesn't have minimum required quantity",
              description: `Need at least ${item.packOf} units`,
              color: "warning",
            });
            return item;
          }
          
          // Ensure quantity is multiple of packOf
          const packOf = item.packOf;
          newQuantity = Math.floor(item.quantity / packOf) * packOf;
          if (newQuantity < packOf) {
            newQuantity = packOf;
          }
        }

        return {
          ...item,
          selectedBatchId: batchId,
          quantity: clamp(
            newQuantity,
            1,
            parseNumber(selectedBatch.quantity)
          ),
          discountPercent: Number(
            getInitialDiscount(
              parseNumber(selectedBatch.mrp),
              parseNumber(selectedBatch.cost)
            ).toFixed(2)
          ),
        };
      })
    );
  };

  // Handle days change from prescription card
  const handlePrescriptionCardDaysChange = (medicineName: string, newDays: number) => {
    // Find the prescription medicine to get frequency
    const prescriptionMed = prescriptionMedicines.find(
      med => med.medicineName.toLowerCase() === medicineName.toLowerCase()
    );

    // Find the selected item for this medicine
    const selectedItem = selectedItems.find(
      item =>
        item.prescribedDays &&
        (matchesPrescriptionMedicine(item, medicineName) ||
          (!!prescriptionMed?.stockMedicine?.id &&
            item.medicineId === prescriptionMed.stockMedicine.id))
    );
    
    if (selectedItem && prescriptionMed) {
      // Check if this is a weekly prescription
      const durationLower = (prescriptionMed.duration || "").toLowerCase().trim();
      const isWeekly = durationLower.includes('week');
      const isFullstrip = isFullstripMedicine(selectedItem.tags || []);
      
      // Calculate base quantity based on frequency and new days
      const isTabletOrCapsule = ["tablet", "capsule"].includes(
        (prescriptionMed.prescribedForm || "").trim().toLowerCase()
      );
      
      const baseQuantity = isTabletOrCapsule
        ? calculateQuantityFromDays(
            prescriptionMed.frequency, 
            newDays, 
            isWeekly,
            selectedItem.packOf,
            isFullstrip
          )
        : 1;
      
      // Find selected batch
      const selectedBatch = selectedItem.medicineAvailable.find(
        (batch) => batch.id === selectedItem.selectedBatchId
      );
      
      let finalQuantity = baseQuantity;
      
      if (selectedBatch) {
        const maxQty = parseNumber(selectedBatch.quantity);
        finalQuantity = Math.min(finalQuantity, maxQty);
      }
      
      // Update selected items
      setSelectedItems((prev) =>
        prev.map((item) => {
          if (item.rowId === selectedItem.rowId) {
            return {
              ...item,
              currentDays: newDays,
              quantity: finalQuantity,
            };
          }
          return item;
        })
      );
    }
    
    // Update prescription medicine state
    setPrescriptionMedicines((prev) =>
      prev.map((med) => {
        if (med.medicineName.toLowerCase() === medicineName.toLowerCase()) {
          const prescribedDays = extractDaysFromDuration(med.duration);
          const clampedDays = Math.max(1, Math.min(prescribedDays, newDays));
          return {
            ...med,
            currentDays: clampedDays,
          };
        }
        return med;
      })
    );
  };

  // Handle quantity change with days update
  const handleQuantityChange = (rowId: string, value: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const selectedBatch = item.medicineAvailable.find(
          (batch) => batch.id === item.selectedBatchId
        );

        if (!selectedBatch) return item;

        const maxQty = parseNumber(selectedBatch.quantity);
        const isFullstrip = isFullstripMedicine(item.tags);
        const packOf = item.packOf;
        
        // Handle empty input
        if (value === "" || value === ".") {
          return {
            ...item,
            quantity: isFullstrip && packOf ? packOf : 1,
          };
        }
        
        // Parse the raw input value
        const rawNumber = parseNumber(value);
        
        // If invalid or less than 0, keep current value
        if (isNaN(rawNumber) || rawNumber < 0) {
          return item;
        }
        
        let newQuantity = rawNumber;
        
        // For Fullstrip medicines, we need to validate the quantity
        if (isFullstrip && packOf && packOf > 0) {
          // Always ensure minimum is packOf
          if (newQuantity > 0 && newQuantity < packOf) {
            newQuantity = rawNumber;
          } else if (newQuantity > 0) {
            // Check if it's a valid multiple
            const remainder = newQuantity % packOf;
            if (remainder !== 0 && newQuantity > packOf) {
              newQuantity = rawNumber;
            }
          }
        }
        
        // Ensure we don't exceed max quantity during typing
        if (newQuantity > maxQty) {
          newQuantity = maxQty;
        }

        // If this is a prescribed medicine, update days based on quantity
        if (item.prescribedDays && item.frequency) {
          const isTabletOrCapsule = ["tablet", "capsule"].includes(
            (item.prescribedForm || "").trim().toLowerCase()
          );
          
          if (isTabletOrCapsule) {
            const dosesPerPeriod = item.frequency
              .split("-")
              .map((x) => Number(x) || 0)
              .reduce((sum, val) => sum + val, 0);
            
            if (dosesPerPeriod > 0) {
              // Check if this is a weekly prescription
              const durationLower = (item.duration || "").toLowerCase().trim();
              const isWeekly = durationLower.includes('week');
              
              let calculatedDays;
              if (isWeekly) {
                // For weekly: quantity / dosesPerPeriod = number of weeks
                const weeks = Math.round(newQuantity / dosesPerPeriod);
                // Convert weeks to days (1 week = 7 days)
                calculatedDays = Math.max(1, weeks * 7);
              } else {
                // For daily: quantity / dosesPerPeriod = number of days
                calculatedDays = Math.round(newQuantity / dosesPerPeriod);
              }
              
              // Clamp to prescribed days
              calculatedDays = Math.max(1, Math.min(item.prescribedDays || 1, calculatedDays));
              
              // Update prescription medicine state
              setPrescriptionMedicines((prev) =>
                prev.map((med) => {
                  if (
                    med.medicineName.toLowerCase() ===
                    (item.prescriptionMedicineName || item.medicineName).toLowerCase()
                  ) {
                    return {
                      ...med,
                      currentDays: calculatedDays,
                    };
                  }
                  return med;
                })
              );
              
              return {
                ...item,
                quantity: newQuantity,
                currentDays: calculatedDays,
              };
            }
          }
        }

        return {
          ...item,
          quantity: newQuantity,
        };
      })
    );
  };

  const handleQuantityBlur = (rowId: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const selectedBatch = item.medicineAvailable.find(
          (batch) => batch.id === item.selectedBatchId
        );

        if (!selectedBatch) return item;

        const maxQty = parseNumber(selectedBatch.quantity);
        const isFullstrip = isFullstripMedicine(item.tags);
        const packOf = item.packOf;
        
        let newQuantity = item.quantity;
        
        // Apply Fullstrip constraint on blur
        if (isFullstrip && packOf && packOf > 0) {
          // If quantity is 0 or less than packOf, set to packOf
          if (newQuantity <= 0 || newQuantity < packOf) {
            newQuantity = packOf;
          } else {
            // Round to nearest multiple of packOf
            const halfPack = packOf / 2;
            const roundedMultiple = Math.round((newQuantity + halfPack - 1) / packOf) * packOf;
            
            // Ensure we don't go below packOf
            if (roundedMultiple < packOf) {
              newQuantity = packOf;
            } else {
              newQuantity = roundedMultiple;
            }
          }
          
          // Ensure quantity is a valid multiple of packOf
          if (newQuantity % packOf !== 0) {
            newQuantity = Math.ceil(newQuantity / packOf) * packOf;
          }
        }
        
        // Ensure we don't exceed max quantity
        if (newQuantity > maxQty) {
          newQuantity = maxQty;
          
          if (isFullstrip && packOf) {
            // Round down to nearest valid multiple within max
            newQuantity = Math.floor(newQuantity / packOf) * packOf;
            if (newQuantity < packOf) {
              newQuantity = packOf;
            }
          }
        }
        
        // Ensure minimum
        const minQty = isFullstrip && packOf ? packOf : 1;
        if (newQuantity < minQty) {
          newQuantity = minQty;
        }

        // If this is a prescribed medicine, update days based on quantity
        if (item.prescribedDays && item.frequency) {
          const isTabletOrCapsule = ["tablet", "capsule"].includes(
            (item.prescribedForm || "").trim().toLowerCase()
          );
          
          if (isTabletOrCapsule) {
            const dosesPerPeriod = item.frequency
              .split("-")
              .map((x) => Number(x) || 0)
              .reduce((sum, val) => sum + val, 0);
            
            if (dosesPerPeriod > 0) {
              // Check if this is a weekly prescription
              const durationLower = (item.duration || "").toLowerCase().trim();
              const isWeekly = durationLower.includes('week');
              
              let calculatedDays;
              if (isWeekly) {
                // For weekly: quantity / dosesPerPeriod = number of weeks
                const weeks = Math.round(newQuantity / dosesPerPeriod);
                // Convert weeks to days (1 week = 7 days)
                calculatedDays = Math.max(1, weeks * 7);
              } else {
                // For daily: quantity / dosesPerPeriod = number of days
                calculatedDays = Math.round(newQuantity / dosesPerPeriod);
              }
              
              // Clamp to prescribed days
              calculatedDays = Math.max(1, Math.min(item.prescribedDays || 1, calculatedDays));
              
              // Update prescription medicine state
              setPrescriptionMedicines((prev) =>
                prev.map((med) => {
                  if (
                    med.medicineName.toLowerCase() ===
                    (item.prescriptionMedicineName || item.medicineName).toLowerCase()
                  ) {
                    return {
                      ...med,
                      currentDays: calculatedDays,
                    };
                  }
                  return med;
                })
              );
              
              return {
                ...item,
                quantity: newQuantity,
                currentDays: calculatedDays,
              };
            }
          }
        }

        // Only update if the value changed
        if (newQuantity !== item.quantity) {
          return {
            ...item,
            quantity: newQuantity,
          };
        }

        return item;
      })
    );
  };

  const formatExpiryDate = (dateString?: string | null) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "-";

    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
      .replace(/ /g, "-");
  };

  const handleDiscountChange = (rowId: string, value: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.rowId !== rowId) return item;

        const selectedBatch = item.medicineAvailable.find(
          (batch) => batch.id === item.selectedBatchId
        );

        if (!selectedBatch) return item;

        const mrp = parseNumber(selectedBatch.mrp);
        const cost = parseNumber(selectedBatch.cost);

        const noLossDiscount = mrp > 0 ? ((mrp - cost) / mrp) * 100 : 0;

        let discount = clamp(parseNumber(value), 0, 100);

        if (isNoLossEnabled) {
          discount = Math.min(discount, noLossDiscount);
        }

        return {
          ...item,
          discountPercent: Number(discount.toFixed(2)),
        };
      })
    );
  };

  const billingSummary = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => {
        const selectedBatch = item.medicineAvailable.find(
          (batch) => batch.id === item.selectedBatchId
        );

        if (!selectedBatch) return acc;

        const mrp = parseNumber(selectedBatch.mrp);
        const gstPercentage = parseNumber(selectedBatch.gstPercentage);

        const subtotal = mrp * item.quantity;
        const discountAmount = subtotal * (item.discountPercent / 100);
        const taxableAmount = subtotal - discountAmount;
        const gstAmount = taxableAmount * (gstPercentage / 100);
        const total = taxableAmount + gstAmount;

        acc.subtotal += subtotal;
        acc.discount += discountAmount;
        acc.gst += gstAmount;
        acc.total += total;

        return acc;
      },
      { subtotal: 0, discount: 0, gst: 0, total: 0 }
    );
  }, [selectedItems]);

  const handleLoadMore = () => {
    if (!hasMore) return;

    setPagination((prev) => ({
      ...prev,
      pageNumber: prev.pageNumber + 1,
    }));
  };

  const isSubmittingRef = useRef(false);

  const handleCreateSale = async () => {
    if (isSubmittingRef.current || isCreating) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      let hasError = false;

      const nameError = getPatientNameError(patientName);
      if (nameError) {
        setPatientNameError(nameError);
        hasError = true;
      }

      if (!paymentMethod) {
        setPaymentMethodError("Payment method is required");
        isSubmittingRef.current = false;
        return;
      }

      if (hasError) return;

      if (selectedItems.length === 0) {
        addToast({
          title: "Add at least one medicine",
          color: "danger",
        });
        return;
      }

      const payload = {
        prescriptionId,
        patientName: patientName.trim(),
        patientMobile: patientMobile.trim() || undefined,
        paymentMethod,
        paymentNotes: paymentNotes.trim() || undefined,
        items: selectedItems.map((item) => ({
          pharmacyStockMedicineId: item.selectedBatchId,
          quantity: item.quantity,
          discountPercent: item.discountPercent || 0,
        })),
      };

      const response = await createSale(payload).unwrap();

      if (prescriptionId) {
        try {
          await updatePrescriptionStatus({
            id: prescriptionId,
            body: { status: "COMPLETED" },
          }).unwrap();
        } catch {
          addToast({
            title: "Sale completed",
            description: "Sale was created, but prescription status could not be updated to Completed.",
            color: "warning",
          });
        }
      }

      addToast({
        title: "Invoice generated successfully",
        color: "success",
      });

      navigate("/pharmacy/prescriptions", {
        state: {
          openInvoiceId: response?.data?.id,
        },
      });
    } catch (error: any) {
      addToast({
        title: "Failed to create sale",
        description: error?.data?.message || error?.message || "Unable to create sale",
        color: "danger",
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const renderPrescriptionMedicines = () => {
    if (!prescriptionMedicines.length) {
      return <div className="text-sm text-default-500">No prescription medicines available.</div>;
    }

    return (
      <div className="grid sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {prescriptionMedicines.map((medicine: PrescriptionMedicine, index: number) => {
          const details = [
            medicine.frequency,
            medicine.duration,
            medicine.dosage,
          ].filter((item) => item && item !== "-");

          const exists = medicine.exists;
          const isInStock = medicine.isAvailable;

          const showAddButton = exists === false;
          const isNotAvailable = exists === true && isInStock === false;
          
          // Calculate days and weeks for this medicine
          const prescribedDays = extractDaysFromDuration(medicine.duration);
          const currentDays = medicine.currentDays || prescribedDays;
          
          // Check if duration is in weeks
          const durationLower = (medicine.duration || "").toLowerCase().trim();
          const isWeekly = durationLower.includes('week');
          const weekMatch = durationLower.match(/(\d+)\s*week/);
          const totalWeeks = weekMatch ? Number(weekMatch[1]) : 1;
          const currentWeek = Math.ceil(currentDays / 7);
          const maxWeeks = totalWeeks;

          return (
            <div
              key={`${medicine.medicineName}-${index}`}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
                setHoveredMedicine(medicine);
              }}
              onMouseLeave={() => {
                setHoveredMedicine(null);
              }}
              onClick={() => {
                if (exists && isInStock) {
                  setSearchValue(medicine.medicineName);
                  setDebouncedSearch(medicine.medicineName);
                  setPagination((prev) => ({
                    ...prev,
                    pageNumber: 1,
                  }));
                  setShowSearchResults(true);
                }
              }}
              className={`
                relative
                bg-white
                border
                rounded-xl
                p-4
                min-h-[92px]
                transition-all
                duration-200
                ${
                  showAddButton || isNotAvailable
                    ? "border-red-200"
                    : "border-slate-200"
                }
                ${
                  exists && isInStock
                    ? "cursor-pointer hover:shadow-md hover:border-green-300"
                    : "cursor-default"
                }
              `}
            >
              {/* Add Medicine Button */}
              {showAddButton && (
                <Tooltip content="Add medicine to inventory">
                  <Button
                    isIconOnly
                    size="sm"
                    color="primary"
                    variant="solid"
                    className="absolute top-2 right-2 z-20 h-7 w-7 min-w-7"
                    onPress={() => {
                      handleOpenAddMedicineModal(medicine.medicineName);
                    }}
                  >
                    <FiPlus className="text-white text-xs" />
                  </Button>
                </Tooltip>
              )}

              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 flex-1">
                  {/* Status Icon Box */}
                  <div
                    className={`
                      h-12
                      w-12
                      min-w-10
                      rounded-lg
                      flex
                      items-center
                      justify-center
                      ${
                        exists && isInStock
                          ? "bg-green-500"
                          : "bg-red-500"
                      }
                    `}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.5 13.5L3 21" />
                      <path d="M21 3l-7.5 7.5" />
                      <path d="M8.5 21a5.5 5.5 0 0 1-3.89-9.39l8.22-8.22a5.5 5.5 0 1 1 7.78 7.78l-8.22 8.22A5.46 5.46 0 0 1 8.5 21Z" />
                      <path d="m14.5 9.5 5 5" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[15px] text-slate-900 truncate">
                      {medicine.medicineName}
                    </h4>

                    <p className="text-[12px] text-slate-500 mt-1 truncate">
                      {details.length > 0 ? details.join(" • ") : "—"}
                    </p>

                    <div
                      className={`mt-2 text-xs font-semibold ${
                        exists && isInStock
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {exists === false
                        ? "Medicine Not Found"
                        : exists === true && isInStock === false
                        ? "Not Available"
                        : "Available"}
                    </div>
                  </div>
                </div>

                {/* Days/Week Editor Area - Keep same height for all cards */}
                <div
                  className="mt-1 pt-3 border-t border-slate-100 min-h-[32px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {exists && isInStock ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">
                        {isWeekly ? "Duration (Weeks)" : "Duration (Days)"}
                      </span>

                      <div className="flex items-center gap-1">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          isDisabled={isWeekly ? currentWeek <= 1 : currentDays <= 1}
                          onPress={() => {
                            if (isWeekly) {
                              const newWeek = Math.max(1, currentWeek - 1);
                              handlePrescriptionCardDaysChange(
                                medicine.medicineName,
                                newWeek * 7
                              );
                            } else {
                              handlePrescriptionCardDaysChange(
                                medicine.medicineName,
                                currentDays - 1
                              );
                            }
                          }}
                          className="h-6 w-6 min-w-6 rounded-lg border border-slate-200 dark:border-[#273244]"
                        >
                          <FiMinus className="text-xs" />
                        </Button>

                        <div className="flex items-center gap-1 px-2">
                          <FiClock className="text-xs text-slate-400" />

                          <span className="text-[13px] font-semibold text-slate-900 dark:text-white min-w-[20px] text-center">
                            {isWeekly ? currentWeek : currentDays}
                          </span>

                          <span className="text-[10px] text-slate-400">
                            /{isWeekly ? maxWeeks : prescribedDays}
                          </span>

                          {isWeekly && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              weeks
                            </span>
                          )}
                        </div>

                        <Button
                          isIconOnly
                          size="sm"
                          variant="flat"
                          isDisabled={
                            isWeekly
                              ? currentWeek >= maxWeeks
                              : currentDays >= prescribedDays
                          }
                          onPress={() => {
                            if (isWeekly) {
                              const newWeek = Math.min(maxWeeks, currentWeek + 1);
                              handlePrescriptionCardDaysChange(
                                medicine.medicineName,
                                newWeek * 7
                              );
                            } else {
                              handlePrescriptionCardDaysChange(
                                medicine.medicineName,
                                currentDays + 1
                              );
                            }
                          }}
                          className="h-6 w-6 min-w-6 rounded-lg border border-slate-200 dark:border-[#273244]"
                        >
                          <FiPlus className="text-xs" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!prescriptionId) {
    return <div className="text-danger">Prescription ID is missing.</div>;
  }

  if (isPrescriptionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="Loading prescription..." />
      </div>
    );
  }

  if (isPrescriptionError) {
    return (
      <div className="h-60 flex items-center justify-center text-danger">
        Unable to load prescription details.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-0 py-0 space-y-6">
      {/* ── Page Header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-4">
          <Button
            isIconOnly
            variant="flat"
            onPress={() => navigate("/pharmacy/prescriptions")}
            className="h-10 w-10 rounded-lg border border-slate-200 dark:border-[#273244]"
          >
            <FiArrowLeft className="text-lg" />
          </Button>

          <div>
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Process Prescription
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
              Review and process patient prescription
            </p>
          </div>
        </div>
      </div>

      {/* ── Patient Details & Billing Summary Side by Side ── */}
      <div className="md:sticky top-0 z-50 pt-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Patient Details Card */}
          <Card className="shadow-sm border border-slate-200 dark:border-[#273244]">
            <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
              <h3 className="text-[16px] font-semibold text-slate-950 dark:text-white">Patient Details</h3>
            </CardHeader>
            <CardBody className="pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Patient Name</label>
                  <Input
                    value={patientName} 
                    onValueChange={(value) => {
                      const sanitizedValue = sanitizeName(value);
                      setPatientName(sanitizedValue);
                      setPatientNameError(
                        sanitizedValue.trim().length >= 3
                          ? ""
                          : patientNameError
                      );
                    }}
                    maxLength={50}
                    autoFocus
                    isRequired 
                    isInvalid={!!patientNameError} 
                    errorMessage={patientNameError}
                    placeholder="Enter patient name"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Patient Mobile</label>
                  <Input 
                    value={patientMobile} 
                    onValueChange={(v) => {
                      const normalized = normalizePhone(v);
                      setPatientMobile(normalized);
                      
                      if (normalized && !isValidPhone(normalized)) {
                        setPatientMobileError("Please enter a valid 10-digit mobile number");
                      } else if (normalized && isValidPhone(normalized)) {
                        setPatientMobileError("");
                      } else if (!normalized) {
                        setPatientMobileError("");
                      }
                    }}
                    isInvalid={!!patientMobileError}
                    errorMessage={patientMobileError}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter mobile number"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Doctor</label>
                  <Input 
                    value={doctorName} 
                    readOnly 
                    placeholder="Doctor name"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Speciality</label>
                  <Input 
                    value={doctorSpeciality} 
                    readOnly 
                    placeholder="Speciality"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Billing Summary Card */}
          <Card className="shadow-sm border border-slate-200 dark:border-[#273244]">
            <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
              <h3 className="text-[16px] font-semibold text-slate-950 dark:text-white">Billing Summary</h3>
            </CardHeader>
            <CardBody className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-slate-500 dark:text-white">Subtotal</span>
                <strong className="text-[14px] text-slate-900 dark:text-white">{formatCurrency(billingSummary.subtotal)}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-slate-500 dark:text-white">Discount</span>
                <strong className="text-[14px] text-red-600">- {formatCurrency(billingSummary.discount)}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-slate-500 dark:text-white">GST (12%)</span>
                <strong className="text-[14px] text-slate-900 dark:text-white">{formatCurrency(billingSummary.gst)}</strong>
              </div>

              <Divider className="my-2" />

              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold text-slate-900 dark:text-white">Total Amount</span>
                <strong className="text-2xl text-primary">{formatCurrency(billingSummary.total)}</strong>
              </div>

              {(status === "PENDING" || status === "ON_HOLD") && (
                <div className="flex items-center justify-end gap-3 mt-4">
                  {showShortcutAnimation && (
                    <div
                      className="
                        flex items-center gap-2
                        px-3 py-2
                        rounded-full
                        bg-primary-50
                        border border-primary-200
                        animate-pulse
                      "
                    >
                      <span className="text-xs font-medium">
                        Press
                      </span>

                      <kbd className="px-2 py-1 bg-primary text-white rounded text-xs font-bold">
                        C
                      </kbd>

                      <span className="text-xs">
                        3 times in 1 sec to Complete Bill
                      </span>
                    </div>
                  )}

                  <Button 
                    color="primary" 
                    onPress={handleOpenPaymentModal} 
                    isDisabled={isCreating || statusUpdating || isSubmittingRef.current || !patientName.trim() || selectedItems.length === 0}
                    className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold"
                    startContent={!isCreating && <FiSave />}
                  >
                    {isCreating ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      "Complete Bill"
                    )}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Prescribed Medicines ── */}
      <Card className="shadow-sm border border-slate-200 dark:border-[#273244]">
        <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-950 dark:text-white">Prescribed Medicines</h2>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white">
              {isCheckingMedicines ? "Checking availability..." : "Click on any available medicine to search in stock"}
            </p>
          </div>
        </CardHeader>

        <CardBody>
          {isCheckingMedicines ? (
            <div className="flex items-center justify-center py-8">
              <Spinner label="Checking medicine availability..." />
            </div>
          ) : (
            renderPrescriptionMedicines()
          )}
        </CardBody>
      </Card>

      {/* ── Search and Add Medicines ── */}
      <Card className="shadow-sm border border-slate-200 dark:border-[#273244] overflow-visible relative z-40">
        <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
          <div className="w-full space-y-3">
            <div className="relative">
              <div className="w-full max-w-[800px]">
                <Input
                  placeholder="Search medicine by sku, name, brand or composition..."
                  maxLength={50}
                  startContent={<FiSearch className="text-default-400 text-lg" />}
                  value={searchValue}
                  onValueChange={(value) => {
                    setSearchValue(value);
                    if (!value.trim()) {
                      setStockRows([]);
                      setDebouncedSearch("");
                      setShowSearchResults(false);
                    }
                  }}
                  isClearable
                  onClear={() => {
                    setSearchValue("");
                    setDebouncedSearch("");
                    setStockRows([]);
                    setShowSearchResults(false);
                  }}
                  classNames={{
                    inputWrapper: "h-11 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                    input: "text-[14px] text-slate-700 dark:text-white",
                  }}
                />
              </div>

              {showSearchResults && searchValue.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#273244] rounded-lg shadow-2xl max-h-[500px] overflow-y-auto z-[999999]">
                  {isFetching ? (
                    <div className="p-4 flex justify-center">
                      <Spinner size="sm" />
                    </div>
                  ) : stockRows.length > 0 ? (
                    <>
                      {stockRows.map((medicine) => (
                        <button
                          key={medicine.id}
                          type="button"
                          onClick={() => handleAddMedicine(medicine)}
                          className="w-full p-4 text-left border-b border-slate-100 dark:border-[#273244] hover:bg-primary-50 dark:hover:bg-[#151e31] transition-all"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[14px] text-slate-900 dark:text-white">
                                  {medicine.medicineName} 
                                  {medicine.packOf && (
                                    <span className="text-[12px] text-slate-500 dark:text-white ml-1">
                                      (Pack of {medicine.packOf})
                                    </span>
                                  )}
                                </span>
                                {medicine.composition && (
                                  <span className="text-[13px] text-slate-500 dark:text-white">
                                    ({medicine.composition})
                                  </span>
                                )}
                                {medicine.form && (
                                  <Chip size="sm" color="primary" variant="flat">
                                    {medicine.form}
                                  </Chip>
                                )}
                                {medicine.category && (
                                  <Chip size="sm" variant="flat">
                                    {medicine.category}
                                  </Chip>
                                )}
                                {medicine.shelf && (
                                  <Chip size="sm" color="warning" variant="flat">
                                    Shelf: {medicine.shelf}
                                  </Chip>
                                )}
                              </div>
                              {medicine.tags && medicine.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {medicine.tags.map((tag) => (
                                    <Chip key={tag} size="sm" variant="flat" color="secondary">
                                      {tag}
                                    </Chip>
                                  ))}
                                </div>
                              )}
                              {medicine.brandName && (
                                <div className="text-[13px] text-slate-500 dark:text-white mt-1">
                                  {medicine.brandName}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-center items-center gap-2">
                              <span className="text-[12px] text-slate-500 dark:text-white">Available</span>
                              <span className="text-xl font-bold text-success">
                                {medicine.availableQuantity}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                      {hasMore && (
                        <div className="p-4 flex justify-center">
                          <Button variant="flat" onPress={handleLoadMore} size="sm" className="text-[13px]">
                            Load More
                          </Button>
                        </div>
                      )}
                    </>
                  ) : debouncedSearch ? (
                    <div className="p-4 text-[13px] text-slate-500 dark:text-white">
                      No medicines found
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-[16px] font-semibold text-slate-950 dark:text-white">Selected Medicines</h2>
              <p className="text-[13px] font-medium text-slate-500 dark:text-white">Batch selection, quantity and billing</p>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {selectedItems.length === 0 ? (
            <div className="text-[13px] text-slate-500 dark:text-white">No medicines selected.</div>
          ) : (
            <div className="w-full overflow-x-auto overflow-y-visible rounded-lg">
              <Table 
                removeWrapper 
                aria-label="Selected medicines"
                classNames={{
                  base: "min-w-[1400px]",
                  table: "table-fixed min-w-[1400px]",
                  td: "align-top",
                }}
              >
                <TableHeader>
                  <TableColumn className="w-[18%] text-[12px] font-bold text-slate-500 dark:text-white">MEDICINE</TableColumn>
                  <TableColumn className="w-[14%] text-[12px] font-bold text-slate-500 dark:text-white">BATCH</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">EXPIRY</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">COST</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">MRP</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">QTY</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">SUBTOTAL</TableColumn>
                  <TableColumn className="w-[7%] text-[12px] font-bold text-slate-500 dark:text-white">DISCOUNT</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">DISC AMT</TableColumn>
                  <TableColumn className="w-[5%] text-[12px] font-bold text-slate-500 dark:text-white">GST</TableColumn>
                  <TableColumn className="w-[8%] text-[12px] font-bold text-slate-500 dark:text-white">TOTAL</TableColumn>
                </TableHeader>

                <TableBody>
                  {selectedItems
                    .map((item) => {
                      const selectedBatch = item.medicineAvailable.find(
                        (batch) => batch.id === item.selectedBatchId
                      );

                      return selectedBatch ? { item, selectedBatch } : null;
                    })
                    .filter(
                      (
                        row
                      ): row is {
                        item: SaleCartItem;
                        selectedBatch: BatchItem;
                      } => row !== null
                    )
                    .map(({ item, selectedBatch }) => {
                      const mrp = parseNumber(selectedBatch.mrp);
                      const cost = parseNumber(selectedBatch.cost);
                      const gst = parseNumber(selectedBatch.gstPercentage);
                      const subtotal = mrp * item.quantity;
                      const discountAmount = subtotal * (item.discountPercent / 100);
                      const taxableAmount = subtotal - discountAmount;
                      const gstAmount = taxableAmount * (gst / 100);
                      const total = taxableAmount + gstAmount;
                      const maxDiscount = isNoLossEnabled ? ((mrp - cost) / mrp) * 100 : 100;

                      const selectedBatchIdsForMedicine = selectedItems
                        .filter((x) => x.medicineId === item.medicineId && x.rowId !== item.rowId)
                        .map((x) => x.selectedBatchId);

                      const isFullstrip = isFullstripMedicine(item.tags);

                      return (
                        <TableRow key={item.rowId} className="hover:bg-slate-50/70 dark:hover:bg-[#151e31]">
                          <TableCell>
                            <div className="flex gap-2">
                              <Tooltip content="Remove">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="danger"
                                  variant="flat"
                                  onPress={() => handleRemoveItem(item.rowId)}
                                  className="min-w-0 h-8 w-8"
                                >
                                  <FiTrash2 className="text-sm" />
                                </Button>
                              </Tooltip>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-[14px] text-slate-900 dark:text-white">
                                    {item.medicineName}
                                    {item.packOf !== null && item.packOf !== undefined && item.packOf > 0 && (
                                      <span className="text-[12px] text-slate-500 dark:text-white ml-1">
                                        (Pack of {item.packOf})
                                      </span>
                                    )}
                                  </p>
                                  
                                  {item.tags && item.tags.length > 0 && (
                                    <Popover placement="right" showArrow={true}>
                                      <PopoverTrigger>
                                        <Button
                                          isIconOnly
                                          size="sm"
                                          variant="light"
                                          className="min-w-0 h-6 w-6 text-slate-500 hover:text-primary"
                                        >
                                          <FiEye className="text-sm" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-3 max-w-[300px]">
                                        <div className="space-y-2">
                                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                            Tags ({item.tags.length})
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {item.tags.map((tag) => (
                                              <Chip key={tag} size="sm" variant="flat" color="secondary">
                                                {tag}
                                              </Chip>
                                            ))}
                                          </div>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </div>
                                
                                <p className="text-[12px] text-slate-500 dark:text-white">
                                  {item.form || "-"}
                                </p>
                                {/* {item.prescribedDays && (
                                  <p className="text-[11px] text-primary-600 dark:text-primary-400">
                                    {item.frequency} • {item.duration} • Days: {item.currentDays || item.prescribedDays}
                                  </p>
                                )} */}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Select
                              size="sm"
                              disallowEmptySelection
                              selectedKeys={new Set([item.selectedBatchId])}
                              onSelectionChange={(keys) => {
                                const batchId = Array.from(keys as Set<string>)[0];
                                if (!batchId) return;
                                handleBatchChange(item.rowId, batchId);
                              }}
                              classNames={{
                                trigger: "h-9 rounded-lg border border-slate-200 dark:border-[#273244]",
                                value: "text-[13px] text-slate-700 dark:text-white",
                              }}
                            >
                              {item.medicineAvailable
                                .filter((batch) => {
                                  // For Fullstrip medicines, filter out batches with quantity < packOf
                                  if (isFullstripMedicine(item.tags) && item.packOf) {
                                    return parseNumber(batch.quantity) >= item.packOf;
                                  }
                                  return true;
                                })
                                .filter(
                                  (batch) =>
                                    !selectedBatchIdsForMedicine.includes(batch.id) || batch.id === item.selectedBatchId
                                )
                                .map((batch) => (
                                  <SelectItem key={batch.id} textValue={batch.batch || "No Batch"}>
                                    <div className="flex flex-col py-1">
                                      <span className="font-medium text-[13px] text-slate-900 dark:text-white">{batch.batch || "No Batch"}</span>
                                      <span className="text-[11px] text-slate-500 dark:text-white">Qty: {batch.quantity}</span>
                                      <span className="text-[11px] text-slate-500 dark:text-white">Exp: {formatExpiryDate(batch.expiry) || "-"}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </Select>
                          </TableCell>

                          <TableCell className="text-[13px] font-semibold text-slate-700 dark:text-white">
                            {formatExpiryDate(selectedBatch.expiry) || "-"}
                          </TableCell>
                          <TableCell className="text-[13px] font-semibold text-slate-700 dark:text-white">
                            {formatCurrency(cost)}
                          </TableCell>
                          <TableCell className="text-[13px] font-semibold text-slate-700 dark:text-white">
                            {formatCurrency(mrp)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col min-w-[90px]">
                              <Input
                                size="sm"
                                type="number"
                                value={String(item.quantity)}
                                onValueChange={(value) => {
                                  handleQuantityChange(item.rowId, value);

                                  if (quantityTimeoutRef.current[item.rowId]) {
                                    clearTimeout(quantityTimeoutRef.current[item.rowId]);
                                  }

                                  quantityTimeoutRef.current[item.rowId] = window.setTimeout(() => {
                                    handleQuantityBlur(item.rowId);
                                  }, 200);
                                }}
                                onBlur={() => handleQuantityBlur(item.rowId)}
                                min={isFullstrip ? (item.packOf || 1) : 1}
                                max={selectedBatch.quantity}
                                step={isFullstrip && item.packOf ? item.packOf : 1}
                                classNames={{
                                  inputWrapper: "h-9 rounded-lg border border-slate-200 dark:border-[#273244]",
                                  input: "text-[13px] text-slate-700 dark:text-white",
                                }}
                              />
                              <span className="text-[10px] text-green-600 dark:text-green-400 mt-1 px-1 leading-none">
                                Max: {selectedBatch.quantity}
                                {isFullstrip && item.packOf && (
                                  <span className="block text-blue-600 dark:text-blue-400">
                                    Multiples of {item.packOf}
                                  </span>
                                )}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-semibold text-slate-700 dark:text-white">
                            {formatCurrency(subtotal)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <Input
                                size="sm"
                                type="text"
                                inputMode="decimal"
                                value={String(item.discountPercent)}
                                onValueChange={(value) => handleDiscountChange(item.rowId, value)}
                                classNames={{
                                  inputWrapper: "h-9 rounded-lg border border-slate-200 dark:border-[#273244]",
                                  input: "text-[13px] text-slate-700 dark:text-white",
                                }}
                              />
                              <span className="text-[10px] text-green-600 dark:text-green-400 mt-1 px-1 leading-none">
                                {isNoLossEnabled 
                                  ? `Max: ${maxDiscount.toFixed(2)}%` 
                                  : "Up to: 100%"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-semibold text-slate-700 dark:text-white">
                            {formatCurrency(discountAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-semibold text-slate-700 dark:text-white">{gst}%</span>
                              <span className="text-[11px] text-slate-500 dark:text-white">{formatCurrency(gstAmount)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-[14px] text-success">
                              {formatCurrency(total)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Hover Tooltip ── */}
      {hoveredMedicine && (
        <div
          className="fixed z-[999999] w-[350px] bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#273244] rounded-xl shadow-2xl p-4 pointer-events-none"
          style={{
            left: hoverPosition.x + 180,
            top: hoverPosition.y - 20,
          }}
        >
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-white">Medicine</div>
              <div className="font-semibold text-[14px] text-slate-900 dark:text-white">{hoveredMedicine.medicineName}</div>
            </div>

            <Divider className="my-1" />

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-slate-500 dark:text-white">Dosage</span>
                <div className="font-semibold text-slate-900 dark:text-white">{hoveredMedicine.dosage || "-"}</div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-white">Frequency</span>
                <div className="font-semibold text-slate-900 dark:text-white">{hoveredMedicine.frequency || "-"}</div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-white">Duration</span>
                <div className="font-semibold text-slate-900 dark:text-white">{hoveredMedicine.duration || "-"}</div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-white">Status</span>
                <div className={`font-semibold ${hoveredMedicine.isAvailable ? "text-green-600" : "text-red-600"}`}>
                  {hoveredMedicine.isAvailable ? "Available" : "Not Available"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      <Modal isOpen={showPaymentModal} onOpenChange={setShowPaymentModal} size="lg">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-slate-100 dark:border-[#273244]">
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Complete Sale</h2>
              </ModalHeader>

              <ModalBody className="pt-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 dark:border-[#273244] p-4 bg-slate-50 dark:bg-[#111726]">
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] font-medium text-slate-500 dark:text-white">Total Medicines</span>
                      <strong className="text-[14px] text-slate-900 dark:text-white">{selectedItems.length}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[13px] font-medium text-slate-500 dark:text-white">Total Amount</span>
                      <strong className="text-lg text-primary">
                        {formatCurrency(billingSummary.total)}
                      </strong>
                    </div>
                  </div>

                  <Select
                    label="Payment Method"
                    selectedKeys={paymentMethod ? new Set([paymentMethod]) : new Set([])}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys as Set<string>)[0] as PaymentMethod;
                      setPaymentMethod(value);
                      setPaymentMethodError("");
                    }}
                    isInvalid={!!paymentMethodError}
                    errorMessage={paymentMethodError}
                    disallowEmptySelection
                    classNames={{
                      trigger: "h-11 rounded-lg border border-slate-200 dark:border-[#273244]",
                      label: "text-[13px] font-semibold text-slate-700 dark:text-white",
                      value: "text-[14px] text-slate-900 dark:text-white",
                    }}
                  >
                    {paymentMethods.map((item) => (
                      <SelectItem key={item.key} textValue={item.label}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Payment Notes"
                    placeholder="Optional notes"
                    value={paymentNotes}
                    max={80}
                    onValueChange={setPaymentNotes}
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 dark:border-[#273244]",
                      label: "text-[13px] font-semibold text-slate-700 dark:text-white",
                      input: "text-[14px] text-slate-900 dark:text-white",
                    }}
                  />
                </div>
              </ModalBody>

              <ModalFooter className="border-t border-slate-100 dark:border-[#273244] pt-4">
                <Button variant="flat" onPress={onClose} className="h-10 px-6 text-[13px] font-semibold">
                  Cancel
                </Button>

                <Button
                  color="primary"
                  isLoading={isCreating}
                  onPress={async () => {
                    if (!paymentMethod) {
                      setPaymentMethodError("Payment method is required");
                      return;
                    }

                    await handleCreateSale();
                  }}
                  className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  Confirm & Generate Invoice
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Medicine Form Modal ── */}
      <MedicineFormModal
        isOpen={isAddMedicineModalOpen}
        onOpenChange={setIsAddMedicineModalOpen}
        initialData={selectedMissingMedicine ? {
          medicineName: selectedMissingMedicine,
          category: "",
          brandName: "",
          composition: "",
          hsnId: "",
          form: "",
          shelf: "",
          reorder: 0,
          packOf: null,
          status: "active",
          tags: [],
        } : null}
        onSubmit={async (data) => {
          await handleAddMissingMedicine(data as AddMedicineRequest);
        }}
        isLoading={isAddingMedicine}
        title="Add Missing Medicine"
        submitLabel="Add"
        hideStatus={false}
      />
    </div>
  );
};

export default ProcessPrescription;
