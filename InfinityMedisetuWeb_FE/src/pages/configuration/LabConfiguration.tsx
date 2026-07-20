import React, { useMemo, useEffect, useState } from "react";
import { FiArrowLeft, FiInfo, FiPhone, FiMail, FiMapPin } from "react-icons/fi";
import { MdOutlineBiotech } from "react-icons/md";
import { useNavigate } from "react-router";
import { Input, Spinner, addToast } from "@heroui/react";

import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetLabsByClinicIdQuery, useCreateLabMutation } from "../../redux/api/labApi";
import AppButton from "../../components/shared/AppButton";
import PremiumUpgradeBanner from "../../components/shared/PremiumUpgradeBanner";
import { useIsFreePlan } from "../../hooks/useIsFreePlan";

const LabConfiguration: React.FC = () => {
  const navigate = useNavigate();
  const { isFreePlan } = useIsFreePlan();

  const { data: clinicRes, isLoading: clinicLoading } = useGetAllClinicsQuery(undefined);

  const clinicId = useMemo(() => {
    const d: any = clinicRes;
    return (
      d?.clinic?.id || d?.clinic?._id || d?.result?.clinic?.id || d?.result?.clinic?._id || ""
    ).toString();
  }, [clinicRes]);

  const { data: labsRes, isLoading: labsLoading } = useGetLabsByClinicIdQuery(
    clinicId,
    { skip: !clinicId },
  );

  const labs = useMemo(() => {
    const arr = labsRes ?? [];
    return arr.filter((x: any) => x?.deletedAt == null);
  }, [labsRes]);

  const primaryLabId = useMemo(() => {
    if (labs.length === 0) return null;
    const lab: any = labs[0];
    return (lab?.id || lab?._id || "").toString();
  }, [labs]);

  useEffect(() => {
    if (!clinicLoading && !labsLoading && primaryLabId) {
      navigate(`/configuration/labs/${primaryLabId}`, { replace: true });
    }
  }, [clinicLoading, labsLoading, primaryLabId, navigate]);

  // Get clinic address for auto-fill
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

  // Form state
  const [labName, setLabName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [createLab, { isLoading: isCreating }] = useCreateLabMutation();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!labName.trim()) e.labName = "Lab name is required";
    if (!address.trim()) e.address = "Address is required";
    if (!contactNo.trim()) e.contactNo = "Contact number is required";
    else if (!/^[6-9]\d{9}$/.test(contactNo.trim())) e.contactNo = "Must be 10 digits starting with 6-9";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    setTouched({ labName: true, address: true, contactNo: true, email: true });
    if (!validate()) return;

    try {
      await createLab({
        clinicId,
        labName: labName.trim(),
        address: address.trim(),
        phone: contactNo.trim(),
        email: email.trim().toLowerCase(),
      }).unwrap();
      addToast({ title: "Laboratory Created", description: "Your laboratory has been configured successfully.", color: "success" });
    } catch (err: any) {
      addToast({ title: "Error", description: err?.data?.message || "Failed to create laboratory.", color: "danger" });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
    validate();
  };

  if (clinicLoading || labsLoading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (primaryLabId) {
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
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
            <MdOutlineBiotech className="text-[22px]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-slate-950 dark:text-white sm:text-[26px]">
              Configure Laboratory
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Set up your clinic's laboratory to start managing tests, departments, and pricing.
            </p>
          </div>
        </div>

        <PremiumUpgradeBanner
          featureName="Laboratory"
          description="Upgrade to Premium to set up and manage your laboratory — configure departments, add tests, set pricing, and assign lab staff."
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
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
          <MdOutlineBiotech className="text-[22px]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-slate-950 dark:text-white sm:text-[26px]">
            Configure Laboratory
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            Set up your clinic's laboratory to start managing tests, departments, and pricing.
          </p>
        </div>
      </div>

      {/* Main layout: Form + Tips sidebar */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
          <h2 className="mb-5 text-[15px] font-semibold text-slate-800 dark:text-white">
            Laboratory Details
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Lab Name */}
            <div className="sm:col-span-2">
              <Input
                label="Lab Name"
                placeholder="e.g. Sharma Diagnostics Lab"
                labelPlacement="outside"
                variant="bordered"
                radius="lg"
                value={labName}
                onValueChange={setLabName}
                onBlur={() => handleBlur("labName")}
                isDisabled={isCreating}
                isRequired
                isInvalid={touched.labName && !!errors.labName}
                errorMessage={touched.labName ? errors.labName : undefined}
                description="This will be displayed as your laboratory name across the system"
                startContent={<MdOutlineBiotech className="text-slate-400" />}
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <Input
                label="Address"
                placeholder="e.g. 123 Medical Plaza, Vijay Nagar"
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
                description={clinicAddress ? "Click to auto-fill with your clinic address" : "Full address including street, area, and city"}
                startContent={<FiMapPin className="text-slate-400" />}
              />
            </div>

            {/* Contact Number */}
            <Input
              label="Contact Number"
              placeholder="e.g. 9876543210"
              labelPlacement="outside"
              variant="bordered"
              radius="lg"
              type="tel"
              maxLength={10}
              value={contactNo}
              onValueChange={(v) => setContactNo(v.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => handleBlur("contactNo")}
              isDisabled={isCreating}
              isRequired
              isInvalid={touched.contactNo && !!errors.contactNo}
              errorMessage={touched.contactNo ? errors.contactNo : undefined}
              description="10-digit Indian mobile number"
              startContent={<FiPhone className="text-slate-400" />}
            />

            {/* Email */}
            <Input
              label="Email"
              placeholder="e.g. lab@clinic.com"
              labelPlacement="outside"
              variant="bordered"
              radius="lg"
              type="email"
              value={email}
              onValueChange={setEmail}
              onBlur={() => handleBlur("email")}
              isDisabled={isCreating}
              isRequired
              isInvalid={touched.email && !!errors.email}
              errorMessage={touched.email ? errors.email : undefined}
              description="Used for lab-related communications"
              startContent={<FiMail className="text-slate-400" />}
            />
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
              text={isCreating ? "Creating..." : "Create Laboratory"}
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
              <li>• Each clinic can have one laboratory</li>
              <li>• You can add departments and tests after setup</li>
              <li>• Lab assistants can be assigned once the lab is created</li>
              <li>• Test pricing and categories are managed from the lab detail page</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-[#273244] dark:bg-[#111726]">
            <h3 className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-white">
              What happens next?
            </h3>
            <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              After creating the laboratory, you'll be taken to the lab management page where you can configure departments, add tests, set pricing, and assign lab staff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabConfiguration;
