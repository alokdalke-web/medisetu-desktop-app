// src/pages/pharmacy/AddStockModal.tsx

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import InputField from "../../components/shared/InputField";
import AppButton from "../../components/shared/AppButton";
import { FiX, FiSearch } from "react-icons/fi";
import { addToast } from "@heroui/react";
import {
  useSearchMedicineSuggestionsQuery,
  useLazySearchMedicineAllQuery,
  useLazyGetDrugStaticQuery,
} from "../../redux/api/medicineApi";
import { useCreateStockMutation } from "../../redux/api/stocksApi";
import { useSelector } from "react-redux";

const stockSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  supplierName: z.string().min(1, "Supplier name is required"),
  quantity: z.number().int().positive("Quantity must be a positive number"),
  batchNo: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  mrp: z.number().positive("MRP must be a positive number"),
  discount: z.number().min(0).max(100, "Discount must be between 0 and 100"),
});

type StockFormData = z.infer<typeof stockSchema>;

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose }) => {
  const { control, handleSubmit, reset, setValue } = useForm<StockFormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      medicineName: "",
      supplierName: "",
      quantity: 0,
      batchNo: "",
      expiryDate: "",
      mrp: 0,
      discount: 0,
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  // 🔹 selected medicine payload that will go inside "medicine"
  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
  // 🔹 strip quantity (tablets per strip) – default 1
  const [stripQty, setStripQty] = useState<number>(1);

  // Get current user (pharmacy)
  const { user } = useSelector((state: any) => state.auth);

  const [createStock, { isLoading: isCreating }] = useCreateStockMutation();

  // lazy queries
  const [triggerSearchAll] = useLazySearchMedicineAllQuery();
  const [triggerDrugStatic] = useLazyGetDrugStaticQuery();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch medicine suggestions from API
  const {
    data: suggestionsData,
    isLoading,
    isFetching,
  } = useSearchMedicineSuggestionsQuery(
    { q: debouncedQuery, city: "Indore", per_page: 10 },
    { skip: debouncedQuery.length < 2 }
  );

  const suggestions =
    suggestionsData?.result?.suggestions || suggestionsData?.suggestions || [];
  const isSearching = isLoading || isFetching;

  const stripHtmlTags = (html: string) => html.replace(/<[^>]*>/g, "");

  // ✅ helper: try to extract number from something like "10 tablets"
  const extractNumber = (val: any): number | null => {
    if (!val) return null;
    const match = String(val).match(/(\d+)/);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    return Number.isNaN(n) || n <= 0 ? null : n;
  };

  // ✅ when user selects a medicine from suggestions
  const handleMedicineSelect = async (suggestion: any) => {
    const cleanName =
      suggestion.search_term || stripHtmlTags(suggestion.name || "");

    // set field + UI
    setValue("medicineName", cleanName);
    setSearchQuery(cleanName);
    setIsFocused(false);

    // reset selection
    setSelectedMedicine(null);
    setStripQty(1);

    try {
      // 1) /medicine/search/all
      const args: any = {
        q: cleanName,
        city: "Indore",
        per_page: 10,
      };
      if (suggestion.search_term) args.search_term = suggestion.search_term;
      if (suggestion.url) args.url = suggestion.url;

      const allRes = await triggerSearchAll(args).unwrap();

      const rows: any[] =
        allRes?.data?.search_results ?? allRes?.results ?? allRes?.items ?? [];

      if (!rows.length) {
        // at least keep basic info
        setSelectedMedicine({
          drugSkuId: "",
          name: cleanName,
          genericName: "",
          manufacturer: null,
          composition: "",
          form: "",
          strength: "",
          packSize: "",
          category: "",
          requiresPrescription: false,
          imageUrl: "",
        });
        return;
      }

      const firstDrug =
        rows.find((r) =>
          (r?.type ?? "").toString().toLowerCase().includes("drug")
        ) || rows[0];

      const skuId = firstDrug.id ?? firstDrug.sku_id;

      // pack size (if available) – from search/all
      const packSizeFromAll =
        firstDrug.packSize ?? firstDrug.pack_size ?? firstDrug.packsize ?? "";

      const initialStripQty = extractNumber(packSizeFromAll) ?? 1;
      setStripQty(initialStripQty);

      // base payload from /search/all
      let medPayload: any = {
        drugSkuId: skuId ? String(skuId) : "",
        name: firstDrug.name || cleanName,
        genericName: firstDrug.generic_name || "",
        manufacturer:
          firstDrug.manufacturer_name ?? firstDrug.manufacturer ?? null,
        composition: firstDrug.composition || firstDrug.short_composition || "",
        form: firstDrug.form || "",
        strength: firstDrug.strength || "",
        packSize: packSizeFromAll ? String(packSizeFromAll) : "",
        category: firstDrug.therapeutic_class || "",
        requiresPrescription: !!firstDrug.requiresPrescription,
        imageUrl:
          firstDrug.imageUrl ||
          firstDrug.image_url ||
          firstDrug.thumbnail ||
          "",
      };

      setSelectedMedicine(medPayload);

      if (!skuId) return;

      // 2) /medicine/drug-static/{skuId}
      try {
        const drugStaticRes = await triggerDrugStatic(String(skuId)).unwrap();
        const core =
          drugStaticRes?.data?.data ??
          drugStaticRes?.data ??
          drugStaticRes ??
          {};

        const comp = core.composition ?? {};
        const sku = core.sku ?? {};

        const manufacturerName =
          sku.manufacturer?.name ??
          sku.marketer?.name ??
          medPayload.manufacturer ??
          null;

        const genericName = comp.name || medPayload.genericName || "";
        const strengthText =
          comp.strength?.display_text || medPayload.strength || "";
        const compositionStr = strengthText
          ? `${genericName} ${strengthText}`.trim()
          : genericName;

        const category = sku.therapeutic_class || medPayload.category || "";

        const requiresRx =
          !!(
            sku.summary?.prescription_required ||
            core.summary?.prescription_required
          ) || medPayload.requiresPrescription;

        const images = sku.images ?? [];
        const imgObj = images[0] ?? {};
        const imageUrl =
          imgObj.mediumhigh ||
          imgObj.high ||
          imgObj.medium ||
          imgObj.low ||
          imgObj.thumbnail ||
          medPayload.imageUrl ||
          "";

        const packSizeFinal =
          sku.pack_size ||
          sku.packSize ||
          packSizeFromAll ||
          medPayload.packSize;

        const finalStripQty =
          extractNumber(packSizeFinal) ?? initialStripQty ?? 1;
        setStripQty(finalStripQty);

        medPayload = {
          ...medPayload,
          drugSkuId: skuId ? String(skuId) : medPayload.drugSkuId,
          name: sku.name || medPayload.name,
          genericName,
          manufacturer: manufacturerName,
          composition: compositionStr,
          form: sku.pack_form || medPayload.form,
          strength: strengthText,
          packSize: packSizeFinal ? String(packSizeFinal) : "",
          category,
          requiresPrescription: requiresRx,
          imageUrl,
        };

        setSelectedMedicine(medPayload);

        // ✅ Auto-fill MRP & Discount
        const prices = firstDrug.prices ?? sku.prices ?? null;

        if (prices?.mrp) {
          const mrpStr = String(prices.mrp);
          const mrpNum = parseFloat(mrpStr.replace(/[^\d.]/g, ""));
          if (!Number.isNaN(mrpNum) && mrpNum > 0) {
            setValue("mrp", mrpNum);
          }
        }

        if (prices?.discount) {
          const discStr = String(prices.discount);
          const match = discStr.match(/(\d+(\.\d+)?)/);
          if (match) {
            const discNum = parseFloat(match[1]);
            if (!Number.isNaN(discNum) && discNum >= 0 && discNum <= 100) {
              setValue("discount", discNum);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch drug-static:", err);
      }
    } catch (err) {
      console.error("Failed to fetch /medicine/search/all:", err);
    }
  };

  // Single close handler
  const handleClose = () => {
    setIsFocused(false);
    setSearchQuery("");
    setSelectedMedicine(null);
    setStripQty(1);
    reset();
    onClose();
  };

  // ✅ UPDATED: include pricePerStrip + price in payload
  const onSubmit = async (data: StockFormData) => {
    const pharmacyId = user?.pharmacyDetails?.pharmacyId;

    if (!pharmacyId) {
      addToast({
        title: "Error",
        description: "Pharmacy information not found. Please login again.",
        color: "danger",
      });
      return;
    }

    if (!selectedMedicine) {
      addToast({
        title: "Select medicine",
        description: "Please search and select a medicine before adding stock.",
        color: "warning",
      });
      return;
    }

    try {
      const totalStrips = data.quantity; // total strips in this stock
      const pricePerStrip = data.mrp; // using form "Price/MRP" as per-strip price
      const totalPrice = pricePerStrip * totalStrips;

      // 🔥 FINAL PAYLOAD (added pricePerStrip & price)

      const payload = {
        pharmacyId, // string
        supplierName: data.supplierName, // string
        batchNumber: data.batchNo, // string
        totalStrips, // number
        stripQuantity: stripQty, // number (tablets per strip)
        expiryDate: data.expiryDate, // string (YYYY-MM-DD)
        pricePerStrip, // ✅ new
        price: totalPrice, // ✅ new (overall price/value)
        medicine: selectedMedicine, // nested object
      };

      await createStock(payload).unwrap();

      addToast({
        title: "Success",
        description: "Stock added successfully",
        color: "success",
      });

      handleClose();
    } catch (error: any) {
      console.error("Failed to add stock:", error);
      addToast({
        title: "Error",
        description: error?.data?.message || "Failed to add stock",
        color: "danger",
      });
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon */}
        <button
          onClick={handleClose}
          className="absolute right-6 top-6 rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            <svg
              className="h-8 w-8 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-gray-900">
            Add New Stock
          </h2>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-8 pb-8 pt-2 space-y-6"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Medicine Name with autocomplete */}
            <div className="relative">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Medicine Name
              </label>
              <Controller
                name="medicineName"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <div className="relative">
                      <input
                        {...field}
                        type="text"
                        placeholder="Search name"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          field.onChange(e.target.value);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                          setTimeout(() => setIsFocused(false), 200);
                        }}
                        autoComplete="off"
                        className="w-full rounded-full border border-gray-200 px-4 py-2.5 pl-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-300"
                      />
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    {fieldState.error && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldState.error.message}
                      </p>
                    )}

                    {isFocused && searchQuery.length >= 2 && (
                      <div className="absolute left-0 right-0 z-[100] mt-2 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl">
                        {isSearching ? (
                          <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                            <div className="h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                            Searching...
                          </div>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((medicine: any, index: number) => {
                            const displayName =
                              medicine.search_term ||
                              stripHtmlTags(medicine.name || "");
                            return (
                              <button
                                key={index}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  void handleMedicineSelect(medicine);
                                }}
                                className="group w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-teal-50"
                              >
                                <div className="font-medium text-gray-800 group-hover:text-teal-700">
                                  {displayName}
                                </div>
                                {medicine.label && (
                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {medicine.label}
                                  </div>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No medicines found for "{searchQuery}"
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              />
            </div>

            {/* Supplier Name */}
            <InputField
              control={control}
              name="supplierName"
              label="Supplier Name"
              placeholder="Enter Name"
              type="text"
            />

            {/* Quantity (total strips) */}
            <InputField
              control={control}
              name="quantity"
              label="Quantity"
              placeholder="Enter Qty"
              type="number"
            />

            {/* Price (MRP) */}
            <InputField
              control={control}
              name="mrp"
              label="Price"
              placeholder="00"
              type="number"
            />

            {/* Batch No */}
            <InputField
              control={control}
              name="batchNo"
              label="Batch No."
              placeholder="Enter number"
              type="text"
            />

            {/* Expiry Date */}
            <InputField
              control={control}
              name="expiryDate"
              label="Expiry Date"
              placeholder="DD/MM/YYYY"
              type="date"
              min={today}
            />
            {/* Discount */}
            <InputField
              control={control}
              name="discount"
              label="Discount (%)"
              placeholder="Enter discount percentage"
              type="number"
            />
          </div>

          {/* Footer buttons */}
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
            <button
              type="button"
              onClick={handleClose}
              className="h-12 rounded-full border border-teal-500 px-8 text-sm font-medium text-teal-600 transition-colors hover:bg-teal-50"
            >
              Cancel
            </button>
            <AppButton
              text={isCreating ? "Adding..." : "Add Stock"}
              type="submit"
              isLoading={isCreating}
              className="h-12 flex-1 rounded-full"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStockModal;
