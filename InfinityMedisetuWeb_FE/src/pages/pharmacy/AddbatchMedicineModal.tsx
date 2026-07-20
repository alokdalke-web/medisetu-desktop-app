import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteItem,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
} from "@heroui/react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  useCreateProductMutation,
  useLazySearchProductsQuery,
  useLazyGetInventoryCategoriesQuery,
  useLazyGetInventoryManufacturersQuery,
  useLazySearchHsnCodesQuery,
  type HsnCodeDto,
} from "../../redux/api/productApi";

import AppButton from "../../components/shared/AppButton";
import InputField from "../../components/shared/InputField";

/* ----------------------------- Types ----------------------------- */

export type FormState = {
  productId?: string;

  medicine: string; // drugName
  brandName: string; // optional
  strength: string;
  composition: string;
  category: string;

  expiryDate: string;
  qty: string;
  mrp: string;
  purchasePrice: string;
  gstPercentage: string;
  sellingPrice: string;
};

const emptyForm = (): FormState => ({
  productId: "",
  medicine: "",
  brandName: "",
  strength: "",
  composition: "",
  category: "",
  expiryDate: "",
  qty: "",
  mrp: "",
  purchasePrice: "",
  gstPercentage: "",
  sellingPrice: "",
});

type CreateMedicineForm = {
  drugName: string;
  strength: string;
  composition: string;
  packSize: string;
  categoryName: string;
  manufacturerName: string;
  hsnCode?: string;
  gstPercentage?: number;
  isPrescriptionRequired: boolean;
};

const emptyCreateMedicineForm = (): CreateMedicineForm => ({
  drugName: "",
  strength: "",
  composition: "",
  packSize: "",
  categoryName: "",
  manufacturerName: "",
  hsnCode: "",
  gstPercentage: 0,
  isPrescriptionRequired: false,
});

type SearchForm = { query: string };

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initial?: FormState;
  onSave: (values: FormState) => void;
};

/* ----------------------------- UI helpers ----------------------------- */

function normalizeProducts(res: any): any[] {
  const raw = res?.result ?? res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result?.data)) return raw.result.data;
  if (Array.isArray(raw?.result)) return raw.result;
  return [];
}

function normalizeNameList(res: any, preferKey: string): string[] {
  const raw = res?.result ?? res?.data ?? res;

  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.result)
        ? raw.result
        : Array.isArray(raw?.result?.data)
          ? raw.result.data
          : [];

  const names = arr
    .map((x: any) =>
      String(x?.[preferKey] ?? x?.name ?? x?.title ?? x ?? "").trim(),
    )
    .filter(Boolean);

  return Array.from(new Set(names));
}

function onlyIntText(v: string) {
  return (v || "").replace(/\D/g, "");
}

function onlyMoneyText(v: string) {
  const cleaned = (v || "").replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

const getIdFromProduct = (p: any) =>
  String(p?.productId ?? p?.id ?? p?._id ?? p?.uuid ?? "").trim();

/* ----------------------------- Component ----------------------------- */

type Step = "search" | "createMedicine" | "batchDetails";

const AddbatchMedicineModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  mode,
  initial,
  onSave,
}) => {
  const [step, setStep] = useState<Step>(
    mode === "edit" ? "batchDetails" : "search",
  );

  // ✅ RHF forms (so we can use InputField everywhere)
  const searchForm = useForm<SearchForm>({ defaultValues: { query: "" } });
  const batchForm = useForm<FormState>({ defaultValues: emptyForm() });
  const createForm = useForm<CreateMedicineForm>({
    defaultValues: emptyCreateMedicineForm(),
  });

  const medicineQuery = useWatch({
    control: searchForm.control,
    name: "query",
  });
  const batchValues = useWatch({ control: batchForm.control });
  const createValues = useWatch({ control: createForm.control });

  // Auto-calculate selling price when GST or Purchase Price changes
  useEffect(() => {
    if (step !== "batchDetails") return;

    const purchaseVal = batchValues.purchasePrice;
    const gstVal = batchValues.gstPercentage;

    if (!purchaseVal) return;

    const purchase = parseFloat(purchaseVal);
    const gst = parseFloat(gstVal || "0");
    const mrp = parseFloat(batchValues.mrp || "0");

    if (Number.isNaN(purchase)) return;

    // Calculation: Purchase + (Purchase * GST / 100)
    let calculated = purchase * (1 + gst / 100);

    // Cap at MRP
    if (mrp > 0 && calculated > mrp) {
      calculated = mrp;
    }

    // Round to 2 decimals
    const formatted = calculated.toFixed(2);

    // Update Selling Price if different
    const currentSelling = batchForm.getValues("sellingPrice");
    if (currentSelling !== formatted) {
      batchForm.setValue("sellingPrice", formatted, { shouldValidate: true });
    }
  }, [
    batchValues.purchasePrice,
    batchValues.gstPercentage,
    batchValues.mrp,
    step,
    batchForm,
  ]);

  // dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const todayYMD = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const minDate = todayYMD();

  // ✅ prevent repeated API calls for same query
  const lastSearchRef = useRef<string>("");
  const hsnTimeoutRef = useRef<any>(null);

  const [triggerSearch, { data: searchRes, isFetching }] =
    useLazySearchProductsQuery();

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();

  // ✅ LAZY categories/manufacturers
  const [
    fetchCategories,
    { data: categoriesRes, isFetching: isCategoriesFetching },
  ] = useLazyGetInventoryCategoriesQuery();

  const [
    fetchManufacturers,
    { data: manufacturersRes, isFetching: isManufacturersFetching },
  ] = useLazyGetInventoryManufacturersQuery();

  const [searchHsnCodes, { data: hsnRes, isFetching: isHsnFetching }] =
    useLazySearchHsnCodesQuery();

  const categoryOptions = useMemo(
    () => normalizeNameList(categoriesRes, "categoryName"),
    [categoriesRes],
  );

  const manufacturerOptions = useMemo(
    () => normalizeNameList(manufacturersRes, "manufacturerName"),
    [manufacturersRes],
  );

  const hsnOptions = useMemo(() => {
    const payload = hsnRes?.result ?? hsnRes?.data;
    let list: any[] = [];
    if (Array.isArray(payload)) list = payload;
    // @ts-ignore
    else if (Array.isArray(payload?.data)) list = payload.data;

    return list.map((item) => ({
      ...item,
      hsnCode: item.hsnCode || item.hsn_code,
      gstPercentage: item.gstPercentage ?? item.gst_percentage,
    })) as HsnCodeDto[];
  }, [hsnRes]);

  // reset on open
  useEffect(() => {
    if (!isOpen) return;

    const f = initial ?? emptyForm();
    batchForm.reset(f);
    searchForm.reset({ query: f.medicine || "" });
    createForm.reset(emptyCreateMedicineForm());

    setDropdownOpen(false);
    lastSearchRef.current = "";

    setStep(mode === "edit" ? "batchDetails" : "search");
  }, [isOpen, initial, mode, batchForm, searchForm, createForm]);

  // close dropdown on outside click (search dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // debounce search (✅ call API only after typing stops + avoid same query)
  useEffect(() => {
    if (!isOpen) return;
    if (step !== "search") return;

    const q = String(medicineQuery || "").trim();
    if (q.length < 2) {
      setDropdownOpen(false);
      lastSearchRef.current = "";
      return;
    }

    const t = window.setTimeout(() => {
      const key = q.toLowerCase();

      if (lastSearchRef.current === key) {
        setDropdownOpen(true);
        return;
      }

      lastSearchRef.current = key;
      triggerSearch(q, true);
      setDropdownOpen(true);
    }, 500);

    return () => window.clearTimeout(t);
  }, [medicineQuery, triggerSearch, isOpen, step]);

  // ✅ when entering createMedicine step: hit both GET APIs once
  useEffect(() => {
    if (!isOpen) return;
    if (step !== "createMedicine") return;

    fetchCategories();
    fetchManufacturers();
  }, [isOpen, step, fetchCategories, fetchManufacturers]);

  const apiProducts = useMemo(() => normalizeProducts(searchRes), [searchRes]);

  const suggestions = useMemo(() => {
    const q = String(medicineQuery || "")
      .trim()
      .toLowerCase();
    if (q.length < 2) return [];

    return apiProducts.filter((p) => {
      const drug = String(p?.drugName ?? p?.name ?? "").toLowerCase();
      const sku = String(p?.sku ?? "").toLowerCase();
      const manufacturer = String(
        p?.manufacturer ?? p?.manufacturerName ?? "",
      ).toLowerCase();
      const category = String(
        p?.category ?? p?.categoryName ?? "",
      ).toLowerCase();
      const strength = String(p?.strength ?? "").toLowerCase();

      return (
        drug.includes(q) ||
        sku.includes(q) ||
        manufacturer.includes(q) ||
        category.includes(q) ||
        strength.includes(q)
      );
    });
  }, [apiProducts, medicineQuery]);

  const noMatch = useMemo(() => {
    const q = String(medicineQuery || "").trim();
    if (q.length < 2) return false;
    return !isFetching && suggestions.length === 0;
  }, [medicineQuery, isFetching, suggestions.length]);

  const canSaveMedicine = useMemo(() => {
    const packNum = Number(createValues.packSize);

    const reqOk =
      String(createValues.drugName || "").trim().length > 0 &&
      String(createValues.strength || "").trim().length > 0 &&
      String(createValues.composition || "").trim().length > 0 &&
      String(createValues.categoryName || "").trim().length > 0 &&
      String(createValues.manufacturerName || "").trim().length > 0 &&
      String(createValues.packSize || "").trim().length > 0 &&
      Number.isFinite(packNum) &&
      packNum > 0;

    return reqOk;
  }, [createValues]);

  const pickProduct = (p: any) => {
    const id = getIdFromProduct(p);
    if (!id) {
      addToast({
        title: "Product id missing in selected item",
        color: "danger",
      });
      return;
    }

    const drugName = String(p?.drugName ?? p?.name ?? "").trim();
    const brandName = String(p?.brandName ?? p?.manufacturer ?? "").trim();
    const strength = String(p?.strength ?? "").trim();
    const composition = String(p?.composition ?? "").trim();
    const categoryName = String(p?.categoryName ?? p?.category ?? "").trim();

    batchForm.setValue("productId", id);
    batchForm.setValue("medicine", drugName);
    batchForm.setValue("brandName", brandName);
    batchForm.setValue("strength", strength);
    batchForm.setValue("composition", composition);
    batchForm.setValue("category", categoryName);

    batchForm.setValue("mrp", "");
    batchForm.setValue(
      "gstPercentage",
      p?.gstPercentage
        ? String(p.gstPercentage)
        : p?.gst_percentage
          ? String(p.gst_percentage)
          : "",
    );
    batchForm.setValue("purchasePrice", "");
    batchForm.setValue("sellingPrice", "");

    searchForm.setValue("query", drugName);
    setDropdownOpen(false);
    setStep("batchDetails");
  };

  const goToCreateMedicine = () => {
    const seed = String(medicineQuery || "").trim();

    createForm.reset({
      ...emptyCreateMedicineForm(),
      drugName: (seed || "").toUpperCase(),
      strength: batchValues.strength || "",
      composition: batchValues.composition || "",
      categoryName: batchValues.category || "",
      packSize: "",
      manufacturerName: "",
    });

    setDropdownOpen(false);
    setStep("createMedicine");
  };

  const validateCreateMedicine = () => {
    const v = createForm.getValues();

    if (!String(v.drugName || "").trim()) {
      addToast({ title: "Drug Name is required", color: "danger" });
      return false;
    }
    if (!String(v.strength || "").trim()) {
      addToast({ title: "Strength is required", color: "danger" });
      return false;
    }
    if (!String(v.composition || "").trim()) {
      addToast({ title: "Composition is required", color: "danger" });
      return false;
    }

    const packNum = Number(v.packSize);
    if (
      !String(v.packSize || "").trim() ||
      !Number.isFinite(packNum) ||
      packNum <= 0
    ) {
      addToast({
        title: "Pack Size must be a valid number > 0",
        color: "danger",
      });
      return false;
    }

    if (!String(v.categoryName || "").trim()) {
      addToast({ title: "Category Name is required", color: "danger" });
      return false;
    }
    if (!String(v.manufacturerName || "").trim()) {
      addToast({ title: "Manufacturer Name is required", color: "danger" });
      return false;
    }

    return true;
  };

  const handleSaveMedicineToInventory = async () => {
    if (!validateCreateMedicine()) return;

    const v = createForm.getValues();

    try {
      const payload: any = {
        drugName: String(v.drugName || "").trim().toUpperCase(),
        strength: String(v.strength || "").trim(),
        composition: String(v.composition || "").trim(),
        packSize: Number(v.packSize),
        categoryName: String(v.categoryName || "").trim(),
        manufacturerName: String(v.manufacturerName || "").trim(),
        hsnCode: String(v.hsnCode || "").trim(),
        gstPercentage: v.gstPercentage ? Number(v.gstPercentage) : undefined,
        isPrescriptionRequired: Boolean(v.isPrescriptionRequired),
      };

      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );

      const res = await createProduct(payload).unwrap();
      const created: any = res?.result ?? res?.data ?? res ?? payload;

      const createdId = getIdFromProduct(created);
      if (!createdId) {
        addToast({
          title: "Created product id not returned by API",
          color: "danger",
        });
        return;
      }

      const drugName = String(
        created?.drugName ?? created?.name ?? v.drugName,
      ).trim();
      const strength = String(created?.strength ?? v.strength).trim();
      const composition = String(created?.composition ?? v.composition).trim();
      const categoryName = String(
        created?.categoryName ?? created?.category ?? v.categoryName,
      ).trim();
      const brandName = String(
        created?.brandName ??
          created?.manufacturerName ??
          created?.manufacturer ??
          "",
      ).trim();

      batchForm.setValue("productId", createdId);
      batchForm.setValue("medicine", drugName);
      batchForm.setValue("brandName", brandName);
      batchForm.setValue("strength", strength);
      batchForm.setValue("composition", composition);
      batchForm.setValue("category", categoryName);

      batchForm.setValue("mrp", "");
      batchForm.setValue(
        "gstPercentage",
        created?.gstPercentage ? String(created.gstPercentage) : "",
      );
      batchForm.setValue("purchasePrice", "");
      batchForm.setValue("sellingPrice", "");

      addToast({ title: "Medicine added to inventory", color: "success" });
      setStep("batchDetails");
    } catch (e: any) {
      const msg =
        e?.data?.message ||
        e?.error ||
        e?.message ||
        "Failed to create medicine";
      addToast({ title: msg, color: "danger" });
    }
  };

  const validateBatchDetails = () => {
    const v = batchForm.getValues();

    if (!String(v.productId || "").trim()) {
      addToast({ title: "Product id missing", color: "danger" });
      return false;
    }
    if (!v.expiryDate) {
      addToast({ title: "Expiry Date is required", color: "danger" });
      return false;
    }

    // Validate expiry date is not in the past
    const expiry = new Date(v.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) {
      addToast({ title: "Expiry date cannot be in the past", color: "danger" });
      return false;
    }

    if (!v.qty || Number(v.qty) <= 0) {
      addToast({ title: "Quantity must be > 0", color: "danger" });
      return false;
    }
    if (Number(v.qty) > 1000000) {
      addToast({ title: "Quantity too large", color: "danger" });
      return false;
    }

    if (v.mrp && Number(v.mrp) <= 0) {
      addToast({ title: "MRP must be > 0", color: "danger" });
      return false;
    }

    if (!v.purchasePrice || Number(v.purchasePrice) <= 0) {
      addToast({ title: "Purchase Price must be > 0", color: "danger" });
      return false;
    }

    if (v.gstPercentage) {
      const gst = Number(v.gstPercentage);

      // GST must be between 0 and 100
      if (gst < 0 || gst > 100) {
        addToast({ title: "GST must be between 0 and 100", color: "danger" });
        return false;
      }

      // Purchase price including GST should not exceed MRP
      const purchasePrice = Number(v.purchasePrice || 0);
      const mrp = Number(v.mrp || 0);

      const priceWithGST = purchasePrice + (purchasePrice * gst) / 100;

      if (priceWithGST > mrp) {
        addToast({
          title: "Purchase price including GST cannot exceed MRP",
          color: "danger",
        });
        return false;
      }
    }
    if (!v.sellingPrice || Number(v.sellingPrice) <= 0) {
      addToast({ title: "Selling Price must be > 0", color: "danger" });
      return false;
    }

    if (Number(v.sellingPrice) < Number(v.purchasePrice)) {
      addToast({
        title: "Selling price must be greater than or equal to purchase price",
        color: "danger",
      });
      return false;
    }

    if (Number(v.sellingPrice) > Number(v.mrp)) {
      addToast({
        title: "Selling price must be less than or equal to MRP",
        color: "danger",
      });
      return false;
    }

    return true;
  };

  const handleSaveBatch = (onClose: () => void) => {
    if (!validateBatchDetails()) return;

    const v = batchForm.getValues();

    onSave({
      ...v,
      productId: String(v.productId || "").trim(),
      medicine: String(v.medicine || "").trim(),
      brandName: String(v.brandName || "").trim(),
      strength: String(v.strength || "").trim(),
      composition: String(v.composition || "").trim(),
      category: String(v.category || "").trim(),
      qty: String(v.qty || "").trim(),
      mrp: String(v.mrp || "").trim(),
      purchasePrice: String(v.purchasePrice || "").trim(),
      gstPercentage: String(v.gstPercentage || "").trim(),
      sellingPrice: String(v.sellingPrice || "").trim(),
    });

    onClose();
  };

  const headerText = () => {
    if (step === "search") return "Select Medicine";
    if (step === "createMedicine") return "Add Medicine to Inventory";
    return mode === "add" ? "Batch Details" : "Edit Batch Medicine";
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      backdrop="opaque"
      scrollBehavior="inside"
      size="3xl"
      classNames={{
        base: "w-[96vw] max-w-4xl max-h-[95vh] flex flex-col",
        header: "shrink-0 pb-2",
        body: "py-4",
        footer: "shrink-0 pt-2",
        closeButton:
          "top-4 right-4 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {headerText()}

              {step === "search" ? (
                <span className="text-xs text-slate-500 font-normal">
                  Type at least 2 characters to search from inventory.
                </span>
              ) : step === "createMedicine" ? (
                <span className="text-xs text-slate-500 font-normal"></span>
              ) : (
                <span className="text-xs text-slate-500 font-normal">
                  Selected medicine:{" "}
                  <b className="text-slate-800">
                    {batchValues.medicine || "—"}
                  </b>{" "}
                  {mode === "add" ? (
                    <>
                      •{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2"
                        onClick={() => setStep("search")}
                      >
                        Change
                      </button>
                    </>
                  ) : null}
                </span>
              )}
            </ModalHeader>

            <ModalBody>
              {/* STEP 1: SEARCH */}
              {step === "search" ? (
                <div ref={wrapRef}>
                  <InputField<SearchForm>
                    control={searchForm.control}
                    name="query"
                    label="Medicine"
                    placeholder="Type medicine name / SKU (min 2 chars)"
                    onFocus={() => {
                      if (String(medicineQuery || "").trim().length >= 2)
                        setDropdownOpen(true);
                    }}
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  {dropdownOpen ? (
                    <div className="mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                      {isFetching ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Searching...
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="max-h-[280px] overflow-y-auto">
                          {suggestions.map((p) => {
                            const drug = String(p?.drugName ?? p?.name ?? "—");
                            const sku = String(p?.sku ?? "");
                            const strength = String(p?.strength ?? "");
                            const cat = String(
                              p?.category ?? p?.categoryName ?? "",
                            );
                            const mfg = String(
                              p?.manufacturer ?? p?.manufacturerName ?? "",
                            );
                            const pack =
                              p?.packSize != null ? String(p.packSize) : "";
                            const gst =
                              p?.gstPercentage != null &&
                              String(p.gstPercentage).trim() !== ""
                                ? `${p.gstPercentage}%`
                                : "";
                            const mrp = p?.mrp != null ? `₹${p.mrp}` : "";

                            return (
                              <button
                                key={String(
                                  p?.id ??
                                    p?._id ??
                                    p?.productId ??
                                    `${sku}-${drug}-${strength}`,
                                )}
                                type="button"
                                onClick={() => pickProduct(p)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                                title={`${drug}${sku ? ` (${sku})` : ""}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">
                                      {drug}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                      {sku ? (
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                                          {sku}
                                        </span>
                                      ) : null}
                                      {strength ? (
                                        <span>{strength}</span>
                                      ) : null}
                                      {pack ? (
                                        <span>• Pack: {pack}</span>
                                      ) : null}
                                      {gst ? <span>• GST: {gst}</span> : null}

                                      {cat ? (
                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                                          {cat}
                                        </span>
                                      ) : null}

                                      {mfg ? (
                                        <span className="truncate max-w-[260px] text-slate-500">
                                          • {mfg}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {mrp ? (
                                    <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                                      {mrp}
                                    </div>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          No match found.
                        </div>
                      )}

                      {noMatch ? (
                        <div className="sticky bottom-0 px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-600">
                            Not found? Add it to inventory.
                          </div>

                          <AppButton
                            text="+ Add Medicine"
                            buttonVariant="primary"
                            onPress={goToCreateMedicine}
                            className="h-9 px-4 text-sm"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 text-xs text-slate-500">
                    Tip: Select from dropdown to continue.
                  </div>
                </div>
              ) : null}

              {/* STEP 2: CREATE MEDICINE */}
              {step === "createMedicine" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <InputField<CreateMedicineForm>
                    control={createForm.control}
                    name="drugName"
                    label={
                      <>
                        Drug Name <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder="Enter drug name"
                    parse={(v) => v.toUpperCase()}
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<CreateMedicineForm>
                    control={createForm.control}
                    name="composition"
                    label={
                      <>
                        Composition <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder='e.g. "Paracetamol 100(mg), Caffeine 50(mg)"'
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<CreateMedicineForm>
                    control={createForm.control}
                    name="strength"
                    label={
                      <>
                        Strength (mg) <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder="e.g. 100"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<CreateMedicineForm>
                    control={createForm.control}
                    name="packSize"
                    label={
                      <>
                        Pack Size <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder="e.g. 1"
                    parse={(v) => onlyIntText(v)}
                    inputMode="numeric"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  {/* Category (Autocomplete) */}
                  <div className="w-full">
                    <div className=" font-medium text-slate-900 mb-2 ">
                      Category Name <span className="text-red-500">*</span>
                    </div>

                    <Controller
                      control={createForm.control}
                      name="categoryName"
                      render={({ field }) => (
                        <Autocomplete
                          allowsCustomValue
                          isLoading={isCategoriesFetching}
                          inputValue={field.value || ""}
                          onInputChange={(v) => field.onChange(v)}
                          onSelectionChange={(key) => {
                            if (key != null) field.onChange(String(key));
                          }}
                          onFocus={() => fetchCategories()}
                          placeholder="Select or type category"
                          variant="bordered"
                          size="sm"
                          inputProps={{
                            classNames: {
                              inputWrapper:
                                "rounded-xl h-11 bg-white border-slate-200",
                            },
                          }}
                        >
                          {categoryOptions.map((name) => (
                            <AutocompleteItem key={name} textValue={name}>
                              {name}
                            </AutocompleteItem>
                          ))}
                        </Autocomplete>
                      )}
                    />
                  </div>

                  {/* Manufacturer (Autocomplete) */}
                  <div className="w-full">
                    <div className=" font-medium text-slate-900 mb-2">
                      Manufacturer Name <span className="text-red-500">*</span>
                    </div>

                    <Controller
                      control={createForm.control}
                      name="manufacturerName"
                      render={({ field }) => (
                        <Autocomplete
                          allowsCustomValue
                          isLoading={isManufacturersFetching}
                          inputValue={field.value || ""}
                          onInputChange={(v) => field.onChange(v)}
                          onSelectionChange={(key) => {
                            if (key != null) field.onChange(String(key));
                          }}
                          onFocus={() => fetchManufacturers()}
                          placeholder="Select or type manufacturer"
                          variant="bordered"
                          size="sm"
                          inputProps={{
                            classNames: {
                              inputWrapper:
                                "rounded-xl h-11 bg-white border-slate-200",
                            },
                          }}
                        >
                          {manufacturerOptions.map((name) => (
                            <AutocompleteItem key={name} textValue={name}>
                              {name}
                            </AutocompleteItem>
                          ))}
                        </Autocomplete>
                      )}
                    />
                  </div>

                  {/* HSN Code (Autocomplete) */}
                  <div className="w-full">
                    <div className="font-medium text-slate-900 mb-2">
                      HSN Code{" "}
                      <span className="text-xs text-slate-400 font-normal">
                        (Search & Select)
                      </span>
                    </div>

                    <Controller
                      control={createForm.control}
                      name="hsnCode"
                      render={({ field }) => (
                        <Autocomplete
                          allowsCustomValue
                          isLoading={isHsnFetching}
                          inputValue={field.value || ""}
                          onInputChange={(v) => {
                            field.onChange(v);

                            if (hsnTimeoutRef.current)
                              clearTimeout(hsnTimeoutRef.current);
                            hsnTimeoutRef.current = setTimeout(() => {
                              searchHsnCodes({ search: v, page: 1, limit: 20 });
                            }, 500);
                          }}
                          onSelectionChange={(key) => {
                            if (key != null) {
                              field.onChange(String(key));
                            }
                          }}
                          onFocus={() => searchHsnCodes({ page: 1, limit: 20 })}
                          placeholder="Search HSN Code"
                          variant="bordered"
                          size="sm"
                          inputProps={{
                            classNames: {
                              inputWrapper:
                                "rounded-xl h-11 bg-white border-slate-200",
                            },
                          }}
                          items={hsnOptions}
                        >
                          {(hsn) => (
                            <AutocompleteItem
                              key={hsn.hsnCode}
                              textValue={hsn.hsnCode}
                            >
                              <div className="flex flex-col">
                                <span className="text-small font-bold">
                                  {hsn.hsnCode}
                                </span>
                                <span className="text-tiny text-slate-500 truncate max-w-[300px]">
                                  {hsn.description} (GST: {hsn.gstPercentage}%)
                                </span>
                              </div>
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                      )}
                    />
                  </div>

                  <div className="w-full md:col-span-2">
                    <Controller
                      control={createForm.control}
                      name="isPrescriptionRequired"
                      render={({ field }) => (
                        <Checkbox
                          isSelected={!!field.value}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          Prescription Required
                        </Checkbox>
                      )}
                    />
                  </div>
                </div>
              ) : null}

              {/* STEP 3: BATCH DETAILS */}
              {step === "batchDetails" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  <div className="w-full md:col-span-2">
                    <InputField<FormState>
                      control={batchForm.control}
                      name="medicine"
                      label="Medicine"
                      isReadOnly
                      classNames={{
                        inputWrapper:
                          "h-11 bg-slate-50 border-slate-200 rounded-xl",
                      }}
                    />
                  </div>

                  <InputField<FormState>
                    control={batchForm.control}
                    name="expiryDate"
                    label="Expiry Date"
                    type="date"
                    min={minDate}
                    rules={{
                      validate: (v) =>
                        !v || String(v) >= minDate || "Past date not allowed",
                    }}
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<FormState>
                    control={batchForm.control}
                    name="qty"
                    label="Quantity"
                    placeholder="0"
                    parse={(v) => onlyIntText(v)}
                    inputMode="numeric"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<FormState>
                    control={batchForm.control}
                    name="mrp"
                    label={
                      <>
                        MRP (₹) <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder="0.00"
                    parse={(v) => onlyMoneyText(v)}
                    inputMode="decimal"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                  />

                  <InputField<FormState>
                    control={batchForm.control}
                    name="purchasePrice"
                    label="Purchase Price"
                    placeholder="0.00"
                    parse={(v) => onlyMoneyText(v)}
                    inputMode="decimal"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                    rules={{
                      required: "Purchase price is required",
                      validate: (value) => {
                        if (!value) return "Purchase price is required";

                        const val = parseFloat(value);
                        const mrp = parseFloat(
                          batchForm.getValues("mrp") || "0",
                        );

                        if (val > mrp) {
                          return "Purchase price cannot be higher than MRP";
                        }

                        return true;
                      },
                    }}
                  />

                  <InputField<FormState>
                    control={batchForm.control}
                    name="sellingPrice"
                    label="Selling Price"
                    placeholder="0.00"
                    parse={(v) => onlyMoneyText(v)}
                    inputMode="decimal"
                    classNames={{
                      inputWrapper: "h-11 bg-white border-slate-200 rounded-xl",
                    }}
                    rules={{
                      required: "Selling price is required",
                      validate: (value) => {
                        if (!value) return "Selling price is required";
                        const val = parseFloat(value);
                        const mrp = parseFloat(
                          batchForm.getValues("mrp") || "0",
                        );


                        if (val > mrp) {
                          return "Selling price cannot be higher than MRP";
                        }
                        // if (val < purchase) {
                        //   return "Selling price cannot be lower than Purchase Price";
                        // }
                        return true;
                      },
                    }}
                  />
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter className="flex items-center gap-2">
              {step === "batchDetails" && mode === "add" ? (
                <AppButton
                  text="Change Medicine"
                  buttonVariant="outlined"
                  onPress={() => setStep("search")}
                  className="h-10 px-5 text-sm"
                />
              ) : (
                <span />
              )}

              <AppButton
                text="Cancel"
                buttonVariant="outlined"
                onPress={onClose}
                className="h-10 px-5 text-sm"
              />

              {step === "createMedicine" ? (
                <AppButton
                  text="Save Medicine"
                  buttonVariant="primary"
                  isLoading={isCreating}
                  isDisabled={!canSaveMedicine}
                  onPress={handleSaveMedicineToInventory}
                  className="h-10 px-6 text-sm"
                />
              ) : step === "batchDetails" ? (
                <AppButton
                  text={mode === "add" ? "Save" : "Update"}
                  buttonVariant="primary"
                  onPress={() => handleSaveBatch(onClose)}
                  className="h-10 px-6 text-sm"
                />
              ) : (
                <AppButton
                  text="Select from list"
                  buttonVariant="primary"
                  isDisabled
                  className="h-10 px-6 text-sm"
                />
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddbatchMedicineModal;
