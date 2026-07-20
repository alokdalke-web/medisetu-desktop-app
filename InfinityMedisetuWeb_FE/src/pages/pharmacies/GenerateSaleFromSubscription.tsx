import React, { useEffect, useMemo, useState, useRef } from "react";
import { I18nProvider } from "@react-aria/i18n";
import { useNavigate, useParams } from "react-router";
import { FiArrowLeft, FiEye, FiSave, FiSearch, FiTrash2, FiCalendar } from "react-icons/fi";
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
  DatePicker,
  Tooltip,
} from "@heroui/react";
import { parseDate, getLocalTimeZone, today } from "@internationalized/date";

import {
  useGetSubscriptionByIdQuery,
  useUpdateDeliveryDateMutation,
  useGetAvailableStockQuery,
  useCreateSaleMutation,
  type PaymentMethod,
  type Subscription,
} from "../../redux/api/pharmaciesApi";
import { useGetUserQuery } from "../../redux/api/authApi";

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
  return tags?.includes("Fullstrip") ?? false;
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
};

type SubscriptionMedicineWithStock = {
  id: string;
  pharmacyMedicineId: string;
  quantity: number;
  medicineName: string;
  brand: string | null;
  sku: string;
  category: string | null;
  form: string | null;
  tags: string[];
  packOf: number | null;
  availableBatches: BatchItem[];
  totalAvailableQty: number;
  defaultBatchId?: string;
};

const paymentMethods: Array<{
  key: PaymentMethod;
  label: string;
}> = [
    { key: "Cash", label: "Cash" },
    { key: "UPI", label: "UPI" },
    { key: "NetBanking", label: "NetBanking" },
  ];

const GenerateSaleFromSubscription: React.FC = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const navigate = useNavigate();

  // Subscription data
  const [_subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionMedicines, setSubscriptionMedicines] = useState<SubscriptionMedicineWithStock[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [frequencyDays, setFrequencyDays] = useState(0);
  const [nextDeliveryDate, setNextDeliveryDate] = useState<string>("");
  const [_originalNextDeliveryDate, setOriginalNextDeliveryDate] = useState<string>("");
  const [isUpdatingDeliveryDate, _setIsUpdatingDeliveryDate] = useState(false);
  const [autoAdded, setAutoAdded] = useState(false);

  // Sale states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<SaleCartItem[]>([]);

  // Validation errors
  const [customerNameError, setCustomerNameError] = useState("");
  const [paymentMethodError, setPaymentMethodError] = useState("");

  // Search states
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [pagination, setPagination] = useState({
    pageNumber: 1,
    pageSize: 25,
  });

  const [stockRows, setStockRows] = useState<MedicineItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Shortcut animation states
  const [_cPressCount, setCPressCount] = useState(0);
  const [showShortcutAnimation, setShowShortcutAnimation] = useState(true);

  // Quantity timeout ref for debouncing
  const quantityTimeoutRef = useRef<Record<string, number>>({});

  const { data: userData } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;

  const isNoLossEnabled = String(user?.pharmacyDetails?.noLoss ?? "false") === "true";

  // API hooks
  const { data: subscriptionResponse, isLoading: isSubscriptionLoading, isError: isSubscriptionError } =
    useGetSubscriptionByIdQuery(
      { subscriptionId: subscriptionId || "" },
      {
        skip: !subscriptionId,
        refetchOnMountOrArgChange: true,
      }
    );

  const [updateDeliveryDate] = useUpdateDeliveryDateMutation();

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

  // Load subscription data
  useEffect(() => {
    if (!subscriptionResponse?.data) return;

    const subData = subscriptionResponse.data;
    setSubscription(subData);
    setCustomerName(subData.customerName || "");
    setCustomerMobile(subData.customerMobile || "");
    setFrequencyDays(subData.frequencyDays);

    const defaultDate = calculateNextDeliveryDate(subData.frequencyDays);
    setNextDeliveryDate(defaultDate);
    setOriginalNextDeliveryDate(defaultDate);

    // Transform subscription medicines
    const medicines = (subData.medicines || []).map((med: any) => ({
      id: med.id,
      pharmacyMedicineId: med.pharmacyMedicineId,
      quantity: med.quantity,
      medicineName: med.medicineName || med.medicine?.medicineName || "Unknown",
      brand: med.brandName || med.medicine?.brandName || null,
      sku: med.sku || med.medicine?.sku || "",
      category: med.category || med.medicine?.category || null,
      form: med.form || med.medicine?.form || null,
      tags: med.tags || med.medicine?.tags || [],
      packOf: med.packOf ?? med.medicine?.packOf ?? null,
      availableBatches: med.availableBatches || [],
      totalAvailableQty: med.availableQuantity || 0,
    }));

    setSubscriptionMedicines(medicines);
    setAutoAdded(false);
  }, [subscriptionResponse]);

  // Auto-add subscription medicines to cart with Fullstrip/packOf handling
  useEffect(() => {
    if (!subscriptionMedicines.length || autoAdded) return;

    const autoItems = subscriptionMedicines
      .filter((med) => med.availableBatches && med.availableBatches.length > 0)
      .map((med) => {
        const isFullstrip = isFullstripMedicine(med.tags || []);

        let availableBatches = med.availableBatches;

        if (isFullstrip && med.packOf) {
          availableBatches = availableBatches.filter(
            (batch) => parseNumber(batch.quantity) >= med.packOf!
          );
        }

        if (availableBatches.length === 0) {
          return null;
        }

        const batch = availableBatches[0];

        if (!batch) return null;

        const availableQty = parseNumber(batch.quantity || 0);
        let requiredQty = med.quantity;

        if (isFullstrip && med.packOf) {
          requiredQty = Math.ceil(requiredQty / med.packOf) * med.packOf;

          if (requiredQty > availableQty) {
            const maxMultiple = Math.floor(availableQty / med.packOf) * med.packOf;
            if (maxMultiple >= med.packOf) {
              requiredQty = maxMultiple;
            } else {
              return null;
            }
          }
        }

        return {
          rowId: `${med.pharmacyMedicineId}-${batch.id}-${Date.now()}-${Math.random()}`,
          medicineId: med.pharmacyMedicineId,
          medicineName: med.medicineName,
          brandName: med.brand || "",
          composition: "",
          category: med.category,
          form: med.form,
          shelf: null,
          selectedBatchId: batch.id,
          quantity: Math.min(requiredQty, availableQty),
          discountPercent: Number(
            getInitialDiscount(
              parseNumber(batch.mrp),
              parseNumber(batch.cost)
            ).toFixed(2)
          ),
          medicineAvailable: med.availableBatches,
          tags: med.tags || [],
          packOf: med.packOf ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (autoItems.length) {
      setSelectedItems(autoItems);
      setAutoAdded(true);
    }
  }, [subscriptionMedicines, autoAdded]);

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
  }, [selectedItems, customerName, paymentMethod]);

  const getInitialDiscount = (mrp: number, cost: number) => {
    if (mrp <= 0) return 0;
    const noLossDiscount = Math.max(0, ((mrp - cost) / mrp) * 100);
    return Math.min(10, noLossDiscount);
  };

  const handleOpenPaymentModal = () => {
    let hasError = false;

    if (!customerName.trim()) {
      setCustomerNameError("Customer name is required");
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

  const handleAddMedicine = (medicine: MedicineItem) => {
    const isFullstrip = isFullstripMedicine(medicine.tags || []);

    let availableBatches = medicine.medicineAvailable.filter(
      (batch) => parseNumber(batch.quantity) > 0
    );

    if (isFullstrip && medicine.packOf) {
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

        const isFullstrip = isFullstripMedicine(item.tags);
        let newQuantity = item.quantity;

        if (isFullstrip && item.packOf) {
          if (parseNumber(selectedBatch.quantity) < item.packOf) {
            addToast({
              title: "This batch doesn't have minimum required quantity",
              description: `Need at least ${item.packOf} units`,
              color: "warning",
            });
            return item;
          }

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

        if (value === "" || value === ".") {
          return {
            ...item,
            quantity: isFullstrip && packOf ? packOf : 1,
          };
        }

        const rawNumber = parseNumber(value);

        if (isNaN(rawNumber) || rawNumber < 0) {
          return item;
        }

        let newQuantity = rawNumber;

        if (isFullstrip && packOf && packOf > 0) {
          if (newQuantity > 0 && newQuantity < packOf) {
            newQuantity = rawNumber;
          } else if (newQuantity > 0) {
            const remainder = newQuantity % packOf;
            if (remainder !== 0 && newQuantity > packOf) {
              newQuantity = rawNumber;
            }
          }
        }

        if (newQuantity > maxQty) {
          newQuantity = maxQty;
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

        if (isFullstrip && packOf && packOf > 0) {
          if (newQuantity <= 0 || newQuantity < packOf) {
            newQuantity = packOf;
          } else {
            const halfPack = packOf / 2;
            const roundedMultiple = Math.round((newQuantity + halfPack - 1) / packOf) * packOf;

            if (roundedMultiple < packOf) {
              newQuantity = packOf;
            } else {
              newQuantity = roundedMultiple;
            }
          }
        }

        if (newQuantity > maxQty) {
          newQuantity = maxQty;

          if (isFullstrip && packOf) {
            newQuantity = Math.floor(newQuantity / packOf) * packOf;
            if (newQuantity < packOf) {
              newQuantity = packOf;
            }
          }
        }

        const minQty = isFullstrip && packOf ? packOf : 1;
        if (newQuantity < minQty) {
          newQuantity = minQty;
        }

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

  const handleDateChange = (value: any) => {
    if (!value) return;

    const dateStr = `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T00:00:00Z`;
    setNextDeliveryDate(dateStr);
  };

  const calculateNextDeliveryDate = (frequencyDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + frequencyDays);
    return date.toISOString().split('T')[0] + 'T00:00:00Z';
  };

  const isSubmittingRef = useRef(false);

  const handleCreateSale = async () => {
    if (isSubmittingRef.current || isCreating) {
      return;
    }

    isSubmittingRef.current = true;

    try {
      let hasError = false;

      if (!customerName.trim()) {
        setCustomerNameError("Customer name is required");
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
        patientName: customerName.trim(),
        patientMobile: customerMobile.trim() || undefined,
        paymentMethod,
        paymentNotes: paymentNotes.trim() || undefined,
        subscriptionId: subscriptionId,
        items: selectedItems.map((item) => ({
          pharmacyStockMedicineId: item.selectedBatchId,
          quantity: item.quantity,
          discountPercent: item.discountPercent || 0,
        })),
      };

      const response = await createSale(payload).unwrap();

      await updateDeliveryDate({
        id: subscriptionId!,
        body: { nextDeliveryDate },
      }).unwrap();

      setOriginalNextDeliveryDate(nextDeliveryDate);

      addToast({
        title: "Invoice generated successfully",
        color: "success",
      });

      navigate("/pharmacy/patient-subscription", {
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

  // Render subscription medicines as cards - UPDATED with same design as ProcessPrescription
  const renderSubscriptionMedicines = () => {
    if (!subscriptionMedicines.length) {
      return <div className="text-sm text-default-500">No medicines in this subscription.</div>;
    }

    return (
      <div className="grid sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {subscriptionMedicines.map((medicine, index) => {
          const hasStock = medicine.totalAvailableQty > 0;
          const isFullstrip = isFullstripMedicine(medicine.tags || []);

          let hasValidBatch = false;
          if (isFullstrip && medicine.packOf) {
            hasValidBatch = medicine.availableBatches.some(
              (batch) => parseNumber(batch.quantity) >= medicine.packOf!
            );
          } else {
            hasValidBatch = medicine.availableBatches.some(
              (batch) => parseNumber(batch.quantity) > 0
            );
          }

          const isAvailable = hasStock && hasValidBatch;

          return (
            <div
              key={`${medicine.medicineName}-${index}`}
              onClick={() => {
                if (isAvailable) {
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
                ${isAvailable
                  ? "border-slate-200 cursor-pointer hover:shadow-md hover:border-green-300"
                  : "border-red-200 cursor-default"
                }
              `}
            >
              <div className="flex items-center gap-3 h-full">
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
                    ${isAvailable
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
                  <h4 className="font-semibold text-[15px] text-slate-900 truncate flex items-center gap-1">
                    {medicine.medicineName}
                    {isFullstrip && medicine.packOf && (
                      <span className="text-[10px] text-blue-600 font-normal">
                        (Pack of {medicine.packOf})
                      </span>
                    )}
                  </h4>

                  <p className="text-[12px] text-slate-500 mt-1 truncate">
                    Qty: {medicine.quantity} • {medicine.form || ""}
                  </p>

                  <div
                    className={`mt-2 text-xs font-semibold ${isAvailable
                        ? "text-green-600"
                        : "text-red-600"
                      }`}
                  >
                    {isAvailable ? "Available" : "Not Available"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!subscriptionId) {
    return <div className="text-danger">Subscription ID is missing.</div>;
  }

  if (isSubscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="Loading subscription..." />
      </div>
    );
  }

  if (isSubscriptionError) {
    return (
      <div className="h-60 flex items-center justify-center text-danger">
        Unable to load subscription details.
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
            onPress={() => navigate("/pharmacy/patient-subscription")}
            className="h-10 w-10 rounded-lg border border-slate-200 dark:border-[#273244]"
          >
            <FiArrowLeft className="text-lg" />
          </Button>

          <div>
            <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
              Generate Sale from Subscription
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
              Generate a sale for customer subscription
            </p>
          </div>
        </div>
      </div>

      {/* ── Customer Details & Billing Summary Side by Side ── */}
      <div className="md:sticky top-0 z-50 pt-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Details Card */}
          <Card className="shadow-sm border border-slate-200 dark:border-[#273244]">
            <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
              <h3 className="text-[16px] font-semibold text-slate-950 dark:text-white">Customer Details</h3>
            </CardHeader>
            <CardBody className="pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Customer Name</label>
                  <Input
                    value={customerName}
                    onValueChange={(value) => {
                      setCustomerName(value);
                      if (value.trim()) setCustomerNameError("");
                    }}
                    autoFocus
                    isRequired
                    readOnly
                    isInvalid={!!customerNameError}
                    errorMessage={customerNameError}
                    placeholder="Enter customer name"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Customer Mobile</label>
                  <Input
                    value={customerMobile}
                    readOnly
                    placeholder="Enter mobile number"
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Frequency</label>
                  <Input
                    value={`Every ${frequencyDays} days`}
                    readOnly
                    startContent={<FiCalendar className="text-default-400" />}
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-slate-100 shadow-sm dark:border-[#273244] dark:bg-[#111726] mt-1",
                      input: "text-[14px] text-slate-700 dark:text-white",
                    }}
                  />
                </div>

                <div>
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-white">Next Delivery Date</label>
                  <div className="mt-1">
                    <I18nProvider locale="en-IN">
                      <DatePicker
                        value={nextDeliveryDate ? parseDate(nextDeliveryDate.split('T')[0]) : null}
                        onChange={(value) => {
                          if (value) {
                            handleDateChange({
                              year: value.year,
                              month: value.month,
                              day: value.day,
                            });
                          }
                        }}
                        isDisabled={isUpdatingDeliveryDate}
                        minValue={today(getLocalTimeZone())}
                        classNames={{
                          inputWrapper: "h-11 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                          input: "text-[14px] text-slate-700 dark:text-white",
                        }}
                      />
                    </I18nProvider>
                    {isUpdatingDeliveryDate && (
                      <span className="text-xs text-primary-500">Updating...</span>
                    )}
                  </div>
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
                      shadow-sm
                    "
                  >
                    <span className="text-xs font-medium text-slate-700">
                      Press
                    </span>

                    <kbd className="px-2 py-1 bg-primary text-white rounded text-xs font-bold shadow-sm min-w-[20px] text-center">
                      C
                    </kbd>

                    <span className="text-xs text-slate-700">
                      3 times in 1 sec to Complete Bill
                    </span>
                  </div>
                )}

                <Button
                  color="primary"
                  onPress={handleOpenPaymentModal}
                  isDisabled={isCreating || isSubmittingRef.current || !customerName.trim() || selectedItems.length === 0}
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
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Subscription Medicines ── */}
      <Card className="shadow-sm border border-slate-200 dark:border-[#273244]">
        <CardHeader className="border-b border-slate-100 dark:border-[#273244]">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-950 dark:text-white">Subscription Medicines</h2>
            <p className="text-[13px] font-medium text-slate-500 dark:text-white">
              Click on any available medicine to search in stock
            </p>
          </div>
        </CardHeader>

        <CardBody>
          {renderSubscriptionMedicines()}
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
    </div>
  );
};

export default GenerateSaleFromSubscription;