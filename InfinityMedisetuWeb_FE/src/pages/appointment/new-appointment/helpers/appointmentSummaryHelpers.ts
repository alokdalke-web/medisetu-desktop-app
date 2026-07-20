import type {
  ClinicServiceOption,
  DoctorOption,
  PatientOption,
} from "../types";
import { formatFeeRange, formatGender, formatPhone } from "./optionMappers";

export const buildPatientSummary = ({
  selectedPatientOption,
  selectedPatientData,
}: {
  selectedPatientOption: PatientOption | null;
  selectedPatientData: any;
}) => {
  const patientNameFromLabel =
    String(selectedPatientOption?.label ?? "")
      .split("(")[0]
      ?.trim() || "";
  const patientName =
    String(selectedPatientData?.name ?? "").trim() ||
    patientNameFromLabel ||
    "Patient";

  const patientAge =
    selectedPatientData?.age != null && String(selectedPatientData.age) !== ""
      ? `${selectedPatientData.age} years`
      : "";

  const patientGender = formatGender(selectedPatientData?.gender);
  const patientAgeGender = patientAge
    ? `${patientAge} / ${patientGender}`
    : `${patientGender}`;

  const patientPhone = formatPhone(
    selectedPatientData?.mobile ?? selectedPatientData?.phoneNumber,
  );

  const rawLastVisit =
    selectedPatientData?.lastVisit ??
    selectedPatientData?.lastVisitDate ??
    selectedPatientData?.lastAppointmentDate;

  const patientLastVisit = rawLastVisit
    ? String(rawLastVisit).split(" ")[0]
    : "No visit";

  const rawNoShowStatus =
    selectedPatientData?.noShowStatus ??
    selectedPatientData?.noShowAction ??
    null;
  const noShowCount =
    typeof selectedPatientData?.noShowCount === "number"
      ? selectedPatientData.noShowCount
      : null;

  const noShowStatusLabel = (() => {
    const s = String(rawNoShowStatus ?? "").toLowerCase();
    if (!s) return "";
    if (s === "warning") return "Warning";
    if (s === "penalty") return "Penalty";
    if (s === "advance_required") return "Advance required";
    if (s === "blocked") return "Blocked";
    return "";
  })();

  const noShowDisplay =
    noShowStatusLabel && noShowCount && noShowCount > 0
      ? `${noShowStatusLabel} (${noShowCount})`
      : noShowStatusLabel;

  return {
    patientName,
    patientAgeGender,
    patientPhone,
    patientLastVisit,
    rawNoShowStatus,
    noShowDisplay,
  };
};

export const buildDoctorSummary = ({
  selectedDoctorData,
  doctorOptions,
  doctorSelect,
}: {
  selectedDoctorData: any;
  doctorOptions: DoctorOption[];
  doctorSelect: any;
}) => {
  const doctorName =
    String(selectedDoctorData?.name ?? "").trim() ||
    (doctorOptions.find((d) => d.value === String(doctorSelect || ""))?.label ??
      "Doctor");

  const doctorRole =
    String(
      selectedDoctorData?.specialization ??
        selectedDoctorData?.department ??
        selectedDoctorData?.designation ??
        "Doctor",
    ).trim() || "Doctor";

  const doctorFee = formatFeeRange(selectedDoctorData);

  return {
    doctorName,
    doctorRole,
    doctorFee,
  };
};

export const buildPatientDraftSnapshot = ({
  patientSelect,
  selectedPatientData,
  selectedPatientOption,
}: {
  patientSelect: any;
  selectedPatientData: any;
  selectedPatientOption: PatientOption | null;
}) => {
  if (!patientSelect && !selectedPatientData && !selectedPatientOption) {
    return null;
  }

  return {
    id: String(
      selectedPatientData?.id ?? selectedPatientData?._id ?? patientSelect ?? "",
    ),
    name: String(
      selectedPatientData?.name ??
        String(selectedPatientOption?.label ?? "")
          .split("(")[0]
          ?.trim() ??
        "",
    ).trim(),
    mobile: String(
      selectedPatientData?.mobile ?? selectedPatientData?.phoneNumber ?? "",
    ).trim(),
    age: selectedPatientData?.age ?? null,
    gender: selectedPatientData?.gender ?? null,
    noShowStatus:
      selectedPatientData?.noShowStatus ??
      selectedPatientData?.noShowAction ??
      null,
    noShowCount: selectedPatientData?.noShowCount ?? null,
    lastVisit:
      selectedPatientData?.lastVisit ??
      selectedPatientData?.lastVisitDate ??
      selectedPatientData?.lastAppointmentDate ??
      null,
  };
};

export const buildDoctorDraftSnapshot = ({
  doctorSelect,
  selectedDoctorData,
  doctorName,
}: {
  doctorSelect: any;
  selectedDoctorData: any;
  doctorName: string;
}) => {
  if (!doctorSelect && !selectedDoctorData) return null;

  return {
    id: String(
      selectedDoctorData?.id ?? selectedDoctorData?._id ?? doctorSelect ?? "",
    ),
    name: String(selectedDoctorData?.name ?? doctorName ?? "").trim(),
    specialization:
      selectedDoctorData?.specialization ??
      selectedDoctorData?.department ??
      selectedDoctorData?.designation ??
      null,
    serviceCount: selectedDoctorData?.serviceCount ?? null,
    feeFrom:
      selectedDoctorData?.feeFrom ??
      selectedDoctorData?.minFee ??
      selectedDoctorData?.consultationFeeFrom ??
      null,
    feeTo:
      selectedDoctorData?.feeTo ??
      selectedDoctorData?.maxFee ??
      selectedDoctorData?.consultationFeeTo ??
      null,
  };
};

export const formatTimeTo12Hour = (time: string): string => {
  // Handle token appointments (they don't need formatting)
  if (time.startsWith("Token")) return time;

  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export const buildConfirmationData = ({
  pendingAppointmentData,
  clinicServiceOptions,
  patientName,
  doctorName,
  formatIsoForUi,
}: {
  pendingAppointmentData: any;
  clinicServiceOptions: ClinicServiceOption[];
  patientName: string;
  doctorName: string;
  formatIsoForUi: (iso: string) => string;
}) => {
  if (!pendingAppointmentData) return null;

  const service = clinicServiceOptions.find(
    (s) => s.value === pendingAppointmentData.clinicServiceId,
  );

  // Determine if this is a token appointment
  const isTokenBooking = pendingAppointmentData.tokenNo != null;

  // Format the time/token display appropriately
  let timeDisplay = pendingAppointmentData.appointmentTime;
  if (isTokenBooking && pendingAppointmentData.tokenNo != null) {
    timeDisplay = `Token ${pendingAppointmentData.tokenNo}`;
  } else {
    // Format time to 12-hour format for non-token appointments
    timeDisplay = formatTimeTo12Hour(pendingAppointmentData.appointmentTime);
  }

  return {
    patientName: patientName,
    doctorName: doctorName,
    date: formatIsoForUi(pendingAppointmentData.appointmentDate),
    time: timeDisplay,
    service: service?.name || "Service",
    paymentMode: pendingAppointmentData.paymentMode || "Not required",
    amount: service?.priceText,
    isTokenAppointment: isTokenBooking,
  };
};
