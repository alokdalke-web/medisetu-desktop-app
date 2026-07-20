import React, { useState, useMemo, useEffect } from "react";
import { I18nProvider } from "@react-aria/i18n";
import { useNavigate, useParams } from "react-router";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
  DatePicker,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Autocomplete,
  AutocompleteItem,
  Spinner,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { FiArrowLeft, FiPlus, FiSave, FiTrash2, FiEye, FiFileText, FiUpload } from "react-icons/fi";
import {
  useGetAllSuppliersQuery,
  useGetAllMedicinesQuery,
  useLazyGetAllMedicinesQuery,
  useAddMedicineMutation,
  useGetStockByIdQuery,
  useUpdateStockMutation,
  useUploadStockInvoiceMutation,
  AddMedicineRequest,
  Medicine,
  StockPaymentStatus,
} from "../../redux/api/pharmaciesApi";
import InvoiceScannerModal from "./InvoiceUploadModal";
import MedicineFormModal from "./MedicineFormModal";

/* ======================== TYPES ======================== */

interface MedicineRow {
  id: string;
  pharmacyMedicineId: string;
  medicineName: string;
  batch: string;
  expiry: any;
  quantity: string;
  mrp: string;
  cost: string;
}

interface FormData {
  supplierId: string;
  purchaseDate: any;
  paymentStatus: StockPaymentStatus | "";
  paymentNotes: string;
  invoice: File | null;
  invoiceUrl: string | null;
  medicines: MedicineRow[];
}

interface MedicineRowErrors {
  pharmacyMedicineId?: string;
  batch?: string;
  expiry?: string;
  quantity?: string;
  mrp?: string;
  cost?: string;
}

interface FormErrors {
  purchaseDate?: string;
  paymentStatus?: string;
  medicines: {
    [key: string]: MedicineRowErrors;
  };
}

/* ======================== HELPERS ======================== */

const calculateTotalCost = (
  quantity: string,
  cost: string
): number => {
  const qty = parseFloat(quantity) || 0;
  const c = parseFloat(cost) || 0;
  return qty * c;
};

const formatDateToYYYYMMDD = (date: any) => {
  if (!date) return undefined;
  return date.toString();
};

const convertStringToCalendarDate = (dateString: string) => {
  const date = new Date(dateString);
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
};

/* ======================== COMPONENT ======================== */

const PharmacistEditStock: React.FC = () => {
  const navigate = useNavigate();
  const tomorrow = today(getLocalTimeZone()).add({ days: 1 });
  const { id } = useParams<{ id: string }>();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedInvoiceUrl, setSelectedInvoiceUrl] = useState<string | null>(
    null
  );

  const [formData, setFormData] = useState<FormData>({
    supplierId: "",
    purchaseDate: null,
    paymentStatus: "paid",
    paymentNotes: "",
    invoice: null,
    invoiceUrl: null,
    medicines: [],
  });

  const [invoiceFileName, setInvoiceFileName] = useState<string>("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [_sPressCount, setSPressCount] = useState(0);
  const [showShortcutAnimation, setShowShortcutAnimation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({
    medicines: {},
  });

  /* ======================== SUPPLIER STATES ======================== */

  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const [supplierInputValue, setSupplierInputValue] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  /* ======================== MEDICINE STATES ======================== */

  const [medicineSearches, setMedicineSearches] = useState<{
    [key: string]: string;
  }>({});

  const [isMedicineDropdownOpen, setIsMedicineDropdownOpen] = useState<{
    [key: string]: boolean;
  }>({});
  const [debouncedActiveMedicineSearch, setDebouncedActiveMedicineSearch] =
    useState("");
  const [isMedicineFormOpen, setIsMedicineFormOpen] = useState(false);
  const [medicineCreationRowId, setMedicineCreationRowId] = useState<string | null>(null);
  const [newMedicineName, setNewMedicineName] = useState("");

  /* ======================== API HOOKS ======================== */

  const { data: stockData, isLoading: stockLoading } = useGetStockByIdQuery(
    { id: id || "" },
    {
      skip: !id,
    }
  );

  const { data: suppliersData, isLoading: suppliersLoading } =
    useGetAllSuppliersQuery(
      {
        pageNumber: 1,
        pageSize: 10,
        status: "active",
        search: debouncedSupplierSearch || undefined,
      },
      {
        skip: !isSupplierDropdownOpen,
      }
    );

  const activeMedicineSearch = useMemo(() => {
    const openedRowId = Object.entries(isMedicineDropdownOpen).find(
      ([_, isOpen]) => isOpen
    )?.[0];

    if (!openedRowId) return undefined;

    return medicineSearches[openedRowId]?.trim();
  }, [medicineSearches, isMedicineDropdownOpen]);

  const shouldFetchMedicines = useMemo(() => {
    return Object.values(isMedicineDropdownOpen).some(Boolean);
  }, [isMedicineDropdownOpen]);

  const { data: medicinesData, isLoading: medicinesLoading } =
    useGetAllMedicinesQuery(
      {
        pageNumber: 1,
        pageSize: 10,
        status: "active",
        search: debouncedActiveMedicineSearch || undefined,
      },
      {
        skip: !shouldFetchMedicines,
      }
    );

  const [updateStock, { isLoading: isUpdatingStock }] =
    useUpdateStockMutation();
  const [addMedicine, { isLoading: isAddingMedicine }] =
    useAddMedicineMutation();
  const [findCreatedMedicine] = useLazyGetAllMedicinesQuery();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedActiveMedicineSearch(activeMedicineSearch || "");
    }, 500);
    return () => clearTimeout(timer);
  }, [activeMedicineSearch]);

  const [uploadInvoice, { isLoading: isUploadingInvoice }] =
    useUploadStockInvoiceMutation();

  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
  };

  const suppliers = suppliersData?.data || [];
  const medicines = medicinesData?.data || [];

  const paymentStatusOptions = [
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partial", label: "Partial" },
  ];

  /* ======================== EFFECT: POPULATE FORM DATA ======================== */

  useEffect(() => {
    if (stockData?.data) {
      const stock = stockData.data;

      setFormData({
        supplierId: stock.pharmacySupplierId || "",
        purchaseDate: convertStringToCalendarDate(
          stock.purchaseDate
        ),
        paymentStatus: (stock.pharmacyStockPaymentStatus as StockPaymentStatus) || "paid",
        paymentNotes: stock.paymentNotes || "",
        invoice: null,
        invoiceUrl: stock.invoice || null,
        medicines: stock.medicines.map((med: any) => ({
          id: med.id,
          pharmacyMedicineId: med.pharmacyMedicineId,
          medicineName: med.medicineName,
          batch: med.batch || "",
          expiry: convertStringToCalendarDate(med.expiry),
          quantity: med.quantity.toString(),
          mrp: med.mrp,
          cost: med.cost,
        })),
      });

      setSupplierInputValue(stock.supplierName || "");

      const initialMedicineSearches: { [key: string]: string } = {};
      stock.medicines.forEach((med: any) => {
        initialMedicineSearches[med.id] = med.medicineName;
      });
      setMedicineSearches(initialMedicineSearches);
    }
  }, [stockData]);

  /* ======================== HANDLERS ======================== */

  const handleSupplierChange = (key: any) => {
    const value = key || "";

    setFormData((prev) => ({
      ...prev,
      supplierId: value,
    }));

    const selectedSupplier = suppliers.find(
      (supplier: any) => supplier.id === value
    );

    setSupplierInputValue(selectedSupplier?.supplierName || "");

    setIsSupplierDropdownOpen(false);
  };

  const handleClearSupplier = () => {
    setFormData((prev) => ({
      ...prev,
      supplierId: "",
    }));

    setSupplierInputValue("");
    setSupplierSearch("");
  };

  const handlePurchaseDateChange = (date: any) => {
    setFormData((prev) => ({
      ...prev,
      purchaseDate: date,
    }));

    setErrors((prev) => ({
      ...prev,
      purchaseDate: undefined,
    }));
  };

  const handlePaymentStatusChange = (
    keys: React.Key | Iterable<React.Key>
  ) => {
    const selectedKey = Array.from(keys as Iterable<React.Key>)[0];

    setFormData((prev) => ({
      ...prev,
      paymentStatus: selectedKey as StockPaymentStatus,
    }));

    setErrors((prev) => ({
      ...prev,
      paymentStatus: undefined,
    }));
  };

  // const handleInvoiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];

  //   if (file) {
  //     const maxSize = 5 * 1024 * 1024;

  //     const validTypes = [
  //       "application/pdf",
  //       "image/jpeg",
  //       "image/png",
  //       "image/jpg",
  //     ];

  //     if (!validTypes.includes(file.type)) {
  //       addToast({
  //         title: "Invalid File Type",
  //         description: "Please upload a PDF, JPG, or PNG file",
  //         color: "danger",
  //       });
  //       return;
  //     }

  //     if (file.size > maxSize) {
  //       addToast({
  //         title: "File Too Large",
  //         description: "Maximum file size is 5MB",
  //         color: "danger",
  //       });
  //       return;
  //     }

  //     setFormData((prev) => ({
  //       ...prev,
  //       invoice: file,
  //     }));

  //     setInvoiceFileName(file.name);
  //   }
  // };

  const handleMedicineChange = (
    rowId: string,
    field: keyof MedicineRowErrors | keyof MedicineRow,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((med) => {
        if (med.id !== rowId) return med;

        const updatedMed = {
          ...med,
          [field]: value,
        };

        const mrp = parseFloat(updatedMed.mrp || "0");
        const cost = parseFloat(updatedMed.cost || "0");

        if (
          updatedMed.cost &&
          updatedMed.mrp &&
          cost > mrp
        ) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            medicines: {
              ...prevErrors.medicines,
              [rowId]: {
                ...prevErrors.medicines[rowId],
                cost: "Cost cannot be greater than MRP",
              },
            },
          }));
        } else {
          setErrors((prevErrors) => ({
            ...prevErrors,
            medicines: {
              ...prevErrors.medicines,
              [rowId]: {
                ...prevErrors.medicines[rowId],
                cost: undefined,
              },
            },
          }));
        }

        return updatedMed;
      }),
    }));
  };

  const openMedicineForm = (rowId: string) => {
    const searchedName = (medicineSearches[rowId] || "").trim();
    if (!searchedName) return;

    setMedicineCreationRowId(rowId);
    setNewMedicineName(searchedName.toUpperCase());
    setIsMedicineFormOpen(true);
  };

  const selectMedicineForRow = (rowId: string, medicine: Medicine) => {
    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.map((med) =>
        med.id === rowId
          ? {
            ...med,
            pharmacyMedicineId: medicine.id,
            medicineName: medicine.medicineName,
          }
          : med
      ),
    }));

    setMedicineSearches((prev) => ({
      ...prev,
      [rowId]: medicine.medicineName,
    }));
    setErrors((prev) => ({
      ...prev,
      medicines: {
        ...prev.medicines,
        [rowId]: {
          ...prev.medicines[rowId],
          pharmacyMedicineId: undefined,
        },
      },
    }));
  };

  const handleMedicineSelect = (rowId: string, key: any) => {
    if (key === "add-new-medicine") {
      openMedicineForm(rowId);
      return;
    }

    const selectedMedicine = medicines.find((m: any) => m.id === key);

    if (selectedMedicine) {
      selectMedicineForRow(rowId, selectedMedicine);
    }

    setIsMedicineDropdownOpen((prev) => ({
      ...prev,
      [rowId]: false,
    }));
  };

  const handleCreateMedicine = async (data: AddMedicineRequest) => {
    if (!medicineCreationRowId) return;

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
        const result = await findCreatedMedicine({
          pageNumber: 1,
          pageSize: 10,
          status: "active",
          search: data.medicineName,
        }).unwrap();
        createdMedicine = result.data.find(
          (medicine) =>
            medicine.medicineName.trim().toLowerCase() ===
            data.medicineName.trim().toLowerCase()
        );
      }

      if (!createdMedicine) {
        throw new Error("Created medicine could not be loaded");
      }

      selectMedicineForRow(medicineCreationRowId, createdMedicine);
      setIsMedicineFormOpen(false);
      setMedicineCreationRowId(null);

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

  //   const handleAddMedicine = () => {
  //     const newId = (
  //       Math.max(
  //         ...formData.medicines.map((m) => parseInt(m.id) || 0),
  //         0
  //       ) + 1
  //     ).toString();

  //     const newRow: MedicineRow = {
  //       id: newId,
  //       pharmacyMedicineId: "",
  //       medicineName: "",
  //       batch: "",
  //       expiry: null,
  //       quantity: "",
  //       mrp: "",
  //       cost: "",
  //     };

  //     setFormData((prev) => ({
  //       ...prev,
  //       medicines: [...prev.medicines, newRow],
  //     }));

  //     setMedicineSearches((prev) => ({
  //       ...prev,
  //       [newId]: "",
  //     }));

  //     setIsMedicineDropdownOpen((prev) => ({
  //       ...prev,
  //       [newId]: false,
  //     }));
  //   };

  const handleAddMedicine = () => {
    const newId = `temp-${Date.now()}`;

    const newRow: MedicineRow = {
      id: newId,
      pharmacyMedicineId: "",
      medicineName: "",
      batch: "",
      expiry: null,
      quantity: "",
      mrp: "",
      cost: "",
    };

    setFormData((prev) => ({
      ...prev,
      medicines: [...prev.medicines, newRow],
    }));

    setMedicineSearches((prev) => ({
      ...prev,
      [newId]: "",
    }));

    setIsMedicineDropdownOpen((prev) => ({
      ...prev,
      [newId]: false,
    }));
  };

  const handleRemoveMedicine = (rowId: string) => {
    if (formData.medicines.length === 1) {
      addToast({
        title: "Error",
        description: "At least one medicine is required",
        color: "danger",
      });

      return;
    }

    setFormData((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((m) => m.id !== rowId),
    }));
  };

  const handleViewInvoice = (invoiceUrl: string | null) => {
    if (!invoiceUrl) {
      return;
    }
    setSelectedInvoiceUrl(invoiceUrl);
    onOpen();
  };

  /* ======================== VALIDATION ======================== */

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      medicines: {},
    };

    let isValid = true;

    // PURCHASE DATE
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = "Purchase date is required";

      isValid = false;
    }

    // PAYMENT STATUS
    if (!formData.paymentStatus) {
      newErrors.paymentStatus = "Payment status is required";

      isValid = false;
    }

    // MEDICINES
    formData.medicines.forEach((medicine) => {
      const medicineErrors: MedicineRowErrors = {};

      if (!medicine.pharmacyMedicineId) {
        medicineErrors.pharmacyMedicineId = "Please select medicine";

        isValid = false;
      }

      if (!medicine.batch.trim()) {
        medicineErrors.batch =
          "Batch number is required";

        isValid = false;
      }

      if (!medicine.expiry) {
        medicineErrors.expiry = "Expiry date is required";

        isValid = false;
      }

      if (
        !medicine.quantity ||
        parseFloat(medicine.quantity) <= 0
      ) {
        medicineErrors.quantity =
          "Quantity must be greater than 0";

        isValid = false;
      }

      if (!medicine.mrp || parseFloat(medicine.mrp) <= 0) {
        medicineErrors.mrp = "MRP must be greater than 0";

        isValid = false;
      }

      if (!medicine.cost || parseFloat(medicine.cost) <= 0) {
        medicineErrors.cost = "Cost must be greater than 0";

        isValid = false;
      }

      if (
        medicine.cost &&
        medicine.mrp &&
        parseFloat(medicine.cost) > parseFloat(medicine.mrp)
      ) {
        medicineErrors.cost = "Cost cannot be greater than MRP";
        isValid = false;
      }

      if (Object.keys(medicineErrors).length > 0) {
        newErrors.medicines[medicine.id] = medicineErrors;
      }
    });

    setErrors(newErrors);

    return isValid;
  };

  /* ======================== SUBMIT ======================== */

  const handleSubmit = async () => {
    if (!validateForm()) return false;

    if (!id) {
      addToast({
        title: "Error",
        description: "Stock ID not found",
        color: "danger",
      });
      return false;
    }

    try {
      setIsLoading(true);

      const purchaseDateStr = formatDateToYYYYMMDD(
        formData.purchaseDate
      );

      const stockPayload = {
        supplierId: formData.supplierId === "" ? null : formData.supplierId,
        purchaseDate: purchaseDateStr,
        pharmacyStockPaymentStatus: formData.paymentStatus as StockPaymentStatus,
        paymentNotes: (formData.paymentNotes || "").toString().trim().length > 0 ? formData.paymentNotes : null,
        medicines: formData.medicines.map((med) => ({
          id: med.id.startsWith("temp-") ? undefined : med.id,
          pharmacyMedicineId: med.pharmacyMedicineId,
          ...(med.batch.trim() && {
            batch: med.batch.trim(),
          }),
          expiry: formatDateToYYYYMMDD(med.expiry),
          quantity: parseInt(med.quantity),
          mrp: parseFloat(med.mrp),
          cost: parseFloat(med.cost),
        })),
      } as any;

      // If existing invoice was removed (no new file and invoiceUrl explicitly null), instruct backend to clear it
      if (!formData.invoice && formData.invoiceUrl === null && stockData?.data?.invoice) {
        (stockPayload as any).invoice = null;
      }

      await updateStock({
        stockId: id,
        body: stockPayload,
      }).unwrap();

      if (formData.invoice) {
        await uploadInvoice({
          stockId: id,
          file: formData.invoice,
        }).unwrap();
      }

      addToast({
        title: "Success",
        description: "Stock updated successfully",
        color: "success",
      });

      navigate("/pharmacy/stock");
      return true;
    } catch (error: any) {
      console.error("Error:", error);

      addToast({
        title: "Error",
        description:
          error?.data?.message || error?.message || "Failed to update stock",
        color: "danger",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSaveModal = () => {
    if (!validateForm()) return;
    setShowSaveModal(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowShortcutAnimation(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key.toLowerCase() === "s") {
        setSPressCount((prev) => {
          const next = prev + 1;

          if (next === 1) {
            timer = setTimeout(() => {
              setSPressCount(0);
            }, 1000);
          }

          if (next >= 3) {
            if (isUpdatingStock || isUploadingInvoice || isLoading) {
              return 0;
            }
            setSPressCount(0);
            handleOpenSaveModal();
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
  }, [formData, isUpdatingStock, isUploadingInvoice, isLoading]);

  /* ======================== COMPUTED ======================== */

  const grandTotal = useMemo(() => {
    return formData.medicines.reduce((total, med) => {
      return (
        total +
        calculateTotalCost(med.quantity, med.cost)
      );
    }, 0);
  }, [formData.medicines]);

  const isLoadingForm = isUpdatingStock || isUploadingInvoice || isLoading;

  if (stockLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner label="Loading stock..." />
      </div>
    );
  }

  /* ======================== RENDER ======================== */

  return (
    <div className="w-full space-y-6">
      {/* HEADER */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="flat"
              onPress={() => navigate("/pharmacy/stock")}
              className="h-10 w-10 rounded-lg border border-slate-200 dark:border-[#273244]"
            >
              <FiArrowLeft className="text-lg" />
            </Button>

            <div>
              <h2 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
                Edit Stock
              </h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
                Edit this stock of inventory
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {showShortcutAnimation && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary-50 border border-primary-200 animate-pulse dark:bg-[#111726] dark:border-[#273244]">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Press
                </span>
                <kbd className="px-2 py-0.5 bg-primary text-white rounded text-xs font-bold">
                  S
                </kbd>
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  3 times to Save
                </span>
              </div>
            )}
            <Button
              color="primary"
              onPress={handleOpenSaveModal}
              isLoading={isLoadingForm}
            >
              <FiSave /> Update Stock
            </Button>
          </div>
        </div>
      </div>

      {/* INVOICE DETAILS */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">
            Invoice Details
          </h2>
        </CardHeader>

        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SUPPLIER */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Supplier{" "}
                <span className="text-slate-400">
                  (Optional)
                </span>
              </label>

              <Autocomplete
                placeholder="Search or select supplier"
                maxLength={50}
                inputValue={supplierInputValue}
                inputProps={{
                  classNames: {
                    inputWrapper: "h-10 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                    input: "text-[14px] text-slate-700 dark:text-white",
                  },
                  onKeyDown: (e) => {
                    if (e.key === "Tab") {
                      setIsSupplierDropdownOpen(false);
                    }
                  },
                }}
                onInputChange={(value) => {
                  setSupplierSearch(value);
                  setSupplierInputValue(value);
                }}
                selectedKey={formData.supplierId}
                onSelectionChange={handleSupplierChange}
                isLoading={suppliersLoading}
                isClearable
                allowsCustomValue={false}
                onClear={handleClearSupplier}
                onOpenChange={(isOpen) => {
                  setIsSupplierDropdownOpen(isOpen);

                  if (!isOpen) {
                    setSupplierSearch("");
                  }
                }}
                classNames={{
                  base: "w-full",
                }}
              >
                {suppliersLoading ? (
                  <AutocompleteItem
                    key="loading"
                    textValue="Loading suppliers..."
                    isReadOnly
                  >
                    <div className="flex items-center gap-2">
                      <Spinner size="sm" />
                      <span>
                        Loading suppliers...
                      </span>
                    </div>
                  </AutocompleteItem>
                ) : suppliers.length === 0 &&
                  supplierSearch ? (
                  <AutocompleteItem
                    key="no-results"
                    textValue="No suppliers found"
                    isReadOnly
                  >
                    No suppliers found
                  </AutocompleteItem>
                ) : (
                  suppliers.map((supplier: any) => (
                    <AutocompleteItem
                      key={supplier.id}
                      textValue={supplier.supplierName}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {supplier.supplierName}
                        </span>

                        <span className="text-xs text-default-500">
                          {supplier.contactPerson ||
                            "N/A"}{" "}
                          •{" "}
                          {supplier.phone || "N/A"}
                        </span>
                      </div>
                    </AutocompleteItem>
                  ))
                )}
              </Autocomplete>
            </div>

            {/* PURCHASE DATE */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Purchase Date{" "}
                <span className="text-red-500">
                  *
                </span>
              </label>

              <I18nProvider locale="en-IN">
                <DatePicker
                  value={formData.purchaseDate}
                  showMonthAndYearPickers
                  onChange={handlePurchaseDateChange}
                  isInvalid={!!errors.purchaseDate}
                  errorMessage={errors.purchaseDate}
                  className="w-full"
                  classNames={{
                    inputWrapper: "h-10 min-h-10 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                  }}
                />
              </I18nProvider>
            </div>

            {/* INVOICE */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Invoice{" "}
                <span className="text-slate-400">
                  (Optional)
                </span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className="flex items-center justify-center w-full h-10 px-4 bg-white dark:bg-[#111726] border border-dashed border-slate-300 dark:border-[#273244] rounded-lg cursor-pointer hover:border-primary transition-colors text-slate-600 dark:text-slate-400"
                  >
                    <FiUpload className="mr-2" />
                    <span className="text-sm truncate">
                      {invoiceFileName || (formData.invoiceUrl ? "Upload new invoice" : "Upload Invoice")}
                    </span>
                  </button>
                </div>

                {formData.invoiceUrl && !formData.invoice && (
                  <Button
                    isIconOnly
                    color="secondary"
                    variant="flat"
                    onPress={() => handleViewInvoice(formData.invoiceUrl)}
                    title="View current invoice"
                  >
                    <FiEye className="text-lg" />
                  </Button>
                )}

                {formData.invoiceUrl && !formData.invoice && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => {
                      // Remove existing invoice reference so backend can be sent null
                      setFormData((prev) => ({ ...prev, invoiceUrl: null }));
                      setInvoiceFileName("");
                    }}
                    title="Remove current invoice"
                  >
                    <FiTrash2 className="text-lg" />
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                PDF, JPG, PNG (Max. 5MB)
              </p>
            </div>

            {formData.invoice && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 col-span-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-red-500" />
                    <div>
                      <p className="text-sm font-medium">{invoiceFileName}</p>
                      <p className="text-xs text-slate-500">
                        {formatBytes(formData.invoice.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => {
                      setFormData(prev => ({ ...prev, invoice: null }));
                      setInvoiceFileName("");
                    }}
                  >
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            )}

            {/* Show existing invoice info if no new file uploaded */}
            {/* {formData.invoiceUrl && !formData.invoice && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 col-span-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiFileText className="text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Current Invoice</p>
                      <p className="text-xs text-slate-500">Existing invoice attached</p>
                    </div>
                  </div>

                  <div>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => {
                        setFormData((prev) => ({ ...prev, invoice: null, invoiceUrl: null }));
                        setInvoiceFileName("");
                        addToast({
                          title: "Invoice removed",
                          description: "Invoice will be removed on save",
                          color: "success",
                        });
                      }}
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                </div>
              </div>
            )} */}

            <InvoiceScannerModal
              isOpen={isScannerModalOpen}
              onOpenChange={setIsScannerModalOpen}
              onInvoiceSelected={(file) => {
                const maxSize = 5 * 1024 * 1024; // 5MB
                const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

                if (!validTypes.includes(file.type)) {
                  addToast({
                    title: "Invalid File Type",
                    description: "Please upload a PDF, JPG, or PNG file",
                    color: "danger",
                  });
                  return;
                }

                if (file.size > maxSize) {
                  addToast({
                    title: "File Too Large",
                    description: "Maximum file size is 5MB",
                    color: "danger",
                  });
                  return;
                }

                setFormData((prev) => ({
                  ...prev,
                  invoice: file,
                  // Clear the existing invoice URL since we're replacing it
                  invoiceUrl: null,
                }));
                setInvoiceFileName(file.name);
              }}
            />
          </div>
        </CardBody>
      </Card>

      {/* MEDICINES */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold">
            Edit Medicines
          </h2>
        </CardHeader>

        <CardBody>
          <div className="overflow-x-auto">
            <Table
              aria-label="Medicines table"
              removeWrapper
              className="w-full"
              classNames={{
                td: "align-top",
              }}
            >
              <TableHeader>
                <TableColumn width={50}>
                  #
                </TableColumn>

                <TableColumn>
                  Medicine{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  Batch Number{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  Expiry{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  QTY{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  MRP (₹){" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  Cost (₹){" "}
                  <span className="text-red-500">
                    *
                  </span>
                </TableColumn>

                <TableColumn>
                  Total Cost (₹)
                </TableColumn>

                <TableColumn width={60}>
                  Action
                </TableColumn>
              </TableHeader>

              <TableBody>
                {formData.medicines.map((medicine, index) => {
                  const totalCost = calculateTotalCost(
                    medicine.quantity,
                    medicine.cost
                  );

                  return (
                    <TableRow key={medicine.id}>
                      <TableCell>{index + 1}</TableCell>

                      {/* MEDICINE */}
                      <TableCell className="min-w-[220px]">
                        <Autocomplete
                          placeholder="Search medicine"
                          maxLength={50}
                          inputProps={{
                            classNames: {
                              inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                              input: "text-[13px] text-slate-700 dark:text-white",
                            }
                          }}
                          classNames={{
                            base: "w-full",
                          }}
                          selectedKey={
                            medicine.pharmacyMedicineId
                          }
                          onSelectionChange={(key) =>
                            handleMedicineSelect(
                              medicine.id,
                              key
                            )
                          }
                          isInvalid={
                            !!errors.medicines[medicine.id]
                              ?.pharmacyMedicineId
                          }
                          errorMessage={
                            errors.medicines[medicine.id]
                              ?.pharmacyMedicineId
                          }
                          inputValue={
                            medicineSearches[
                            medicine.id
                            ] || ""
                          }
                          onInputChange={(value) => {
                            setMedicineSearches((prev) => ({
                              ...prev,
                              [medicine.id]: value,
                            }));

                            setIsMedicineDropdownOpen(
                              (prev) => ({
                                ...prev,
                                [medicine.id]: true,
                              })
                            );
                          }}
                          isLoading={medicinesLoading}
                          allowsCustomValue={false}
                          onOpenChange={(isOpen) =>
                            setIsMedicineDropdownOpen(
                              (prev) => ({
                                ...prev,
                                [medicine.id]: isOpen,
                              })
                            )
                          }
                        >
                          {medicinesLoading ? (
                            <AutocompleteItem
                              key="loading"
                              textValue="Loading..."
                              isReadOnly
                            >
                              <Spinner size="sm" />
                            </AutocompleteItem>
                          ) : medicines.length === 0 &&
                            (medicineSearches[medicine.id] || "").trim() ? (
                            <AutocompleteItem
                              key="add-new-medicine"
                              textValue={`Add ${medicineSearches[medicine.id]}`}
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
                                  onPress={() => openMedicineForm(medicine.id)}
                                  className="shrink-0 font-medium"
                                >
                                  Add medicine
                                </Button>
                              </div>
                            </AutocompleteItem>
                          ) : (
                            medicines.map((med: any) => (
                              <AutocompleteItem
                                key={med.id}
                                textValue={med.medicineName}
                              >
                                {med.medicineName}
                              </AutocompleteItem>
                            ))
                          )}
                        </Autocomplete>
                      </TableCell>

                      {/* BATCH */}
                      <TableCell className="min-w-[150px]">
                        <Input
                          placeholder="Enter batch"
                          value={medicine.batch}
                          maxLength={50}
                          onValueChange={(value) =>
                            handleMedicineChange(
                              medicine.id,
                              "batch",
                              value
                            )
                          }
                          isInvalid={
                            !!errors.medicines[medicine.id]
                              ?.batch
                          }
                          errorMessage={
                            errors.medicines[medicine.id]
                              ?.batch
                          }
                          size="sm"
                          classNames={{
                            inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                            input: "text-[13px] text-slate-700 dark:text-white",
                          }}
                        />
                      </TableCell>

                      {/* EXPIRY */}
                      <TableCell className="min-w-[180px]">
                        <I18nProvider locale="en-IN">
                          <DatePicker
                            value={medicine.expiry}
                            showMonthAndYearPickers
                            onChange={(value) =>
                              handleMedicineChange(
                                medicine.id,
                                "expiry",
                                value
                              )
                            }
                            isInvalid={
                              !!errors.medicines[medicine.id]
                                ?.expiry
                            }
                            errorMessage={
                              errors.medicines[medicine.id]
                                ?.expiry
                            }
                            className="w-full"
                            minValue={tomorrow}
                            classNames={{
                              inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                            }}
                          />
                        </I18nProvider>
                      </TableCell>

                      {/* QUANTITY */}
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          placeholder="Enter qty"
                          value={medicine.quantity}
                          onValueChange={(value) => {
                            if (value === '' || /^\d+$/.test(value)) {
                              handleMedicineChange(medicine.id, "quantity", value);
                            }
                          }}
                          isInvalid={
                            !!errors.medicines[medicine.id]
                              ?.quantity
                          }
                          errorMessage={
                            errors.medicines[medicine.id]
                              ?.quantity
                          }
                          size="sm"
                          classNames={{
                            inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                            input: "text-[13px] text-slate-700 dark:text-white",
                          }}
                        />
                      </TableCell>

                      {/* MRP */}
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          placeholder="Enter MRP"
                          value={medicine.mrp}
                          onValueChange={(value) => {
                            if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                              handleMedicineChange(medicine.id, "mrp", value);
                            }
                          }}
                          isInvalid={
                            !!errors.medicines[medicine.id]
                              ?.mrp
                          }
                          errorMessage={
                            errors.medicines[medicine.id]
                              ?.mrp
                          }
                          size="sm"
                          classNames={{
                            inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                            input: "text-[13px] text-slate-700 dark:text-white",
                          }}
                        />
                      </TableCell>

                      {/* COST */}
                      <TableCell className="min-w-[120px]">
                        <Input
                          type="number"
                          placeholder="Enter cost"
                          value={medicine.cost}
                          onValueChange={(value) => {
                            if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
                              handleMedicineChange(medicine.id, "cost", value);
                            }
                          }}
                          isInvalid={
                            !!errors.medicines[medicine.id]
                              ?.cost
                          }
                          errorMessage={
                            errors.medicines[medicine.id]
                              ?.cost
                          }
                          size="sm"
                          classNames={{
                            inputWrapper: "h-9 min-h-9 rounded-lg border border-slate-200 bg-white shadow-sm dark:border-[#273244] dark:bg-[#111726]",
                            input: "text-[13px] text-slate-700 dark:text-white",
                          }}
                        />
                      </TableCell>

                      {/* TOTAL COST */}
                      <TableCell>
                        <div className="text-sm font-semibold">
                          ₹ {totalCost.toFixed(2)}
                        </div>
                      </TableCell>

                      {/* ACTION */}
                      <TableCell>
                        <Button
                          isIconOnly
                          color="danger"
                          variant="light"
                          size="sm"
                          onPress={() =>
                            handleRemoveMedicine(
                              medicine.id
                            )
                          }
                        >
                          <FiTrash2 className="text-lg" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button
            color="primary"
            variant="flat"
            startContent={<FiPlus />}
            onPress={handleAddMedicine}
            className="mt-4 w-50 sm:w-50"
          >
            Add Medicine
          </Button>

          {/* GRAND TOTAL */}
          <div className="flex justify-end mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-2">
              <div className="flex gap-4 text-lg font-semibold">
                <span>Grand Total:</span>
                <span className="text-primary">
                  ₹ {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* INVOICE PREVIEW MODAL */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "h-[90vh]",
        }}
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>Invoice Preview</ModalHeader>
              <ModalBody className="p-0">
                {selectedInvoiceUrl ? (
                  <iframe
                    src={selectedInvoiceUrl}
                    title="Invoice PDF"
                    width="100%"
                    height="100%"
                    className="min-h-[75vh] border-0"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[75vh]">
                    No invoice available
                  </div>
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <MedicineFormModal
        isOpen={isMedicineFormOpen}
        onOpenChange={setIsMedicineFormOpen}
        initialData={{
          medicineName: newMedicineName,
          status: "active",
        }}
        onSubmit={(data) => handleCreateMedicine(data as AddMedicineRequest)}
        isLoading={isAddingMedicine}
        title="Add Medicine"
        submitLabel="Add"
      />

      {/* ── Save Stock Confirmation Modal ── */}
      <Modal
        isOpen={showSaveModal}
        onOpenChange={setShowSaveModal}
        size="lg"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-slate-100 dark:border-[#273244]">
                <h2 className="text-[18px] font-semibold text-slate-900 dark:text-white">Save Stock Details</h2>
              </ModalHeader>

              <ModalBody className="pt-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 dark:border-[#273244] p-4 bg-slate-50 dark:bg-[#111726]">
                    <div className="flex justify-between mb-2">
                      <span className="text-[13px] font-medium text-slate-500 dark:text-white">Total Medicines</span>
                      <strong className="text-[14px] text-slate-900 dark:text-white">{formData.medicines.length}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[13px] font-medium text-slate-500 dark:text-white">Grand Total</span>
                      <strong className="text-lg text-primary">
                        ₹{grandTotal.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <Select
                    label="Payment Status"
                    selectedKeys={formData.paymentStatus ? new Set([formData.paymentStatus]) : new Set([])}
                    onSelectionChange={handlePaymentStatusChange}
                    isInvalid={!!errors.paymentStatus}
                    errorMessage={errors.paymentStatus}
                    disallowEmptySelection
                    classNames={{
                      trigger: "h-11 rounded-lg border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726]",
                      label: "text-[13px] font-semibold text-slate-700 dark:text-white",
                      value: "text-[14px] text-slate-900 dark:text-white",
                    }}
                  >
                    {paymentStatusOptions.map((option) => (
                      <SelectItem key={option.key} textValue={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Payment Notes"
                    placeholder="Optional notes"
                    value={formData.paymentNotes}
                    maxLength={100}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentNotes: value,
                      }))
                    }
                    classNames={{
                      inputWrapper: "h-11 rounded-lg border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726]",
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
                  isLoading={isLoadingForm}
                  onPress={async () => {
                    const success = await handleSubmit();
                    if (success) {
                      onClose();
                    }
                  }}
                  className="h-10 px-6 bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  Confirm & Update Stock
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default PharmacistEditStock;
