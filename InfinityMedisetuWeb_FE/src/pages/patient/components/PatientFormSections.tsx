import React, { useState } from "react";
import type { Control, FieldValues } from "react-hook-form";
import {
  FiUser,
  FiPhone,
  FiMapPin,
  FiHeart,
  FiChevronDown,
} from "react-icons/fi";

import InputField from "../../../components/shared/InputField";
import SelectField from "../../../components/shared/SelectField";
import CitySelector from "../../../components/shared/CitySelector";
import {
  phoneValidation,
  optionalPhoneValidation,
} from "../../../utils/validation";

function capitalizeWords(value: string) {
  return value.replace(
    /[A-Za-z]+/g,
    (word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
  );
}

interface PatientFormSectionsProps {
  control: Control<FieldValues, FieldValues>;
  onCityStateChange: (city: string, state: string) => void;
  /** Ref wrappers for keyboard navigation (Add Patient uses these) */
  nameFieldRef?: React.RefObject<HTMLDivElement | null>;
  genderFieldRef?: React.RefObject<HTMLDivElement | null>;
  ageFieldRef?: React.RefObject<HTMLDivElement | null>;
  mobileFieldRef?: React.RefObject<HTMLDivElement | null>;
  cityFieldRef?: React.RefObject<HTMLDivElement | null>;
  /** Keyboard navigation handler (Add Patient uses this) */
  moveOnEnter?: (
    e: React.KeyboardEvent<HTMLDivElement>,
    nextRef: React.RefObject<HTMLDivElement | null>,
    selector?: string,
  ) => void;
  /** CSS class for required asterisk styling (Add Patient uses this) */
  reqAsterisk?: string;
  /** Show city validation error externally (Add Patient) */
  cityError?: string;
  /** Optional custom renderer for the address field (replaces default InputField) */
  renderAddressField?: () => React.ReactNode;
  /** When true, the mobile field is read-only (linked family member) */
  disableMobile?: boolean;
}

/* ─── Section Header ─────────────────────────────────────────────────────── */
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: "teal" | "blue" | "purple" | "rose";
}> = ({ icon, title, subtitle, tone = "teal" }) => {
  const toneClasses = {
    teal: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  };

  return (
    <div className="mb-4 flex items-center gap-3 sm:mb-5">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px] sm:h-9 sm:w-9 sm:text-[16px] ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-slate-800 dark:text-white sm:text-[14px]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-[12px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const PatientFormSections: React.FC<PatientFormSectionsProps> = ({
  control,
  onCityStateChange,
  nameFieldRef,
  genderFieldRef,
  ageFieldRef,
  mobileFieldRef,
  cityFieldRef,
  moveOnEnter,
  reqAsterisk = "",
  cityError,
  renderAddressField,
  disableMobile,
}) => {
  const [medicalOpen, setMedicalOpen] = useState(false);

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* ═══ Section 1: Basic Information ═══ */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 lg:p-6 dark:bg-[#111726] dark:border-[#273244]">
        <SectionHeader
          icon={<FiUser />}
          title="Basic Information"
          subtitle="Patient's personal details"
          tone="teal"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
          {/* Full Name */}
          <div
            ref={nameFieldRef}
            className={`min-w-0 ${reqAsterisk}`}
            onKeyDownCapture={
              moveOnEnter && genderFieldRef
                ? (e) =>
                  moveOnEnter(
                    e,
                    genderFieldRef,
                    'button:not([disabled]), [role="combobox"], [data-slot="trigger"], [tabindex]:not([tabindex="-1"])',
                  )
                : undefined
            }
          >
            <InputField
              control={control}
              name="name"
              label="Full Name"
              placeholder="Enter patient's full name"
              isRequired
              rules={{
                required: "Name is required",
                pattern: {
                  value: /^[A-Za-z ]+$/,
                  message: "Only alphabets and spaces are allowed",
                },
              }}
              parse={(value) =>
                capitalizeWords(value.replace(/[^A-Za-z ]/g, ""))
              }
            />
          </div>

          {/* Gender */}
          <div
            ref={genderFieldRef}
            className={`min-w-0 mt-1 [&_[data-slot='trigger']]:!h-12 [&_[data-slot='trigger']]:!rounded-lg ${reqAsterisk}`}
          >
            <SelectField
              control={control}
              name="gender"
              label="Gender"
              placeholder="Select gender"
              isRequired
              rules={{ required: "Gender is required" }}
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
                { label: "Other", value: "Other" },
              ]}
            />
          </div>

          {/* Age */}
          <div
            ref={ageFieldRef}
            className={`min-w-0 ${reqAsterisk}`}
            onKeyDownCapture={
              moveOnEnter && mobileFieldRef
                ? (e) => moveOnEnter(e, mobileFieldRef, "input:not([disabled])")
                : undefined
            }
          >
            <InputField
              control={control}
              type="number"
              name="age"
              label="Age (Years)"
              placeholder="e.g. 35"
              isRequired
              min={1}
              max={100}
              rules={{
                required: "Age is required",
                min: { value: 1, message: "Age must be at least 1" },
                max: { value: 100, message: "Age must be 100 or below" },
              }}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                let v = (t.value || "").replace(/\D/g, "");
                if (!v) { t.value = ""; return; }
                v = v.replace(/^0+/, "");
                if (!v) { t.value = ""; return; }
                if (v.length <= 2) { t.value = v; return; }
                if (v.startsWith("100")) { t.value = "100"; return; }
                t.value = v.slice(0, 2);
              }}
            />
          </div>
        </div>
      </section>

      {/* ═══ Section 2: Contact Details ═══ */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 lg:p-6 dark:bg-[#111726] dark:border-[#273244]">
        <SectionHeader
          icon={<FiPhone />}
          title="Contact Details"
          subtitle="For appointment reminders & communication"
          tone="blue"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {/* Mobile */}
          <div
            ref={mobileFieldRef}
            className={`min-w-0 ${reqAsterisk}`}
            onKeyDownCapture={
              moveOnEnter && cityFieldRef
                ? (e) =>
                  moveOnEnter(
                    e,
                    cityFieldRef,
                    'input:not([disabled]), button:not([disabled]), [role="combobox"], [data-slot="trigger"], [tabindex]:not([tabindex="-1"])',
                  )
                : undefined
            }
          >
            <InputField
              control={control}
              name="mobile"
              label={disableMobile ? "Phone No (Linked)" : "Phone No"}
              type="tel"
              placeholder="10-digit mobile number"
              isRequired={!disableMobile}
              isReadOnly={disableMobile}
              rules={disableMobile ? undefined : phoneValidation}
              startContent={
                <span className="pointer-events-none text-[12px] font-medium text-slate-400">
                  +91
                </span>
              }
              onInput={disableMobile ? undefined : (e) => {
                const t = e.target as HTMLInputElement;
                t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
              }}
            />
          </div>

          {/* Alternate Mobile */}
          <div className="min-w-0">
            <InputField
              control={control}
              name="alternateMobile"
              label="Alternate Phone No"
              type="tel"
              placeholder="Optional alternate number"
              isOptional
              rules={optionalPhoneValidation}
              startContent={
                <span className="pointer-events-none text-[12px] font-medium text-slate-400">
                  +91
                </span>
              }
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
              }}
            />
          </div>
        </div>
      </section>

      {/* ═══ Section 3: Address Details ═══ */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5 lg:p-6 dark:bg-[#111726] dark:border-[#273244]">
        <SectionHeader
          icon={<FiMapPin />}
          title="Address Details"
          subtitle="For home visits & delivery services"
          tone="purple"
        />

        <div className="space-y-4">
          {/* Address */}
          <div className="max-w-full">
            {renderAddressField ? (
              renderAddressField()
            ) : (
              <InputField
                control={control}
                name="address"
                label="Address"
                placeholder="House no, Street, Locality..."
                maxLength={512}
                parse={(value) => capitalizeWords(value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            )}
          </div>

          {/* City & State */}
          <div ref={cityFieldRef} className={`min-w-0 ${reqAsterisk}`}>
            <CitySelector
              control={control}
              onCityStateChange={onCityStateChange}
              isRequired
              error={cityError}
            />
          </div>
        </div>
      </section>

      {/* ═══ Section 4: Medical Information (Collapsible) ═══ */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl dark:bg-[#111726] dark:border-[#273244]">
        <button
          type="button"
          onClick={() => setMedicalOpen((v) => !v)}
          aria-expanded={medicalOpen}
          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 sm:p-5 lg:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[15px] text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 sm:h-9 sm:w-9 sm:text-[16px]">
              <FiHeart />
            </div>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-slate-800 dark:text-white sm:text-[14px]">
                Medical Information
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-[12px]">
                Optional — Blood group, vitals & conditions
              </p>
            </div>
          </div>

          <div
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-[#273244] transition-transform",
              medicalOpen ? "rotate-180" : "",
            ].join(" ")}
          >
            <FiChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
        </button>

        {/* Collapsible content */}
        <div
          className={[
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            medicalOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
              {/* Row 1: Blood Group, Height, Weight */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-start">
                <div className="min-w-0 mt-1 [&_[data-slot='trigger']]:!h-12 [&_[data-slot='trigger']]:!rounded-lg">
                  <SelectField
                    control={control}
                    name="bloodGroup"
                    label="Blood Group"
                    placeholder="Select"
                    options={[
                      { label: "A+", value: "A+" },
                      { label: "A-", value: "A-" },
                      { label: "B+", value: "B+" },
                      { label: "B-", value: "B-" },
                      { label: "AB+", value: "AB+" },
                      { label: "AB-", value: "AB-" },
                      { label: "O+", value: "O+" },
                      { label: "O-", value: "O-" },
                    ]}
                  />
                </div>

                <div className="min-w-0">
                  <InputField
                    control={control}
                    name="height"
                    label="Height"
                    placeholder="e.g. 170"
                    type="number"
                    endContent={
                      <span className="pointer-events-none text-[11px] font-medium text-slate-400">
                        cm
                      </span>
                    }
                    rules={{
                      min: { value: 30, message: "Min 30 cm" },
                      max: { value: 275, message: "Max 275 cm" },
                    }}
                    onInput={(e) => {
                      const t = e.target as HTMLInputElement;
                      t.value = t.value.replace(/[^0-9]/g, "").slice(0, 3);
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <InputField
                    control={control}
                    name="weight"
                    label="Weight"
                    placeholder="e.g. 70"
                    type="number"
                    endContent={
                      <span className="pointer-events-none text-[11px] font-medium text-slate-400">
                        kg
                      </span>
                    }
                    rules={{
                      min: { value: 1, message: "Min 1 kg" },
                      max: { value: 300, message: "Max 300 kg" },
                    }}
                    onInput={(e) => {
                      const t = e.target as HTMLInputElement;
                      t.value = t.value.replace(/[^0-9.]/g, "").slice(0, 5);
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Allergies & Chronic Conditions */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <div className="min-w-0 mt-1 [&_[data-slot='trigger']]:!h-12 [&_[data-slot='trigger']]:!rounded-lg">
                  <SelectField
                    control={control}
                    name="allergies"
                    label="Allergies"
                    placeholder="Select known allergies"
                    selectionMode="multiple"
                    options={[
                      { label: "Penicillin", value: "Penicillin" },
                      { label: "Dust", value: "Dust" },
                      { label: "Pollen", value: "Pollen" },
                      { label: "Nuts", value: "Nuts" },
                      { label: "Latex", value: "Latex" },
                      { label: "Shellfish", value: "Shellfish" },
                      { label: "Sulfa Drugs", value: "Sulfa Drugs" },
                      { label: "Aspirin", value: "Aspirin" },
                      { label: "Ibuprofen", value: "Ibuprofen" },
                      { label: "Eggs", value: "Eggs" },
                      { label: "Milk", value: "Milk" },
                      { label: "Soy", value: "Soy" },
                      { label: "Wheat", value: "Wheat" },
                      { label: "None", value: "None" },
                    ]}
                  />
                </div>

                <div className="min-w-0 mt-1 [&_[data-slot='trigger']]:!h-12 [&_[data-slot='trigger']]:!rounded-lg">
                  <SelectField
                    control={control}
                    name="chronicConditions"
                    label="Chronic Conditions"
                    placeholder="Select conditions"
                    selectionMode="multiple"
                    options={[
                      { label: "Diabetes", value: "Diabetes" },
                      { label: "Hypertension", value: "Hypertension" },
                      { label: "Asthma", value: "Asthma" },
                      { label: "Heart Disease", value: "Heart Disease" },
                      { label: "Arthritis", value: "Arthritis" },
                      { label: "Thyroid", value: "Thyroid" },
                      { label: "COPD", value: "COPD" },
                      { label: "Kidney Disease", value: "Kidney Disease" },
                      { label: "Liver Disease", value: "Liver Disease" },
                      { label: "Cancer", value: "Cancer" },
                      { label: "Epilepsy", value: "Epilepsy" },
                      { label: "Depression", value: "Depression" },
                      { label: "None", value: "None" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PatientFormSections;
