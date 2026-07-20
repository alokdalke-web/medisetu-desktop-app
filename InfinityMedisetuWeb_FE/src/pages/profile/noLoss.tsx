import React, { useState, useEffect, useRef } from "react";
import { Card, CardBody, addToast } from "@heroui/react";
import { FiShield, FiShieldOff } from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { useSetNoLossSettingMutation } from "../../redux/api/pharmaciesApi";
import { useEffectiveUserType } from "../../hooks/useEffectiveUserType";
import { useGetUserQuery } from "../../redux/api/authApi";

const NoLoss: React.FC = () => {
  const [isNoLossEnabled, setIsNoLossEnabled] = useState(false);
  const hasFetched = useRef(false);
  
  const { data: userData, refetch } = useGetUserQuery();
  const user = (userData as any)?.user ?? userData;

  const [setNoLossSetting, { isLoading }] = useSetNoLossSettingMutation();

  const currentNoLossSetting = String(user?.pharmacyDetails?.noLoss ?? "false") === "true";

  useEffect(() => {
    if (user && !hasFetched.current) {
      setIsNoLossEnabled(currentNoLossSetting);
      hasFetched.current = true;
    }
  }, [user, currentNoLossSetting]);

  const effectiveUserType = useEffectiveUserType();
  const normalized = String(effectiveUserType ?? "").toLowerCase();
  const isPharmacist = normalized.includes("pharmacist");

  if (!isPharmacist) {
    return (
      <Card className="shadow-none rounded-2xl overflow-hidden">
        <CardBody className="p-10 text-center text-red-600 min-h-[300px] flex items-center justify-center">
          <p className="text-lg">You do not have permission to view this page.</p>
        </CardBody>
      </Card>
    );
  }

  const handleToggle = async () => {
    try {
      const res = await setNoLossSetting({ noLoss: !isNoLossEnabled }).unwrap();
      // Optimistic update
      setIsNoLossEnabled(!isNoLossEnabled);
      // Refresh user data so UI reflects authoritative value
      try {
        await refetch();
      } catch (_) {
        // ignore refetch errors
      }
      addToast({
        title: "Updated",
        description: res?.message || `No-loss protection ${!isNoLossEnabled ? 'enabled' : 'disabled'} successfully`,
        color: "success",
        variant: "flat",
      });
    } catch (err: any) {
      addToast({
        title: "Failed to update",
        description: err?.data?.message || err?.message || "Failed to update no-loss setting",
        color: "danger",
        variant: "flat",
      });
    }
  };

  return (
    <Card className="shadow-none rounded-2xl overflow-hidden dark:bg-[#111726]">
      <ProfilePageHeader
        icon={<FiShield className="h-4 w-4" />}
        title="No-Loss Protection Settings"
        description="Control whether the system prevents loss-making transactions during billing."
      />

      <CardBody className="p-5 sm:p-6 flex flex-col min-h-[400px] [&_.text-slate-800]:dark:text-white [&_.text-slate-500]:dark:text-slate-400">
        {/* Main Settings Card */}
        <div className="mb-8 mx-auto w-full">
          <div className="bg-default-50 rounded-xl p-6 border border-default-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div className={`p-3 rounded-xl ${isNoLossEnabled ? 'bg-primary/15' : 'bg-amber-100'}`}>
                  {isNoLossEnabled ? (
                    <FiShield className="w-6 h-6 text-primary" />
                  ) : (
                    <FiShieldOff className="w-6 h-6 text-amber-700" />
                  )}
                </div>
                
                {/* Status Text */}
                <div>
                  <p className="font-semibold text-slate-800 text-base">
                    {isNoLossEnabled ? 'Protection Active' : 'Protection Inactive'}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {isNoLossEnabled 
                      ? 'Cannot sell below cost price' 
                      : 'Can sell below cost price (loss allowed)'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3 ml-auto">
                <span
                  className={`text-sm font-medium ${
                    isNoLossEnabled ? "text-primary" : "text-amber-600"
                  }`}
                >
                  {isNoLossEnabled ? "Enabled" : "Disabled"}
                </span>
                
                <button
                  onClick={handleToggle}
                  disabled={isLoading}
                  className={`
                    relative inline-flex h-7 w-12 items-center rounded-full 
                    transition-colors duration-300 ease-in-out focus:outline-none
                    ${isNoLossEnabled ? "bg-primary/100" : "bg-amber-500"}
                    ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white 
                      shadow transition-transform duration-300 ease-in-out
                      ${isNoLossEnabled ? "translate-x-6" : "translate-x-1"}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="mt-4 pt-4 border-t border-default-200">
              {isNoLossEnabled ? (
                <div className="space-y-2">
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="font-semibold">✓ Protection Active:</span>
                    <span>System will block any transaction where selling price is below cost price</span>
                  </p>
                  <p className="text-xs text-slate-500 ml-4">
                    • Discounts cannot reduce price below cost<br />
                    • Loss-making sales are prevented<br />
                    • Business profitability is protected
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <span className="font-semibold">⚠ Protection Inactive:</span>
                    <span>System allows transactions even if selling price is below cost price</span>
                  </p>
                  <p className="text-xs text-slate-500 ml-4">
                    • Discounts can make price go below cost<br />
                    • Loss-making sales are permitted<br />
                    • Use with caution - may affect profitability
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default NoLoss;