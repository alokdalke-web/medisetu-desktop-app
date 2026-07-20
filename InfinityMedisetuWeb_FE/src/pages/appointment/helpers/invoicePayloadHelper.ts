type BuildAppointmentInvoicePayloadArgs = {
  appointment: any;
  appointmentData: any;
  apiResult: any;
  clinicData: any;
  clinicService: any;
  primaryServicePriceValue: number;
  primaryServicePriceText: string;
  additionalServices: any[];
  patient: any;
  doctor: any;
  paymentMode: any;
  to12h: (value: any) => string;
};

export const buildAppointmentInvoicePayload = ({
  appointment,
  appointmentData: a,
  apiResult,
  clinicData,
  clinicService,
  primaryServicePriceValue,
  primaryServicePriceText,
  additionalServices,
  patient,
  doctor,
  paymentMode,
  to12h,
}: BuildAppointmentInvoicePayloadArgs) => {
  const clinic = (clinicData as any)?.clinic ?? {};
  const clinicBranding =
    (apiResult as any)?.clinic ?? (a as any)?.clinic ?? {};

  const primaryService = {
    name: clinicService?.serviceName || "Consultation",
    price: primaryServicePriceValue,
  };

  // Prepare additional services from the API data
  const additionalServicesList = additionalServices.map((svc: any) => {
    const serviceObj = svc.service || svc;
    return {
      name: serviceObj.serviceName || svc.serviceName || "Service",
      price: Number(serviceObj.price || svc.price || 0),
      paymentMode: serviceObj.paymentMode || svc.paymentMode || "Cash",
      paymentNotes: serviceObj.payment_notes || svc.payment_notes || "",
    };
  });

  const primaryPrice = primaryServicePriceValue;
  const additionalTotal = additionalServicesList.reduce(
    (sum: number, svc: { price: number }) => sum + svc.price,
    0,
  );
  const totalPrice = primaryPrice + additionalTotal;

  return {
    invoiceNo: appointment.id?.split("-").pop() || "NA",
    generatedAt: new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    appointmentDate: appointment.dateOnly || "—",
    appointmentTime: to12h((a as any)?.appointmentTime) || "",
    token: appointment.tokenNo || "",
    patientName: patient.name || "",
    patientAge: patient.age || "",
    patientGender: patient.gender || "",
    patientMobile: patient.contact || "",
    doctorName: doctor.name ? `Dr. ${doctor.name}` : "",
    speciality: doctor.speciality || doctor.qualification || "",
    clinicName: clinic.clinicName || "",
    clinicAddress: clinic.clinicAddress || "",
    clinicPhone: clinic.clinicPhone || "",
    clinicCity: clinic.City || "",
    clinicState: clinic.State || "",
    clinicZipCode: clinic.ZipCode || "",
    clinicLogo: clinic.clinicLogo || "",
    clinicSealUrl:
      clinic.seal ||
      clinic.sealUrl ||
      clinicBranding.seal ||
      clinicBranding.sealUrl ||
      "",
    clinicSignUrl:
      clinic.signature ||
      clinic.signatureUrl ||
      clinic.sign ||
      clinic.signUrl ||
      clinicBranding.signature ||
      clinicBranding.signatureUrl ||
      clinicBranding.sign ||
      clinicBranding.signUrl ||
      "",
    serviceName: clinicService?.serviceName || "Consultation",
    paymentMode: paymentMode === "Pay Later" ? "Pay on Visit" : paymentMode,
    paymentStatus: a?.paymentStatus || "—",
    paymentNotes: a?.paymentNotes || "",
    amountText: primaryServicePriceText,
    totalAmountText: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalPrice),
    priceValue: totalPrice,
    notes: (a as any)?.paymentNotes || "",
    // Add the new fields
    primaryService: primaryService,
    additionalServices: additionalServicesList,
  };
};
