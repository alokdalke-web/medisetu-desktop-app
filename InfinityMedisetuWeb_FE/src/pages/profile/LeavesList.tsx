// src/pages/profile/LeavesList.tsx
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, addToast } from "@heroui/react";
import React, { useState } from "react";
import { FiCalendar, FiPlus, FiTrash2 } from "react-icons/fi";

// ✅ type-only import to avoid runtime circular dependency
import type { DateAvailabilityItem } from "./ClinicAvailability";

// ✅ Import the delete leave mutation
import { useDeleteLeaveMutation } from "../../redux/api/doctorApi";

/* ---------------- Helpers ---------------- */

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toPrettyDate(yyyyMmDdOrIso: string) {
  const dOnly = normalizeDateOnly(yyyyMmDdOrIso);
  if (!dOnly) return "—";
  const d = new Date(dOnly + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dOnly;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// function parseTimeToMinutes(t?: string | null): number | null {
//   if (!t) return null;
//   const s = String(t).trim();

//   const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
//   if (m12) {
//     let hh = Number(m12[1]);
//     const mm = Number(m12[2]);
//     const ap = m12[3].toUpperCase();
//     if (hh === 12) hh = 0;
//     if (ap === "PM") hh += 12;
//     return hh * 60 + mm;
//   }

//   const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
//   if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

//   return null;
// }

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const s = String(t).trim();

  // Handle "09:00AM" format (no space)
  const m12NoSpace = s.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (m12NoSpace) {
    let hh = Number(m12NoSpace[1]);
    const mm = Number(m12NoSpace[2]);
    const ap = m12NoSpace[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }

  // Handle "09:00 AM" format (with space)
  const m12WithSpace = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12WithSpace) {
    let hh = Number(m12WithSpace[1]);
    const mm = Number(m12WithSpace[2]);
    const ap = m12WithSpace[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }

  // Handle 24-hour format "09:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  return null;
}

// function compactTime(t?: string | null) {
//   if (!t) return "";
//   return String(t).trim().replace(/\s+/g, "");
// }

function formatTimeForDisplay(t?: string | null): string {
  if (!t) return "";
  const s = String(t).trim();
  
  // If it's already "09:00AM" format, add space for better display
  const m12NoSpace = s.match(/^(\d{1,2}):(\d{2})(AM|PM)$/i);
  if (m12NoSpace) {
    return `${m12NoSpace[1]}:${m12NoSpace[2]} ${m12NoSpace[3]}`;
  }
  
  // If it's "09:00 AM" format, keep as is
  const m12WithSpace = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12WithSpace) {
    return `${m12WithSpace[1]}:${m12WithSpace[2]} ${m12WithSpace[3]}`;
  }
  
  return s;
}

function getRangeText(item: DateAvailabilityItem) {
  const slots = Array.isArray(item.timeSlots) ? item.timeSlots : [];
  const hasSlots = slots.length > 0;

  const isFullDay = !item.isAvailable || !hasSlots;
  
  // For full day leave, show a default range or custom message
  if (isFullDay) {
    // You can return empty string or a default message
    // Returning empty string will hide the range text
    return "";
  }

  const byStart = [...slots].sort((a, b) => {
    const am = parseTimeToMinutes(a.startTime) ?? 999999;
    const bm = parseTimeToMinutes(b.startTime) ?? 999999;
    return am - bm;
  });
  const byEnd = [...slots].sort((a, b) => {
    const am = parseTimeToMinutes(a.endTime) ?? -999999;
    const bm = parseTimeToMinutes(b.endTime) ?? -999999;
    return bm - am;
  });

  const start = byStart[0]?.startTime;
  const end = byEnd[0]?.endTime;
  
  // Format times for better display
  const formattedStart = formatTimeForDisplay(start);
  const formattedEnd = formatTimeForDisplay(end);
  
  return `(${formattedStart} - ${formattedEnd})`;
}

// function getRangeText(item: DateAvailabilityItem) {
//   const slots = Array.isArray(item.timeSlots) ? item.timeSlots : [];
//   const hasSlots = slots.length > 0;

//   const isFullDay = !item.isAvailable || !hasSlots;
//   if (isFullDay) return "09:00AM - 05:00PM";

//   const byStart = [...slots].sort((a, b) => {
//     const am = parseTimeToMinutes(a.startTime) ?? 999999;
//     const bm = parseTimeToMinutes(b.startTime) ?? 999999;
//     return am - bm;
//   });
//   const byEnd = [...slots].sort((a, b) => {
//     const am = parseTimeToMinutes(a.endTime) ?? -999999;
//     const bm = parseTimeToMinutes(b.endTime) ?? -999999;
//     return bm - am;
//   });

//   const start = byStart[0]?.startTime;
//   const end = byEnd[0]?.endTime;
//   return `${compactTime(start)} - ${compactTime(end)}`;
// }

/* ---------------- Types ---------------- */

type Props = {
  items?: DateAvailabilityItem[];
  leaves?: DateAvailabilityItem[];
  deletingKey?: string | null;
  onAdd: () => void;
  onEdit: (item: DateAvailabilityItem) => void;
  onDeleteSuccess?: () => void; // ✅ Callback to refresh parent data
};

/* ---------------- Component ---------------- */

const LeavesList: React.FC<Props> = ({
  items,
  leaves,
  onAdd,
  onDeleteSuccess, // ✅ Add this prop
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DateAvailabilityItem | null>(null);
  const [localItems, setLocalItems] = useState<DateAvailabilityItem[]>([]);

  // ✅ Use the delete leave mutation
  const [deleteLeave, { isLoading: isDeleting }] = useDeleteLeaveMutation();

  // ✅ Define list here
  const list = items ?? leaves ?? [];

  // ✅ Update local items when props change
  React.useEffect(() => {
    setLocalItems(list);
  }, [list]);

  const handleDeleteClick = (item: DateAvailabilityItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) {
      addToast({
        title: "Error",
        description: "Leave ID is missing. Cannot delete.",
        color: "danger",
      });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      return;
    }

    try {
      await deleteLeave(itemToDelete.id).unwrap();
      
      // ✅ Remove item from local state immediately (optimistic update)
      setLocalItems(prev => prev.filter(item => item.id !== itemToDelete.id));
      
      addToast({
        title: "Deleted",
        description: `Leave for ${toPrettyDate(itemToDelete.date)} has been removed.`,
        color: "success",
      });
      
      // Close modal and clear item
      setDeleteModalOpen(false);
      setItemToDelete(null);
      
      // ✅ Call the callback to refresh parent data
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      console.error("Error deleting leave:", err);
      addToast({
        title: "Delete failed",
        description: "Something went wrong. Please try again.",
        color: "danger",
      });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // ✅ Use localItems for rendering
  if (!localItems.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs text-slate-500">
        <div className="flex items-center justify-between gap-3">
          <div>No leaves added yet.</div>
          <Button
            size="sm"
            className="rounded-full bg-emerald-700 text-white"
            startContent={<FiPlus />}
            onPress={onAdd}
          >
            Add Leave
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Top action */}
        <div className="flex items-center justify-end">
          <Button
            size="sm"
            className="rounded-lg bg-emerald-700 px-4 text-white"
            startContent={<FiPlus />}
            onPress={onAdd}
          > Add
          </Button>
        </div>

        {localItems.map((item) => {
          const dateOnly = normalizeDateOnly(item.date);
          const slots = Array.isArray(item.timeSlots) ? item.timeSlots : [];
          const hasSlots = slots.length > 0;

          const isFullDay = !item.isAvailable || !hasSlots;
          const rangeText = getRangeText(item);

          const k = (item as any)?.id || dateOnly;

          return (
            <div
              key={k}
              className="rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl ${
                      isFullDay ? "text-slate-400" : "text-emerald-700"
                    }`}
                  >
                    <FiCalendar className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {toPrettyDate(dateOnly)}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-md px-2 py-0.5 font-semibold ${
                          isFullDay
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isFullDay ? "FULL DAY LEAVE" : "CUSTOM WORKING HOURS"}
                      </span>

                      <span className="text-slate-500">{rangeText}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="md"
                    variant="light"
                    className="rounded-full bg-danger text-white hover:bg-danger/90"
                    startContent={<FiTrash2 />}
                    onPress={() => handleDeleteClick(item)}
                  />
                  {/* <Button
                    size="sm"
                    variant="bordered"
                    className="rounded-full border-slate-200 text-slate-700"
                    onPress={() => onEdit(item)}
                  >
                    Edit
                  </Button> */}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete the leave for{" "}
              <strong>{itemToDelete ? toPrettyDate(itemToDelete.date) : ""}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="bordered" 
              onPress={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              color="danger" 
              onPress={confirmDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default LeavesList;