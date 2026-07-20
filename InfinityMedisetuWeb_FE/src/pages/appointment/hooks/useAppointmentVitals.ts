import { addToast } from "@heroui/react";
import { useEffect, useState } from "react";

import {
  validateVital,
  VITAL_LIMITS,
} from "../helpers/appointmentDetailsPrintHelpers";

export type Vitals = {
  bpSys?: number | null;
  bpDia?: number | null;
  pulse?: number | null;
  spo2?: number | null;
  temperatureC?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
};

const calcBmi = (heightCm?: number | null, weightKg?: number | null) => {
  const h = Number(heightCm ?? 0);
  const w = Number(weightKg ?? 0);
  if (h <= 0 || w <= 0) return null;
  const m = h / 100;
  const bmi = Number((w / (m * m)).toFixed(1));
  return Number.isFinite(bmi) ? bmi : null;
};

type UseAppointmentVitalsArgs = {
  appointmentId?: string;
  appointmentVitals?: Vitals | null;
  updateAppointment: any;
  refetchAppointment: () => any;
};

const useAppointmentVitals = ({
  appointmentId,
  appointmentVitals,
  updateAppointment,
  refetchAppointment,
}: UseAppointmentVitalsArgs) => {
  const [vitals, setVitals] = useState<Vitals>({});

  const [vitalErrors, setVitalErrors] = useState<
    Record<keyof typeof VITAL_LIMITS, string | null>
  >({
    bpSys: null,
    bpDia: null,
    pulse: null,
    spo2: null,
    temperatureC: null,
    heightCm: null,
    weightKg: null,
  });

  const [isSavingVitals, setIsSavingVitals] = useState(false);

  useEffect(() => {
    const bmi = calcBmi(vitals.heightCm, vitals.weightKg);
    if (bmi !== vitals.bmi) {
      setVitals((prev) => ({ ...prev, bmi }));
    }
  }, [vitals.heightCm, vitals.weightKg]);

  const validateAllVitals = (): boolean => {
    const errors: Record<keyof typeof VITAL_LIMITS, string | null> = {
      bpSys: validateVital("bpSys", vitals.bpSys),
      bpDia: validateVital("bpDia", vitals.bpDia),
      pulse: validateVital("pulse", vitals.pulse),
      spo2: validateVital("spo2", vitals.spo2),
      temperatureC: validateVital("temperatureC", vitals.temperatureC),
      heightCm: validateVital("heightCm", vitals.heightCm),
      weightKg: validateVital("weightKg", vitals.weightKg),
    };
    setVitalErrors(errors);
    return !Object.values(errors).some((error) => error !== null);
  };

  const handleVitalChange = (key: keyof typeof VITAL_LIMITS, value: string) => {
    const numValue = value === "" ? null : Number(value);
    setVitals((prev) => ({ ...prev, [key]: numValue }));

    // Validate on change
    const error = validateVital(key, numValue);
    setVitalErrors((prev) => ({ ...prev, [key]: error }));
  };

  const handleAutoFillVitals = () => {
    setVitals({
      bpSys: vitals.bpSys ?? 120,
      bpDia: vitals.bpDia ?? 80,
      pulse: vitals.pulse ?? 78,
      spo2: vitals.spo2 ?? 98,
      temperatureC: vitals.temperatureC ?? 37,
      heightCm: vitals.heightCm,
      weightKg: vitals.weightKg,
    });
    // Clear any validation errors for auto-filled fields
    setVitalErrors({
      bpSys: validateVital("bpSys", 120),
      bpDia: validateVital("bpDia", 80),
      pulse: validateVital("pulse", 78),
      spo2: validateVital("spo2", 98),
      temperatureC: validateVital("temperatureC", 37),
      heightCm: validateVital("heightCm", vitals.heightCm),
      weightKg: validateVital("weightKg", vitals.weightKg),
    });
  };

  const handleSaveVitals = async () => {
    if (!appointmentId) return;

    // Validate all vitals before saving
    if (!validateAllVitals()) {
      addToast({
        title: "Validation Error",
        description: "Please check the vitals values and try again.",
        color: "danger",
        variant: "flat",
      });
      return;
    }

    try {
      setIsSavingVitals(true);
      await updateAppointment({
        appointmentId,
        data: {
          vitals: {
            ...vitals,
            bmi: calcBmi(vitals.heightCm, vitals.weightKg),
          },
        },
      }).unwrap();

      addToast({
        title: "Vitals updated",
        description: "Patient vitals have been saved successfully",
        color: "success",
        variant: "flat",
      });

      refetchAppointment();
    } catch (e: any) {
      addToast({
        title: "Failed to update vitals",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsSavingVitals(false);
    }
  };

  // Load existing vitals when appointment data is available
  useEffect(() => {
    if (appointmentVitals) {
      setVitals(appointmentVitals);
    }
  }, [appointmentVitals]);

  return {
    vitals,
    vitalErrors,
    isSavingVitals,
    handleAutoFillVitals,
    handleVitalChange,
    handleSaveVitals,
  };
};

export default useAppointmentVitals;
