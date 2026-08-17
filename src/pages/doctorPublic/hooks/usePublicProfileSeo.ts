import { useEffect } from "react";

import type { PublicDoctorProfile } from "../../../types/doctor";
import { buildJsonLd, getDoctorDisplayName, getSpecializations } from "../helpers/doctorPublicContent";

const JSON_LD_ID = "doctor-public-profile-jsonld";

/**
 * Public profiles are meant to be found, so the page owns its own title,
 * description and schema.org markup. The app has no SSR/head manager, so this
 * runs client-side and restores the previous title on unmount.
 */
export function usePublicProfileSeo(data: PublicDoctorProfile | undefined) {
  useEffect(() => {
    if (!data) return;

    const previousTitle = document.title;
    const name = getDoctorDisplayName(data.doctor.name);
    const specializations = getSpecializations(data.doctor);
    const city = data.clinics[0]?.city;

    document.title = [name, specializations[0], city].filter(Boolean).join(" | ");

    const description =
      data.doctor.about?.trim() ||
      `Book an appointment with ${name}${specializations[0] ? `, ${specializations[0]}` : ""}${city ? ` in ${city}` : ""}. View timings, fees, clinic address and patient reviews.`;

    let metaTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const hadMetaTag = !!metaTag;
    const previousDescription = metaTag?.content ?? "";
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = "description";
      document.head.appendChild(metaTag);
    }
    metaTag.content = description.slice(0, 300);

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = JSON_LD_ID;
    script.text = JSON.stringify(buildJsonLd(data, window.location.href));
    document.head.appendChild(script);

    return () => {
      document.title = previousTitle;
      document.getElementById(JSON_LD_ID)?.remove();
      if (!metaTag) return;
      if (hadMetaTag) {
        metaTag.content = previousDescription;
      } else {
        metaTag.remove();
      }
    };
  }, [data]);
}
