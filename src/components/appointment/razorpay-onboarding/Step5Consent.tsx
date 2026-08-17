import React, { useEffect, useState } from "react";
import type { Control } from "react-hook-form";
import CheckBox from "../../shared/CheckBox";
import type { OnboardRouteFormValues } from "../../../schemas/razorpayOnboarding";

interface Step5ConsentProps {
  control: Control<OnboardRouteFormValues>;
}

const Step5Consent: React.FC<Step5ConsentProps> = ({ control }) => {
  const [ipAddress, setIpAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.ipify.org?format=json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ip?: string } | null) => {
        if (!cancelled && data?.ip) setIpAddress(data.ip);
      })
      .catch(() => {
        // Best-effort only — consent isn't blocked if the lookup fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-[#273244] bg-slate-50 dark:bg-[#0f1728] p-4">
        <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
          I agree to the Razorpay Route Services terms and conditions and
          authorize the platform to route patient booking settlements to my
          linked bank account.
        </p>
      </div>

      <CheckBox
        name="tncAccepted"
        control={control}
        label="I agree to the terms and conditions above"
      />

      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        Consent will be recorded from IP address:{" "}
        {ipAddress ?? "resolving…"}
      </p>
    </div>
  );
};

export default Step5Consent;
