
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

/* ---------- PDF Styles Factory ---------- */
const createPdfStyles = (templateConfig: any) => {
  const PRIMARY_COLOR = templateConfig?.color1 || "#0D7E83"; // Fallback to Teal

  return StyleSheet.create({
    page: {
      padding: 0,
      fontSize: 10,
      fontFamily: "Helvetica",
      color: "#111827",
    },
    headerBanner: {
      backgroundColor: PRIMARY_COLOR,
      color: "white",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 24,
      paddingHorizontal: 32,
    },
    headerLeft: {
      flex: 1,
      paddingRight: 16,
    },
    clinicName: {
      fontSize: 24,
      fontFamily: "Times-Bold",
      marginBottom: 6,
    },
    clinicAddress: {
      fontSize: 9,
      color: "#ccfbf1",
      lineHeight: 1.4,
    },
    headerRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      borderLeftWidth: 1,
      borderColor: "#5eead4",
      paddingLeft: 24,
      marginLeft: 16,
      flexShrink: 0,
    },
    doctorName: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      marginBottom: 4,
    },
    doctorSpeciality: {
      fontSize: 9,
      color: "#ccfbf1",
      marginBottom: 2,
    },
    doctorReg: {
      fontSize: 9,
      color: "#ccfbf1",
    },
    contentContainer: {
      paddingHorizontal: 32,
      paddingTop: 24,
    },
    patientBox: {
      backgroundColor: "#F8FAFC",
      borderRadius: 8,
      padding: 16,
      flexDirection: "row",
      marginBottom: 16,
    },
    patientBoxCol: {
      flex: 1,
      borderLeftWidth: 1,
      borderColor: "#E2E8F0",
      paddingLeft: 16,
    },
    patientBoxColFirst: {
      flex: 1,
    },
    patientBoxLabel: {
      fontSize: 7,
      color: "#64748B",
      fontFamily: "Helvetica-Bold",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    patientBoxValue: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      color: "#0f172a",
    },
    addressRow: {
      flexDirection: "row",
      marginBottom: 24,
    },
    addressLabel: {
      color: PRIMARY_COLOR,
      fontFamily: "Helvetica-Bold",
      fontSize: 10,
    },
    addressValue: {
      fontSize: 10,
      marginLeft: 4,
      color: "#334155",
    },
    rxIconText: {
      fontSize: 32,
      color: PRIMARY_COLOR,
      fontFamily: "Times-Bold",
      marginBottom: 16,
    },
    table: {
      width: "100%",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: PRIMARY_COLOR,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    tableHeaderText: {
      color: "white",
      fontSize: 8,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: "#E2E8F0",
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    colNo: { width: 30 },
    colMedication: { flex: 2, paddingRight: 8 },
    colDosage: { flex: 1, textAlign: "center" },
    colFrequency: { flex: 1.5, textAlign: "center" },
    colDuration: { flex: 1, textAlign: "center" },
    colInstructions: { flex: 1.5, textAlign: "right" },
    medName: {
      fontFamily: "Helvetica-Bold",
      fontSize: 10,
      marginBottom: 4,
      color: "#0f172a",
    },
    medMeta: {
      color: "#64748B",
      fontSize: 8,
      fontStyle: "italic",
    },
    instructionsText: {
      fontSize: 9,
      color: "#64748B",
      fontStyle: "italic",
    },
    adviceWrap: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderColor: "#E2E8F0",
    },
    adviceTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 8, color: PRIMARY_COLOR },
    adviceText: { fontSize: 9, lineHeight: 1.5, color: "#334155" },
    footerWrap: {
      marginTop: 60,
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    signBlock: {
      alignItems: "center",
      width: 200,
    },
    signLine: {
      width: "100%",
      borderBottomWidth: 1,
      borderColor: "#CBD5E1",
      marginBottom: 8,
    },
    signName: {
      fontSize: 11,
      color: "#334155",
    }
  });
};

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
    month: "short",
    year: "numeric",
  }).replace(/ /g, "-");
};

/**
 * Main Component
 */
const PrescriptionPdf: React.FC<{
  items: PdfItem[];
  patient?: PatientSummary;
  doctor?: DoctorSummary;
  clinic?: ClinicSummary;
  adviceText?: string | null;
  reportCard?: unknown;
  templateConfig?: any;
}> = ({ items, patient, doctor, clinic, adviceText, templateConfig }) => {
  const first = items?.[0];
  const pdfStyles = React.useMemo(() => createPdfStyles(templateConfig), [templateConfig]);

  const patientNameDisplay = patient?.name || "—";
  const dateDisplay = formatDateLikeIN((first as any)?.date ?? (first as any)?.createdAt) || "-";

  const advice = String(adviceText ?? "").trim();

  // Construct clinic address string
  const clinicAddressParts = [
    (clinic as any)?.addressLine1,
    (clinic as any)?.addressLine2,
    (clinic as any)?.addressLine3
  ].filter(Boolean);
  const clinicAddressStr = clinicAddressParts.join(", ");
  const clinicPhoneStr = (clinic as any)?.phone ? `Ph: ${(clinic as any).phone}` : "";
  const clinicFullAddress = [clinicAddressStr, clinicPhoneStr].filter(Boolean).join(" | ");

  // Doctor qualifications
  const doctorSpecs = [doctor?.qualification, (doctor as any)?.speciality].filter(Boolean).join(", ");

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        
        {/* Teal Header Banner */}
        <View style={pdfStyles.headerBanner}>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.clinicName}>{clinic?.name || "mediplus"}</Text>
            {clinicFullAddress ? (
              <Text style={pdfStyles.clinicAddress}>{clinicFullAddress}</Text>
            ) : null}
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.doctorName}>{doctor?.name ? `Dr. ${doctor.name}` : "Dr. —"}</Text>
            {doctorSpecs ? (
              <Text style={pdfStyles.doctorSpeciality}>{doctorSpecs}</Text>
            ) : null}
            {(doctor as any)?.licenseNumber ? (
              <Text style={pdfStyles.doctorReg}>Reg. No: {(doctor as any).licenseNumber}</Text>
            ) : null}
          </View>
        </View>

        <View style={pdfStyles.contentContainer}>
          {/* Patient Details Box */}
          <View style={pdfStyles.patientBox}>
            <View style={pdfStyles.patientBoxColFirst}>
              <Text style={pdfStyles.patientBoxLabel}>PATIENT</Text>
              <Text style={pdfStyles.patientBoxValue}>{patientNameDisplay}</Text>
            </View>
            <View style={pdfStyles.patientBoxCol}>
              <Text style={pdfStyles.patientBoxLabel}>AGE / SEX</Text>
              <Text style={pdfStyles.patientBoxValue}>
                {[patient?.age != null ? `${patient.age} Y` : null, patient?.gender].filter(Boolean).join(" / ") || "—"}
              </Text>
            </View>
            <View style={pdfStyles.patientBoxCol}>
              <Text style={pdfStyles.patientBoxLabel}>DATE</Text>
              <Text style={pdfStyles.patientBoxValue}>{dateDisplay}</Text>
            </View>
          </View>

          {/* Address */}
          {(patient as any)?.address && (
            <View style={pdfStyles.addressRow}>
              <Text style={pdfStyles.addressLabel}>Address:</Text>
              <Text style={pdfStyles.addressValue}>{(patient as any).address}</Text>
            </View>
          )}

          <Text style={pdfStyles.rxIconText}>Rx</Text>

          {/* Table */}
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colNo]}>#</Text>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colMedication]}>MEDICATION</Text>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colDosage]}>DOSAGE</Text>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colFrequency]}>FREQUENCY</Text>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colDuration]}>DURATION</Text>
              <Text style={[pdfStyles.tableHeaderText, pdfStyles.colInstructions]}>INSTRUCTIONS</Text>
            </View>

            {items.map((rawItem, index) => {
              const item = rawItem as PdfItem;
              
              const strengthComp = [(item as any).strength, (item as any).composition].filter(Boolean).join(" • ");
              
              // Map to layout fields
              const freq = item.scheduleText || item.frequency || "-";
              let instructions = item.noteText || (item as any).instructions || "-";
              if (instructions === "-") instructions = "";
              
              const dosageStr = item.dosage || "-";
              const durationStr = item.duration || "-";

              return (
                <View key={(item as any).id ?? index} style={pdfStyles.tableRow}>
                  <Text style={[pdfStyles.colNo, { fontSize: 10, color: "#64748B", fontFamily: "Helvetica-Bold" }]}>{index + 1}.</Text>
                  
                  <View style={pdfStyles.colMedication}>
                    <Text style={pdfStyles.medName}>
                      {((item as any).medicineName || "-").startsWith("Tab") || ((item as any).medicineName || "-").startsWith("Cap") 
                        ? (item as any).medicineName 
                        : `Tab. ${(item as any).medicineName || "-"}`}
                    </Text>
                    {strengthComp ? (
                      <Text style={pdfStyles.medMeta}>{strengthComp}</Text>
                    ) : null}
                  </View>
                  
                  <Text style={[pdfStyles.colDosage, { fontSize: 10, color: "#475569" }]}>{dosageStr}</Text>
                  <Text style={[pdfStyles.colFrequency, { fontSize: 10, color: "#475569" }]}>{freq}</Text>
                  <Text style={[pdfStyles.colDuration, { fontSize: 10, color: "#475569" }]}>{durationStr}</Text>
                  <View style={pdfStyles.colInstructions}>
                    {instructions ? <Text style={pdfStyles.instructionsText}>{instructions}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Advice */}
          {advice ? (
            <View style={pdfStyles.adviceWrap}>
              <Text style={pdfStyles.adviceTitle}>ADVICE / NOTES</Text>
              <Text style={pdfStyles.adviceText}>{advice}</Text>
            </View>
          ) : null}

          {/* Footer Signature */}
          <View style={pdfStyles.footerWrap}>
            <View style={pdfStyles.signBlock}>
              <View style={pdfStyles.signLine} />
              <Text style={pdfStyles.signName}>Dr. {doctor?.name || "—"}</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  );
};

export default PrescriptionPdf;
