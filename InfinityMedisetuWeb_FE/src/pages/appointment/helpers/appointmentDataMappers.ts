import {
  calcAgeFromDob,
  fmtDate,
  safe,
  shortPid,
  to12h,
} from "./appointmentDetailsHelpers";

export const mapPatientIdRaw = (apiResult: any, appointmentData: any) =>
  appointmentData?.patientId ??
  appointmentData?.patient?.id ??
  apiResult?.patientId ??
  apiResult?.id;

export const mapPatient = (
  apiResult: any,
  appointmentData: any,
  patientIdRaw?: string,
) => ({
  id: patientIdRaw,
  name: apiResult?.name ?? appointmentData?.patient?.name ?? "—",
  age: apiResult?.age ?? calcAgeFromDob(apiResult?.dob) ?? "—",
  gender: (() => {
    const g = apiResult?.gender ?? appointmentData?.patient?.gender ?? "";
    const s = String(g).toLowerCase();
    if (s.startsWith("m")) return "Male";
    if (s.startsWith("f")) return "Female";
    if (!s) return "—";
    return g;
  })(),
  avatar:
    apiResult?.profileImage ||
    appointmentData?.patient?.profileImage ||
    (apiResult?.name
      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
          apiResult?.name,
        )}&background=EEE&color=444`
      : ""),
  patientId: shortPid(patientIdRaw),
  contact: apiResult?.mobile ?? appointmentData?.patient?.mobile ?? "—",
  dob: apiResult?.dob ?? "",
  alternateContact:
    apiResult?.alternateMobile ??
    appointmentData?.patient?.alternateMobile ??
    apiResult?.alternateContact ??
    appointmentData?.patient?.alternateContact ??
    "",
  email: apiResult?.email ?? appointmentData?.patient?.email ?? "—",
  address: apiResult?.address ?? "",
  city: apiResult?.city ?? "",
  state: apiResult?.state ?? "",
  country: apiResult?.country ?? "",
  zipCode: apiResult?.zipCode ?? "",
});

export const mapFullPatientAddress = (patient: any) =>
  [
    patient.address,
    patient.city,
    patient.state,
    patient.country,
    patient.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

export const mapAppointment = (appointmentData: any, id: string) => ({
  id: appointmentData?.id ?? id,
  dateRange: (() => {
    const date = fmtDate(appointmentData?.appointmentDate);
    const time = to12h(appointmentData?.appointmentTime);
    return date ? `${date}${time ? ` – ${time}` : ""}` : "—";
  })(),
  type: appointmentData?.appointmentType ?? "Consultation",
  status: (appointmentData?.appointmentStatus ?? "—") as string,
  clinicService: appointmentData?.clinicService ?? null,
  notes: appointmentData?.appointmentNotes ?? "",
  dateOnly: fmtDate(appointmentData?.appointmentDate),
  tokenNo: appointmentData?.tokenNo ?? "",
  paymentMode: appointmentData?.paymentMode ?? null,
});

export const mapClinicService = (apiResult: any, appointmentData: any) =>
  apiResult?.clinicService ??
  (appointmentData as any)?.clinicService ??
  (appointmentData as any)?.clinic_service ??
  null;

export const mapSymptomsFromApi = (apiResult: any) => {
  const out: string[] = [];
  const arr = (apiResult as any)?.symptoms;
  if (Array.isArray(arr)) {
    arr.forEach((s: any) => {
      const n = safe(s?.name);
      if (n) out.push(n);
    });
  }
  return Array.from(new Set(out.map((x) => x.trim()).filter(Boolean)));
};

export const mapSymptomsToRender = (symptomsFromApi: string[]) =>
  symptomsFromApi;

export const mapReferEntry = (appointmentData: any) => {
  const entry =
    (appointmentData as any)?.referrals &&
    !Array.isArray((appointmentData as any)?.referrals)
      ? (appointmentData as any).referrals
      : Array.isArray((appointmentData as any)?.referrals)
        ? (appointmentData as any).referrals[0]
        : null;

  return {
    Refernote: entry?.Refernote ?? (appointmentData as any)?.Refernote ?? "",
    referredName:
      entry?.referredName ?? (appointmentData as any)?.referredName ?? "",
    referredaddress:
      entry?.referredaddress ??
      (appointmentData as any)?.referredaddress ??
      "",
    referredDoctorClinic:
      entry?.referredDoctorClinic ??
      (appointmentData as any)?.referredDoctorClinic ??
      "",
    referredPhone:
      entry?.referredPhone ?? (appointmentData as any)?.referredPhone ?? "",
  };
};

export const mapClinic = (
  reportsResult: any,
  apiResult: any,
  appointmentData: any,
) => {
  const clinicRaw =
    reportsResult?.clinic ??
    apiResult?.clinic ??
    (appointmentData as any)?.clinic ??
    {};

  return {
    name: clinicRaw.clinicName || clinicRaw.name || undefined,
    addressLine1: clinicRaw.clinicAddress || undefined,
    addressLine2:
      [clinicRaw.City, clinicRaw.State, clinicRaw.Country, clinicRaw.ZipCode]
        .filter(Boolean)
        .join(", ") || undefined,
    phone: clinicRaw.phone || clinicRaw.mobile || undefined,
    timing: clinicRaw.timing || undefined,
    logoUrl: clinicRaw.clinicLogo || clinicRaw.logoUrl || undefined,
    isPharmacyAvailable: clinicRaw.isPharmacyAvailable === true,
  };
};

export const mapDoctor = (
  appointmentData: any,
  apiResult: any,
  meDoc: any,
) => {
  const doctorFromAppt =
    (appointmentData as any).doctor ?? (apiResult as any).doctor ?? {};

  return {
    name:
      doctorFromAppt.name ||
      (appointmentData as any).doctorName ||
      (apiResult as any).doctorName ||
      undefined,
    speciality: doctorFromAppt.speciality ?? undefined,
    qualification:
      meDoc.qualification ?? doctorFromAppt.qualification ?? undefined,
    licenseNumber:
      meDoc.licenseNumber ?? doctorFromAppt.licenseNumber ?? undefined,
    mobile: meDoc.mobile ?? doctorFromAppt.mobile ?? undefined,
    email: meDoc.email ?? doctorFromAppt.email ?? undefined,
  };
};

export const mapPdfPatient = (patient: any, fullPatientAddress: string) => ({
  id: patient.id,
  patientId: patient.patientId,
  name: patient.name,
  age: typeof patient.age === "number" ? patient.age : undefined,
  gender: patient.gender && patient.gender !== "—" ? patient.gender : undefined,
  mobile: patient.contact && patient.contact !== "—" ? patient.contact : undefined,
  email: patient.email && patient.email !== "—" ? patient.email : undefined,
  address: fullPatientAddress || undefined,
});
