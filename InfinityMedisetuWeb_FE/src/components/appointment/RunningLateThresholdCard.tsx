/**
 * RunningLateThresholdCard.tsx
 *
 * A card component for configuring the "running late" notification threshold.
 * Patients are notified when the doctor is running late beyond this many minutes.
 * Designed to match the ClinicSettings right-column card style.
 */

import React, { useEffect, useState } from "react";
import { Card, CardBody, Slider, addToast } from "@heroui/react";
import { FiClock } from "react-icons/fi";
import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
} from "../../redux/api/clinicApi";

const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 60;
const DEFAULT_THRESHOLD = 10;

const RunningLateThresholdCard: React.FC = () => {
  const { data: settingsData } = useGetClinicSettingsQuery();
  const [upsertSettings, { isLoading: isSaving }] =
    useUpsertClinicSettingsMutation();

  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [initialThreshold, setInitialThreshold] = useState<number>(DEFAULT_THRESHOLD);

  // Load current threshold from settings
  useEffect(() => {
    if (settingsData?.success && settingsData.result) {
      const savedThreshold =
        settingsData.result?.settings?.runningLateThresholdMinutes ??
        DEFAULT_THRESHOLD;
      setThreshold(savedThreshold);
      setInitialThreshold(savedThreshold);
    }
  }, [settingsData]);

  const handleChange = (val: number | number[]) => {
    const newVal = Array.isArray(val) ? val[0] : val;
    setThreshold(newVal);
  };

  const handleChangeEnd = async (val: number | number[]) => {
    const newVal = Array.isArray(val) ? val[0] : val;
    if (newVal === initialThreshold) return;

    try {
      await upsertSettings({
        settings: {
          runningLateThresholdMinutes: newVal,
        },
      }).unwrap();

      setInitialThreshold(newVal);

      addToast({
        title: "Saved",
        description: `Patients will be notified when doctor is ${newVal}+ min late.`,
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to update running late threshold.",
        color: "danger",
      });
      // Revert on failure
      setThreshold(initialThreshold);
    }
  };

  return (
    <Card className="border border-[#E2E8F0] bg-white shadow-none rounded-[16px]">
      <CardBody className="p-5">
        {/* Header with icon */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-[#0D9488] text-[#0D9488] shrink-0">
            <FiClock size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-[#1E293B] leading-tight">
              Running Late Notification
            </h3>
            <p className="text-[11px] text-[#64748B] mt-1 leading-snug">
              Notify patients when doctor is running late by more than this many minutes
            </p>
          </div>
        </div>

        {/* Slider */}
        <div className="mt-2 mb-1">
          <Slider
            aria-label="Running late threshold minutes"
            step={5}
            minValue={MIN_THRESHOLD}
            maxValue={MAX_THRESHOLD}
            value={threshold}
            onChange={handleChange}
            onChangeEnd={handleChangeEnd}
            className="w-full"
            size="sm"
            color="primary"
            marks={[
              { value: 5, label: "5" },
              { value: 15, label: "15" },
              { value: 30, label: "30" },
              { value: 45, label: "45" },
              { value: 60, label: "60" },
            ]}
            isDisabled={isSaving}
          />
        </div>

        {/* Threshold label */}
        <p className="text-[12px] font-medium text-[#64748B] text-center mt-2">
          Threshold:{" "}
          <span className="font-bold text-[#0D9488]">
            {threshold} minutes
          </span>
        </p>
      </CardBody>
    </Card>
  );
};

export default RunningLateThresholdCard;
