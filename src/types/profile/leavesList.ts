import type { DateAvailabilityItem } from "../../pages/profile/ClinicAvailability";

export type LeavesListProps = {
  items?: DateAvailabilityItem[];
  leaves?: DateAvailabilityItem[];
  deletingKey?: string | null;
  onAdd: () => void;
  onEdit: (item: DateAvailabilityItem) => void;
  onDeleteSuccess?: () => void; // Callback to refresh parent data
};
