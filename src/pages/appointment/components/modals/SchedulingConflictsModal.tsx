import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader, ModalFooter, addToast } from "@heroui/react";
import { FiAlertTriangle } from "react-icons/fi";
import AppButton from "../../../../components/shared/AppButton";
import { useNavigate } from "react-router";

type SchedulingConflictsModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved: () => void; // callback to refresh parent badge
};

const SchedulingConflictsModal = ({
  isOpen,
  onOpenChange,
  onResolved,
}: SchedulingConflictsModalProps) => {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      if ((window as any).ipcAPI) {
        const data = await (window as any).ipcAPI.appointment.getConflicts();
        setConflicts(data || []);
      }
    } catch (error) {
      console.error("Failed to load conflicts:", error);
      addToast({
        title: "Error",
        description: "Failed to load scheduling conflicts.",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConflicts();
    }
  }, [isOpen]);

  const handleResolve = async (keepAppointmentId: string, conflictGroupId: string) => {
    setResolvingId(keepAppointmentId);
    try {
      const group = conflicts.find(g => g.conflictGroupId === conflictGroupId);
      const rejectedAppt = group?.appointments.find((a: any) => a.id !== keepAppointmentId);

      await (window as any).ipcAPI.appointment.resolveConflict({
        keepAppointmentId,
        conflictGroupId,
      });

      addToast({
        title: "Conflict Resolved",
        description: "Please reschedule the other appointment.",
        color: "success",
        variant: "flat",
      });
      
      // Remove group locally
      setConflicts(prev => prev.filter(g => g.conflictGroupId !== conflictGroupId));
      onResolved();

      if (rejectedAppt) {
        onOpenChange(false);
        navigate(`/appointment/${rejectedAppt.id}/reschedule`);
      }
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
      addToast({
        title: "Error",
        description: "Failed to resolve conflict.",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="3xl"
      classNames={{ base: "rounded-2xl" }}
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 border-b pb-4">
              <div className="flex items-center gap-2">
                <FiAlertTriangle className="text-warning-500" size={24} />
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  Scheduling Conflicts
                </h2>
              </div>
              <p className="text-sm font-normal text-slate-500">
                The following appointments occupy the same time slot. Choose which appointment to keep.
              </p>
            </ModalHeader>
            
            <ModalBody className="p-6 bg-slate-50/50 dark:bg-transparent">
              {loading && conflicts.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : conflicts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-emerald-100 rounded-full p-4 mb-4">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">No scheduling conflicts</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-1">All your appointments are perfectly scheduled without any overlaps.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {conflicts.map((group) => (
                    <div key={group.conflictGroupId} className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        
                        {/* VS Divider for desktop */}
                        <div className="hidden md:flex absolute inset-y-0 left-1/2 items-center justify-center -ml-4 z-10">
                          <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                            VS
                          </div>
                        </div>

                        {group.appointments.map((appt: any, idx: number) => (
                          <div key={`${appt.id}-${idx}`} className="flex flex-col gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50 dark:bg-[#151e31] dark:border-slate-700/50">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-base text-slate-900 dark:text-white">
                                  {appt.patientName || "Unknown Patient"}
                                </h4>
                                <div className="text-sm text-slate-500 mt-1 space-y-1">
                                  <p><strong>Date:</strong> {appt.date}</p>
                                  <p><strong>Time:</strong> {appt.time_slot}</p>
                                </div>
                              </div>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                appt.booking_source === 'cloud' || appt.booking_source === 'online'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}>
                                {appt.booking_source === 'cloud' || appt.booking_source === 'online' ? 'Online Booking' : 'Walk-in'}
                              </span>
                            </div>
                            <div className="mt-auto pt-4">
                              <AppButton
                                text="Keep This One"
                                className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                isLoading={resolvingId === appt.id}
                                disabled={resolvingId !== null}
                                onPress={() => handleResolve(appt.id, group.conflictGroupId)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ModalBody>

            <ModalFooter className="border-t pt-4">
              <AppButton
                text="Close"
                onPress={onClose}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              />
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SchedulingConflictsModal;
