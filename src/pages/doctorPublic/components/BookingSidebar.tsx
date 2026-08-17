import { FiCalendar, FiCreditCard, FiPhone } from "react-icons/fi";

import type { PublicClinic } from "../../../types/doctor";
import { getLowestFee, getPaymentMethods } from "../helpers/doctorPublicContent";

interface BookingSidebarProps {
  clinics: PublicClinic[];
  canBook: boolean;
  onBook: () => void;
}

const BookingSidebar: React.FC<BookingSidebarProps> = ({ clinics, canBook, onBook }) => {
  const lowestFee = getLowestFee(clinics);
  const bookable = clinics.find((c) => c.onlineBookingEnabled);
  const paymentMethods = Array.from(
    new Set(clinics.flatMap((c) => getPaymentMethods(c))),
  );
  const phone = clinics.find((c) => c.clinicPhone)?.clinicPhone;

  return (
    <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-20">
      {lowestFee !== null && (
        <div className="mb-4">
          <p className="text-sm text-text-muted">Consultation from</p>
          <p className="text-2xl font-semibold text-text">₹{lowestFee}</p>
        </div>
      )}

      {canBook ? (
        <button
          type="button"
          onClick={onBook}
          className="min-h-12 w-full rounded-lg bg-primary font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Book appointment
        </button>
      ) : (
        <p className="rounded-lg bg-surface-muted p-3 text-sm text-text-muted">
          Online booking is not enabled. Please contact the clinic directly.
        </p>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-text transition-colors hover:bg-surface-muted"
        >
          <FiPhone className="h-4 w-4" /> Call clinic
        </a>
      )}

      <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        {bookable && (
          <div className="flex items-start gap-2">
            <FiCalendar className="mt-0.5 shrink-0 text-text-subtle" />
            <div>
              <dt className="text-text">Advance booking</dt>
              <dd className="text-text-muted">
                Up to {bookable.maxAdvanceBookingDays} days ahead
              </dd>
            </div>
          </div>
        )}
        {paymentMethods.length > 0 && (
          <div className="flex items-start gap-2">
            <FiCreditCard className="mt-0.5 shrink-0 text-text-subtle" />
            <div>
              <dt className="text-text">Payment options</dt>
              <dd className="text-text-muted">{paymentMethods.join(" · ")}</dd>
            </div>
          </div>
        )}
      </dl>
    </aside>
  );
};

export default BookingSidebar;
