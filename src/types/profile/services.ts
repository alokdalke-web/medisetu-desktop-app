/**
 * `EditServicePage.tsx` and `UpdateServicePriceModal.tsx` each have their own `ServiceForm`/
 * `Props` types with the same name but different shapes (the edit-page version has
 * `canBeBookedByPatient`; the modal version has `additionalServices`/`durationMonths` instead) —
 * kept distinct here rather than merged, since forcing one shape onto both would either drop
 * fields one screen needs or add unused optional fields to the other.
 */
export type EditServicePageServiceForm = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  durationDays: number | string;
  canBeBookedByPatient: boolean;
};

export type UpdateServicePriceModalServiceForm = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  additionalServices?: string;

  // form field now days
  durationDays: number | string;

  // optional: if the existing "service" object still comes with durationMonths,
  // read it safely while editing.
  durationMonths?: number | string;
};

export type UpdateServicePriceModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: UpdateServicePriceModalServiceForm | null;
  onSaved: () => void;
};
