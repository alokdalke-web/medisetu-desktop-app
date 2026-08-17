/**
 * ManageDoctorsOnlineBookingCard.tsx
 *
 * Admin-only card listing every doctor in the clinic with a per-row
 * "Accept Online Bookings" switch, so an Admin can toggle any doctor's
 * setting without needing that doctor to log in themselves.
 */

import React from "react";
import { Card, CardBody, Switch, Spinner, addToast } from "@heroui/react";
import { FiUsers } from "react-icons/fi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";
import { useSetDoctorOnlineBookingMutation } from "../../redux/api/doctorApi";
import type { DoctorOnlineBookingRowProps } from "../../types/clinicOnlineBooking";

const DoctorRow: React.FC<DoctorOnlineBookingRowProps> = ({ doctorId, name, enabled }) => {
  const [value, setValue] = React.useState(enabled);
  const [setDoctorOnlineBooking, { isLoading }] =
    useSetDoctorOnlineBookingMutation();

  React.useEffect(() => setValue(enabled), [enabled]);

  const handleChange = async (val: boolean) => {
    const previous = value;
    setValue(val);
    try {
      await setDoctorOnlineBooking({ doctorId, enabled: val }).unwrap();
      addToast({
        title: "Saved",
        description: `${name} is ${val ? "now" : "no longer"} accepting online bookings.`,
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: `Failed to update online booking setting for ${name}.`,
        color: "danger",
      });
      setValue(previous);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 dark:border-[#273244]">
      <p className="text-[13px] font-medium text-slate-800 truncate pr-3 dark:text-white">
        Dr. {name}
      </p>
      <Switch
        isSelected={value}
        onValueChange={handleChange}
        isDisabled={isLoading}
        size="sm"
        aria-label={`Accept Online Bookings for ${name}`}
      />
    </div>
  );
};

const ManageDoctorsOnlineBookingCard: React.FC = () => {
  const { data, isLoading } = useGetAllUsersQuery({
    page: 1,
    pageSize: 100,
    userType: "Doctor",
  });

  const doctors = (data?.users ?? []).map((u: any) => ({
    id: String(u?.id ?? u?._id ?? ""),
    name: u?.name ?? "Unknown",
    onlineBookingEnabled: !!u?.onlineBookingEnabled,
  }));

  return (
    <Card className="border border-slate-200 bg-white shadow-none rounded-[16px] dark:border-[#273244] dark:bg-[#111726]">
      <CardBody className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#0D9488] text-[#0D9488] shrink-0">
            <FiUsers size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight dark:text-white">
              Manage Doctors' Online Booking
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug dark:text-slate-400">
              Turn online booking on or off for any doctor in your clinic
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-[12px] text-slate-400 text-center py-6 dark:text-slate-500">
            No doctors found in this clinic.
          </p>
        ) : (
          <div>
            {doctors.map((doc) => (
              <DoctorRow
                key={doc.id}
                doctorId={doc.id}
                name={doc.name}
                enabled={doc.onlineBookingEnabled}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ManageDoctorsOnlineBookingCard;
