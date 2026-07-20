// import React from "react";
import { Card, CardBody, Spinner } from "@heroui/react";
import { FiInfo, FiUser } from "react-icons/fi";
import type { AppointmentHistoryItem } from "../../redux/api/appointmentApi";
import { useGetAppointmentHistoryQuery } from "../../redux/api/appointmentApi";

interface AppointmentHistoryProps {
  appointmentId: string;
}

const actionColors: Record<string, string> = {
  CREATED: "bg-blue-100 text-blue-700",
  UPDATED: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  STATUS_CHANGED: "bg-indigo-100 text-indigo-700", // Changed from purple
  PAYMENT_STATUS: "bg-pink-100 text-pink-700",
  RESCHEDULED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-red-100 text-red-700",
  NOTES_ADDED: "bg-teal-100 text-teal-700",
  REMINDER_SENT: "bg-amber-100 text-amber-700", // Changed from indigo
  TEST_PRESCRIBED: "bg-yellow-100 text-yellow-700",
  TEST_REPORT_UPLOADED: "bg-lime-100 text-lime-700", // Changed from green
  PRESCRIPTION_CREATED: "bg-rose-100 text-rose-700", // Changed from pink
  PRESCRIPTION_UPDATED: "bg-cyan-100 text-cyan-700",
  VITALS_UPDATED: "bg-emerald-100 text-emerald-700", // Changed from yellow
};

const formatAction = (action: string) => {
  return action.replace(/_/g, " ");
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const AppointmentHistory: React.FC<AppointmentHistoryProps> = ({
  appointmentId,
}) => {
  const { data, isLoading, isError } = useGetAppointmentHistoryQuery(appointmentId);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8 text-teal-600">
        <Spinner size="sm" color="current" />
      </div>
    );
  }

  if (isError || !data?.success) {
    return null; // Silent fail or simple message
  }

  const history = data.data || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <Card shadow="none" radius="lg" className="bg-white border border-gray-100">
      <CardBody className="p-0">
    

        <div className="p-5">
          <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {history.map((item: AppointmentHistoryItem, idx: number) => (
              <div key={item.id || idx} className="relative flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border-2 border-slate-100 shadow-sm z-10">
                  <FiInfo className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        actionColors[item.action] || "bg-slate-100"
                      }`}
                    >
                      {formatAction(item.action)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {item.remarks && (
                    <p className="text-sm text-slate-600 mt-1">{item.remarks}</p>
                  )}

                  <div className="flex items-center gap-1.5 mt-1">
                    <FiUser className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">
                      {item.performedBy?.name || "System"}
                    </span>
                  </div>

                  {(item.previousState || item.newState) && (
                    <div className="mt-2 text-[11px] text-slate-400 font-mono bg-slate-50 p-2 rounded border border-slate-100 overflow-x-auto max-w-full">
                      {item.action === "STATUS_CHANGED" && (
                        <div className="flex items-center gap-2">
                          <span className="line-through">
                            {item.previousState?.appointmentStatus || "N/A"}
                          </span>
                          <span>→</span>
                          <span className="font-bold text-teal-600">
                            {item.newState?.appointmentStatus}
                          </span>
                        </div>
                      )}
                      {item.action === "RESCHEDULED" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="line-through">
                              {item.previousState?.appointmentDate
                                ? new Date(
                                    item.previousState.appointmentDate
                                  ).toLocaleDateString()
                                : "N/A"}{" "}
                              at {item.previousState?.appointmentTime || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>→</span>
                            <span className="font-bold text-teal-600">
                              {item.newState?.appointmentDate
                                ? new Date(
                                    item.newState.appointmentDate
                                  ).toLocaleDateString()
                                : "N/A"}{" "}
                              at {item.newState?.appointmentTime || "N/A"}
                            </span>
                          </div>
                        </div>
                      )}
                      {item.action !== "STATUS_CHANGED" &&
                        item.action !== "RESCHEDULED" &&
                        item.action !== "CREATED" && (
                          <div className="text-[10px] opacity-70">
                            Changes were made to the appointment details.
                          </div>
                        )}
                      {item.action === "CREATED" && (
                        <div className="text-[10px] text-teal-600 font-medium">
                          Initial appointment record created.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default AppointmentHistory;
