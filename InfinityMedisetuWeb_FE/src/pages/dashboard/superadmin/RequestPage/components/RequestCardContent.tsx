import { Avatar } from "@heroui/react";
import React from "react";
import type { RequestCard } from "../types";
// import { getClinicName } from "../utils";

interface RequestCardContentProps {
  card: RequestCard;
}

/**
 * Displays the detailed content of a request card
 * Includes doctor info, speciality, registration number, and clinic info
 */
export const RequestCardContent: React.FC<RequestCardContentProps> = ({
  card,
}) => {
  const doctorName = card.doctor.name ?? "Doctor";
  const doctorContact = card.doctor.email ?? card.doctor.mobile ?? "—";
  const doctorMobile = card.doctor.mobile;
  // const doctorSpeciality = card.doctor.speciality ?? "—";
  // const doctorRegistrationNumber = card.doctor.registrationNumber ?? "—";
  // const clinicName = getClinicName(card.clinic);

  return (
    <>
      {/* Doctor Info Header */}
      <div className="flex items-start gap-3">
        <Avatar
          src={card.doctor.profileImage ?? ""}
          name={doctorName}
          radius="lg"
          className="h-10 w-10 shrink-0 bg-slate-100 text-slate-700"
        />

        <div className="min-w-0 flex-1">
          <p className="break-all text-[14px] font-bold leading-snug text-slate-950">
            {doctorName}
          </p>

          <p className="mt-1 break-all text-xs font-medium leading-snug text-slate-500">
            {doctorContact}
          </p>

          {doctorMobile && card.doctor.email && (
            <p className="mt-0.5 break-words text-xs text-slate-400">
              {doctorMobile}
            </p>
          )}
        </div>
      </div>


    </>
  );
};
