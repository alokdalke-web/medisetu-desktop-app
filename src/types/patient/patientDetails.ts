// ⬇️ Show status as-is from backend
export type AStatus = string;
export type PStatus = "Active";

export type AppointmentRow = {
  id: string;
  dateRange: string;
  type: string;
  status: AStatus; // raw from API
  tokenNo: number;
  doctorName?: string;
  doctorSpeciality?: string;
};

export type HistoryRow = {
  date: string;
  label: string;
  value?: string | null;
};
