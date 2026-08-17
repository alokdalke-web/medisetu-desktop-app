import { useMemo, useState } from "react";
import { FiClock, FiMapPin, FiPhone } from "react-icons/fi";

import type { PublicClinic } from "../../../types/doctor";
import {
  formatClinicLocation,
  formatTime,
  getClinicMapEmbedUrl,
  getClinicMapsUrl,
  sortTimings,
} from "../helpers/doctorPublicFormatters";
import { getPaymentMethods } from "../helpers/doctorPublicContent";

interface ClinicCardProps {
  clinic: PublicClinic;
  onBook: () => void;
}

const ClinicCard: React.FC<ClinicCardProps> = ({ clinic, onBook }) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const timings = useMemo(() => sortTimings(clinic.timings), [clinic.timings]);
  const mapsUrl = getClinicMapsUrl(clinic);
  const mapEmbedUrl = getClinicMapEmbedUrl(clinic);
  const location = formatClinicLocation(clinic);
  const paymentMethods = getPaymentMethods(clinic);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {clinic.clinicLogo && !logoFailed ? (
            <img
              src={clinic.clinicLogo}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-line bg-surface object-contain p-1"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg font-semibold text-text-muted">
              {clinic.clinicName.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-text">{clinic.clinicName}</h3>
            {clinic.tagline && (
              <p className="text-sm text-text-muted">{clinic.tagline}</p>
            )}
          </div>
        </div>
        {clinic.onlineBookingEnabled && (
          <button
            type="button"
            onClick={onBook}
            className="min-h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Book appointment
          </button>
        )}
      </div>

      {location && (
        <p className="mt-4 flex items-start gap-2 text-sm text-text-muted">
          <FiMapPin className="mt-0.5 shrink-0" />
          <span>
            {location}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 font-medium text-primary hover:underline"
              >
                View on map
              </a>
            )}
          </span>
        </p>
      )}

      {clinic.clinicPhone && (
        <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
          <FiPhone className="shrink-0" />
          <a href={`tel:${clinic.clinicPhone}`} className="hover:underline">
            {clinic.clinicPhone}
          </a>
        </p>
      )}

      {mapEmbedUrl && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <iframe
            src={mapEmbedUrl}
            title={`Map showing ${clinic.clinicName}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-56 w-full border-0"
          />
        </div>
      )}

      {timings.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
            <FiClock /> Consultation hours
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <tbody>
                {timings.map((t) => (
                  <tr key={t.dayOfWeek} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4 capitalize text-text-muted">{t.dayOfWeek}</td>
                    <td className="py-2 text-right text-text">
                      {t.isAvailable
                        ? `${formatTime(t.startTime)} – ${formatTime(t.endTime)}`
                        : "Closed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paymentMethods.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-text">Payment options</p>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs text-text-muted"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      )}

      {clinic.services.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-text">Consultation fees</p>
          <ul className="space-y-2">
            {clinic.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-text-muted">{s.serviceName}</span>
                <span className="font-medium text-text">
                  {s.price != null ? `${s.currency} ${s.price}` : "--"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ClinicCard;
