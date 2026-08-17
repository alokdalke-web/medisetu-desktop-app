import { Button } from "@heroui/react";
import React from "react";
import { FiPlus } from "react-icons/fi";

const NewPatientButton: React.FC<{ onPress: () => void; isDisabled?: boolean }> = ({ onPress, isDisabled }) => (
  <div id="tour-add-patient-btn" className="shrink-0">
    <Button
      disableRipple
      onPress={onPress}
      isDisabled={isDisabled}
      aria-label="New Patient"
      className="h-10 shrink-0 whitespace-nowrap rounded-xl bg-primary px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-primary-hover sm:px-5"
    >
      <FiPlus className="h-4 w-4 sm:hidden" />
      <span className="hidden sm:inline">+ New Patient</span>
    </Button>
  </div>
);

export default NewPatientButton;
