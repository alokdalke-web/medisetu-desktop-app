import type { PublicClinic, PublicDoctorProfile } from "../../../types/doctor";
import { formatClinicLocation, formatTime, sortTimings } from "./doctorPublicFormatters";

export interface PublicFaq {
  question: string;
  answer: string;
}

export function getDoctorDisplayName(name: string | null) {
  const clean = (name ?? "").trim();
  if (!clean) return "This doctor";
  return /^dr\.?\s/i.test(clean) ? clean : `Dr. ${clean}`;
}

/** Speciality plus every distinct qualification specialization, de-duplicated. */
export function getSpecializations(doctor: PublicDoctorProfile["doctor"]) {
  const values = [
    doctor.speciality,
    ...doctor.qualifications.map((q) => q.specialization),
  ];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = (value ?? "").trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function getPaymentMethods(clinic: PublicClinic) {
  const methods: string[] = [];
  if (clinic.payAtClinicEnabled) methods.push("Cash / pay at clinic");
  if (clinic.payOnlineEnabled) methods.push("Online payment");
  return methods;
}

export function getLowestFee(clinics: PublicClinic[]) {
  const prices = clinics
    .flatMap((c) => c.services.map((s) => s.price))
    .filter((p): p is number => typeof p === "number" && p > 0);
  return prices.length ? Math.min(...prices) : null;
}

function describeHours(clinic: PublicClinic) {
  const open = sortTimings(clinic.timings).filter((t) => t.isAvailable);
  if (!open.length) return null;
  const first = open[0];
  return `${formatTime(first.startTime)} to ${formatTime(first.endTime)}`;
}

export function buildFaqs(data: PublicDoctorProfile): PublicFaq[] {
  const { doctor, clinics, rating } = data;
  const name = getDoctorDisplayName(doctor.name);
  const faqs: PublicFaq[] = [];
  const specializations = getSpecializations(doctor);

  if (specializations.length) {
    faqs.push({
      question: `What does ${name} specialise in?`,
      answer: `${name} practises ${specializations.join(", ")}.`,
    });
  }

  if (doctor.yearsOfExperience) {
    faqs.push({
      question: `How much experience does ${name} have?`,
      answer: `${name} has ${doctor.yearsOfExperience} years of experience.`,
    });
  }

  const primary = clinics[0];
  if (primary) {
    const location = formatClinicLocation(primary);
    if (location) {
      faqs.push({
        question: `Where does ${name} practise?`,
        answer: `${name} consults at ${primary.clinicName}, ${location}.`,
      });
    }

    const hours = describeHours(primary);
    if (hours) {
      faqs.push({
        question: `What are the consultation timings?`,
        answer: `Consultations at ${primary.clinicName} are generally available from ${hours}. Check the clinic card above for day-wise timings.`,
      });
    }
  }

  const lowestFee = getLowestFee(clinics);
  if (lowestFee !== null) {
    faqs.push({
      question: `What is the consultation fee?`,
      answer: `Consultations start at ${lowestFee}. Exact fees per service are listed under each clinic.`,
    });
  }

  const bookable = clinics.find((c) => c.onlineBookingEnabled);
  faqs.push({
    question: `How do I book an appointment with ${name}?`,
    answer: bookable
      ? `You can book online using the "Book appointment" button on this page, up to ${bookable.maxAdvanceBookingDays} days in advance.`
      : `Online booking is not enabled for this doctor. Please contact the clinic directly using the phone number listed above.`,
  });

  if (rating.count > 0) {
    faqs.push({
      question: `How is ${name} rated by patients?`,
      answer: `${name} has an average rating of ${rating.average.toFixed(1)} out of 5 from ${rating.count} patient ${rating.count === 1 ? "review" : "reviews"}.`,
    });
  }

  return faqs;
}

/** schema.org Physician markup — what makes these pages surface in search. */
export function buildJsonLd(data: PublicDoctorProfile, pageUrl: string) {
  const { doctor, clinics, rating } = data;
  const primary = clinics[0];

  return {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: getDoctorDisplayName(doctor.name),
    url: pageUrl,
    ...(doctor.profileImage ? { image: doctor.profileImage } : {}),
    ...(doctor.about ? { description: doctor.about } : {}),
    ...(doctor.speciality ? { medicalSpecialty: doctor.speciality } : {}),
    ...(rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
            bestRating: 5,
          },
        }
      : {}),
    ...(primary
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: primary.clinicAddress ?? undefined,
            addressLocality: primary.city ?? undefined,
            addressRegion: primary.state ?? undefined,
            postalCode: primary.zipCode ? String(primary.zipCode) : undefined,
          },
          ...(primary.clinicPhone ? { telephone: primary.clinicPhone } : {}),
        }
      : {}),
  };
}
