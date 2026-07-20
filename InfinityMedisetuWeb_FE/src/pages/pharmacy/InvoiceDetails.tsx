// src/pages/pharmacy/InvoiceDetails.tsx
import React from "react";
import { FiFileText, FiPrinter, FiX } from "react-icons/fi";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Button,
} from "@heroui/react";
import type {
  InvoiceDetailsClinic,
  InvoiceDetailsPharmacy,
} from "../../redux/api/pharmacyApi";

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

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const [day, mon, year] = d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .split(" ");
  return `${day}-${mon}-${year}`;
};

export type CreatedInvoiceData = {
  invoice: {
    id: string;
    customerName: string;
    address: string;
    mobile: string;
    clinicId: string;
    pharmacyId: string;
    doctorId: string | null;
    billingId: string;
    createdAt: string;
    clinic?: InvoiceDetailsClinic | null;
    pharmacy?: InvoiceDetailsPharmacy | null;
    updatedAt: string;
  };
  billing: {
    id: string;
    invoiceId: string;
    tax: string;
    discount: string;
    price: string;
    totalPrice: string;
    invoicePdf?: string | null;
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
  };
  medicines: {
    medicineId: string;
    medicineName: string;
    totalStrips: number;
    pickedBatches: {
      stockId: string;
      usedStrips: number;
      pricePerStrip: number;
      expiryDate?: string | null;
      gstPercentage?: number;
      gstAmount?: number;
      totalPrice?: number;
    }[];
  }[];
};

const InvoiceDetails: React.FC<{ data: CreatedInvoiceData }> = ({ data }) => {
  const { invoice, billing, medicines } = data;

  const subtotal = Number(billing.price ?? 0);
  const discount = Number(billing.discount ?? 0);
  const tax = Number(billing.tax ?? 0);
  const totalAmount = Number(billing.totalPrice ?? 0);

  const displayInvoiceId = `INV-${invoice.id.slice(0, 8).toUpperCase()}`;

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const buildSimpleInvoiceHtml = () => {
    const { pharmacy, clinic } = invoice;
    const dateStr = formatDate(invoice.createdAt);

    const rowsHtml = medicines
      .flatMap((m, mIdx) =>
        (m.pickedBatches || []).map((b) => {
          const qty = b.usedStrips || 0;
          const price = b.pricePerStrip || 0;
          const gstPerc = b.gstPercentage || 0;
          const total = b.totalPrice || (qty * price * (1 + gstPerc / 100));
          const expiry = b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : "—";

          return `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${mIdx + 1}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <div style="font-weight: 600;">${m.medicineName}</div>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${expiry}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${price.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${gstPerc}%</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">₹${total.toFixed(2)}</td>
            </tr>
          `;
        }),
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${displayInvoiceId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; background: #fff; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }
            .pharmacy-info h1 { margin: 0; font-size: 24px; color: #111827; }
            .pharmacy-info p { margin: 4px 0; font-size: 14px; color: #6b7280; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.025em; }
            .invoice-title p { margin: 4px 0; font-size: 14px; color: #6b7280; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .meta-box h3 { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; margin-bottom: 8px; }
            .meta-box p { margin: 2px 0; font-size: 15px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background: #f9fafb; padding: 12px 10px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
            .summary { display: flex; justify-content: flex-end; }
            .summary-card { width: 300px; background: #f9fafb; padding: 20px; border-radius: 12px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-row { display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-weight: 800; font-size: 20px; color: #059669; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
            @media print {
              body { padding: 0; }
              .container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="pharmacy-info">
                <h1>${pharmacy?.name || "MediSetu Pharmacy"}</h1>
                <p>${pharmacy?.address || "—"}</p>
                <p>Phone: ${pharmacy?.contactNumber || "—"}</p>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>${displayInvoiceId}</p>
                <p>${dateStr}</p>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-box">
                <h3>Billed To</h3>
                <p style="font-size: 18px; font-weight: 700;">${invoice.customerName}</p>
                <p>${invoice.mobile}</p>
                <p>${invoice.address || "—"}</p>
              </div>
              <div class="meta-box" style="text-align: right;">
                <h3>Clinic Details</h3>
                <p>${clinic?.clinicName || "—"}</p>
                <p>Method: ${billing.paymentMethod}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th width="40">#</th>
                  <th>Medicine</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: center;">Exp</th>
                  <th style="text-align: right;">Rate</th>
                  <th style="text-align: right;">GST</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-card">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>₹${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>GST Total</span>
                  <span>₹${tax.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span>Discount</span>
                  <span style="color: #ef4444;">-₹${discount.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Total</span>
                  <span>₹${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>This is a computer generated invoice and does not require a physical signature.</p>
              <p>Thank you for choosing ${pharmacy?.name || "MediSetu Pharmacy"}!</p>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    try {
      const html = buildSimpleInvoiceHtml();
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Please allow popups to print the invoice.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error("❌ Failed to print invoice", err);
    }
  };

  const InvoicePreviewContent = () => {
    const { pharmacy, clinic } = invoice;
    const dateStr = formatDate(invoice.createdAt);

    return (
      <div className="bg-white text-slate-800 p-2 sm:p-4 max-w-4xl mx-auto border border-slate-100 rounded-xl shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10 border-b-2 border-slate-50 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {pharmacy?.name || "MediSetu Pharmacy"}
            </h1>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              {pharmacy?.address || "—"}
            </p>
            <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
              Phone: {pharmacy?.contactNumber || "—"}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <h2 className="text-3xl font-black text-slate-900 mb-1">INVOICE</h2>
            <div className="space-y-1">
              <p className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded inline-block sm:block">
                {displayInvoiceId}
              </p>
              <p className="text-sm text-slate-500">{dateStr}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-10">
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Billed To
            </h3>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">
                {invoice.customerName}
              </p>
              <p className="text-sm text-slate-600 font-medium">
                {invoice.mobile}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                {invoice.address || "—"}
              </p>
            </div>
          </div>
          <div className="sm:text-right space-y-3">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Clinic Details
            </h3>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">
                {clinic?.clinicName || "—"}
              </p>
              <p className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg inline-block sm:ml-auto">
                Method: {billing.paymentMethod}
              </p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100 mb-8 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80">
              <tr className="text-left">
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px]">
                  #
                </th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px]">
                  Medicine
                </th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px] text-center">
                  Qty
                </th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px] text-center">
                  Exp
                </th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px] text-right">
                  Rate
                </th>
                <th className="px-4 py-3 font-bold text-slate-600 uppercase text-[11px] text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {medicines.flatMap((m, mIdx) =>
                (m.pickedBatches || []).map((b, bIdx) => {
                  const qty = b.usedStrips || 0;
                  const price = b.pricePerStrip || 0;
                  const gstPerc = b.gstPercentage || 0;
                  const total =
                    b.totalPrice || qty * price * (1 + gstPerc / 100);
                  const expiry = b.expiryDate
                    ? new Date(b.expiryDate).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "2-digit",
                      })
                    : "—";

                  return (
                    <tr key={`${mIdx}-${bIdx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-medium">{mIdx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">
                          {m.medicineName}
                        </p>
                        {gstPerc > 0 && (
                          <p className="text-[10px] text-slate-400">
                            Incl. {gstPerc}% GST
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">
                        {qty}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">
                        {expiry}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatINR(price)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        {formatINR(total)}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-12">
          <div className="w-full sm:w-72 bg-slate-50/50 rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="text-slate-900 font-bold">
                  {formatINR(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">GST Total</span>
                <span className="text-slate-900 font-bold">
                  {formatINR(tax)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-medium">Discount</span>
                <span className="text-rose-600 font-bold">
                  -{formatINR(discount)}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-base font-black text-slate-900">
                  Total
                </span>
                <span className="text-2xl font-black text-primary">
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-100 text-center">
          <p className="text-[11px] font-medium text-slate-400 italic">
            This is a computer generated invoice and does not require a physical
            signature.
          </p>
          <p className="text-xs font-bold text-slate-300 mt-2 tracking-widest uppercase">
            Thank you for choosing {pharmacy?.name || "MediSetu Pharmacy"}!
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-800">
          Invoice Details
        </h1>

        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <FiFileText className="h-3 w-3" />
          <span>{displayInvoiceId}</span>
        </span>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Customer Details
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1">
            <div className="text-xs text-slate-500">Customer</div>
            <div className="text-sm font-semibold text-slate-900">
              {invoice.customerName || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1">
            <div className="text-xs text-slate-500">Contact</div>
            <div className="text-sm font-semibold text-slate-900">
              {invoice.mobile || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-1">
            <div className="text-xs text-slate-500">Address</div>
            <div className="text-sm font-semibold text-slate-900">
              {invoice.address || "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Medicine Details
        </h2>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                  Medicine Name
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">
                  Qty
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">
                  Expiry Date
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">
                  GST %
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                  GST Amt
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                  Selling Price
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">
                  Total Price
                </th>
              </tr>
            </thead>
            <tbody>
              {medicines.flatMap((m, mIdx) =>
                (m.pickedBatches || []).map((b, bIdx) => {
                  const expiry = formatDate(b.expiryDate ?? null);
                  const gstPercent = b.gstPercentage || 0;
                  const pricePerStrip = b.pricePerStrip || 0;
                  const qty = b.usedStrips || 0;

                  // Calculate values if not present
                  const baseTotal = qty * pricePerStrip;
                  const gstAmt = b.gstAmount ?? (baseTotal * gstPercent) / 100;
                  const total = b.totalPrice ?? baseTotal + gstAmt;

                  return (
                    <tr
                      key={`${m.medicineId}-${b.stockId}-${bIdx}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-4 py-3 align-top font-medium text-slate-900">
                        {mIdx + 1}.{bIdx + 1}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900">
                          {m.medicineName}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-center text-slate-700">
                        {qty}
                      </td>
                      <td className="px-4 py-3 align-top text-center text-slate-700">
                        {expiry}
                      </td>
                      <td className="px-4 py-3 align-top text-center text-slate-700">
                        {gstPercent}%
                      </td>
                      <td className="px-4 py-3 align-top text-right text-slate-700">
                        {formatINR(gstAmt)}
                      </td>
                      <td className="px-4 py-3 align-top text-right text-slate-700">
                        {formatINR(pricePerStrip)}
                      </td>
                      <td className="px-4 py-3 align-top text-right font-semibold text-slate-900">
                        {formatINR(total)}
                      </td>
                    </tr>
                  );
                }),
              )}

              {medicines.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-4 text-center text-sm text-slate-500"
                  >
                    No medicines found for this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold text-emerald-700">Bill Summary</h2>

        <div className="max-w-md space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Subtotal (Excl. GST):</span>
            <span className="font-semibold text-slate-900">
              {formatINR(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Discount:</span>
            <span className="font-semibold text-slate-900">
              - {formatINR(discount)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600">GST:</span>
            <span className="font-semibold text-slate-900">
              + {formatINR(tax)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-700 font-medium">Total Amount:</span>
            <span className="font-semibold text-emerald-700">
              {formatINR(totalAmount)}
            </span>
          </div>
        </div>
      </section>

      <div className="pt-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
        >
          <FiPrinter className="h-4 w-4" />
          <span>Preview & Print Invoice</span>
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="4xl"
        scrollBehavior="inside"
        classNames={{
          base: "bg-slate-50",
          header: "border-b border-slate-200 bg-white",
          footer: "border-t border-slate-200 bg-white",
          closeButton: "hover:bg-slate-100 active:scale-90 transition-all",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-slate-800">
                  <FiPrinter className="text-emerald-600" />
                  <span>Invoice Preview</span>
                </div>
                <p className="text-xs font-normal text-slate-500">
                  Review the invoice details before printing
                </p>
              </ModalHeader>
              <ModalBody className="py-8">
                <InvoicePreviewContent />
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  color="danger"
                  onPress={onClose}
                  startContent={<FiX />}
                  className="font-semibold"
                >
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={handlePrint}
                  startContent={<FiPrinter />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                >
                  Print Invoice
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default InvoiceDetails;
