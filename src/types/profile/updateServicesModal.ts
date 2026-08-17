export type ClinicServiceItem = {
  serviceName: string;
  price: number;
  currency: string;
  additionalServices?: string;

  // required
  durationDays: number;

  // optional (keep if backend also supports months)
  durationMonths?: number | string;
};

export type UpdateServicesModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clinicService: ClinicServiceItem[]; // already sanitized from ServicesPrice
  onSaved: () => void; // calls refetch in parent
};
