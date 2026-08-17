import type { PaymentTransaction } from "../../../redux/api/subscriptionApi";
import type { TransactionRow } from "../../../types/paymentHistory";

export const formatDateSafe = (val?: string | null) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
};

export const mapFromAPI = (
  item: PaymentTransaction,
  subServices?: {
    name: string;
    price: number;
    transactionId: string;
    paymentMode?: string | null;
    refundMode?: string | null;
    entryType?: string | null;
  }[] | null,
): TransactionRow => {
  const patientName = item.patientName ?? "Unknown Patient";
  const patientMobile = item.patientMobile ?? null;
  const serviceName =
    subServices && subServices.length > 1
      ? `${subServices[0].name} +${subServices.length - 1}`
      : (item.serviceName ?? "—");
  const priceNumber = typeof item.price === "number" ? item.price : null;
  const entryType = item.entryType ?? "";
  const paymentMode = item.paymentMode ?? null;
  const refundMode = item.refundMode ?? null;
  const refundNotes = item.refundNotes ?? null;
  const mode = entryType.toLowerCase() === "credit" ? paymentMode : refundMode;

  const dateSrc = item.appointmentDate ?? null;
  const dateLabel = dateSrc
    ? (() => {
      const d = new Date(dateSrc);
      if (Number.isNaN(d.getTime())) return formatDateSafe(dateSrc);
      const mon = d.toLocaleString("en-US", { month: "long" });
      const day = d.getDate();
      const yy = d.getFullYear();
      return `${mon} ${day}, ${yy}`;
    })()
    : "—";

  // A merged row spans more than one underlying transactionId — showing just
  // one child's id as "the" transaction id would misrepresent it, so fall
  // back to the shared appointment id instead.
  const isMerged = !!subServices && subServices.length > 1;
  const rawId = String(
    (isMerged ? item.originalAppointmentId : item.transactionId) ??
      item.originalAppointmentId ??
      item.transactionId ??
      "",
  ).trim();

  return {
    rawId,
    originalAppointmentId: item.originalAppointmentId ?? null,
    patientName,
    patientMobile,
    doctorName: item.doctorName ?? "—",
    doctorSpeciality: item.doctorSpeciality ?? null,
    serviceName,
    priceNumber,
    entryType,
    paymentStatus: item.paymentStatus ?? null,
    paymentMode,
    refundMode,
    refundNotes,
    mode,
    dateLabel,
    subServices:
      subServices && subServices.length > 1
        ? subServices.map((s) => {
          const sEntryType = s.entryType ?? entryType;
          const sMode = sEntryType.toLowerCase() === "credit" ? s.paymentMode : s.refundMode;
          return {
            serviceName: s.name,
            priceNumber: s.price,
            transactionId: s.transactionId,
            mode: sMode ?? null,
          };
        })
        : null,
  };
};

export const moneyFmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const monthStartYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
};

export const doctorDisplayName = (name: string) => {
  const clean = String(name || "").trim();
  if (!clean || clean === "—") return "—";
  return clean.toLowerCase().startsWith("dr.") ? clean : `Dr. ${clean}`;
};

/** Entry type pill — maps to StatusChip-compatible status. */
export const entryTypeStatus = (type: string) => {
  const t = type.toLowerCase();
  if (t === "credit") return "completed"; // green
  if (t === "debit") return "cancelled"; // red
  return "unknown";
};

/** User-facing label for an entry type — clearer than accounting jargon.
 * "Credit" = money received (a payment); "Debit" = money returned (a refund). */
export const entryTypeLabel = (type: string) => {
  const t = type.toLowerCase();
  if (t === "credit") return "Payment";
  if (t === "debit") return "Refund";
  return "—";
};

/** true when this entry represents money leaving (a refund/debit) */
export const isDebitEntry = (type: string) => type.toLowerCase() === "debit";

/** Display-only prettifier for payment-mode strings. The underlying value is
 * kept verbatim for filtering; this only cleans up the label (e.g. the stored
 * "PayLater" reads as "Pay Later"). Falls back to splitting camelCase. */
export const prettyModeLabel = (mode: string): string => {
  const raw = (mode || "").trim();
  if (!raw) return raw;
  const known: Record<string, string> = {
    paylater: "Pay Later",
    "pay later": "Pay Later",
    "pay on visit": "Pay on Visit",
    cash: "Cash",
    online: "Online",
    upi: "UPI",
    card: "Card",
  };
  const hit = known[raw.toLowerCase()];
  if (hit) return hit;
  return raw.replace(/([a-z])([A-Z])/g, "$1 $2");
};

/** Per-row payment status → user-facing label + StatusChip colour.
 * Falls back to the entry type when the backend didn't send a status. */
export const paymentStatusMeta = (
  status?: string | null,
  entryType?: string,
): { label: string; chip: string } => {
  const s = String(status ?? "").toLowerCase();
  if (s === "pending") return { label: "Pending", chip: "pending" }; // amber
  if (s === "refunded") return { label: "Refunded", chip: "cancelled" }; // red
  if (s === "already paid") return { label: "Already Paid", chip: "completed" };
  if (s === "paid") return { label: "Paid", chip: "completed" }; // green
  // Fallback for older data with no status field
  return isDebitEntry(entryType ?? "")
    ? { label: "Refunded", chip: "cancelled" }
    : { label: "Paid", chip: "completed" };
};
