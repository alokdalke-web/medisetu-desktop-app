import type { NoShowRow } from "../../../types/noshow";

export const mapNoShowRows = (incidents: unknown[]): NoShowRow[] =>
  incidents.map((item, idx) => {
    const record = item as Record<string, any>;
    return {
      id: record?.patient?.id || `temp-${idx}`,
      patientName: record?.patient?.name || "N/A",
      patientMobile: record?.patient?.mobile || "N/A",
      doctorName: record?.doctor?.name || "N/A",
      appointmentType: record?.latestAppointment?.appointmentType || "Consultation",
      appointmentDate: record?.latestAppointment?.appointmentDate || "",
      appointmentTime: record?.latestAppointment?.appointmentTime || "",
      appointmentStatus: "no-show" as const,
      latestAction: (record?.latestAction || "no-show") as NoShowRow["latestAction"],
      reason: record?.latestAppointment?.noShowReason || "",
      markedBy: record?.latestAppointment?.noShowMarkedBy || "System",
      markedAt: record?.latestAppointment?.createdAt || "",
      totalNoShows: record?.totalNoShows || 0,
      firstNoShowDate: record?.firstNoShowDate || "",
      currentStatus: record?.currentStatus || "active",
      isBlocked: record?.isBlocked || false,
    };
  });

export const getErrText = (err: any, fallback: string): string => {
  if (!err) return fallback;
  if (err?.data?.errors?.[0]?.message) return err.data.errors[0].message;
  if (err?.data?.message) return err.data.message;
  if (err?.error) return err.error;
  if (typeof err === "string") return err;
  return fallback;
};
