/**
 * OnlineBookingSettingsCard.tsx
 *
 * Clinic-level "Online Appointment Booking" toggle + payment-option toggles.
 * Admin-only. Auto-saves each switch individually, matching RunningLateThresholdCard.tsx.
 */

import React, { useEffect, useState } from "react";
import { Card, CardBody, Switch, addToast } from "@heroui/react";
import { FiCalendar } from "react-icons/fi";
import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
  useGetAllClinicsQuery,
} from "../../redux/api/clinicApi";
import type { ClinicOnlineBookingSettings } from "../../types/clinicOnlineBooking";

const DEFAULTS: ClinicOnlineBookingSettings = {
  onlineBookingEnabled: true,
  payOnlineEnabled: false,
  payAtClinicEnabled: false,
  showClinicNumberPublicly: true,
};

const OnlineBookingSettingsCard: React.FC = () => {
  const { data: settingsData } = useGetClinicSettingsQuery();
  const { data: clinicData } = useGetAllClinicsQuery();
  const [upsertSettings, { isLoading: isSaving }] =
    useUpsertClinicSettingsMutation();

  const [settings, setSettings] =
    useState<ClinicOnlineBookingSettings>(DEFAULTS);

  useEffect(() => {
    if (settingsData?.success && settingsData.result) {
      const s = settingsData.result?.settings ?? {};
      setSettings({
        onlineBookingEnabled: s.onlineBookingEnabled ?? DEFAULTS.onlineBookingEnabled,
        payOnlineEnabled: s.payOnlineEnabled ?? DEFAULTS.payOnlineEnabled,
        payAtClinicEnabled: s.payAtClinicEnabled ?? DEFAULTS.payAtClinicEnabled,
        showClinicNumberPublicly:
          s.showClinicNumberPublicly ?? DEFAULTS.showClinicNumberPublicly,
      });
    }
  }, [settingsData]);

  const handleToggle = async (
    key: keyof ClinicOnlineBookingSettings,
    value: boolean
  ) => {
    if (key === "payOnlineEnabled" && value) {
      const routeStatus = clinicData?.clinic?.routeStatus;
      if (routeStatus !== "ACTIVE") {
        addToast({
          title: "Razorpay Not Linked",
          description: "To enable online payments, ensure your Razorpay account is linked and active. Check 'Razorpay Account Linking' section below.",
          color: "warning",
        });
        return;
      }
    }

    const previous = settings;

    setSettings((prev) => ({ ...prev, [key]: value }));

    try {
      await upsertSettings({ settings: { [key]: value } }).unwrap();
      addToast({
        title: "Saved",
        description: "Online booking settings updated.",
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to update online booking settings.",
        color: "danger",
      });
      setSettings(previous);
    }
  };

  const payOptionsDisabled = !settings.onlineBookingEnabled || isSaving;

  return (
    <Card className="border border-slate-200 bg-white shadow-none rounded-[16px] dark:border-[#273244] dark:bg-[#111726]">
      <CardBody className="p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#0D9488] text-[#0D9488] shrink-0">
            <FiCalendar size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight dark:text-white">
              Online Appointment Booking
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug dark:text-slate-400">
              Let patients book appointments with your doctors online
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-[#273244]">
          <div className="min-w-0 pr-3">
            <p className="text-[13px] font-medium text-slate-800 dark:text-white">
              Enable Online Booking
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
              Allow patients to book appointments for this clinic online
            </p>
          </div>
          <Switch
            isSelected={settings.onlineBookingEnabled}
            onValueChange={(val) => handleToggle("onlineBookingEnabled", val)}
            isDisabled={isSaving}
            size="sm"
            aria-label="Enable Online Booking"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-[#273244]">
          <div className="min-w-0 pr-3">
            <p className="text-[13px] font-medium text-slate-800 dark:text-white">
              Show Clinic Number Publicly
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
              Display the clinic's phone number to patients on the app and public booking page
            </p>
          </div>
          <Switch
            isSelected={settings.showClinicNumberPublicly}
            onValueChange={(val) => handleToggle("showClinicNumberPublicly", val)}
            isDisabled={isSaving}
            size="sm"
            aria-label="Show Clinic Number Publicly"
          />
        </div>

        <div className={payOptionsDisabled ? "opacity-50 pointer-events-none" : ""}>
          <p className="text-[12px] font-semibold text-slate-800 mt-4 mb-1 dark:text-slate-200">
            Payment Options
          </p>

          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-[#273244]">
            <div className="min-w-0 pr-3">
              <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                Accept Pay Online (Razorpay)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
                Patients can pay by card/UPI at the time of booking
              </p>
            </div>
            <Switch
              isSelected={settings.payOnlineEnabled}
              onValueChange={(val) => handleToggle("payOnlineEnabled", val)}
              isDisabled={payOptionsDisabled}
              size="sm"
              aria-label="Accept Pay Online"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="min-w-0 pr-3">
              <p className="text-[13px] font-medium text-slate-800 dark:text-white">
                Accept Pay at Clinic
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
                Patients can reserve a slot and pay when they arrive
              </p>
            </div>
            <Switch
              isSelected={settings.payAtClinicEnabled}
              onValueChange={(val) => handleToggle("payAtClinicEnabled", val)}
              isDisabled={payOptionsDisabled}
              size="sm"
              aria-label="Accept Pay at Clinic"
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default OnlineBookingSettingsCard;
