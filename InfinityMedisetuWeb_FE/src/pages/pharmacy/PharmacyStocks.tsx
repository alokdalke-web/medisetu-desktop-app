import React, { useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { addToast } from "@heroui/react";
import AddStockModal from "./AddStockModal";
import EditStockModal from "./EditStockModal";
import DeleteStockModal from "./DeleteStockModal";

import {
  useGetStocksQuery,
  useDeleteStockMutation,
  useUpdateStockMutation,
  useUpdateStockPricingMutation,
} from "../../redux/api/stocksApi";
import type { Stock } from "../../redux/api/stocksApi";

type StockStatus = "healthy" | "low_stock" | "out_of_stock";

// ✅ EditStockModal expects this shape
type EditModalStock = {
  id: string;
  medicineName: string;
  supplierName: string;
  quantity: number;
  price: number;
  batchNo: string;
  expiryDate: string;
  status: StockStatus;
};

// ✅ Adapter: API Stock -> Edit modal stock
const toEditModalStock = (s: Stock): EditModalStock => {
  const totalStrips = (s as any)?.totalStrips ?? (s as any)?.quantity ?? 0;
  const pricePerStrip =
    (s as any)?.pricePerStrip ?? (s as any)?.price ?? (s as any)?.mrp ?? 0;

  const expiry = String((s as any)?.expiryDate ?? "");

  return {
    id: String((s as any)?.id ?? ""),
    medicineName: String((s as any)?.medicineName ?? ""),
    supplierName: String((s as any)?.supplierName ?? ""),
    quantity: Number(totalStrips) || 0,
    price: Number(pricePerStrip) || 0,
    batchNo: String((s as any)?.batchNo ?? (s as any)?.batchNumber ?? ""),
    expiryDate: expiry ? expiry.slice(0, 10) : "", // keep YYYY-MM-DD
    status: ((s as any)?.status ?? "healthy") as StockStatus,
  };
};

const PharmacyStocks: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isFetching, error, refetch } = useGetStocksQuery({
    search: searchQuery || undefined,
    pageNumber: currentPage,
    pageSize,
  });

  const [deleteStock, { isLoading: isDeleting }] = useDeleteStockMutation();
  const [updateStock] = useUpdateStockMutation();
  const [updateStockPricing] = useUpdateStockPricingMutation();

  const stocks = data?.result?.stocks || [];
  const pagination = data?.result?.pagination;

  const getStatusBadge = (status?: StockStatus) => {
    const statusValue = status || "healthy";
    const badges = {
      healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
      low_stock: "bg-yellow-50 text-yellow-700 border-yellow-200",
      out_of_stock: "bg-red-50 text-red-700 border-red-emerald-200",
    } as const;

    const labels = {
      healthy: "Healthy",
      low_stock: "Low Stock",
      out_of_stock: "Out of Stock",
    } as const;

    const dots = {
      healthy: "bg-emerald-500",
      low_stock: "bg-yellow-500",
      out_of_stock: "bg-red-500",
    } as const;

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${badges[statusValue]}`}
      >
        <span className={`h-2 w-2 rounded-full ${dots[statusValue]}`} />
        {labels[statusValue]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleEdit = (stock: Stock) => {
    setSelectedStock(stock);
    setIsEditModalOpen(true);
  };

  // ✅ Open delete modal
  const handleDeleteClick = (stockId: string, medicineName?: string) => {
    setDeleteTarget({ id: stockId, name: medicineName });
    setIsDeleteModalOpen(true);
  };

  // ✅ Confirm delete from modal
  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      await deleteStock(deleteTarget.id).unwrap();
      addToast({
        title: "Stock Deleted 🗑️",
        description: "Stock has been deleted successfully",
        color: "success",
      });

      setIsDeleteModalOpen(false);
      setDeleteTarget(null);

      refetch();
    } catch (_error) {
      addToast({
        title: "Error",
        description: "Failed to delete stock",
        color: "danger",
      });
      throw _error;
    }
  };

  // ✅ Update stock + price
  // ✅ Update stock + price (only when changed)
  const handleUpdate = async (id: string, formData: any) => {
    try {
      const patch: any = {};

      if (typeof formData?.supplierName === "string")
        patch.supplierName = formData.supplierName.trim();

      if (
        formData?.quantity !== undefined &&
        formData?.quantity !== null &&
        formData?.quantity !== ""
      )
        patch.totalStrips = Number(formData.quantity);
      if (typeof formData?.expiryDate === "string" && formData.expiryDate)
        patch.expiryDate = formData.expiryDate;

      if (typeof formData?.batchNo === "string" && formData.batchNo.trim())
        patch.batchNo = formData.batchNo.trim();

      if (
        formData?.lowStockThreshold !== undefined &&
        formData?.lowStockThreshold !== null &&
        formData?.lowStockThreshold !== ""
      )
        patch.lowStockThreshold = Number(formData.lowStockThreshold);

      // ✅ also update status (you have it in modal)
      if (typeof formData?.status === "string" && formData.status)
        patch.status = formData.status;

      // 1) Update main stock fields
      if (Object.keys(patch).length > 0) {
        await updateStock({ stockId: id, data: patch }).unwrap();
      }

      // 2) ✅ Pricing: call ONLY if changed
      const newPriceRaw = formData?.price;
      const newPrice =
        newPriceRaw === "" || newPriceRaw === null || newPriceRaw === undefined
          ? undefined
          : Number(newPriceRaw);

      if (Number.isFinite(newPrice)) {
        // get current price from selectedStock OR list
        const currentStock =
          selectedStock && String((selectedStock as any).id) === String(id)
            ? selectedStock
            : stocks.find((s: any) => String(s?.id) === String(id));

        const currentPrice = currentStock
          ? toEditModalStock(currentStock as any).price
          : undefined;

        const priceChanged =
          typeof currentPrice !== "number"
            ? true
            : Math.abs(Number(newPrice) - Number(currentPrice)) > 1e-9;

        if (priceChanged) {
          await updateStockPricing({
            stockId: id,
            pricePerStrip: Number(newPrice),
          }).unwrap();
        }
      }

      addToast({
        title: "Stock updated ✅",
        description: "Stock has been updated successfully",
        color: "success",
      });

      refetch();
    } catch (err) {
      addToast({
        title: "Update failed",
        description: "Unable to update stock. Please try again.",
        color: "danger",
      });
      throw err;
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const selectedStockForModal: EditModalStock | null = selectedStock
    ? toEditModalStock(selectedStock)
    : null;

  return (
    <>
      <div className="mx-auto w-full bg-white py-4 px-6 border border-gray-200 rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[28px] font-semibold tracking-tight">Stocks</h2>
        </div>

        {/* Search */}
        <div className="mb-5 flex justify-between">
          <div className="relative">
            <input
              type="text"
              placeholder="Search here"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-white font-medium px-4 py-2.5 rounded-2xl flex items-center hover:opacity-90 transition-opacity"
          >
            <span className="text-xl mr-2">+</span>
            Add Stock
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="min-w-full text-[14px]">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-slate-500">
                  <th className="px-6 py-4 font-medium">Medicine Name</th>
                  <th className="px-6 py-4 font-medium">Available Qty</th>
                  <th className="px-6 py-4 font-medium">Batch No</th>
                  <th className="px-6 py-4 font-medium">Expiry</th>
                  <th className="px-6 py-4 font-medium">Last Added</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right pr-8">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading || isFetching ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Loading stocks...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-red-500"
                    >
                      Error loading stocks
                    </td>
                  </tr>
                ) : stocks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No stocks found
                    </td>
                  </tr>
                ) : (
                  stocks.map((stock: Stock, idx: number) => (
                    <tr
                      key={stock.id}
                      className={`hover:bg-gray-50 ${
                        idx !== stocks.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-5 font-medium">
                        {stock.medicineName || "N/A"}
                      </td>

                      <td className="px-6 py-5">
                        {Number(
                          (stock as any).totalStrips ??
                            (stock as any).quantity ??
                            0
                        )}{" "}
                        Strips
                      </td>

                      <td className="px-6 py-5">
                        {(stock as any).batchNo ??
                          (stock as any).batchNumber ??
                          "—"}
                      </td>

                      <td className="px-6 py-5">
                        {(stock as any).expiryDate
                          ? formatDate((stock as any).expiryDate)
                          : "—"}
                      </td>

                      <td className="px-6 py-5">
                        {(stock as any).createdAt
                          ? formatDate((stock as any).createdAt)
                          : "N/A"}
                      </td>

                      <td className="px-6 py-5">
                        {getStatusBadge((stock as any).status)}
                      </td>

                      <td className="px-6 py-5 text-right pr-8">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(stock)}
                            className="text-slate-600 hover:text-primary p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteClick(
                                String((stock as any).id),
                                (stock as any).medicineName
                              )
                            }
                            className="text-slate-600 hover:text-red-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <div>
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, pagination.totalRecords)} of{" "}
              {pagination.totalRecords} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>

              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1.5 rounded ${
                        currentPage === page
                          ? "bg-primary text-white"
                          : "border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                }
              )}

              {pagination.totalPages > 5 && (
                <>
                  <span className="px-2">...</span>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit */}
      {selectedStockForModal && (
        <EditStockModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedStock(null);
          }}
          stock={selectedStockForModal}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete */}
      {deleteTarget && (
        <DeleteStockModal
          isOpen={isDeleteModalOpen} 
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
          }}
          title="Delete Stock"
          description={`Are you sure you want to delete ${
            deleteTarget.name || "this stock"
          }? This action cannot be undone.`}
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
};

export default PharmacyStocks;
