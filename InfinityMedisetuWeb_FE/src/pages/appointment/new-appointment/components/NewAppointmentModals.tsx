import React from "react";

import QuickAddPatientModal from "../../../patient/QuickAddPatientModal";
import ConfirmAppointmentModal from "../../ConfirmAppointmentModal";

type CreatedPatient = {
  id: string;
  name: string;
  mobile: string;
  gender?: string;
  age?: number;
  address?: string;
  city?: string;
  state?: string;
};

type NewAppointmentModalsProps = {
  isAddPatientOpen: boolean;
  onCloseAddPatient: () => void;
  quickAddQuery: string;
  onPatientCreated: (patient: CreatedPatient) => void;
  isConfirmModalOpen: boolean;
  onConfirmModalOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  appointmentData: any;
  onConfirmAppointment: () => void;
};

const NewAppointmentModals: React.FC<NewAppointmentModalsProps> = ({
  isAddPatientOpen,
  onCloseAddPatient,
  quickAddQuery,
  onPatientCreated,
  isConfirmModalOpen,
  onConfirmModalOpenChange,
  appointmentData,
  onConfirmAppointment,
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
      />
    </>
  );
};

export default NewAppointmentModals;
