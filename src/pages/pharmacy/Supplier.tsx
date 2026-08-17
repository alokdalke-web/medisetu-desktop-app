

import { useDisclosure, Pagination } from "@heroui/react";
import React, { useEffect, useMemo, useState } from "react";
import { FiChevronRight, FiPlus } from "react-icons/fi";
import { useNavigate } from "react-router";

import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetSuppliersQuery } from "../../redux/api/supplierApi";
import AddSupplierModal from "./AddSupplierModal";

/* ----------------------------- Types ----------------------------- */

export type SupplierRow = {
  supplierId: string;
  supplierName: string; // API "name"
  companyName: string;
  location: string;
  contactNo: string;
  totalAmount: number;
  contactEmail?: string;
  batchNo?: string;
};

/* ----------------------------- Helpers ----------------------------- */

const PAGE_SIZE = 8;

const formatINR = (amount: number) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

const extractList = (apiData: any): any[] => {
  const root = apiData?.result ?? apiData?.data ?? apiData;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.suppliers)) return root.suppliers;
  return [];
};

const extractPagination = (apiData: any) => {
  return (
    apiData?.pagination ??
    apiData?.result?.pagination ??
    apiData?.data?.pagination ??
    null
  );
};

// simple debounce hook
function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ----------------------------- Component ----------------------------- */

const Supplier: React.FC = () => {
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 350);

  const [page, setPage] = useState(1);

  /* ----------------------------- User / Pharmacy ----------------------------- */

  const {
    data: userRes,
    isLoading: isUserLoading,
    isError: isUserError,
    error: userError,
  } = useGetUserQuery();

  const pharmacyId =
    (userRes as any)?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.result?.pharmacyDetails?.pharmacyId ||
    (userRes as any)?.data?.pharmacyDetails?.pharmacyId ||
    "";

  /* ----------------------------- Suppliers (SERVER SIDE) ----------------------------- */

  const {
    data: supplierRes,
    isLoading: isSupplierLoading,
    isFetching: isSupplierFetching,
    isError: isSupplierError,
    error: supplierError,
  } = useGetSuppliersQuery(
    {
      pharmacyId: String(pharmacyId),
      pageNumber: page,
      pageSize: PAGE_SIZE,
      search: debouncedQuery.trim(),
    },
    { skip: !pharmacyId },
  );

  const suppliers: SupplierRow[] = useMemo(() => {
    const list = extractList(supplierRes);

    return list.map((s: any) => {
      const id = s?.supplierId ?? s?._id ?? s?.id ?? "";
      return {
        supplierId: String(id),
        supplierName: s?.name ?? s?.supplierName ?? "",
        companyName: s?.companyName ?? "",
        location: s?.location ?? "",
        contactNo: s?.contactPhone ?? s?.contactNo ?? s?.mobile ?? "",
        contactEmail: s?.contactEmail ?? s?.email,
        totalAmount: Number(s?.totalAmount ?? 0) || 0,
        batchNo: s?.batchNo,
      };
    });
  }, [supplierRes]);

  const pagination = useMemo(() => extractPagination(supplierRes), [supplierRes]);

  // Prefer backend pagination if available
  const totalRecords = Number(
    pagination?.totalRecords ??
      pagination?.total ??
      pagination?.count ??
      suppliers.length ??
      0,
  );

  const totalPages = Math.max(
    1,
    Number(pagination?.totalPages) ||
      Math.ceil((totalRecords || 0) / PAGE_SIZE) ||
      1,
  );

  // keep page safe if totalPages changes after search
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);

  const showingText = useMemo(() => {
    if (!totalRecords) return "Showing 0 entries";
    const from = (safePage - 1) * PAGE_SIZE + 1;
    const to = Math.min(safePage * PAGE_SIZE, totalRecords);
    return `Showing ${from}-${to} of ${totalRecords} entries`;
  }, [safePage, totalRecords]);

  const onSearchChange = (val: string) => {
    setQuery(val);
    setPage(1); // ✅ search change -> first page
  };

  const openDetails = (row: SupplierRow) => {
    navigate(`/pharmacy/supplier/${row.supplierId}`, {
      state: { supplier: row },
    });
  };

  const loading =
    isUserLoading || (!!pharmacyId && (isSupplierLoading || isSupplierFetching));

  const hasError = isUserError || isSupplierError;

  const errorMsg =
    (userError as any)?.data?.message ||
    (supplierError as any)?.data?.message ||
    (userError as any)?.error ||
    (supplierError as any)?.error ||
    "";

  /* ----------------------------- UI ----------------------------- */

  return (
    <div className="w-full min-w-0 px-0 py-0">
      {/* Header title */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[18px] md:text-[24px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl ">
          Suppliers
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
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSearchChange(e.target.value)
              }
              onClear={() => onSearchChange("")}
              placeholder="Search supplier"
              className="w-full"
            />
          </div>
        </div>

        {/* right controls */}
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <AppButton
            text="Add Supplier"
            buttonVariant="primary"
            startContent={<FiPlus />}
            onPress={onOpen}
            className="h-9 shrink-0 whitespace-nowrap rounded-full bg-primary px-4 text-[13px] text-white hover:bg-primary-hover"
          />
        </div>
      </div>

      {!loading && !pharmacyId ? (
        <div className="mb-4">
          <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-2xl px-4 py-3 text-sm ">
            Pharmacy ID not found in user response. Please check{" "}
            <b>pharmacyDetails.pharmacyId</b>.
          </div>
        </div>
      ) : null}

      {hasError ? (
        <div className="mb-4">
          <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-2xl px-4 py-3 text-sm">
            Failed to load suppliers.
            {errorMsg ? (
              <div className="text-rose-700/80 mt-1 text-xs">{errorMsg}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[980px] table-fixed text-left">
            <thead className="bg-slate-50">
              <tr className="border-b border-gray-100">
                <th className="w-[240px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Supplier
                </th>
                <th className="w-[220px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Company
                </th>
                <th className="w-[180px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Contact
                </th>
                <th className="w-[180px] px-5 py-3 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Location
                </th>
                <th className="w-[180px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  Order Amount
                </th>
                <th className="w-[80px] px-5 py-3 text-right text-[13px] font-semibold text-slate-500 sm:text-[14px]">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    <td className="px-5 py-5">
                      <div className="h-4 w-36 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5">
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="h-4 w-24 bg-slate-200 rounded ml-auto" />
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="h-8 w-8 bg-slate-200 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td
                    className="h-[320px] text-center text-slate-400"
                    colSpan={6}
                  >
                    No suppliers found
                  </td>
                </tr>
              ) : (
                suppliers.map((row) => (
                  <tr
                    key={row.supplierId}
                    className="cursor-pointer hover:bg-slate-50/50 transition"
                    onClick={() => openDetails(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetails(row);
                      }
                    }}
                  >
                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] font-semibold text-slate-900">
                        {row.supplierName || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] font-medium text-slate-900">
                        {row.companyName || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] font-medium text-slate-900">
                        {row.contactNo || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="truncate text-[14px] font-medium text-slate-900">
                        {row.location || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="truncate text-[14px] font-semibold text-slate-900">
                        {formatINR(row.totalAmount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetails(row);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                          title="View Batches"
                        >
                          <FiChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls / Info */}
        {!loading && totalRecords > 0 && totalPages > 1 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-center sm:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
                onChange={setPage}
                radius="full"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center sm:justify-end",
                  item:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50 data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  next:
                    "min-w-9 h-9 rounded-full border border-gray-200 bg-white text-slate-600 shadow-none hover:bg-slate-50",
                  cursor: "hidden",
                }}
              />
            </div>
          </div>
        ) : !loading && totalRecords > 0 ? (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex justify-start text-[13px] text-slate-600">
              {showingText}
            </div>
          </div>
        ) : null}
      </div>

      <AddSupplierModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </div>
  );
};

export default Supplier;
