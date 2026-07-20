import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import SearchField from "../../components/shared/SearchField";
import { useSearchMedicinesQuery } from "../../redux/api/pharmaDashApi";

type MedicineRow = {
  productId: string;
  drugName: string;
  strength: string;
  packSize: number | string;
  expiryDate: string;
  sellingPrice: string;
  availableQuantity: string;
};

const formatExpiry = (raw: unknown) => {
  const s = typeof raw === "string" ? raw : "";
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (raw: unknown) => {
  if (raw == null) return "₹0";
  const s = String(raw);
  return s.includes("₹") ? s : `₹${s}`;
};

const PharmacyMedicine: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ✅ debounce search to avoid API call on every keypress
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ✅ IMPORTANT: now sending `name` so URL becomes ?name=...
  const { data, isLoading, isFetching, isError, refetch } =
    useSearchMedicinesQuery(
      { name: debouncedSearch || undefined },
      { refetchOnMountOrArgChange: true }
    );

  const apiList = useMemo(() => {
    return (data?.data ?? data?.result ?? []) as any[];
  }, [data]);

  const medicines: MedicineRow[] = useMemo(() => {
    return apiList.map((it: any) => ({
      productId: String(it?.productId ?? it?.id ?? it?._id ?? ""),
      drugName: String(it?.drugName ?? it?.medicineName ?? it?.name ?? "—"),
      strength: String(it?.strength ?? "—"),
      packSize: it?.packSize ?? "—",
      expiryDate: formatExpiry(it?.expiryDate ?? it?.expDate),
      sellingPrice: formatPrice(it?.sellingPrice ?? it?.price ?? it?.mrp),
      availableQuantity: String(it?.availableQuantity ?? "0"),
    }));
  }, [apiList]);

  const total = medicines.length;

  const goToDetails = (productId: string) => {
    if (!productId) return;
    navigate(`/pharmacy/medicine/${productId}`);
  };

  const showSkeleton = isLoading || isFetching;
  const SKELETON_ROWS = 6;

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Header title */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] md:text-[24px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl ">
          Medicines List
        </h2>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        {/* left filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center ">
          {/* Search */}
          <div className="w-full sm:w-[260px]">
            <SearchField
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              onClear={() => setSearchQuery("")}
              placeholder="Search medicine"
              className="w-full"
            />
          </div>

          {isError && (
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-gray-100">
                <th className="w-[280px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Medicine
                </th>
                <th className="w-[140px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Strength
                </th>
                <th className="w-[140px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Pack Size
                </th>
                <th className="w-[160px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Expiry Date
                </th>
                <th className="w-[160px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Selling Price
                </th>
                <th className="w-[140px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Available Qty
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {showSkeleton ? (
                Array.from({ length: SKELETON_ROWS }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`}>
                    <td className="px-5 py-5">
                      <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : medicines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="h-[320px] text-center text-slate-400"
                  >
                    No medicines found
                  </td>
                </tr>
              ) : (
                medicines.map((m, idx) => {
                  const clickable = !!m.productId;

                  return (
                    <tr
                      key={`${m.productId || "row"}-${idx}`}
                      tabIndex={clickable ? 0 : -1}
                      onClick={() => clickable && goToDetails(m.productId)}
                      onKeyDown={(e) => {
                        if (!clickable) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToDetails(m.productId);
                        }
                      }}
                      className={[
                        clickable
                          ? "cursor-pointer hover:bg-slate-50/50"
                          : "cursor-not-allowed opacity-70",
                      ].join(" ")}
                      title={clickable ? "Click to view details" : "No productId"}
                    >
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.drugName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.strength}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.packSize}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.expiryDate}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.sellingPrice}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="truncate text-[14px] font-medium text-slate-900">
                          {m.availableQuantity}
                        </p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls / Info */}
        {!showSkeleton && total > 0 && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-start text-[13px] text-slate-600">
              Showing {total} entries
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PharmacyMedicine;
