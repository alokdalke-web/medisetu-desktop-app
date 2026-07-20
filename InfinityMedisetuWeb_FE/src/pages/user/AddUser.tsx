// src/pages/user/AddUser.tsx
import React, { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { addToast, Input, Select, SelectItem } from "@heroui/react";
import { FiChevronRight, FiInfo } from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router";

import { useAddUserMutation } from "../../redux/api/authApi";
import type { AddUserDto } from "../../schemas/auth";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import AppButton from "../../components/shared/AppButton";
import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
import { useGetLabsByClinicIdQuery } from "../../redux/api/labApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetPharmaciesQuery } from "../../redux/api/pharmacyApi";
import { useFeatureGate } from "../../hooks/useFeatureGate";

// Only these user types can be added via the adduser endpoint
const ALLOWED_USER_TYPES = [
  { key: "Doctor", label: "Doctor" },
  { key: "Receptionist", label: "Receptionist" },
  { key: "Pharmacist", label: "Pharmacist" },
  { key: "Lab_Assistant", label: "Lab Assistant" },
] as const;

type AddableUserType =
  | "Doctor"
  | "Receptionist"
  | "Nurse"
  | "Pharmacist"
  | "Lab_Assistant"
  | "Radiologist";

const VALID_USER_TYPES: AddableUserType[] = [
  "Doctor", "Receptionist", "Nurse", "Pharmacist", "Lab_Assistant", "Radiologist",
];

type AddUserFormValues = {
  name: string;
  email: string;
  mobile: string;
  userType: AddableUserType;
  speciality: string;
  registrationNumber: string;
  labId: string;
  pharmacyId: string;
};

const capitalizeWords = (value: string) =>
  value.replace(
    /[A-Za-z]+/g,
    (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
  );

const AddUser: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [addUser, { isLoading }] = useAddUserMutation();

  // Pre-select user type from URL query param: /user/new?type=Receptionist
  const typeParam = searchParams.get("type") as AddableUserType | null;
  const labIdParam = searchParams.get("labId");
  const pharmacyIdParam = searchParams.get("pharmacyId");
  const defaultUserType: AddableUserType =
    typeParam && VALID_USER_TYPES.includes(typeParam) ? typeParam : "Doctor";

  const { control, handleSubmit, reset, formState, setValue } =
    useForm<AddUserFormValues>({
      defaultValues: {
        name: "",
        email: "",
        mobile: "",
        userType: defaultUserType,
        speciality: "",
        registrationNumber: "",
        labId: labIdParam || "",
        pharmacyId: pharmacyIdParam || "",
      },
      mode: "onTouched",
    });

  const selectedUserType = useWatch({ control, name: "userType" });

  // Feature gate info for the sidebar
  const { currentUsage: doctorUsage, totalLimit: doctorLimit, status: doctorLimitStatus } = useFeatureGate("doctor_accounts");
  const { currentUsage: staffUsage, totalLimit: staffLimit, status: staffLimitStatus } = useFeatureGate("staff_accounts");
  const { status: labFeatureStatus } = useFeatureGate("lab_integration");
  const { status: pharmacyFeatureStatus } = useFeatureGate("pharmacy_integration");

  // Determine which user types should be disabled in the dropdown
  const disabledUserTypes = useMemo(() => {
    const disabled: string[] = [];
    if (doctorLimitStatus === "limit_reached") disabled.push("Doctor");
    if (staffLimitStatus === "limit_reached") {
      disabled.push("Receptionist", "Nurse", "Pharmacist", "Lab_Assistant", "Radiologist");
    } else {
      // Even if staff limit not reached, disable if feature not available
      if (labFeatureStatus !== "enabled") disabled.push("Lab_Assistant");
      if (pharmacyFeatureStatus !== "enabled") disabled.push("Pharmacist");
    }
    return disabled;
  }, [doctorLimitStatus, staffLimitStatus, labFeatureStatus, pharmacyFeatureStatus]);

  // Get clinic ID for fetching labs/pharmacies
  const { data: clinicRes } = useGetAllClinicsQuery();
  const clinicId = useMemo(() => {
    const d: any = clinicRes;
    return (
      d?.clinic?.id ||
      d?.clinic?._id ||
      d?.result?.clinic?.id ||
      d?.result?.clinic?._id ||
      ""
    ).toString();
  }, [clinicRes]);

  // Fetch labs for Lab_Assistant selection
  const { data: labsData } = useGetLabsByClinicIdQuery(clinicId, {
    skip: !clinicId || selectedUserType !== "Lab_Assistant",
  });

  const labs = useMemo(() => {
    const arr = labsData ?? [];
    return arr.filter((x: any) => x?.deletedAt == null).map((x: any) => ({
      id: (x.id || x._id || "") as string,
      name: x.name || "Unknown Lab",
    }));
  }, [labsData]);

  // Fetch pharmacies for Pharmacist selection
  const { data: pharmacyData } = useGetPharmaciesQuery(
    { page: 1, pageSize: 50 },
    { skip: selectedUserType !== "Pharmacist" },
  );

  const pharmacies = useMemo(() => {
    const list = pharmacyData?.pharmacies ?? [];
    return list.map((p) => ({
      id: p.id,
      name: p.name || "Unknown Pharmacy",
    }));
  }, [pharmacyData]);

  const isDoctor = selectedUserType === "Doctor";
  const isPharmacist = selectedUserType === "Pharmacist";
  const isLabAssistant = selectedUserType === "Lab_Assistant";

  // Auto-select lab if there's only one
  useEffect(() => {
    if (isLabAssistant && labs.length === 1) {
      setValue("labId", labs[0].id);
    }
  }, [isLabAssistant, labs, setValue]);

  // Auto-select pharmacy if there's only one
  useEffect(() => {
    if (isPharmacist && pharmacies.length === 1) {
      setValue("pharmacyId", pharmacies[0].id);
    }
  }, [isPharmacist, pharmacies, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload: AddUserDto = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        userType: data.userType,
        ...(data.mobile.trim() && { mobile: data.mobile.trim() }),
        ...(isDoctor && data.speciality.trim() && { speciality: data.speciality.trim() }),
        ...(isDoctor && data.registrationNumber.trim() && {
          registrationNumber: data.registrationNumber.trim(),
        }),
        ...(isLabAssistant && { labId: data.labId }),
        ...(isPharmacist && { pharmacyId: data.pharmacyId }),
      };

      await addUser(payload).unwrap();

      addToast({
        title: "Success",
        description: "User created successfully",
        color: "success",
      });

      reset();
      navigate("/users");
    } catch (err: any) {
      const status = err?.status;
      const msg =
        err?.data?.message ||
        err?.error ||
        "Something went wrong. Please try again.";

      if (status === 403) {
        if (msg.includes("limit reached")) {
          addToast({ title: "Limit Reached", description: msg, color: "warning" });
        } else if (msg.includes("does not support")) {
          addToast({ title: "Feature Not Available", description: msg, color: "warning" });
        } else {
          addToast({ title: "Error", description: msg, color: "danger" });
        }
      } else {
        addToast({ title: "Error", description: msg, color: "danger" });
      }
    }
  });

  return (
    <div className="p-4 sm:p-6">
      {/* Breadcrumb navigation — same pattern as AppointmentDetails */}
      <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
        <Link
          to="/users"
          className="hover:text-slate-900 hover:underline underline-offset-4"
        >
          Users
        </Link>

        <FiChevronRight className="opacity-60" />

        <span className="font-semibold text-primary">
          Add User
        </span>
      </div>

      {/* Main layout: form + sidebar info */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Form card */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2 className="mb-5 text-[16px] font-semibold text-slate-800">
            User Details
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* User Type */}
            <Controller
              name="userType"
              control={control}
              rules={{ required: "User type is required" }}
              render={({ field, fieldState }) => (
                <Select
                  label="User Type"
                  placeholder="Select user type"
                  labelPlacement="outside"
                  variant="bordered"
                  radius="full"
                  isRequired
                  selectedKeys={new Set([field.value])}
                  disabledKeys={disabledUserTypes}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    if (selected) field.onChange(selected);
                  }}
                  onBlur={field.onBlur}
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                  description={disabledUserTypes.length > 0 ? "Some types are disabled due to plan limits" : undefined}
                  className="w-full"
                >
                  {ALLOWED_USER_TYPES.map((type) => (
                    <SelectItem key={type.key} textValue={type.label}>
                      {type.label}
                      {disabledUserTypes.includes(type.key) ? " (Limit reached)" : ""}
                    </SelectItem>
                  ))}
                </Select>
              )}
            />

            {/* Name */}
            <Controller
              name="name"
              control={control}
              rules={{
                required: "Name is required",
                validate: (value) => value.trim() ? true : "Name is required",
              }}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Name"
                  placeholder="Full name"
                  labelPlacement="outside"
                  variant="bordered"
                  radius="full"
                  isRequired
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(capitalizeWords(e.target.value))}
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                  className="w-full"
                />
              )}
            />

            {/* Email */}
            <Controller
              name="email"
              control={control}
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/,
                  message: "Please enter a valid email address",
                },
              }}
              render={({ field, fieldState }) => (
                <Input
                  label="Email"
                  placeholder="name@example.com"
                  type="email"
                  inputMode="email"
                  labelPlacement="outside"
                  variant="bordered"
                  radius="full"
                  isRequired
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  onBlur={field.onBlur}
                  name={field.name}
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                  className="w-full"
                />
              )}
            />

            {/* Mobile */}
            <Controller
              name="mobile"
              control={control}
              rules={{
                ...(isDoctor
                  ? {
                      required: "Mobile number is required",
                      pattern: { value: /^[6-9]\d{9}$/, message: "Mobile number must be 10 digits" },
                    }
                  : {
                      pattern: { value: /^[6-9]\d{9}$/, message: "Mobile number must be 10 digits" },
                    }),
              }}
              render={({ field, fieldState }) => (
                <Input
                  label="Mobile Number"
                  placeholder="Enter mobile number"
                  labelPlacement="outside"
                  variant="bordered"
                  radius="full"
                  type="tel"
                  inputMode="numeric"
                  isRequired={isDoctor}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    field.onChange(value);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  isInvalid={!!fieldState.error}
                  errorMessage={fieldState.error?.message}
                  className="w-full"
                />
              )}
            />

            {/* Doctor: Speciality */}
            {isDoctor && (
              <Controller
                name="speciality"
                control={control}
                rules={{
                  required: "Doctor speciality is required",
                  validate: (value) => value.trim() ? true : "Doctor speciality is required",
                }}
                render={({ field, fieldState }) => {
                  const selectedSpeciality = DOCTOR_SPECIALITIES.includes(field.value)
                    ? field.value
                    : null;
                  return (
                    <Autocomplete
                      label="Doctor Speciality"
                      placeholder="Type or select speciality"
                      inputValue={field.value ?? ""}
                      selectedKey={selectedSpeciality}
                      onInputChange={field.onChange}
                      onSelectionChange={(key) => field.onChange(key ? String(key) : "")}
                      onBlur={field.onBlur}
                      variant="bordered"
                      radius="full"
                      labelPlacement="outside"
                      allowsCustomValue
                      isRequired
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      className="w-full"
                    >
                      {[...DOCTOR_SPECIALITIES]
                        .sort((a, b) => a.localeCompare(b))
                        .map((spec) => (
                          <AutocompleteItem key={spec}>{spec}</AutocompleteItem>
                        ))}
                    </Autocomplete>
                  );
                }}
              />
            )}

            {/* Doctor: Registration Number */}
            {isDoctor && (
              <Controller
                name="registrationNumber"
                control={control}
                rules={{
                  required: "Registration number is required",
                  validate: (value) => value.trim() ? true : "Registration number is required",
                }}
                render={({ field, fieldState }) => (
                  <Input
                    {...field}
                    label="Registration Number"
                    placeholder="Enter registration number"
                    labelPlacement="outside"
                    variant="bordered"
                    radius="full"
                    isRequired
                    isInvalid={!!fieldState.error}
                    errorMessage={fieldState.error?.message}
                    className="w-full"
                  />
                )}
              />
            )}

            {/* Lab_Assistant: Lab selection */}
            {isLabAssistant && (
              <Controller
                name="labId"
                control={control}
                rules={{ required: "Please select a lab" }}
                render={({ field, fieldState }) => (
                  <Select
                    label="Assign to Lab"
                    placeholder="Select a lab"
                    labelPlacement="outside"
                    variant="bordered"
                    radius="full"
                    isRequired
                    selectedKeys={field.value ? new Set([field.value]) : new Set()}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) field.onChange(selected);
                    }}
                    onBlur={field.onBlur}
                    isInvalid={!!fieldState.error}
                    errorMessage={fieldState.error?.message}
                    className="w-full"
                  >
                    {labs.map((lab) => (
                      <SelectItem key={lab.id} textValue={lab.name}>{lab.name}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            )}

            {/* Pharmacist: Pharmacy selection */}
            {isPharmacist && (
              <Controller
                name="pharmacyId"
                control={control}
                rules={{ required: "Please select a pharmacy" }}
                render={({ field, fieldState }) => (
                  <Select
                    label="Assign to Pharmacy"
                    placeholder="Select a pharmacy"
                    labelPlacement="outside"
                    variant="bordered"
                    radius="full"
                    isRequired
                    selectedKeys={field.value ? new Set([field.value]) : new Set()}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) field.onChange(selected);
                    }}
                    onBlur={field.onBlur}
                    isInvalid={!!fieldState.error}
                    errorMessage={fieldState.error?.message}
                    className="w-full"
                  >
                    {pharmacies.map((p) => (
                      <SelectItem key={p.id} textValue={p.name}>{p.name}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <AppButton
              text="Cancel"
              buttonVariant="outlined"
              onPress={() => navigate("/users")}
              isDisabled={isLoading || formState.isSubmitting}
            />
            <AppButton
              type="submit"
              text={isLoading || formState.isSubmitting ? "Saving..." : "Save User"}
              isDisabled={isLoading || formState.isSubmitting}
            />
          </div>
        </form>

        {/* Sidebar — usage info + tips */}
        <div className="space-y-4">
          {/* Usage card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-[14px] font-semibold text-slate-800">
              Account Usage
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Doctors</span>
                <span className="font-semibold text-slate-800">
                  {doctorUsage} / {doctorLimit ?? "∞"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${doctorLimit ? Math.min(100, (doctorUsage / doctorLimit) * 100) : 0}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Staff Members</span>
                <span className="font-semibold text-slate-800">
                  {staffUsage} / {staffLimit ?? "∞"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${staffLimit ? Math.min(100, (staffUsage / staffLimit) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <FiInfo className="text-primary" />
              <span>Quick Info</span>
            </div>
            <ul className="space-y-2 text-[12px] text-slate-600">
              <li>• A password setup link will be sent to the user's email</li>
              <li>• Staff accounts share a unified limit pool</li>
              <li>• Pharmacist requires an existing pharmacy setup</li>
              <li>• Lab Assistant requires an existing lab setup</li>
              {isDoctor && (
                <li>• Doctor accounts have a separate limit from staff</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
