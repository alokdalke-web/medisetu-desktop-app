import { type SelectedMed } from "../../../components/PrescriptionWorkspace";
import Images from "../../../constants/images";
import { normalizeDose, safe } from "./appointmentDetailsHelpers";

export const FIELD_CN = {
  inputWrapper:
    "rounded-2xl border-slate-200 bg-white shadow-none data-[hover=true]:border-slate-300",
} as const;

// Hard limits - only block values that are medically impossible or clearly errors
export const VITAL_LIMITS = {
  bpSys: { min: 40, max: 300 },      // Allow recording severe hypotension and hypertensive crisis
  bpDia: { min: 20, max: 200 },      // Allow recording extreme cases
  pulse: { min: 20, max: 250 },      // Allow recording bradycardia and tachycardia
  spo2: { min: 50, max: 100 },       // Allow recording severe hypoxia
  temperatureC: { min: 30, max: 45 }, // Allow recording hypothermia and extreme hyperthermia
  heightCm: { min: 30, max: 250 },   // Allow pediatric to very tall patients
  weightKg: { min: 1, max: 500 },    // Allow neonates to morbidly obese patients
} as const;

// Normal ranges - for showing warnings (not blocking)
export const VITAL_NORMAL_RANGES = {
  bpSys: { min: 90, max: 140, unit: 'mmHg' },
  bpDia: { min: 60, max: 90, unit: 'mmHg' },
  pulse: { min: 60, max: 100, unit: 'bpm' },
  spo2: { min: 95, max: 100, unit: '%' },
  temperatureC: { min: 36.1, max: 37.2, unit: '°C' },
  heightCm: { min: 100, max: 200, unit: 'cm' },
  weightKg: { min: 20, max: 150, unit: 'kg' },
} as const;

export const validateVital = (
  key: keyof typeof VITAL_LIMITS,
  value: number | null | undefined,
): string | null => {
  if (value == null || value === 0) return null; // Allow empty or zero as no input
  const limits = VITAL_LIMITS[key];
  if (value < limits.min) return `Value too low (min: ${limits.min})`;
  if (value > limits.max) return `Value too high (max: ${limits.max})`;
  return null;
};

export const buildPrescriptionPayload = ({
  appointmentId,
  rxMeds,
}: {
  appointmentId: string;
  rxMeds: SelectedMed[];
}) => {
  return {
    appointmentId,
    items: (rxMeds as any[]).map((m: any, idx: number) => {
      const name = safe(m?.name ?? m?.medicineName, "Medicine").toUpperCase();

      const medicineId = String(
        m?.medicineId ?? m?.id ?? m?.value ?? m?.key ?? name ?? idx,
      );
      const dose = normalizeDose(m);

      return {
        medicineId,
        name,
        dose,

        // keep existing fields
        medicineName: name,
        composition: safe(m.composition, "N/A"),
        strength: safe(m.strength),
        dosage: safe(m.dosage),
        frequency: safe(m.frequency),
        duration: safe(m.duration),
        manufacturer: safe(m.manufacturer, "N/A"),
        medicineCount: safe(m.medicineCount ?? ""),
        marketer: safe(m.marketer),
        imageUrl: m.image ?? null,
        notes: safe(m.notes),
      };
    }),
  };
};
export const buildMedicalCertificatePrintHtml = ({
  clinicData,
  doctor,
  appointment,
  medicalCertificateRestDays,
  medicalCertificateRestrictions,
  patient,
  medicalCertificateReason,
  escapeHtml,
}: any) => {
  const clinicLogo = (clinicData as any)?.clinic?.clinicLogo;
  const clinicName =
    (clinicData as any)?.clinic?.clinicName || "Infinity MediSetu";
  const clinicAddress = [
    (clinicData as any)?.clinic?.clinicAddress,
    (clinicData as any)?.clinic?.ZipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const clinicCityState = [
    (clinicData as any)?.clinic?.City,
    (clinicData as any)?.clinic?.State,
  ]
    .filter(Boolean)
    .join(", ");

  const clinicPhone = String(
    (clinicData as any)?.clinic?.clinicPhone ||
      (clinicData as any)?.clinic?.phone ||
      "",
  ).trim();

  const clinicEmail = String(
    (clinicData as any)?.clinic?.email || doctor.email || "",
  ).trim();

  const examinedOn = appointment.dateOnly || "—";

  // Use current date and time
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const issuedAt = `${currentDate}`;

  let returnDays = Number(medicalCertificateRestDays) || 0;
  returnDays = Math.max(0, returnDays);

  const returnToWorkText =
    returnDays === 0
      ? "immediately"
      : returnDays === 1
        ? "in 1 day"
        : `in ${returnDays} days`;

  const restrictions = String(medicalCertificateRestrictions || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Medical Certificate - ${patient.name || "Patient"}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Times New Roman', Georgia, 'Segoe UI', Arial, serif;
            background: #e8f0f5;
            color: #1a3a4f;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .certificate-container {
            position: relative;
            max-width: 1100px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          /* Decorative top border */
          .certificate-border-top {
            height: 8px;
            background: linear-gradient(90deg, #1a6b5e 0%, #2c9b8a 50%, #1a6b5e 100%);
          }

          /* Doctor watermark background - positioned below title */
          .doctor-watermark {
            position: absolute;
            top: 38%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 55%;
            height: auto;
            opacity: 0.08;
            pointer-events: none;
            z-index: 0;
          }

          .doctor-watermark img {
            width: 100%;
            height: auto;
            object-fit: contain;
          }

          .certificate-content {
            position: relative;
            z-index: 1;
            padding: 40px 48px;
          }

          /* Header section with logos - clinic details added */
          .header-section {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #d4e6e2;
          }

          .brand-logo {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .brand-logo img {
            width: 180px;
            object-fit: contain;
          }

          .clinic-details {
            text-align: right;
          }

          .clinic-name-header {
            font-size: 14px;
            font-weight: 700;
            color: #1a6b5e;
          }

          .clinic-address-header {
            font-size: 10px;
            color: #6b8a7a;
          }

          .clinic-logo {
            max-height: 40px;
            max-width: 40px;
            object-fit: contain;
          }

          /* Title */
          .certificate-title {
            text-align: center;
            margin: 15px 0 25px;
            position: relative;
            z-index: 2;
          }

          .certificate-title h1 {
            font-size: 42px;
            color: #1a6b5e;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .certificate-title p {
            color: #6b8a7a;
            font-size: 14px;
            letter-spacing: 3px;
          }

          /* Date info row - outside patient box */
          .date-info-row {
            display: flex;
            justify-content: space-between;
            margin: 20px 0 15px;
            padding: 12px 16px;
            background: #f8fdfc;
            border-radius: 12px;
            border: 1px solid #d4e6e2;
          }

          .date-item {
            display: flex;
            gap: 12px;
            font-size: 14px;
          }

          .date-label {
            font-weight: 700;
            color: #1a6b5e;
          }

          .date-value {
            color: #2c5a4a;
          }

          /* Patient info card */
          .info-card {
            background: linear-gradient(135deg, #f8fdfc 0%, #f0f8f5 100%);
            border-radius: 20px;
            padding: 20px 28px;
            margin: 15px 0 25px;
            border: 1px solid #d4e6e2;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px 30px;
          }

          .info-item {
            display: flex;
            align-items: baseline;
            gap: 12px;
            font-size: 15px;
            padding: 6px 0;
            border-bottom: 1px dashed #c8dfd9;
          }

          .info-label {
            font-weight: 700;
            color: #1a6b5e;
            min-width: 85px;
            font-size: 14px;
          }

          .info-value {
            color: #2c5a4a;
            font-weight: 500;
          }

          /* Medical statement */
          .medical-statement {
            margin: 25px 0 20px;
          }

          .statement-text {
            font-size: 17px;
            line-height: 1.8;
            text-align: justify;
            margin-bottom: 20px;
            color: #2c4a3e;
          }

          .condition-box {
            background: #fff9f0;
            border-left: 4px solid #e6b84e;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 12px;
          }

          .condition-box strong {
            color: #c9771e;
          }

          /* Restrictions section */
          .restrictions-section {
            margin: 25px 0;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a6b5e;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #d4e6e2;
            display: inline-block;
          }

          .bullet-list {
            list-style: none;
            padding-left: 0;
            margin: 15px 0;
          }

          .bullet-list li {
            font-size: 15px;
            line-height: 1.7;
            color: #3a5a4e;
            padding: 6px 0 6px 28px;
            position: relative;
          }

          .bullet-list li:before {
            content: "✓";
            color: #2c9b8a;
            font-weight: bold;
            position: absolute;
            left: 0;
            font-size: 16px;
          }

          .no-restrictions {
            color: #8aaec0;
            font-style: italic;
            padding: 10px 0;
          }

          /* Footer with signatures */
          .footer-section {
            margin-top: 40px;
            padding-top: 25px;
            border-top: 2px solid #d4e6e2;
            display: flex;
            justify-content: flex-end;
          }

          .signature-box {
            margin-top: 80px;
            text-align: center;
            width: 280px;
          }

          .signature-name {
            font-weight: 700;
            color: #1a6b5e;
            font-size: 16px;
          }

          .signature-title {
            font-size: 12px;
            color: #6b8a7a;
            margin-top: 4px;
          }

          /* Contact info */
          .contact-info {
            margin-top: 25px;
            text-align: center;
            padding-top: 15px;
            font-size: 11px;
            color: #8aaec0;
            border-top: 1px solid #e0ede9;
          }

          .contact-info p {
            margin: 4px 0;
          }

          /* Print optimization */
          @media print {
            body {
              background: white;
              margin: 0;
              padding: 0;
            }
            .certificate-container {
              margin: 0;
              border-radius: 0;
              box-shadow: none;
            }
            .doctor-watermark {
              opacity: 0.1;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-border-top"></div>

          <div class="certificate-content">
            <!-- Header with Logos and Clinic Details -->
            <div class="header-section">
              <div class="brand-logo">
<img src="${Images.mediSetuLogo}" alt="Infinity MediSetu" />   
           </div>
              <div class="clinic-details">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
                  ${clinicLogo ? `<img src="${clinicLogo}" alt="Clinic Logo" class="clinic-logo" />` : ""}
                  <div class="clinic-name-header">${escapeHtml(clinicName)}</div>
                </div>
                ${clinicPhone ? `<div class="clinic-address-header">${escapeHtml(clinicPhone)}</div>` : ""}
                ${clinicEmail ? `<div class="clinic-address-header">${escapeHtml(clinicEmail)}</div>` : ""}
                ${clinicAddress ? `<div class="clinic-address-header">${escapeHtml(clinicAddress)}</div>` : ""}
                ${clinicCityState ? `<div class="clinic-address-header">${escapeHtml(clinicCityState)}</div>` : ""}
              </div>
            </div>

            <!-- Title -->
            <div class="certificate-title">
              <h1>Medical Certificate</h1>
              <p>Certificate of Health & Fitness</p>
            </div>

            <!-- Doctor Watermark - positioned below Medical Certificate heading -->
            <div class="doctor-watermark">
              <img src="https://res.cloudinary.com/dixjklm0v/image/upload/v1776665132/4f60305f48b01e05db6b53083abf71dd-removebg-preview_sd5jzd.png"/>
            </div>

            <!-- Date Info Row - Examined On and Certificate Issued outside patient box -->
            <div class="date-info-row">
              <div class="date-item">
                <span class="date-label">Examined On:</span>
                <span class="date-value">${escapeHtml(examinedOn)}</span>
              </div>
              <div class="date-item">
                <span class="date-label">Certificate Issued:</span>
                <span class="date-value">${escapeHtml(issuedAt)}</span>
              </div>
            </div>

            <!-- Patient Information Card -->
            <div class="info-card">
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Patient Name:</span>
                  <span class="info-value">${escapeHtml(patient.name || "—")}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Age:</span>
                  <span class="info-value">${escapeHtml(patient.age || "—")} yr</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Gender:</span>
                  <span class="info-value">${escapeHtml(patient.gender || "—")}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Contact:</span>
                  <span class="info-value">${escapeHtml(patient.contact || "—")}</span>
                </div>
              </div>
            </div>

            <!-- Medical Statement -->
            <div class="medical-statement">
              <p class="statement-text">
                This is to certify that <strong>${escapeHtml(patient.name || "the patient")}</strong>
                was examined. After thorough clinical evaluation of the patient's health status,
                it is my professional medical opinion that the patient is medically fit to resume regular work duties ${escapeHtml(returnToWorkText)}.
              </p>

              <div class="condition-box">
                <strong>Medical Condition:</strong> ${escapeHtml(medicalCertificateReason || "Medical evaluation completed")}
              </div>
            </div>

            <!-- Restrictions Section -->
            ${
              restrictions.length > 0
                ? `
            <div class="restrictions-section">
              <div class="section-title">Recommendations</div>
                <ul class="bullet-list">
                  ${restrictions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
            </div>
            `
                : ""
            }

            <!-- Footer with Signatures -->
            <div class="footer-section">
              <div class="signature-box">
                <div class="signature-name">${escapeHtml(doctor.name ? `Dr. ${doctor.name}` : "Attending Physician")}</div>
                <div class="signature-title">${escapeHtml(doctor.speciality)}</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;
};

export const buildConsentPrintHtml = ({
  clinicData,
  clinic,
  consentNotes,
  patient,
  doctor,
  escapeHtml,
}: any) => {
  // Get clinic info from various sources
  const clinicLogo = (clinicData as any)?.clinic?.clinicLogo;
  const clinicName =
    (clinicData as any)?.clinic?.clinicName ||
    clinic?.name ||
    "Infinity MediSetu";
  const clinicAddress =
    (clinicData as any)?.clinic?.clinicAddress || clinic?.addressLine1 || "";
  const clinicCity = (clinicData as any)?.clinic?.City || "";
  const clinicState = (clinicData as any)?.clinic?.State || "";
  const clinicZipCode = (clinicData as any)?.clinic?.ZipCode || "";
  const clinicPhone =
    (clinicData as any)?.clinic?.clinicPhone || clinic?.phone || "";

  const fullAddress = [clinicAddress, clinicZipCode].filter(Boolean).join(", ");

  const cityState = [clinicCity, clinicState].filter(Boolean).join(", ");

  const consentNotesText = consentNotes?.trim() || "";

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Consent Form - ${patient.name || "Patient"}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Times New Roman', Georgia, 'Segoe UI', Arial, serif;
              background: white;
              color: #1a3a4f;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .consent-container {
              max-width: 1100px;
              margin: 0 auto;
              background: white;
            }

            .consent-sheet {
              background: white;
              border: 1px solid #d4e6e2;
              border-radius: 14px;
              overflow: hidden;
            }

            .consent-top-accent {
              height: 6px;
              background: linear-gradient(90deg, #0f766e 0%, #34b39b 100%);
            }

            .consent-content {
              padding: 32px 40px;
            }

            /* Header section */
            .header-section {
              border-bottom: 2px solid #d4e6e2;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }

            .clinic-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              flex-wrap: wrap;
              gap: 16px;
            }

            .medi-logo {
              max-height: 50px;
              object-fit: contain;
            }

            .clinic-info-right {
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }

            .clinic-logo-sm {
              max-height: 40px;
              max-width: 120px;
              object-fit: contain;
              margin-bottom: 8px;
            }

            .clinic-name {
              font-size: 18px;
              font-weight: 700;
              color: #0f766e;
            }

            .clinic-detail {
              font-size: 11px;
              color: #5b738f;
              margin-top: 2px;
            }

            /* Patient details card */
            .patient-card {
              background: #f8fdfc;
              border: 1px solid #d4e6e2;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 16px;
            }

            .patient-field {
              flex: 1;
              min-width: 120px;
            }

            .patient-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f766e;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }

            .patient-value {
              font-size: 14px;
              font-weight: 600;
              color: #1a3a4f;
            }

            /* Title */
            .consent-title {
              text-align: center;
              margin: 24px 0 20px;
            }

            .consent-title h1 {
              font-size: 32px;
              color: #0f766e;
              font-weight: 700;
              margin-bottom: 8px;
            }

            .consent-title p {
              color: #6b8a7a;
              font-size: 13px;
            }

            /* Declaration */
            .declaration-box {
              background: #f4fbfa;
              border: 1px solid #d4e6e2;
              border-left: 4px solid #2fb39a;
              border-radius: 12px;
              padding: 20px 24px;
              margin: 20px 0;
            }

            .declaration-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f766e;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }

            .declaration-text {
              font-size: 14px;
              line-height: 1.8;
              color: #2c5a4a;
              text-align: justify;
            }

            /* Notes section */
            .notes-section {
              margin: 20px 0;
            }

            .notes-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f766e;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }

            .notes-content {
              background: white;
              border: 1px solid #d4e6e2;
              border-radius: 12px;
              padding: 16px 20px;
              min-height: 80px;
              font-size: 13px;
              line-height: 1.6;
              color: #2c5a4a;
              white-space: pre-wrap;
            }

            /* Signatures - matching modal spacing */
            .signatures {
              display: flex;
              justify-content: space-between;
              gap: 48px;
              margin-top: 80px;
              margin-bottom: 24px;
            }

            .signature-box {
              flex: 1;
              text-align: center;
            }

            .signature-line {
              border-top: 1px solid #4e6781;
              margin-bottom: 4px;
              padding-top: 24px;
            }

            .signature-label {
              font-size: 12px;
              font-weight: 700;
              color: #1a3a4f;
            }

            .signature-sub {
              font-size: 10px;
              color: #6b8a7a;
              margin-top: 4px;
            }

            /* Footer */
            .footer-note {
              text-align: center;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #d4e6e2;
              font-size: 10px;
              color: #8aaec0;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .consent-sheet {
                border: none;
                border-radius: 0;
              }
              .consent-content {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="consent-container">
            <div class="consent-sheet">
              <div class="consent-top-accent"></div>

              <div class="consent-content">
                <!-- Header -->
                <div class="header-section">
                  <div class="clinic-row">
                    <img src="https://infinitymedisetu.com/app/assets/images/logoLight.svg" alt="Infinity MediSetu" class="medi-logo" />

                    <div class="clinic-info-right">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        ${clinicLogo ? `<img src="${clinicLogo}" alt="Clinic Logo" class="clinic-logo-sm" />` : ""}
                        <div class="clinic-name">${escapeHtml(clinicName)}</div>
                      </div>
                      ${clinicPhone ? `<div class="clinic-detail">Tel: ${escapeHtml(clinicPhone)}</div>` : ""}
                      ${fullAddress ? `<div class="clinic-detail">${escapeHtml(fullAddress)}</div>` : ""}
                      ${cityState ? `<div class="clinic-detail">${escapeHtml(cityState)}</div>` : ""}
                    </div>
                  </div>
                </div>

                <!-- Patient Details -->
                <div class="patient-card">
                  <div class="patient-field">
                    <div class="patient-label">Patient Name</div>
                    <div class="patient-value">${escapeHtml(patient.name || "—")}</div>
                  </div>
                  <div class="patient-field">
                    <div class="patient-label">Age</div>
                    <div class="patient-value">${escapeHtml(patient.age || "—")} yrs</div>
                  </div>
                  <div class="patient-field">
                    <div class="patient-label">Gender</div>
                    <div class="patient-value">${escapeHtml(patient.gender || "—")}</div>
                  </div>
                  <div class="patient-field">
                    <div class="patient-label">Date</div>
                    <div class="patient-value">${escapeHtml(currentDate || "—")}</div>
                  </div>
                </div>

                <!-- Title -->
                <div class="consent-title">
                  <h1>Consent Form</h1>
                  <p>Consent for Checkup / Procedure / Surgery</p>
                </div>

                <!-- Declaration -->
                <div class="declaration-box">
                  <div class="declaration-title">Declaration</div>
                  <div class="declaration-text">
                    I, <strong>${escapeHtml(patient.name || "________________")}</strong>, hereby confirm
                    that I have been informed about the nature of the checkup / procedure /
                    surgery, its expected benefits, possible risks, and available alternatives.
                    I understand that no guarantee has been given regarding the outcome of the
                    treatment. I voluntarily give my consent to proceed with the advised
                    medical evaluation / procedure / treatment under the supervision of
                    <strong>${escapeHtml(doctor.name ? `Dr. ${doctor.name}` : "________________")}</strong>.
                  </div>
                </div>

                ${
                  consentNotesText
                    ? `
                <!-- Notes -->
                <div class="notes-section">
                  <div class="notes-title">Notes</div>
                  <div class="notes-content">${escapeHtml(consentNotesText)}</div>
                </div>
                `
                    : ""
                }

                <div class="signatures">
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">${escapeHtml(patient.name || "Patient Signature")}</div>
                  </div>

                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">${escapeHtml(doctor.name ? `Dr. ${doctor.name}` : "Doctor Signature")}</div>
                    <div class="signature-sub">${escapeHtml(doctor.speciality)}</div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer-note">
                  This is a legally binding document. Please read carefully before signing.
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
      `;
};

export const buildReferPrintHtml = ({
  clinicData,
  clinic,
  doctor,
  referredName,
  referredAddress,
  referredDoctorClinic,
  referredPhone,
  patient,
  referNotes,
  escapeHtml,
}: any) => {
  const clinicLogo = (clinicData as any)?.clinic?.clinicLogo;
  const clinicName =
    (clinicData as any)?.clinic?.clinicName ||
    clinic?.name ||
    "Infinity MediSetu";
  const clinicAddress =
    (clinicData as any)?.clinic?.clinicAddress || clinic?.addressLine1 || "";
  const clinicZipCode = (clinicData as any)?.clinic?.ZipCode || "";
  const clinicCity = (clinicData as any)?.clinic?.City || "";
  const clinicState = (clinicData as any)?.clinic?.State || "";
  const clinicPhone =
    (clinicData as any)?.clinic?.clinicPhone || clinic?.phone || "";

  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Patient Referral Form</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Times New Roman', Georgia, 'Segoe UI', Arial, serif;
              background: white;
              color: #1a3a4f;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .refer-container {
              max-width: 1100px;
              margin: 0 auto;
              background: white;
            }

            .refer-sheet {
              background: white;
              border: 1px solid #d4e6e2;
              border-radius: 14px;
              overflow: hidden;
            }

            .refer-top-accent {
              height: 6px;
              background: linear-gradient(90deg, #0f766e 0%, #34b39b 100%);
            }

            .refer-content {
              padding: 32px 40px;
            }

            .header-section {
              border-bottom: 2px solid #d4e6e2;
              padding-bottom: 20px;
              margin-bottom: 24px;
            }

            .clinic-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
              flex-wrap: wrap;
              gap: 16px;
            }

            .medi-logo {
              max-height: 50px;
              object-fit: contain;
            }

            .clinic-info-right {
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: flex-end;
            }

            .clinic-logo-sm {
              max-height: 40px;
              max-width: 120px;
              object-fit: contain;
              margin-bottom: 8px;
            }

            .clinic-name {
              font-size: 18px;
              font-weight: 700;
              color: #0f766e;
            }

            .clinic-detail {
              font-size: 11px;
              color: #5b738f;
              margin-top: 2px;
            }

            .doctor-box {
              background: #f4fbfa;
              border: 1px solid #d4e6e2;
              border-radius: 12px;
              padding: 16px 20px;
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 16px;
            }

            .doctor-info {
              flex: 1;
            }

            .date-info {
              text-align: right;
            }

            .info-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f766e;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }

            .info-value {
              font-size: 14px;
              font-weight: 600;
              color: #1a3a4f;
            }

            .info-sub {
              font-size: 11px;
              color: #5b738f;
              margin-top: 2px;
            }

            .title {
              text-align: center;
              margin: 24px 0 20px;
            }

            .title h1 {
              font-size: 32px;
              color: #0f766e;
              font-weight: 700;
              margin-bottom: 8px;
            }

            .title p {
              color: #6b8a7a;
              font-size: 13px;
            }

            .section-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f766e;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }

            .referred-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
              margin: 16px 0;
            }

            .referred-field {
              border: 1px solid #d4e6e2;
              border-radius: 12px;
              padding: 12px 16px;
              background: white;
            }

            .referred-label {
              font-size: 10px;
              font-weight: 700;
              color: #0f766e;
              margin-bottom: 4px;
            }

            .referred-value {
              font-size: 13px;
              color: #1a3a4f;
            }

            .declaration-box {
              background: #f4fbfa;
              border: 1px solid #d4e6e2;
              border-left: 4px solid #2fb39a;
              border-radius: 12px;
              padding: 20px 24px;
              margin: 20px 0;
            }

            .declaration-text {
              font-size: 14px;
              line-height: 1.8;
              color: #2c5a4a;
              text-align: justify;
            }

            .notes-content {
              background: white;
              border: 1px solid #d4e6e2;
              border-radius: 12px;
              padding: 16px 20px;
              min-height: 80px;
              font-size: 13px;
              line-height: 1.6;
              color: #2c5a4a;
              white-space: pre-wrap;
            }

            .footer-note {
              text-align: center;
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #d4e6e2;
              font-size: 10px;
              color: #8aaec0;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .refer-sheet {
                border: none;
                border-radius: 0;
              }
              .refer-content {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="refer-container">
            <div class="refer-sheet">
              <div class="refer-top-accent"></div>

              <div class="refer-content">
                <div class="header-section">
                  <div class="clinic-row">
                    <img src="https://infinitymedisetu.com/app/assets/images/logoLight.svg" alt="Infinity MediSetu" class="medi-logo" />

                    <div class="clinic-info-right">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        ${clinicLogo ? `<img src="${clinicLogo}" alt="Clinic Logo" class="clinic-logo-sm" />` : ""}
                        <div class="clinic-name">${escapeHtml(clinicName)}</div>
                      </div>
                      ${clinicPhone ? `<div class="clinic-detail">Tel: ${escapeHtml(clinicPhone)}</div>` : ""}
                      ${clinicAddress ? `<div class="clinic-detail">${escapeHtml(clinicAddress)}${clinicZipCode ? `, ${escapeHtml(clinicZipCode)}` : ""}</div>` : ""}
                      ${clinicCity || clinicState ? `<div class="clinic-detail">${escapeHtml(clinicCity)}${clinicState ? `, ${escapeHtml(clinicState)}` : ""}</div>` : ""}
                    </div>
                  </div>

                  <div class="doctor-box">
                    <div class="doctor-info">
                      <div class="info-label">Referring Doctor</div>
                      <div class="info-value">${escapeHtml(doctor.name ? `Dr. ${doctor.name}` : "—")}</div>
                      <div class="info-sub">${escapeHtml(doctor.speciality || doctor.qualification || "Medical Specialist")}</div>
                    </div>
                    <div class="date-info">
                      <div class="info-label">Date of Referral</div>
                      <div class="info-value">${escapeHtml(currentDate)}</div>
                    </div>
                  </div>
                </div>

                <div class="title">
                  <h1>Patient Referral Form</h1>
                  <p>Referral to Doctor / Lab / Specialist</p>
                </div>

                <div class="section-title">Referred To</div>
                <div class="referred-grid">
                  <div class="referred-field">
                    <div class="referred-label">Name</div>
                    <div class="referred-value">${escapeHtml(referredName || "—")}</div>
                  </div>
                  <div class="referred-field">
                    <div class="referred-label">Speciality / Type</div>
                    <div class="referred-value">${escapeHtml(referredAddress || "—")}</div>
                  </div>
                  <div class="referred-field">
                    <div class="referred-label">Clinic / Hospital / Lab</div>
                    <div class="referred-value">${escapeHtml(referredDoctorClinic || "—")}</div>
                  </div>
                  <div class="referred-field">
                    <div class="referred-label">Phone Number</div>
                    <div class="referred-value">${escapeHtml(referredPhone || "—")}</div>
                  </div>
                </div>

                <div class="declaration-box">
                  <div class="section-title">Referral Declaration</div>
                  <div class="declaration-text">
                    I, <strong> ${escapeHtml(doctor.name ? `Dr. ${doctor.name}` : "________________")}</strong>, hereby certify that
                    <strong>${escapeHtml(patient.name || "________________")}</strong> (${escapeHtml(patient.age || "—")} yrs, ${escapeHtml(patient.gender || "—")}),
                     has been examined by me and requires referral to <strong>${escapeHtml(referredName || "________________")}</strong>
                    ${referredAddress ? ` (${escapeHtml(referredAddress)})` : ""}
                    ${referredDoctorClinic ? ` at ${escapeHtml(referredDoctorClinic)}.` : ""}
                    Kindly carry out the necessary evaluation, including appropriate consultation/diagnostic tests, and specialized treatment if indicated,
                    and provide your expert opinion for further management of the patient.
                  </div>
                </div>

                <div class="section-title">Notes</div>
                <div class="notes-content">${escapeHtml(referNotes || "—")}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
      `;
};
