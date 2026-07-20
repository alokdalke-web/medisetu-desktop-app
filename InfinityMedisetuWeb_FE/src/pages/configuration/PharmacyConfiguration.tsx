import React, { useMemo, useEffect, useState } from "react";
import { FiArrowLeft, FiInfo, FiPhone, FiMapPin } from "react-icons/fi";
import { MdLocalPharmacy } from "react-icons/md";
import { useNavigate } from "react-router";
import { Input, Spinner, addToast } from "@heroui/react";

import { useGetPharmaciesQuery, useCreatePharmacyMutation } from "../../redux/api/pharmacyApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import AppButton from "../../components/shared/AppButton";
import PremiumUpgradeBanner from "../../components/shared/PremiumUpgradeBanner";
import { useIsFreePlan } from "../../hooks/useIsFreePlan";

const PharmacyConfiguration: React.FC = () => {
  const navigate = useNavigate();
  const { isFreePlan } = useIsFreePlan();

  const { data: pharmacyRes, isLoading: pharmacyLoading } = useGetPharmaciesQuery({
    page: 1,
    pageSize: 50,
  });

  const pharmacies = useMemo(() => pharmacyRes?.pharmacies ?? [], [pharmacyRes]);

  // Get clinic address for auto-fill
  const { data: clinicRes } = useGetAllClinicsQuery(undefined);
  const clinicAddress = useMemo(() => {
    const d: any = clinicRes;
    const clinic = d?.clinic;
    if (!clinic) return "";
    const parts = [
      clinic.clinicAddress,
      clinic.City,
      clinic.State,
      clinic.ZipCode ? `- ${clinic.ZipCode}` : "",
    ].filter((p) => p && String(p).trim());
    return parts.join(", ");
  }, [clinicRes]);

  const primaryPharmacyId = useMemo(() => {
    if (pharmacies.length === 0) return null;
    return pharmacies[0]?.id ?? null;
  }, [pharmacies]);

  useEffect(() => {
    if (!pharmacyLoading && primaryPharmacyId) {
      navigate(`/configuration/pharmacy/${primaryPharmacyId}`, { replace: true });
    }
  }, [pharmacyLoading, primaryPharmacyId, navigate]);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [createPharmacy, { isLoading: isCreating }] = useCreatePharmacyMutation();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Pharmacy name is required";
    if (!address.trim()) e.address = "Address is required";
    if (!contactNumber.trim()) e.contactNumber = "Contact number is required";
    else if (!/^[6-9]\d{9}$/.test(contactNumber.trim())) e.contactNumber = "Must be 10 digits starting with 6-9";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    setTouched({ name: true, address: true, contactNumber: true });
    if (!validate()) return;

    try {
      await createPharmacy({
        name: name.trim(),
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      }).unwrap();
      addToast({ title: "Pharmacy Created", description: "Your pharmacy has been configured successfully.", color: "success" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.data?.message || "Failed to create pharmacy.", color: "danger" });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
    validate();
  };

  if (pharmacyLoading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (primaryPharmacyId) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  // Free plan — show only upgrade banner, no data or forms
  if (isFreePlan) {
    return (
      <div className="mx-auto w-full space-y-5">
        <button
          type="button"
          onClick={() => navigate("/configuration")}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FiArrowLeft className="text-[13px]" />
          Back to Configuration
        </button>

        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <MdLocalPharmacy className="text-[22px]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-slate-950 dark:text-white sm:text-[26px]">
              Configure Pharmacy
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Set up your clinic's pharmacy to start managing medicines, categories, and suppliers.
            </p>
          </div>
        </div>

        <PremiumUpgradeBanner
          featureName="Pharmacy"
          description="Upgrade to Premium to set up and manage your pharmacy — add medicines, track inventory, manage suppliers, and process sales."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-5">
      <button
        type="button"
        onClick={() => navigate("/configuration")}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <FiArrowLeft className="text-[13px]" />
        Back to Configuration
      </button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
          <MdLocalPharmacy className="text-[22px]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-slate-950 dark:text-white sm:text-[26px]">
            Configure Pharmacy
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            Set up your clinic's pharmacy to start managing medicines, categories, and suppliers.
          </p>
        </div>
      </div>

      {/* Main layout: Form + Tips sidebar */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
          <h2 className="mb-5 text-[15px] font-semibold text-slate-800 dark:text-white">
            Pharmacy Details
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Pharmacy Name */}
            <div className="sm:col-span-2">
              <Input
                label="Pharmacy Name"
                placeholder="e.g. MediCare Pharmacy"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={name}
                onValueChange={setName}
                onBlur={() => handleBlur("name")}
                isDisabled={isCreating}
                isRequired
                isInvalid={touched.name && !!errors.name}
                errorMessage={touched.name ? errors.name : undefined}
                description="This will be displayed as your pharmacy name across the system"
                startContent={<MdLocalPharmacy className="text-slate-400" />}
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <Input
                label="Address"
                placeholder="e.g. Ground Floor, Medical Complex, Main Road"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={address}
                onValueChange={setAddress}
                onFocus={() => {
                  if (!address.trim() && clinicAddress) {
                    setAddress(clinicAddress);
                  }
                }}
                onBlur={() => handleBlur("address")}
                isDisabled={isCreating}
                isRequired
                isInvalid={touched.address && !!errors.address}
                errorMessage={touched.address ? errors.address : undefined}
                description={clinicAddress ? "Click to auto-fill with your clinic address" : "Full address including building, street, and area"}
                startContent={<FiMapPin className="text-slate-400" />}
              />
            </div>

            {/* Contact Number */}
            <div className="sm:col-span-2 sm:max-w-[50%]">
              <Input
                label="Contact Number"
                placeholder="e.g. 9876543210"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                type="tel"
                maxLength={10}
                value={contactNumber}
                onValueChange={(v) => setContactNumber(v.replace(/\D/g, "").slice(0, 10))}
                onBlur={() => handleBlur("contactNumber")}
                isDisabled={isCreating}
                isRequired
                isInvalid={touched.contactNumber && !!errors.contactNumber}
                errorMessage={touched.contactNumber ? errors.contactNumber : undefined}
                description="10-digit Indian mobile number"
                startContent={<FiPhone className="text-slate-400" />}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-[#273244]">
            <AppButton
              text="Cancel"
              buttonVariant="outlined"
              onPress={() => navigate("/configuration")}
              isDisabled={isCreating}
            />
            <AppButton
              text={isCreating ? "Creating..." : "Create Pharmacy"}
              buttonVariant="primary"
              onPress={handleCreate}
              isDisabled={isCreating}
            />
          </div>
        </div>

        {/* Tips Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-[#273244] dark:bg-[#0f1728]">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-white">
              <FiInfo className="text-primary" />
              <span>Quick Tips</span>
            </div>
            <ul className="space-y-2 text-[12px] text-slate-600 dark:text-slate-400">
              <li>• Each clinic can have one pharmacy</li>
              <li>• You can add staff members after setup</li>
              <li>• Medicines and categories are managed from the pharmacy detail page</li>
              <li>• Inventory tracking can be enabled after configuration</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#273244] dark:bg-[#111726]">
            <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-white">
              What happens next?
            </h3>
            <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              After creating the pharmacy, you'll be taken to the management page where you can add staff members, configure medicines, set up categories, and manage suppliers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyConfiguration;
