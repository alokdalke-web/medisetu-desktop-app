import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Spinner,
  addToast,
} from "@heroui/react";
import {
  FiRotateCcw,
  FiCheck,
  FiAlertCircle,
  FiDollarSign,
  FiSmartphone,
  FiGlobe,
} from "react-icons/fi";
import {
  useGetSaleByIdQuery,
  useCreateSalesReturnMutation,
} from "../../../redux/api/pharmaciesApi";

interface PharmacySalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string | null;
  onSuccess?: () => void;
}

interface ItemReturnState {
  salesItemId: string;
  medicineName: string;
  batch: string;
  soldQuantity: number;
  totalPrice: number;
  gstPercentage: number;
  returnedQuantity: number;
  refundAmount: number;
  isManuallyEdited: boolean;
}

const PharmacySalesReturnModal: React.FC<PharmacySalesReturnModalProps> = ({
  isOpen,
  onClose,
  saleId,
  onSuccess,
}) => {
  // Form states
  const [returnItems, setReturnItems] = useState<ItemReturnState[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"Cash" | "UPI" | "Netbanking" | "">("");
  const [refundNotes, setRefundNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // API hooks
  const { data: saleData, isLoading: isLoadingSale, isError } = useGetSaleByIdQuery(
    { id: saleId || "" },
    { skip: !saleId || !isOpen }
  );

  const [createSalesReturn, { isLoading: isSubmitting }] = useCreateSalesReturnMutation();

  const sale = saleData?.data;

  // Initialize return items when sale details are loaded
  useEffect(() => {
    if (sale?.items && sale.items.length > 0) {
      const initialItems: ItemReturnState[] = sale.items.map((item: any) => {
        const soldQty = Number(item.quantity) || 1;
        const totalP = parseFloat(item.total) || 0;
        const gstPct = parseFloat(item.gstPercentage) || 0;

        return {
          salesItemId: item.id,
          medicineName: item.medicineName,
          batch: item.batch,
          soldQuantity: soldQty,
          totalPrice: totalP,
          gstPercentage: gstPct,
          returnedQuantity: 0,
          refundAmount: 0,
          isManuallyEdited: false,
        };
      });
      setReturnItems(initialItems);
    } else {
      setReturnItems([]);
    }
    setReturnReason("");
    setRefundMethod("");
    setRefundNotes("");
    setValidationError(null);
  }, [sale, isOpen]);

  const handleClose = () => {
    setReturnItems([]);
    setReturnReason("");
    setRefundMethod("");
    setRefundNotes("");
    setValidationError(null);
    onClose();
  };

  // Quantity Change Handler with auto-calculation of refundAmount
  const handleQuantityChange = (salesItemId: string, newQty: number) => {
    setReturnItems((prevItems) =>
      prevItems.map((item) => {
        if (item.salesItemId !== salesItemId) return item;

        const clampedQty = Math.max(0, Math.min(item.soldQuantity, newQty));

        // Auto calculate refund amount based on returned quantity ratio
        const autoRefund = item.soldQuantity > 0
          ? Number(((clampedQty / item.soldQuantity) * item.totalPrice).toFixed(2))
          : 0;

        // Refund amount cannot exceed max allowed for the current returned quantity
        const cappedRefundAmount = item.isManuallyEdited
          ? Math.min(autoRefund, item.refundAmount)
          : autoRefund;

        return {
          ...item,
          returnedQuantity: clampedQty,
          refundAmount: cappedRefundAmount,
        };
      })
    );
  };

  // Manual Refund Amount Change Handler (capped at max allowed for returned quantity)
  const handleRefundAmountChange = (salesItemId: string, newAmount: number) => {
    setReturnItems((prevItems) =>
      prevItems.map((item) => {
        if (item.salesItemId !== salesItemId) return item;

        const maxRefundAmount = item.soldQuantity > 0
          ? Number(((item.returnedQuantity / item.soldQuantity) * item.totalPrice).toFixed(2))
          : 0;

        const clampedAmount = Number(Math.min(maxRefundAmount, Math.max(0, newAmount)).toFixed(2));

        return {
          ...item,
          refundAmount: clampedAmount,
          isManuallyEdited: true,
        };
      })
    );
  };

  // Calculate totals
  const totalItemsReturned = returnItems.reduce(
    (acc, item) => acc + item.returnedQuantity,
    0
  );

  const totalBaseRefund = returnItems.reduce(
    (acc, item) => acc + (item.returnedQuantity > 0 ? item.refundAmount : 0),
    0
  );

  // Total GST of returned medicines
  const totalReturnGst = returnItems.reduce((acc, item) => {
    if (item.returnedQuantity <= 0) return acc;
    const gst = (item.refundAmount * item.gstPercentage) / 100;
    return acc + gst;
  }, 0);

  // Total Refund includes GST of all returned medicines
  const totalRefundAmountWithGst = totalBaseRefund + totalReturnGst;

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!saleId) return;

    if (totalItemsReturned <= 0) {
      setValidationError("Please enter return quantity for at least 1 medicine.");
      return;
    }

    if (!refundMethod) {
      setValidationError("Please select a refund method (Cash, UPI, or Netbanking).");
      return;
    }

    // Validate refund amounts do not exceed max auto fill amount for quantity
    for (const item of returnItems) {
      if (item.returnedQuantity > 0) {
        const maxAllowed = item.soldQuantity > 0
          ? Number(((item.returnedQuantity / item.soldQuantity) * item.totalPrice).toFixed(2))
          : 0;
        if (item.refundAmount > maxAllowed) {
          setValidationError(
            `Refund amount for "${item.medicineName}" cannot exceed ₹${maxAllowed}`
          );
          return;
        }
      }
    }

    try {
      const activeItems = returnItems
        .filter((item) => item.returnedQuantity > 0)
        .map((item) => ({
          salesItemId: item.salesItemId,
          returnedQuantity: item.returnedQuantity,
          refundAmount: item.refundAmount,
        }));

      const payload = {
        saleId,
        returnReason: returnReason.trim() || "-",
        refundMethod,
        refundNotes: refundNotes.trim() || undefined,
        items: activeItems,
      };

      const res = await createSalesReturn(payload).unwrap();

      addToast({
        title: "Success",
        description: res?.message || "Sales return created successfully",
        color: "success",
      });

      handleClose();

      try {
        if (onSuccess) onSuccess();
      } catch (callbackErr) {
        console.error("onSuccess error:", callbackErr);
      }
    } catch (err: any) {
      addToast({
        title: "Error",
        description: err?.data?.message || err?.message || "Failed to create sales return",
        color: "danger",
      });
    }
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#273244] shadow-2xl rounded-2xl max-w-4xl",
        header: "border-b border-slate-100 dark:border-[#273244] px-6 py-4",
        body: "p-6 overflow-y-auto max-h-[80vh]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <FiRotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Sales Return
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {sale ? `Invoice ${sale.id?.split("-").pop()?.toUpperCase()} • Patient: ${sale.patientName}` : "Loading sale..."}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {isLoadingSale ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" color="primary" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Fetching invoice details...
              </p>
            </div>
          ) : isError || !sale ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500">
              <FiAlertCircle className="h-10 w-10 mb-2" />
              <p className="text-sm font-semibold">Failed to load sale items</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReturn} className="space-y-6">
              {validationError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <FiAlertCircle className="h-4 w-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Medicines Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-[#273244] dark:bg-[#151c2d]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 dark:bg-[#111726] dark:text-slate-300">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Medicine</th>
                        <th className="px-3 py-3 font-semibold text-center">Batch</th>
                        <th className="px-3 py-3 font-semibold text-center">Sold Qty</th>
                        <th className="px-3 py-3 font-semibold text-right">Unit Price</th>
                        <th className="px-3 py-3 font-semibold text-center">GST Info</th>
                        <th className="px-4 py-3 font-semibold text-center w-28">Return Qty</th>
                        <th className="px-4 py-3 font-semibold text-right w-36">Return Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                      {returnItems.map((item) => {
                        const unitPrice = item.soldQuantity > 0 ? item.totalPrice / item.soldQuantity : 0;
                        const maxRefundForQty = item.soldQuantity > 0
                          ? Number(((item.returnedQuantity / item.soldQuantity) * item.totalPrice).toFixed(2))
                          : 0;

                        // Dynamic GST amount for returned quantity
                        const itemGstAmount = item.returnedQuantity > 0
                          ? (item.refundAmount * item.gstPercentage) / 100
                          : 0;

                        return (
                          <tr
                            key={item.salesItemId}
                            className={`transition ${
                              item.returnedQuantity > 0
                                ? "bg-teal-50/50 dark:bg-teal-900/10"
                                : "hover:bg-slate-50/50 dark:hover:bg-[#111726]/50"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                              <div>{item.medicineName}</div>
                            </td>
                            <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300">
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                {item.batch}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center font-medium text-slate-700 dark:text-slate-300">
                              {item.soldQuantity}
                            </td>
                            <td className="px-3 py-3 text-right text-slate-700 dark:text-slate-300">
                              {formatCurrency(unitPrice)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {/* Display GST Amount under GST Info */}
                              <div className="flex flex-col items-center">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(itemGstAmount)}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                  ({item.gstPercentage}% GST)
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.soldQuantity}
                                  value={item.returnedQuantity || ""}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.salesItemId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  placeholder="0"
                                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-[#111726] dark:text-white"
                                />
                                <span className="text-[10px] text-slate-400">/ {item.soldQuantity}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={maxRefundForQty}
                                  value={item.refundAmount || ""}
                                  onChange={(e) =>
                                    handleRefundAmountChange(
                                      item.salesItemId,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  disabled={item.returnedQuantity === 0}
                                  placeholder="0.00"
                                  className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-[#111726] dark:text-white dark:disabled:bg-slate-800"
                                />
                                {item.isManuallyEdited && item.returnedQuantity > 0 && (
                                  <span className="text-[10px] font-medium text-teal-600 dark:text-teal-400">
                                    Manual edit (max ₹{maxRefundForQty})
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Controls Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
                {/* Refund Method Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Refund Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "Cash", label: "Cash", icon: FiDollarSign },
                      { key: "UPI", label: "UPI", icon: FiSmartphone },
                      { key: "Netbanking", label: "Netbanking", icon: FiGlobe },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isSelected = refundMethod === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setRefundMethod(option.key as any)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border h-[62px] text-xs font-bold transition ${
                            isSelected
                              ? "border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-300"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-[#273244] dark:bg-[#151c2d] dark:text-slate-300 dark:hover:bg-[#111726]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Return Reason (Optional / max 255 chars, same height as refund method card) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Return Reason <span className="text-xs font-normal text-slate-400">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">{returnReason.length}/255</span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={255}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g. Unused medicine / Wrong dosage"
                    className="w-full h-[62px] resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-[#273244] dark:bg-[#151c2d] dark:text-white"
                  />
                </div>
              </div>

              {/* Refund Notes (Optional / max 255 chars) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Refund Notes / Transaction Reference <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{refundNotes.length}/255</span>
                </div>
                <input
                  type="text"
                  maxLength={255}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. TXN12345678 or Cash handed to customer"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-[#273244] dark:bg-[#151c2d] dark:text-white"
                />
              </div>

              {/* Modal Footer Summary & Submit */}
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-[#151c2d] sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-[#273244]">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Returned:</span>
                    <span className="ml-1.5 font-bold text-slate-900 dark:text-white">
                      {totalItemsReturned} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Total GST:</span>
                    <span className="ml-1.5 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(totalReturnGst)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total Refund (inc. GST):</span>
                    <span className="ml-2 text-base font-extrabold text-teal-600 dark:text-teal-400">
                      {formatCurrency(totalRefundAmountWithGst)}
                    </span>
                  </div>
                  <Button
                    type="submit"
                    color="primary"
                    isLoading={isSubmitting}
                    className="bg-teal-600 font-semibold text-white hover:bg-teal-700 px-6"
                    startContent={<FiCheck />}
                  >
                    Submit Sales Return
                  </Button>
                </div>
              </div>
            </form>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PharmacySalesReturnModal;
