import React from "react";
import type { Control, FieldValues } from "react-hook-form";

import AutocompleteField from "../../../../components/shared/AutocompleteField";
import InputLabel from "../../../../components/shared/InputLabel";
import type { DoctorOption } from "../types";

type DoctorSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  doctorFieldRef: React.RefObject<HTMLDivElement | null>;
  doctorOptions: DoctorOption[];
  isFetchingDoctors: boolean;
  onDoctorSelectionChange: (key: React.Key | null) => void;
  jiggleKey: string;
};

const DoctorSelectionSection: React.FC<DoctorSelectionSectionProps> = ({
  rhfControl,
  doctorFieldRef,
  doctorOptions,
  isFetchingDoctors,
  onDoctorSelectionChange,
  jiggleKey,
}) => {
  return (
    <div
      ref={doctorFieldRef}
      className={[
        "min-w-0",
        jiggleKey === "doctorSelect" ? "jiggle-anim" : "",
      ].join(" ")}
    >
      <div className="mb-1.5 flex h-5 items-center">
        <InputLabel label="Select Doctor" />
      </div>
   <AutocompleteField
  control={rhfControl}
  name="doctorSelect"
  placeholder={
    isFetchingDoctors && doctorOptions.length === 0
      ? "Loading doctors..."
      : "Select doctor"
  }
  radius="lg"
  size="md"
  containerClassName="mb-0"
  classNames={{
    base: "max-w-full",
  }}
  inputProps={{
    classNames: {
      input:
        "text-[13px] text-slate-800 placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400",
      inputWrapper:
        "!h-10 !min-h-10 rounded-lg bg-white px-3 shadow-none " +
        "!border !border-slate-200 " +
        "data-[hover=true]:!border-slate-200 data-[focus=true]:!border-slate-200 " +
        "dark:!border-[#38445a] dark:bg-[#0f1728] dark:data-[hover=true]:!border-[#38445a] dark:data-[focus=true]:!border-[#38445a]",
    },
  }}
  options={doctorOptions}
  isLoading={isFetchingDoctors}
  onSelectionChange={onDoctorSelectionChange}
/>
    </div>
  );
};

export default DoctorSelectionSection;
