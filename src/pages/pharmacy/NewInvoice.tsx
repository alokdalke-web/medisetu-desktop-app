// src/pages/pharmacy/NewInvoice.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiFileText, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router";
import { addToast, Spinner } from "@heroui/react";
import { useForm } from "react-hook-form";

import SearchField from "../../components/shared/SearchField";
import InputField from "../../components/shared/InputField";
import {
  useLazySearchInvoiceMedicinesQuery,
  useCreateInvoiceMutation,
  type InvoiceMedicineOption,
} from "../../redux/api/pharmacyApi";
import { useGetUserQuery } from "../../redux/api/authApi";

import InvoiceDetails, { type CreatedInvoiceData } from "./InvoiceDetails";
import AppButton from "../../components/shared/AppButton";
import { phoneValidation } from "../../utils/validation";

/* ----------------------------- Formatters ----------------------------- */
const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

const formatDateShort = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(iso);
  }
};

/* ----------------------------- Types ----------------------------- */
type ClinicInfo = {
  clinicName?: string | null;
  Tagline?: string | null;
  clinicAddress?: string | null;
  Country?: string | null;
  State?: string | null;
  City?: string | null;
  ZipCode?: string | number | null;
};

type PharmacyInfo = {
  name?: string | null;
  address?: string | null;
  contactNumber?: string | null;
  status?: string | boolean | null;
};

type CreatedInvoiceDataWithMeta = CreatedInvoiceData & {
  clinic?: ClinicInfo | null;
  pharmacy?: PharmacyInfo | null;
};

type SelectedRow = {
  rowId: string;
  selected: InvoiceMedicineOption;
  qty: number;
};

type InvoiceFormValues = {
  customerName: string;
  mobile: string;
  doctorName?: string;
};

const clamp01_100 = (n: number) => Math.min(100, Math.max(0, n));

/* ----------------------------- Helpers ----------------------------- */
const toNum = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const only10Digits = (v: string) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

/**
 * ✅ Handles all possible shapes:
 * - backend: { success, message, data: [] }
 * - transformed: { items: [] }
 * - transformed: [] (direct array)
 */
const pickArray = (sr: any): any[] => {
  if (!sr) return [];
  if (Array.isArray(sr)) return sr;
  if (Array.isArray(sr?.data)) return sr.data;
  if (Array.isArray(sr?.items)) return sr.items;
  if (Array.isArray(sr?.data?.items)) return sr.data.items;
  return [];
};

/**
 * ✅ IMPORTANT FIX:
 * Your search API returns:
 * { productId, sku, drugName, packSize, batchItemId, expiryDate, sellingPrice, availableQuantity }
 *
 * We FORCE:
 * stock[0].expiryDate = expiryDate
 * stock[0].sellingPrice = sellingPrice
 */
const normalizeInvoiceOption = (m: any): InvoiceMedicineOption => {
  const s0 =
    (Array.isArray(m?.stock) ? m.stock[0] : null) ??
    (Array.isArray(m?.stockDetails) ? m.stockDetails[0] : null) ??
    (m?.stock && !Array.isArray(m.stock) ? m.stock : null) ??
    {};

  const medicineId = String(
    m?.productId ?? m?.medicineId ?? m?.id ?? "",
  ).trim();
  const sku = String(m?.sku ?? m?.genericName ?? "").trim();
  const name = String(m?.drugName ?? m?.medicineName ?? m?.name ?? "").trim();

  const stripQuantity = toNum(
    s0?.stripQuantity ?? m?.packSize ?? m?.stripQuantity,
    0,
  );

  const expiryDate =
    s0?.expiryDate ??
    (s0 as any)?.expireyDate ??
    m?.expiryDate ??
    (m as any)?.expireyDate ??
    m?.expireDate ??
    m?.expDate ??
    null;

  const sellingPrice = toNum(
    s0?.sellingPrice ??
      (s0 as any)?.selling_price ??
      (s0 as any)?.pricePerStrip ??
      m?.sellingPrice ??
      (m as any)?.selling_price ??
      (m as any)?.pricePerStrip ??
      m?.price ??
      0,
    0,
  );

  const gstPercentage = toNum(
    s0?.gstPercentage ?? m?.gstPercentage ?? m?.gst ?? m?.tax ?? m?.GST ?? 0,
    0,
  );

  const availableStrips = toNum(
    s0?.availableStrips ?? s0?.availableQuantity ?? m?.availableQuantity ?? 0,
    0,
  );

  const batchItemId = String(
    m?.batchItemId ?? (s0 as any)?.batchItemId ?? "",
  ).trim();
  const batchNumber = sku || batchItemId || "—";

  return {
    medicineId,
    name,
    genericName: sku,
    strength: m?.strength != null ? String(m.strength) : "",
    form: String(m?.form ?? ""),

    expiryDate,
    sellingPrice,
    gstPercentage,
    availableQuantity: availableStrips,
    availableStrips,

    batchItemId: batchItemId || undefined,
    stock: [
      {
        ...s0,
        stripQuantity: stripQuantity || undefined,
        batchNumber,
        batchItemId: batchItemId || undefined,

        expiryDate,
        sellingPrice,
        gstPercentage,
        pricePerStrip: sellingPrice,
        availableStrips,
      } as any,
    ],
  } as any;
};

const NewInvoice: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Logged-in user data
  const { data: userResp, isLoading: isUserLoading } = useGetUserQuery();
  const user: any = (userResp as any)?.data ?? userResp;
  const pharmacyId: string = String(user?.pharmacyDetails?.pharmacyId ?? "");

  // ✅ RHF for inputs (replaces local state)
  const { control: rhfControl, getValues } = useForm<InvoiceFormValues>({
    defaultValues: {
      customerName: "",
      mobile: "",
      doctorName: "",
    },
  });

  // Header invoice number (UI only)
  const invoiceNo = useMemo(() => {
    const n = Math.floor(10000 + Math.random() * 90000);
    return `INV-${n}`;
  }, []);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownWrapRef = useRef<HTMLDivElement | null>(null);

  // Selected medicines table rows
  const [rows, setRows] = useState<SelectedRow[]>([]);

  // Bill inputs
  const [discountInput, setDiscountInput] = useState("");

  // (kept as-is; screen won't show because we navigate on success)
  const [createdInvoice, setCreatedInvoice] =
    useState<CreatedInvoiceDataWithMeta | null>(null);

  const [triggerSearch, { data: searchResult, isFetching }] =
    useLazySearchInvoiceMedicinesQuery();

  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

  // ✅ Debounced search
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);

    const t = window.setTimeout(() => {
      triggerSearch(term);
    }, 300);

    return () => window.clearTimeout(t);
  }, [searchTerm, triggerSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = dropdownWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ✅ Normalize search results for UI
  const items: InvoiceMedicineOption[] = useMemo(() => {
    const arr = pickArray(searchResult);
    return arr
      .map(normalizeInvoiceOption)
      .filter((x: any) => x?.medicineId && x?.name);
  }, [searchResult]);

  const upsertRow = (rawOrMapped: any) => {
    const item = normalizeInvoiceOption(rawOrMapped);

    if (!item?.batchItemId) return;

    setRows((prev) => {
      const maxStock = item.availableStrips ?? 0;

      const idx = prev.findIndex(
        (r) => r.selected.batchItemId === item.batchItemId,
      );

      if (idx >= 0) {
        // Prevent over stock
        if (prev[idx].qty >= maxStock) {
          return prev; // or show toast
        }

        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }

      return [
        ...prev,
        {
          rowId: `${item.batchItemId}-${Date.now()}`,
          selected: item,
          qty: 1,
        },
      ];
    });

    setSearchTerm("");
    setShowDropdown(false);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const setQty = (rowId: string, qty: number) => {
    const q = Math.max(1, Math.floor(qty || 1));
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, qty: q } : r)),
    );
  };

  const { subtotal, totalGst } = rows.reduce(
    (acc, r) => {
      const stock: any = (r.selected as any)?.stock?.[0];
      const unitInclusive = toNum(
        stock?.sellingPrice ?? (r.selected as any)?.sellingPrice ?? 0,
        0,
      );
      const gst = toNum(
        stock?.gstPercentage ?? (r.selected as any)?.gstPercentage ?? 0,
        0,
      );

      const basePerUnit =
        gst > 0 ? unitInclusive / (1 + gst / 100) : unitInclusive;
      const gstPerUnit = unitInclusive - basePerUnit;

      const lineTotalExcl = basePerUnit * r.qty;
      const lineGst = gstPerUnit * r.qty;

      acc.subtotal += lineTotalExcl;
      acc.totalGst += lineGst;
      return acc;
    },
    { subtotal: 0, totalGst: 0 },
  );

  const discountPercent = clamp01_100(Number(discountInput) || 0);
  // const taxPercent = clamp01_100(Number(taxInput) || 0);

  // ✅ FIXED: discount first, then tax on discounted subtotal
  const discountAmount = subtotal > 0 ? (subtotal * discountPercent) / 100 : 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Tax is now calculated per item (GST), so we add the total GST here
  // If there was a global tax, we would add it too, but usually it's one or the other or GST is the tax.
  // Assuming GST is the tax.
  const taxAmount = totalGst; // Using calculated GST from items

  // const taxAmount =
  //   discountedSubtotal > 0 ? (discountedSubtotal * taxPercent) / 100 : 0;

  const totalAmount = Math.max(0, discountedSubtotal + taxAmount);

  // ✅ CREATE INVOICE
  const handleCreateClick = async () => {
    if (isUserLoading) {
      addToast({
        title: "Please wait",
        description: "Loading user details...",
        color: "warning",
      });
      return;
    }

    if (!pharmacyId) {
      addToast({
        title: "Missing pharmacy",
        description: "Pharmacy ID not found in user profile (pharmacyDetails).",
        color: "warning",
      });
      return;
    }

    const cn = String(getValues("customerName") ?? "").trim();
    if (!cn) {
      addToast({
        title: "Customer name required",
        description: "Please enter customer name.",
        color: "warning",
      });
      return;
    }

    const mobile10 = only10Digits(String(getValues("mobile") ?? ""));
    if (mobile10.length !== 10) {
      addToast({
        title: "Invalid mobile",
        description: "Please enter a valid 10-digit mobile number.",
        color: "warning",
      });
      return;
    }

    if (rows.length === 0) {
      addToast({
        title: "Missing items",
        description: "Please add at least one medicine.",
        color: "warning",
      });
      return;
    }

    const itemsPayload = rows
      .map((r) => {
        const sel: any = r.selected as any;
        const productId = String(sel.medicineId ?? "").trim();
        const batchItemId = String(sel.batchItemId ?? "").trim();
        const quantity = Math.max(1, Math.floor(r.qty || 1));

        return {
          productId,
          batchItemId,
          quantity,
        };
      })
      .filter((x) => x.productId && x.batchItemId);

    const payload = {
      pharmacyId,
      customerName: cn,
      mobile: mobile10,
      items: itemsPayload,
      billing: {
        paymentMethod: "CASH",
        discount: discountPercent,
      },
    };

    try {
      const res = await createInvoice(payload as any).unwrap();
      const root = (res as any)?.data ?? res;

      const invoiceDetailsArray = root?.invoice?.invoiceDetails;
      const firstDetail = Array.isArray(invoiceDetailsArray)
        ? invoiceDetailsArray[0]
        : undefined;

      addToast({
        title: "Invoice created",
        description: "Invoice has been created successfully.",
        color: "success",
      });

      const createdId =
        firstDetail?.invoice?.id ??
        firstDetail?.invoice?.invoiceId ??
        root?.invoice?.id ??
        root?.invoiceId ??
        null;

      navigate("/pharmacy/invoice", {
        replace: true,
        state: createdId ? { createdInvoiceId: createdId } : undefined,
      });

      if (firstDetail?.invoice) {
        const normalized: CreatedInvoiceData = {
          invoice: {
            ...firstDetail.invoice,
            clinic: firstDetail.clinic ?? null,
            pharmacy: firstDetail.pharmacy ?? null,
          },
          billing: root.billing,
          medicines: root.medicines ?? [],
        } as any;

        setCreatedInvoice(normalized as any);
      }
    } catch (error: any) {
      addToast({
        title: "Failed to create invoice",
        description:
          error?.data?.message || "Something went wrong. Please try again.",
        color: "danger",
      });
    }
  };

  if (createdInvoice) {
    return (
      <div className="w-full h-full px-6 py-4">
        <InvoiceDetails data={createdInvoice as any} />
      </div>
    );
  }

  return (
    <div className="w-full h-full px-6 py-4">
      {/* Top header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 hover:bg-slate-50"
            aria-label="Back"
            title="Back"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
            Create New Invoice
          </div>

          <div className="hidden sm:flex items-center gap-2 text-primary font-semibold">
            <FiFileText className="h-4 w-4" />
            <span className="text-sm">{invoiceNo}</span>
          </div>
        </div>

        <AppButton
          text={isCreating || isUserLoading ? "Creating..." : "Create Invoice"}
          buttonVariant="primary"
          onPress={handleCreateClick}
          isDisabled={isCreating || isUserLoading}
          startContent={
            isCreating || isUserLoading ? <Spinner size="sm" /> : undefined
          }
          className={[
            "w-full md:w-auto",
            "text-sm font-medium px-6",
            isCreating || isUserLoading ? "opacity-70" : "",
          ].join(" ")}
        />
      </div>

      {/* Main card */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-5">
          {/* Inputs row (✅ now using InputField) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InputField
              label="Customer Name"
              name="customerName"
              control={rhfControl}
              placeholder="Enter name"
              rules={{ required: "Customer name required" }}
            />

            <InputField
              label="Contact Number"
              name="mobile"
              control={rhfControl}
              placeholder="Enter 10 digit number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              parse={(val) => only10Digits(val)}
              rules={phoneValidation}
            />

            <InputField
              label="Doctor Name"
              name="doctorName"
              control={rhfControl}
              placeholder="Enter name"
              isOptional
            />
          </div>

          {/* ✅ Search (same SearchField UI as Appointment) */}
          <div className="mt-5" ref={dropdownWrapRef}>
            <div
              className="relative"
              onFocusCapture={() => {
                if (searchTerm.trim()) setShowDropdown(true);
              }}
              onClick={() => {
                if (searchTerm.trim()) setShowDropdown(true);
              }}
            >
              <SearchField
                type="text"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                onClear={() => {
                  setSearchTerm("");
                  setShowDropdown(false);
                }}
                placeholder='Type brand/ generic (e.g. "Paracetamol 650")'
                className="w-full"
              />
            </div>

            {showDropdown && (
              <div className="relative">
                <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  {isFetching ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      Searching...
                    </div>
                  ) : items.length > 0 ? (
                    <div className="max-h-64 overflow-auto">
                      {items.map((item, idx) => {
                        const st: any = (item as any).stock?.[0];
                        const availableStrips = toNum(st?.availableStrips, 0);

                        return (
                          <button
                            key={`${(item as any).medicineId}-${idx}`}
                            type="button"
                            onClick={() => upsertRow(item)}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {(item as any).name}
                                </div>
                                <div className="mt-0.5 text-xs text-slate-500">
                                  {[
                                    (item as any).genericName,
                                    st?.expiryDate
                                      ? `Exp ${formatDateShort(st.expiryDate)}`
                                      : null,
                                    st?.sellingPrice
                                      ? formatINR(toNum(st.sellingPrice, 0))
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              </div>

                              <div className="text-xs whitespace-nowrap text-emerald-600">
                                In stock · {availableStrips}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No results
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-5 py-4 text-xs font-medium text-[15px] text-slate-500">
                      Medicine Name
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-[15px] text-slate-500">
                      Batch
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-[15px]  text-slate-500">
                      Expiry Date
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-slate-500 text-[15px]">
                      Quantity
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-slate-500 text-[15px]">
                      GST %
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-slate-500 text-[15px]">
                      GST Amt
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-slate-500 text-[15px]">
                      Selling Price
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-slate-500 text-[15px]">
                      Total Price
                    </th>
                    <th className="px-5 py-4 text-xs font-medium text-[15px] text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-slate-500"
                      >
                        No medicines added.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const st: any = (r.selected as any)?.stock?.[0];
                      const availableStrips = st?.availableStrips ?? 0;

                      // const pack =
                      //   st?.stripQuantity ??
                      //   (r.selected as any)?.packSize ??
                      //   "—";
                      const batch =
                        st?.batchNumber ??
                        (r.selected as any)?.genericName ??
                        "—";

                      const expiryIso =
                        st?.expiryDate ??
                        (r.selected as any)?.expiryDate ??
                        null;
                      const expiry = formatDateShort(expiryIso);

                      const unitInclusive = toNum(
                        st?.sellingPrice ??
                          (r.selected as any)?.sellingPrice ??
                          0,
                        0,
                      );
                      const gstPerc = toNum(
                        st?.gstPercentage ??
                          (r.selected as any)?.gstPercentage ??
                          0,
                        0,
                      );

                      const qty = r.qty;
                      const basePerUnit =
                        gstPerc > 0
                          ? unitInclusive / (1 + gstPerc / 100)
                          : unitInclusive;
                      const gstPerUnit = unitInclusive - basePerUnit;

                      const totalExcl = basePerUnit * qty;
                      const gstAmt = gstPerUnit * qty;
                      const rowTotal = unitInclusive * qty;

                      return (
                        <tr key={r.rowId} className="border-t border-slate-200">
                          <td className="px-5 py-4 font-semibold text-slate-900 flex flex-col">
                            {(r.selected as any).name}
                            <span className="text-[10px] w-25 bg-green-100 text-green-700 mt-1 rounded">
                              Available Qty: {availableStrips}
                            </span>
                          </td>
                          {/* <td className="px-5 py-4 text-slate-700">
                            {String(pack)}
                          </td> */}
                          <td className="px-5 py-4 text-slate-700">{batch}</td>
                          <td className="px-5 py-4 text-slate-700">{expiry}</td>
                          <td className="px-5 py-4">
                            <input
                              type="number"
                              min={1}
                              max={availableStrips}
                              value={r.qty}
                              onChange={(e) => {
                                let value = Number(e.target.value);

                                // If empty or invalid → set 1
                                if (!value || value < 1) {
                                  value = 1;
                                }

                                // If more than stock → set to max stock
                                if (value > availableStrips) {
                                  value = availableStrips;
                                }

                                setQty(r.rowId, value);
                              }}
                              className="w-16 text-center border-b border-slate-300 bg-transparent outline-none focus:border-emerald-600"
                            />
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {gstPerc}%
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {formatINR(gstAmt)}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {formatINR(totalExcl)}
                          </td>
                          <td className="px-5 py-4 text-slate-900 font-semibold">
                            {formatINR(rowTotal)}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => removeRow(r.rowId)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
                              title="Remove"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <div className="text-[15px] text-slate-500">
                  Subtotal (Excl. GST)
                </div>
                <div className="text-[15px] font-semibold text-slate-900">
                  {formatINR(subtotal)}
                </div>
              </div>

              <div>
                <div className="text-[15px] text-slate-500">Discount</div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="mt-1 h-9 w-24 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="text-[15px] text-slate-500">GST</div>
                <div className="text-[15px] font-semibold text-slate-900">
                  + {formatINR(totalGst)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[15px] text-slate-500">Total Amount</div>
              <div className="text-2xl font-semibold text-primary">
                {formatINR(totalAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile invoice number */}
      <div className="mt-3 sm:hidden flex items-center gap-2 text-primary font-semibold">
        <FiFileText className="h-4 w-4" />
        <span className="text-sm">{invoiceNo}</span>
      </div>
    </div>
  );
};

export default NewInvoice;
