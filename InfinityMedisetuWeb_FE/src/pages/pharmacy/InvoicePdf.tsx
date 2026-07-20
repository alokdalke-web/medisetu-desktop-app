import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { CreatedInvoiceData } from "./InvoiceDetails";

/* ---------- PDF Styles (matching prescription format) ---------- */
const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 6,
  },
  pharmacyBlock: { flex: 1 },
  clinicBlock: { flex: 1, alignItems: "flex-end" },
  pharmacyName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
  pharmacyLine: { fontSize: 9, color: "#374151" },
  clinicName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
  clinicLine: { fontSize: 9, color: "#374151", textAlign: "right" },
  logo: { width: 28, height: 28, marginBottom: 3, alignSelf: "center" },

  hr: { borderBottomWidth: 1, borderColor: "#9CA3AF", marginVertical: 6 },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaLeft: { flex: 1 },
  metaRight: { flexShrink: 0, alignItems: "flex-end" },
  metaLine: { fontSize: 9, marginBottom: 1 },
  metaLabel: { fontWeight: "bold" },
  smallGray: { fontSize: 8, color: "#6B7280", marginBottom: 2 },

  invoiceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 6,
  },

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#374151",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 4,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#D1D5DB",
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },

  medName: {
    color: "#111827",
    fontWeight: "bold",
  },

  colNo: { width: 24, fontSize: 8 },
  colName: { flex: 2, minWidth: 0, fontSize: 8, paddingRight: 4 },
  colQty: { width: 30, fontSize: 8, textAlign: "center" },
  colExpiry: { width: 50, fontSize: 8, textAlign: "center" },
  colGst: { width: 45, fontSize: 8, textAlign: "right" },
  colGstAmt: { width: 45, fontSize: 8, textAlign: "right" },
  colPrice: { width: 50, fontSize: 8, textAlign: "right" },
  colTotal: { width: 60, fontSize: 8, textAlign: "right" },

  tableHeaderText: { fontSize: 8, fontWeight: "bold" },

  /* Bill Summary */
  summaryWrap: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  summaryBlock: {
    alignItems: "flex-end",
    minWidth: 220,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    minWidth: 180,
  },
  summaryLabel: { fontSize: 9, color: "#374151" },
  summaryValue: { fontSize: 9, fontWeight: "bold" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    minWidth: 180,
  },
  totalLabel: { fontSize: 10, fontWeight: "bold" },
  totalValue: { fontSize: 10, fontWeight: "bold", color: "#059669" },

  computerNote: {
    marginTop: 6,
    fontSize: 8,
    color: "#6B7280",
    textAlign: "right",
    maxWidth: 420,
    lineHeight: 1.2,
  },
});

/* ---------- Helpers ---------- */
const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

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

interface InvoicePdfProps {
  data: CreatedInvoiceData;
}

const InvoicePdf: React.FC<InvoicePdfProps> = ({ data }) => {
  const { invoice, billing, medicines } = data;
  const { clinic, pharmacy } = invoice;

  const subtotal = Number(billing?.price ?? 0);
  const discount = Number(billing?.discount ?? 0);
  const tax = Number(billing?.tax ?? 0);
  const totalAmount = Number(billing?.totalPrice ?? 0);

  const invoiceIdDisplay = `INV-${String(invoice?.id ?? "").slice(0, 8)}`;
  const invoiceDate = formatDate(invoice?.createdAt);

  const rows = medicines.flatMap((m) =>
    (m.pickedBatches || []).map((b) => {
      const expiry = formatDate(b.expiryDate ?? null);
      const gstPercent = b.gstPercentage || 0;
      const pricePerStrip = b.pricePerStrip || 0;
      const qty = b.usedStrips || 0;

      const baseTotal = qty * pricePerStrip;
      const gstAmt = b.gstAmount ?? (baseTotal * gstPercent) / 100;
      const total = b.totalPrice ?? (baseTotal + gstAmt);

      return {
        medicineName: m.medicineName,
        qty,
        expiry,
        gstPercent,
        gstAmt,
        pricePerStrip,
        total,
      };
    })
  );

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Top header: Pharmacy + Clinic */}
        <View style={pdfStyles.headerRow}>
          <View style={pdfStyles.pharmacyBlock}>
            <Text style={pdfStyles.pharmacyName}>
              {pharmacy?.name ? `Pharmacy: ${pharmacy.name}` : "Pharmacy: —"}
            </Text>

            {pharmacy?.address ? (
              <Text style={pdfStyles.pharmacyLine}>
                Address: {pharmacy.address}
              </Text>
            ) : null}

            {pharmacy?.contactNumber ? (
              <Text style={pdfStyles.pharmacyLine}>
                Contact: {pharmacy.contactNumber}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.clinicBlock}>
            {clinic?.clinicLogo ? (
              <Image style={pdfStyles.logo} src={clinic.clinicLogo} />
            ) : null}

            {clinic?.clinicName ? (
              <Text style={pdfStyles.clinicName}>{clinic.clinicName}</Text>
            ) : null}

            {clinic?.clinicAddress ? (
              <Text style={pdfStyles.clinicLine}>{clinic.clinicAddress}</Text>
            ) : null}

            {[clinic?.City, clinic?.State, clinic?.Country]
              .filter(Boolean)
              .join(", ") ? (
              <Text style={pdfStyles.clinicLine}>
                {[clinic?.City, clinic?.State, clinic?.Country]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={pdfStyles.hr} />

        {/* Customer meta row */}
        <View style={pdfStyles.metaRow}>
          <View style={pdfStyles.metaLeft}>
            <Text style={pdfStyles.metaLine}>
              <Text style={pdfStyles.metaLabel}>Customer Name: </Text>
              <Text>{invoice?.customerName || "—"}</Text>
            </Text>

            {invoice?.address ? (
              <Text style={pdfStyles.metaLine}>
                <Text style={pdfStyles.metaLabel}>Address: </Text>
                <Text>{invoice.address}</Text>
              </Text>
            ) : null}

            {invoice?.mobile ? (
              <Text style={pdfStyles.smallGray}>
                Mobile: {invoice.mobile}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaRight}>
            <Text style={pdfStyles.metaLine}>
              <Text style={pdfStyles.metaLabel}>Invoice ID: </Text>
              <Text>{invoiceIdDisplay}</Text>
            </Text>
            <Text style={pdfStyles.metaLine}>
              <Text style={pdfStyles.metaLabel}>Date: </Text>
              <Text>{invoiceDate}</Text>
            </Text>
            <Text style={pdfStyles.smallGray}>
              Payment: {billing?.paymentMethod ?? "—"}
            </Text>
          </View>
        </View>

        {/* Invoice title */}
        <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>

        {/* Table header */}
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.colNo, pdfStyles.tableHeaderText]}>#</Text>
          <Text style={[pdfStyles.colName, pdfStyles.tableHeaderText]}>
            Medicine Name
          </Text>
          <Text style={[pdfStyles.colQty, pdfStyles.tableHeaderText]}>
            Qty
          </Text>
          <Text style={[pdfStyles.colExpiry, pdfStyles.tableHeaderText]}>
            Expiry
          </Text>
          <Text style={[pdfStyles.colGst, pdfStyles.tableHeaderText]}>
            GST %
          </Text>
          <Text style={[pdfStyles.colGstAmt, pdfStyles.tableHeaderText]}>
            GST Amt
          </Text>
          <Text style={[pdfStyles.colPrice, pdfStyles.tableHeaderText]}>
            Rate
          </Text>
          <Text style={[pdfStyles.colTotal, pdfStyles.tableHeaderText]}>
            Total
          </Text>
        </View>

        {/* Rows */}
        {rows.map((row, index) => (
          <View key={index} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.colNo}>{index + 1}</Text>

            <Text style={pdfStyles.colName}>
              <Text style={pdfStyles.medName}>{row.medicineName}</Text>
            </Text>

            <Text style={pdfStyles.colQty}>{row.qty}</Text>

            <Text style={pdfStyles.colExpiry}>{row.expiry}</Text>

            <Text style={pdfStyles.colGst}>{row.gstPercent}%</Text>

            <Text style={pdfStyles.colGstAmt}>{formatINR(row.gstAmt)}</Text>

            <Text style={pdfStyles.colPrice}>{formatINR(row.pricePerStrip)}</Text>

            <Text style={pdfStyles.colTotal}>{formatINR(row.total)}</Text>
          </View>
        ))}

        {rows.length === 0 && (
          <View style={pdfStyles.tableRow}>
            <Text style={{ flex: 1, textAlign: "center", color: "#6B7280" }}>
              No medicines found for this invoice.
            </Text>
          </View>
        )}

        {/* Bill Summary (right-aligned like prescription footer) */}
        <View style={pdfStyles.summaryWrap}>
          <View style={pdfStyles.summaryBlock}>
            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Subtotal (Excl. GST):</Text>
              <Text style={pdfStyles.summaryValue}>{formatINR(subtotal)}</Text>
            </View>

            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>Discount:</Text>
              <Text style={pdfStyles.summaryValue}>
                - {formatINR(discount)}
              </Text>
            </View>

            <View style={pdfStyles.summaryRow}>
              <Text style={pdfStyles.summaryLabel}>GST:</Text>
              <Text style={pdfStyles.summaryValue}>+ {formatINR(tax)}</Text>
            </View>

            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Total Amount:</Text>
              <Text style={pdfStyles.totalValue}>{formatINR(totalAmount)}</Text>
            </View>

            <Text style={pdfStyles.computerNote}>
              This invoice is generated by computer and does not require a
              physical signature.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePdf;
