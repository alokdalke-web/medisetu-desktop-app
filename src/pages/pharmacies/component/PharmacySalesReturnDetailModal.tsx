import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Chip,
  Button,
} from "@heroui/react";
import { FiRotateCcw } from "react-icons/fi";
import { SalesReturn } from "../../../redux/api/pharmaciesApi";

interface PharmacySalesReturnDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: SalesReturn | null;
  formatCurrency: (amount: string | number) => string;
  formatDate: (dateString: string) => string;
}

const PharmacySalesReturnDetailModal: React.FC<PharmacySalesReturnDetailModalProps> = ({
  isOpen,
  onClose,
  salesReturn,
  formatCurrency,
  formatDate,
}) => {
  if (!salesReturn) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#273244] shadow-2xl rounded-2xl max-w-3xl",
        header: "border-b border-slate-100 dark:border-[#273244] px-6 py-4",
        body: "p-6 overflow-y-auto max-h-[75vh]",
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
                Sales Return Details
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Return ID: {salesReturn.id?.split("-").pop()?.toUpperCase()} • Original Sale: {salesReturn.saleId?.split("-").pop()?.toUpperCase()}
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-5">
          {/* Summary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#273244] dark:bg-[#151c2d]">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Return Date</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                {formatDate(salesReturn.createdAt)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#273244] dark:bg-[#151c2d]">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Refund Method</span>
              <div className="mt-1">
                <Chip size="sm" variant="flat" color="primary">
                  {salesReturn.refundMethod}
                </Chip>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#273244] dark:bg-[#151c2d]">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">GST Return</span>
              <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                {formatCurrency(salesReturn.gstAmountReturn || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
              <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">Total Refund</span>
              <p className="mt-1 text-sm font-extrabold text-teal-700 dark:text-teal-300">
                {formatCurrency(salesReturn.totalReturnAmount)}
              </p>
            </div>
          </div>

          {/* Return Reason & Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 dark:border-[#273244] dark:bg-[#151c2d]">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Return Reason:</span>
              <p className="text-xs font-medium text-slate-900 dark:text-white mt-0.5">
                {salesReturn.returnReason}
              </p>
            </div>
            {salesReturn.refundNotes && (
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Refund Notes / Reference:</span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {salesReturn.refundNotes}
                </p>
              </div>
            )}
          </div>

          {/* Returned Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Returned Items ({salesReturn.items?.length || 0})
            </h4>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-[#273244] dark:bg-[#151c2d]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-[#111726] dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Medicine</th>
                    <th className="px-3 py-3 font-semibold text-center">Batch</th>
                    <th className="px-3 py-3 font-semibold text-center">Returned Qty</th>
                    <th className="px-4 py-3 font-semibold text-right">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#273244]">
                  {salesReturn.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#111726]/50">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {item.medicineName}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-700 dark:text-slate-300">
                          {item.batch}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800 dark:text-white">
                        {item.returnedQuantity}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-teal-600 dark:text-teal-400">
                        {formatCurrency(item.refundAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button color="secondary" variant="flat" onPress={onClose} className="font-semibold text-xs">
              Close
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PharmacySalesReturnDetailModal;
