
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import type {
  PrescriptionHistoryItem,
  PatientSummary,
  DoctorSummary,
  ClinicSummary,
} from "./PrescriptionsHistory";

/**
 * ✅ FIX:
 * - Added `medicineCount?: string | number | null` (you are using item.medicineCount in code)
 * - Kept your extra fields (scheduleText, noteText, totalDoses)
 */
type PdfItem = PrescriptionHistoryItem & {
  scheduleText?: string;
  noteText?: string;
  totalDoses?: number | null;

  // ✅ NEW (build fix)
  medicineCount?: string | number | null;
};

/* ---------- PDF Styles ---------- */
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
  doctorBlock: { flex: 1 },
  clinicBlock: { flex: 1, alignItems: "flex-end" },
  doctorName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
  doctorLine: { fontSize: 9, color: "#374151" },
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

  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#374151",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginTop: 4,
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
  medMeta: {
    color: "#6B7280",
    fontWeight: "normal",
  },

  // ✅ Column widths (Dosage wider)
  colNo: { width: 24, fontSize: 9 },
  colName: { flex: 1.3, minWidth: 0, fontSize: 9, paddingRight: 6 },
  colDosage: { flex: 2.8, minWidth: 0, fontSize: 9, paddingRight: 6 },
  colDuration: { width: 58, fontSize: 9 },

  tableHeaderText: { fontSize: 9, fontWeight: "bold" },

  // ✅ Main line (horizontal flow + auto wrap)
  dosageInline: {
    fontSize: 9,
    lineHeight: 1.25,
    flexShrink: 1,
  },

  // ✅ Note ALWAYS on next line (below)
  noteBlock: {
    fontSize: 8,
    color: "#6B7280",
    lineHeight: 1.25,
    marginTop: 2,
    flexShrink: 1,
  },

  /* ✅ Advice block */
  adviceWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#D1D5DB",
  },
  adviceTitle: { fontSize: 9, fontWeight: "bold", marginBottom: 3 },
  adviceText: { fontSize: 9, lineHeight: 1.25, color: "#111827" },

  /* ✅ Footer */
  footerWrap: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  signBlock: {
    alignItems: "flex-end",
    minWidth: 220,
  },

  computerNote: {
    marginTop: 6,
    fontSize: 8,
    color: "#6B7280",
    textAlign: "right",
    maxWidth: 420,
    lineHeight: 1.2,
  },

  signLine: {
    width: 160,
    borderBottomWidth: 1,
    borderColor: "#111827",
    marginBottom: 4,
  },
  signLabel: { fontSize: 9, fontWeight: "bold" },
  signName: { fontSize: 9, color: "#374151" },
});

/* ---------- Helpers ---------- */

const splitBulletParts = (s?: string | null) =>
  (s || "")
    .split("•")
    .map((x) => x.trim())
    .filter(Boolean);

const clamp = (s: string, max = 140) => {
  const t = (s || "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trim() + "…";
};

/** ✅ FIX: accept string | number */
const extractTotalFromMedicineCount = (
  s?: string | number | null
): number | null => {
  if (s == null) return null;
  const m = String(s).match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};

const formatDateLikeIN = (raw?: any) => {
  if (!raw) return "-";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getNoteText = (item: PdfItem) => {
  return String(item.noteText ?? (item as any).notes ?? "").trim();
};

/** ✅ FIX: use medicineCount safely */
const getTotalDoseText = (item: PdfItem): string | null => {
  if (typeof item.totalDoses === "number" && item.totalDoses > 0) {
    return String(item.totalDoses);
  }

  const mc = item.medicineCount ?? null;

  if (typeof mc === "number" && Number.isFinite(mc) && mc > 0) return String(mc);

  const fromCountNum = extractTotalFromMedicineCount(mc);
  if (fromCountNum && fromCountNum > 0) return String(fromCountNum);

  if (mc != null && String(mc).trim()) return String(mc);

  return null;
};


const buildInlineParts = (item: PdfItem) => {
  const dosage = String((item as any).dosage ?? "").trim();

  const schedRaw = String(
    item.scheduleText ?? (item as any).frequency ?? ""
  ).trim();

  const scheduleParts = splitBulletParts(schedRaw);

  const totalDose = getTotalDoseText(item);
  const note = getNoteText(item);

  // ✅ If note exists, skip schedule parts (Morning/Night, days, etc.)
  const parts: string[] = [dosage].filter(Boolean);

  if (!note) {
    // note nahi hai to hi schedule show karo
    parts.push(...scheduleParts);
  }

  if (totalDose) parts.push(`Total doses: ${totalDose}`);

  return {
    mainText: parts.length ? parts.join(" • ") : "-",
    noteText: note ? `Note: ${clamp(note, 130)}` : "",
  };
};


/**
 * ✅ FIX:
 * - added adviceText + reportCard in props so PrescriptionSection.tsx can pass them
 */
const PrescriptionPdf: React.FC<{
  items: PdfItem[];
  patient?: PatientSummary;
  doctor?: DoctorSummary;
  clinic?: ClinicSummary;

  adviceText?: string | null;
  reportCard?: unknown; // keep generic (no extra import needed)
}> = ({ items, patient, doctor, clinic, adviceText }) => {
  const first = items?.[0];

  const patientNameDisplay = patient?.name || "—";
  const dateDisplay =
    formatDateLikeIN((first as any)?.date ?? (first as any)?.createdAt) || "-";

  const patientAgeGender = [
    patient?.age != null ? `${patient.age} yrs` : null,
    patient?.gender || null,
  ]
    .filter(Boolean)
    .join(" / ");

  const genderShort = patient?.gender
    ? `(${patient.gender.charAt(0).toUpperCase()})`
    : "";

  const advice = String(adviceText ?? "").trim();

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Top header: doctor + clinic */}
        <View style={pdfStyles.headerRow}>
          <View style={pdfStyles.doctorBlock}>
            <Text style={pdfStyles.doctorName}>
              {doctor?.name ? `Doctor: Dr. ${doctor.name}` : "Doctor: Dr. —"}
            </Text>

            {[doctor?.qualification, (doctor as any)?.speciality]
              .filter(Boolean)
              .join(", ") || "" ? (
              <Text style={pdfStyles.doctorLine}>
                {[doctor?.qualification, (doctor as any)?.speciality]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            ) : null}

            {(doctor as any)?.licenseNumber ? (
              <Text style={pdfStyles.doctorLine}>
                Reg. No: {(doctor as any).licenseNumber}
              </Text>
            ) : null}

            {(doctor as any)?.mobile ? (
              <Text style={pdfStyles.doctorLine}>
                Mob: {(doctor as any).mobile}
              </Text>
            ) : null}

            {doctor?.email ? (
              <Text style={pdfStyles.doctorLine}>Email: {doctor.email}</Text>
            ) : null}
          </View>

          <View style={pdfStyles.clinicBlock}>
            <Text style={pdfStyles.smallGray}>Clinic Details</Text>

            {(clinic as any)?.logoUrl ? (
              <Image style={pdfStyles.logo} src={(clinic as any).logoUrl} />
            ) : null}

            {clinic?.name ? (
              <Text style={pdfStyles.clinicName}>{clinic.name}</Text>
            ) : null}

            {(clinic as any)?.addressLine1 ? (
              <Text style={pdfStyles.clinicLine}>
                {(clinic as any).addressLine1}
              </Text>
            ) : null}

            {(clinic as any)?.addressLine2 ? (
              <Text style={pdfStyles.clinicLine}>
                {(clinic as any).addressLine2}
              </Text>
            ) : null}

            {(clinic as any)?.phone ? (
              <Text style={pdfStyles.clinicLine}>
                Ph: {(clinic as any).phone}
              </Text>
            ) : null}

            {(clinic as any)?.timing ? (
              <Text style={pdfStyles.clinicLine}>{(clinic as any).timing}</Text>
            ) : null}
          </View>
        </View>

        <View style={pdfStyles.hr} />

        {/* Patient meta row */}
        <View style={pdfStyles.metaRow}>
          <View style={pdfStyles.metaLeft}>
            <Text style={pdfStyles.metaLine}>
              <Text style={pdfStyles.metaLabel}>Patient Name: </Text>
              <Text>
                {patientNameDisplay} {genderShort}
              </Text>
            </Text>

            {(patient as any)?.address ? (
              <Text style={pdfStyles.metaLine}>
                <Text style={pdfStyles.metaLabel}>Address: </Text>
                <Text>{(patient as any).address}</Text>
              </Text>
            ) : null}

            {patientAgeGender ? (
              <Text style={pdfStyles.smallGray}>
                Age / Gender: {patientAgeGender}
              </Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaRight}>
            <Text style={pdfStyles.metaLine}>
              <Text style={pdfStyles.metaLabel}>Date: </Text>
              <Text>{dateDisplay}</Text>
            </Text>
          </View>
        </View>

        {/* Table header */}
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.colNo, pdfStyles.tableHeaderText]}>#</Text>
          <Text style={[pdfStyles.colName, pdfStyles.tableHeaderText]}>
            Medicine Name
          </Text>
          <Text style={[pdfStyles.colDosage, pdfStyles.tableHeaderText]}>
            Dosage / Schedule / Note
          </Text>
          <Text style={[pdfStyles.colDuration, pdfStyles.tableHeaderText]}>
            Duration
          </Text>
        </View>

        {/* Rows */}
        {items.map((rawItem, index) => {
          const item = rawItem as PdfItem;

          const strengthComp = [
            (item as any).strength,
            (item as any).composition,
          ]
            .filter(Boolean)
            .join(" • ");

          const { mainText, noteText } = buildInlineParts(item);

          return (
            <View key={(item as any).id ?? index} style={pdfStyles.tableRow}>
              <Text style={pdfStyles.colNo}>{index + 1}</Text>

              <Text style={pdfStyles.colName}>
                <Text style={pdfStyles.medName}>
                  {(item as any).medicineName || "-"}
                </Text>
                {strengthComp ? (
                  <Text style={pdfStyles.medMeta}>
                    {"\n"}({strengthComp})
                  </Text>
                ) : null}
              </Text>

              {/* ✅ mainText on top, Note on next line (below) */}
              <View style={pdfStyles.colDosage}>
                <Text style={pdfStyles.dosageInline}>{mainText}</Text>
                {noteText ? (
                  <Text style={pdfStyles.noteBlock}>{noteText}</Text>
                ) : null}
              </View>

              <Text style={pdfStyles.colDuration}>
                {String((item as any).duration ?? "-") || "-"}
              </Text>
            </View>
          );
        })}

        {/* ✅ Advice (optional) */}
        {advice ? (
          <View style={pdfStyles.adviceWrap}>
            <Text style={pdfStyles.adviceTitle}>Advice</Text>
            <Text style={pdfStyles.adviceText}>{advice}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={pdfStyles.footerWrap}>
          <View style={pdfStyles.signBlock}>
            <View style={pdfStyles.signLine} />
            <Text style={pdfStyles.signLabel}>Doctor Sign</Text>
            <Text style={pdfStyles.signName}>
              {doctor?.name ? `Dr. ${doctor.name}` : "Dr. —"}
            </Text>

            <Text style={pdfStyles.computerNote}>
              This prescription is generated by computer and does not require a
              physical signature.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPdf;
