import type { Patient } from "../../redux/api/patientApi";

/** Page-size options for the patient list pagination control. */
export type PageSize = 6 | 10 | 15;

export type SortKey = "name";

/**
 * The `Patient` API type (redux/api/patientApi.ts) doesn't yet cover every
 * field the list screen reads defensively (visit history, family linkage,
 * alternate date fields) — extend it with those as explicit optional fields
 * rather than a blanket `[key: string]: any` index.
 */
export interface PatientRow extends Partial<Patient> {
  id: string;
  name?: string;
  visitCount?: number | null;
  linkedNumber?: string | null;
  lastVisit?: string | null;
  date?: string | null;
  sex?: string | null;
  familyMembers?: { name?: string | null; relationship?: string | null }[] | null;
}

export interface ApiPagination {
  totalRecords?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}

export interface StatCardData {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  iconClassName: string;
  detailClassName: string;
}

export interface BottomControlsProps {
  show: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
}

export interface PatientTableProps {
  rows: PatientRow[];
  showSkeleton: boolean;
  sortDir: "asc" | "desc";
  onToggleSort: () => void;
  goToDetails: (id: string) => void;
  goToEdit: (id: string) => void;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  totalRecords: number;
  rowsPerPage: PageSize;
  setRowsPerPage: (v: PageSize) => void;
  isPending?: boolean;
}

export interface PatientStatCardsProps {
  stats: StatCardData[];
  isLoading: boolean;
}
