import React from "react";

import QuickAddPatientModal from "../../../patient/QuickAddPatientModal";
import ConfirmAppointmentModal from "../../ConfirmAppointmentModal";
import type { NewAppointmentModalsProps } from "../../../../types/appointment";

const NewAppointmentModals: React.FC<NewAppointmentModalsProps> = ({
  isAddPatientOpen,
  onCloseAddPatient,
  quickAddQuery,
  onPatientCreated,
  isConfirmModalOpen,
  onConfirmModalOpenChange,
  appointmentData,
  onConfirmAppointment,
  requiresPaymentMode,
  paymentModeOptions,
  onSelectPaymentMode,
}) => {
  return (
    <>
      <QuickAddPatientModal
        isOpen={isAddPatientOpen}
        onClose={onCloseAddPatient}
        queryText={quickAddQuery}
        onCreated={onPatientCreated}
      />
      <ConfirmAppointmentModal
        isOpen={isConfirmModalOpen}
        onOpenChange={onConfirmModalOpenChange}
        appointmentData={appointmentData}
        onConfirm={onConfirmAppointment}
        requiresPaymentMode={requiresPaymentMode}
        paymentModeOptions={paymentModeOptions}
        onSelectPaymentMode={onSelectPaymentMode}
      />
    </>
  );
};

export default NewAppointmentModals;
