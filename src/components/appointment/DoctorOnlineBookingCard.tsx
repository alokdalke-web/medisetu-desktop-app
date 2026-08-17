/**
 * DoctorOnlineBookingCard.tsx
 *
 * Per-doctor "Accept Online Bookings" toggle, scoped to the current clinic.
 * Used on a doctor's own profile (self-toggle) and, compactly, in the
 * admin's doctor list (admin toggling any doctor in their clinic).
 */

import React, { useEffect, useState } from "react";
import { Card, CardBody, Switch, Input, Button, addToast } from "@heroui/react";
import { FiUserCheck } from "react-icons/fi";
import {
  useGetDoctorOnlineBookingQuery,
  useSetDoctorOnlineBookingMutation,
} from "../../redux/api/doctorApi";
import { useGetClinicSettingsQuery } from "../../redux/api/clinicApi";
import type { DoctorOnlineBookingCardProps } from "../../types/clinicOnlineBooking";

const DoctorOnlineBookingCard: React.FC<DoctorOnlineBookingCardProps> = ({
  doctorId,
}) => {
  const { data: onlineBookingData } = useGetDoctorOnlineBookingQuery(
    doctorId,
    { skip: !doctorId }
  );
  const [enabled, setEnabled] = useState(false);
  const [maxDays, setMaxDays] = useState(7);
  const [maxDaysInput, setMaxDaysInput] = useState("7");
  const [setDoctorOnlineBooking, { isLoading }] =
    useSetDoctorOnlineBookingMutation();
  const { data: clinicSettingsData } = useGetClinicSettingsQuery();

  useEffect(() => {
    if (onlineBookingData?.success && onlineBookingData.data) {
      setEnabled(!!onlineBookingData.data.onlineBookingEnabled);
      const days = onlineBookingData.data.maxAdvanceBookingDays ?? 7;
      setMaxDays(days);
      setMaxDaysInput(String(days));
    }
  }, [onlineBookingData]);

  const clinicOnlineBookingEnabled =
    !!clinicSettingsData?.result?.settings?.onlineBookingEnabled;

  const handleChange = async (val: boolean) => {
    const previous = enabled;
    setEnabled(val);
    try {
      await setDoctorOnlineBooking({ doctorId, enabled: val }).unwrap();
      addToast({
        title: "Saved",
        description: val
          ? "You are now accepting online bookings."
          : "Online bookings turned off for your profile.",
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to update online booking setting.",
        color: "danger",
      });
      setEnabled(previous);
    }
  };

  const parsedMaxDaysInput = Math.min(
    90,
    Math.max(1, parseInt(maxDaysInput, 10) || 0)
  );
  const maxDaysDirty =
    maxDaysInput !== "" && parsedMaxDaysInput !== maxDays;

  const saveMaxDays = async () => {
    const clamped = parsedMaxDaysInput || 7;
    setMaxDaysInput(String(clamped));
    if (clamped === maxDays) return;

    const previous = maxDays;
    setMaxDays(clamped);
    try {
      await setDoctorOnlineBooking({
        doctorId,
        maxAdvanceBookingDays: clamped,
      }).unwrap();
      addToast({
        title: "Saved",
        description: `Patients can now book you up to ${clamped} day(s) in advance.`,
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to update max advance booking days.",
        color: "danger",
      });
      setMaxDays(previous);
      setMaxDaysInput(String(previous));
    }
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-none rounded-[16px] dark:border-[#273244] dark:bg-[#111726]">
      <CardBody className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#0D9488] text-[#0D9488] shrink-0">
            <FiUserCheck size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight dark:text-white">
              Online Booking (My Availability)
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="min-w-0 pr-3">
            <p className="text-[13px] font-medium text-slate-800 dark:text-white">
              Accept Online Bookings
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug dark:text-slate-400">
              When on, patients can find and book you online — subject to
              your clinic's online booking setting also being on.
            </p>
          </div>
          <Switch
            isSelected={enabled}
            onValueChange={handleChange}
            isDisabled={isLoading}
            size="sm"
            aria-label="Accept Online Bookings"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-[#273244]">
          <div className="min-w-0 pr-3">
            <p className="text-[13px] font-medium text-slate-800 dark:text-white">
              Max Advance Booking Days
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug dark:text-slate-400">
              How many days ahead patients can book you online (1–90, default
              7).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={90}
              step={1}
              value={maxDaysInput}
              onValueChange={(val) =>
                setMaxDaysInput(val.replace(/[^0-9]/g, ""))
              }
              onKeyDown={(e) => {
                if (e.key === "." || e.key === ",") e.preventDefault();
              }}
              isDisabled={isLoading || !enabled}
              size="sm"
              className="w-20"
              aria-label="Max Advance Booking Days"
            />
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={saveMaxDays}
              isDisabled={isLoading || !enabled || !maxDaysDirty}
              isLoading={isLoading}
            >
              Save
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 dark:text-slate-500">
          Clinic online booking is currently:{" "}
          <span
            className={
              clinicOnlineBookingEnabled
                ? "text-green-600 dark:text-green-400 font-medium"
                : "text-amber-600 dark:text-amber-400 font-medium"
            }
          >
            {clinicOnlineBookingEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
      </CardBody>
    </Card>
  );
};

export default DoctorOnlineBookingCard;
