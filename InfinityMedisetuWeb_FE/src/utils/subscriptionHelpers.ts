import { format } from "date-fns";

/* ---------------- Types ---------------- */

export interface PriceBreakdown {
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
}

export interface InvoiceData {
  id: string;
  transactionId: string;
  planName: string;
  planDescription: string;
  price: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  paymentMode: string;
  paymentStatus: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicState: string;
  clinicCity: string;
  zipCode: string;
  currency: string;
  adminName: string;
  adminEmail: string;
  adminMobile: string;
}

/* ---------------- Helpers ---------------- */

export function safeFormatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `₹${amount || 0}`;
  }
}

/* ---------------- Checkout / Billing-cycle helpers ---------------- */

export type BillingCycleType = "monthly" | "yearly";

/** Yearly billing discount, in percent (matches the "Save 20%" badge in the UI). */
export const YEARLY_DISCOUNT_PCT = 20;

/**
 * Resolve a monthly price into the price for the selected billing cycle.
 * Yearly = 12 months with the yearly discount applied.
 */
export const getCyclePrice = (
  monthlyPrice: number,
  cycle: BillingCycleType,
): number => {
  if (cycle === "yearly") {
    return Math.round(monthlyPrice * 12 * (1 - YEARLY_DISCOUNT_PCT / 100));
  }
  return monthlyPrice;
};

export interface SelectedAddOnLine {
  unitPrice: number;
  quantity: number;
}

export interface CheckoutTotals {
  addOnTotal: number;
  subtotal: number;
  discount: number;
  totalPayable: number;
}

/**
 * Pure checkout math: plan price + add-ons, minus an optional coupon discount.
 * `discountPct` (0–100) is applied to the subtotal. Kept pure for testability.
 */
export const computeCheckoutTotals = (args: {
  planPrice: number;
  selectedAddOns: SelectedAddOnLine[];
  discountPct?: number;
}): CheckoutTotals => {
  const { planPrice, selectedAddOns, discountPct = 0 } = args;

  const addOnTotal = selectedAddOns.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  const subtotal = planPrice + addOnTotal;
  const discount = Math.round((subtotal * Math.max(0, discountPct)) / 100);
  const totalPayable = Math.max(0, subtotal - discount);

  return { addOnTotal, subtotal, discount, totalPayable };
};

export const calculatePriceBreakdown = (grandTotal: number): PriceBreakdown => {
  const subtotal = grandTotal / 1.18;
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;

  return {
    subtotal: subtotal,
    cgst: cgst,
    sgst: sgst,
    grandTotal: grandTotal,
  };
};

/* ---------------- Invoice Generator ---------------- */

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy");
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "dd MMM yyyy, hh:mm a");
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return format(now, "dd MMM yyyy, hh:mm a");
  };

  const getInvoiceSuffix = (id: string) => {
    if (!id) return "unknown";
    const parts = id.split("-");
    return parts[parts.length - 1];
  };

  const breakdown = calculatePriceBreakdown(Number(data.price));
  const grandTotal = breakdown.grandTotal;
  const subtotal = breakdown.subtotal;
  const cgst = breakdown.cgst;
  const sgst = breakdown.sgst;

  const amountInWords = (amount: number) => {
    const words = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const convert = (n: number): string => {
      if (n < 20) return words[n];
      if (n < 100)
        return tens[Math.floor(n / 10)] + (n % 10 ? " " + words[n % 10] : "");
      if (n < 1000)
        return (
          words[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 ? " " + convert(n % 100) : "")
        );
      if (n < 100000)
        return (
          convert(Math.floor(n / 1000)) +
          " Thousand" +
          (n % 1000 ? " " + convert(n % 1000) : "")
        );
      if (n < 10000000)
        return (
          convert(Math.floor(n / 100000)) +
          " Lakh" +
          (n % 100000 ? " " + convert(n % 100000) : "")
        );
      return (
        convert(Math.floor(n / 10000000)) +
        " Crore" +
        (n % 10000000 ? " " + convert(n % 10000000) : "")
      );
    };

    return convert(Math.floor(amount)) + " Rupees Only";
  };

  const invoiceNumber = `${getInvoiceSuffix(data.id)}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <title>${invoiceNumber}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: "Courier New", "Lucida Console", monospace;
        background: #fffdf7;
        padding: 12px;
        color: #000;
        overflow-x: hidden;
        letter-spacing: 1px;
        font-weight: 700;
        text-transform: uppercase;
        image-rendering: pixelated;
        filter: contrast(1.1);
      }

      .invoice-container {
        width: 100%;
        max-width: 850px;
        margin: auto;
        border: 1px solid rgba(0,0,0,0.25);
        padding: 22px;
        background: #fffdf7;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #000;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }

      .logo img { height: 30px; }

      .company-details {
        font-size: 12px;
        line-height: 1.5;
        margin-bottom: 20px;
        text-align: right;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .invoice-title {
        text-align: right;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .invoice-title h1 {
        font-size: 28px;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      .invoice-title p {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .section-title {
        font-weight: bold;
        font-size: 13px;
        margin-bottom: 8px;
        text-transform: uppercase;
        border-bottom: 1px solid #000;
        padding-bottom: 4px;
        letter-spacing: 1px;
      }

      .info-grid {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        gap: 20px;
      }

      .info-box {
        flex: 1;
        font-size: 13px;
        line-height: 1.6;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .info-box .info-row {
        margin-bottom: 4px;
        display: flex;
        flex-wrap: wrap;
      }

      .info-box .info-label {
        font-weight: bold;
        min-width: 100px;
        text-transform: uppercase;
      }

      .info-box .info-value {
        flex: 1;
        word-wrap: break-word;
        word-break: break-word;
        text-transform: uppercase;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      table th,
      table td {
        border: 1px solid #000;
        padding: 10px;
        font-size: 13px;
        text-align: left;
        vertical-align: top;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      table th {
        background: #f5f5f5;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .grand-total td {
        font-size: 15px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .signature-section {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
      }

      .signature-box {
        text-align: center;
        position: relative;
      }

      .signature {
        position: absolute;
        top: 20px;
      }

      .seal img {
        max-width: 120px;
      }

      .footer {
        margin-top: 30px;
        font-size: 12px;
        text-align: center;
        border-top: 1px solid #000;
        padding-top: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      @media (max-width: 768px) {
        body {
          padding: 8px;
        }

        .invoice-container {
          padding: 14px;
        }

        .header,
        .info-grid {
          flex-direction: column;
          gap: 12px;
        }

        .invoice-title,
        .company-details {
          text-align: left;
        }

        table {
          display: block;
          overflow-x: auto;
          white-space: nowrap;
        }

        table th,
        table td {
          padding: 8px;
          font-size: 12px;
        }

        .seal img {
          max-width: 82px;
        }

        .footer {
          margin-top: 18px;
        }
      }

      @media print {
        body {
          padding: 0;
          margin: 0;
          background: #fff;
        }
        .invoice-container {
          border: none;
          padding: 20px;
          max-width: 100%;
          background: #fff;
        }
        .no-print { display: none !important; }
        button, .print-button { display: none !important; }
        @page { size: A4; margin: 1.5cm; }
      }
    </style>
    </head>
    <body>
    <div class="invoice-container">
      <div class="header">
        <div class="logo">
          <img src="/app/assets/images/logoLight.svg" alt="Logo">
        </div>
        <div class="invoice-title">
          <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
          <p><strong>Date/Time:</strong> ${getCurrentDateTime()}</p>
        </div>
      </div>
      <div class="company-details">
        <strong>Infinity Medisetu</strong><br>
        <strong>GSTIN: </strong>27AAJCI8930K1ZP
      </div>
      <div class="info-grid">
        <div class="info-box">
          <div class="section-title">Clinic Details</div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${data.clinicName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${data.clinicAddress || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">City/State:</span>
            <span class="info-value">${data.clinicCity || "N/A"}, ${data.clinicState || "N/A"} - ${data.zipCode || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${data.clinicPhone || "N/A"}</span>
          </div>
        </div>
        
        <div class="info-box">
          <div class="section-title">Customer Details</div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${data.adminName || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${data.adminEmail || "N/A"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">${data.adminMobile || "N/A"}</span>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Transaction Date/Time</th>
            <th>Transaction ID</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${data.planName}</strong><br><span style="font-size: 10px; text-transform: lowercase;">(${data.planDescription || "Clinic Subscription Plan"})</span></td>
            <td>${formatDate(data.startsAt)}</td>
            <td>${formatDate(data.expiresAt)}</td>
            <td>${formatDateTime(data.createdAt)}</td>
            <td>${data.transactionId}</td>
            <td>${safeFormatMoney(subtotal, data.currency)}</td>
          </tr>
          <tr>
            <td colspan="5" style="font-size:12px; text-align:right; line-height: 20px; text-transform: uppercase; letter-spacing: 1px;">
              <p>CGST (9<span style="font-size:10px; font-family: Arial, Helvetica, sans-serif">%</span>)</p>
              <p>SGST (9<span style="font-size:10px; font-family: Arial, Helvetica, sans-serif">%</span>)</p>
            </td>
            <td style="line-height: 20px; text-transform: uppercase; letter-spacing: 1px;">
              <p>${safeFormatMoney(cgst, data.currency)}</p>
              <p>${safeFormatMoney(sgst, data.currency)}</p>
            </td>
          </tr>
          <tr class="grand-total">
            <td colspan="5" style="text-align:right; font-weight:bold; text-transform: uppercase; letter-spacing: 1px;">Grand Total</td>
            <td style="font-weight:bold; text-transform: uppercase; letter-spacing: 1px;">${safeFormatMoney(grandTotal, data.currency)}</td>
          </tr>
          <tr>
            <td colspan="6" style="border-top: none;">
              <p style="font-size: 10px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Total in Words:</p>
              <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${amountInWords(grandTotal)}</p>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="signature-section">
        <div class="signature-box">
          <div class="seal" style="opacity: 0.8">
            <img src="https://i.ibb.co/YTKDDQbY/IMS-Seal.png" alt="Seal">
          </div>
        </div>
      </div>
      <div class="footer">
        This is a computer-generated invoice.<br>
        For queries: support@infinitymedisetu.com
      </div>
    </div>
    </body>
    </html>
  `;
};
