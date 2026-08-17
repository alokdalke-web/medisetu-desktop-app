import React from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
} from "@heroui/react";
import { FiMessageCircle } from "react-icons/fi";

interface PharmacyInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale?: any;
  isLoading?: boolean;
  isSendingWhatsApp?: boolean;
  onSendWhatsApp?: () => void;
  formatCurrency?: (amount: string | number) => string;
  formatDate?: (dateString: string) => string;
}

interface InvoiceContentProps {
  sale: any;
  formatCurrency: (amount: string | number) => string;
  formatDate: (dateString: string) => string;
}

const defaultFormatCurrency = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(num);
};

const defaultFormatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
};

const handlePrintInvoice = () => {
  const invoice = document.getElementById("print-invoice");
  if (!invoice) return;

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        html, body {
          margin: 0;
          padding: 8px;
          background: #fff;
          overflow: visible !important;
        }
        @page {
          size: A4;
          margin: 5mm;
        }
        *, *::before, *::after {
          overflow: visible !important;
        }
        ::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        @media print {
          html, body {
            overflow: visible !important;
          }
          * {
            overflow: visible !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      ${invoice.outerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, 300);
};

const InvoiceContent: React.FC<InvoiceContentProps> = ({
  sale,
  formatCurrency,
  formatDate,
}) => {

  const showDiscountColumn = sale.items?.some((item: any) => Number(item.discountPercent) > 0) ?? false;

  return (
    <div
      id="print-invoice"
      className="space-y-4 p-4 bg-[#fffdf7] rounded-none print:bg-white text-black border border-black/25"
      style={{
        fontFamily: '"Courier New", "Lucida Console", monospace',
        letterSpacing: "1px",
        fontWeight: 700,
        textTransform: "uppercase",
        imageRendering: "pixelated",
        filter: "contrast(1.1)",
      }}
    >
      <div className="border-b border-slate-300 dark:border-slate-600 pb-1 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {sale.pharmacyName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {sale.pharmacyAddress}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Phone: {sale.pharmacyContactNumber}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-dark dark:text-white uppercase">
              Invoice ID: <span className="text-xs text-gray-500">{sale.id?.split("-").pop()}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-dark dark:text-white uppercase">
              Date: <span className="text-xs text-gray-500">{formatDate(sale.createdAt)} ({formatTime(sale.createdAt)})</span>
            </p>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-r-4 border-gray px-8 bg-gray-100 dark:bg-gray-950 py-2 rounded flex justify-between">
        <div>
          <p className="text-xs font-semibold text-dark dark:text-white uppercase mb-1">Customer Details</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.patientName}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{sale.patientMobile}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-dark dark:text-white uppercase mb-1">Payment Details</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.paymentMethod}</p>
          {sale.paymentNotes && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {sale.paymentNotes}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto print:overflow-visible pt-2">
        <table className="w-full min-w-full text-sm table-fixed">
          <thead>
            <tr className="border-b-2 border-slate-300 dark:border-slate-600">
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[30%]">Medicine</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[10%]">Qty</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">MRP</th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Amount</th>
              {showDiscountColumn && (
                <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Disc <span className="font-sans">%</span></th>
              )}
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">GST <span className="font-sans">%</span></th>
              <th className="text-left py-2 px-2 font-semibold text-slate-900 dark:text-white w-[15%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="py-2 px-2 text-slate-900 dark:text-white">
                  <div>
                    <p className="font-semibold text-left text-slate-700 dark:text-slate-300">{item.medicineName}</p>
                  </div>
                </td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.quantity}</td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.mrp)}</td>
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.mrp * item.quantity)}</td>
                {showDiscountColumn && (
                  <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.discountPercent}<span className="font-sans">%</span></td>
                )}
                <td className="py-2 px-2 text-left font-semibold text-slate-700 dark:text-slate-300">{item.gstPercentage}<span className="font-sans">%</span></td>
                <td className="py-2 px-2 text-left font-bold text-slate-900 dark:text-white">
                  {formatCurrency(
                    (
                      Number(item.mrp) *
                      item.quantity *
                      (1 - Number(item.discountPercent) / 100)
                    ) +
                    (
                      Number(item.mrp) *
                      item.quantity *
                      (1 - Number(item.discountPercent) / 100) *
                      (Number(item.gstPercentage) / 100)
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-end items-end gap-6">
        <div className="w-full md:w-80 pt-2">
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-900 dark:text-white">Sub-total</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && 
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-slate-900 dark:text-white">Discount</span>
              <span className="font-semibold text-slate-900 dark:text-white">-{formatCurrency(sale.discountAmount)}</span>
            </div>
          }
          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
            <span className="text-slate-900 dark:text-white">GST (CGST+SGST)</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(sale.gstAmount)}</span>
          </div>
          <div className="flex justify-between py-3 rounded font-bold text-lg">
            <span className="text-slate-900 dark:text-white">Total Amount</span>
            <span className="text-slate-900 dark:text-white">{formatCurrency(sale.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="gap-4 border-t border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-1 text-[10px]">
        <p>&#9702; Schedule H and H1 medicines are sold only with valid prescriptions.</p>
        <p>&#9702; Verify medicine details, expiry and quantity before leaving pharmacy.</p>
        <p>&#9702; Store medicines properly and keep away from sunlight and children always.</p>
        <p>&#9702; {sale.pharmacyName} will not be responsible for medicine misuse or overdose.</p>
      </div>
      <div className="flex justify-center">
        <img
          src="https://infinitymedisetu.com/assets/images/logoDark.svg"
          alt="MediSetu Logo"
          className="w-20 object-contain grayscale"
        />
      </div>
    </div>
  );
};

const PharmacyInvoiceModal: React.FC<PharmacyInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  isLoading = false,
  isSendingWhatsApp = false,
  onSendWhatsApp,
  formatCurrency = defaultFormatCurrency,
  formatDate = defaultFormatDate,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <span>Invoice</span>
              <div className="flex justify-end me-8 gap-2 print:hidden">
                {sale?.patientMobile && onSendWhatsApp && (
                  <Button
                    color="success"
                    variant="flat"
                    isLoading={isSendingWhatsApp}
                    onPress={onSendWhatsApp}
                  >
                    <FiMessageCircle /> WhatsApp Invoice
                  </Button>
                )}
                <Button
                  color="primary"
                  variant="flat"
                  onClick={handlePrintInvoice}
                >
                  Print Invoice
                </Button>
              </div>
            </ModalHeader>
            <ModalBody className="py-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-pulse text-slate-500">Loading invoice...</div>
                </div>
              ) : sale ? (
                <InvoiceContent
                  sale={sale}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ) : (
                <div className="text-center py-10 text-slate-500">
                  Failed to load invoice details
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default PharmacyInvoiceModal;
