export type UiService = {
  id?: string;
  serviceName: string;
  price: number | string;
  currency: string;
  durationDays: number;
  additionalServices?: string;
  durationMonths: number | string;
  canBeBookedByPatient?: boolean;
};
