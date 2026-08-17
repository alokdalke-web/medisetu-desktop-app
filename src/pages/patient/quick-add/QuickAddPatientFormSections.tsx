import React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
} from "react-hook-form";

import CitySelector from "../../../components/shared/CitySelector";
import InputField from "../../../components/shared/InputField";
import SelectField from "../../../components/shared/SelectField";
import {
  optionalPhoneValidation,
  phoneValidation,
} from "../../../utils/validation";
import type { AddPatientFormValues } from "./types";
import {
  compactCityStateFieldBase,
  fieldBase,
  fieldShell,
  fullFieldShell,
  requiredMark,
} from "./styles";
import { limitAddressText } from "./voicePatientParsing";

type QuickAddPatientFormSectionsProps = {
  control: Control<AddPatientFormValues>;
  rhfControl: Control<FieldValues, FieldValues>;
  addressEditedRef: React.MutableRefObject<boolean>;
  onCityStateChange: (
    city: string,
    state: string,
    shouldValidate?: boolean,
  ) => void;
};

const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

const QuickAddPatientFormSections = ({
  control,
  rhfControl,
  addressEditedRef,
  onCityStateChange,
}: QuickAddPatientFormSectionsProps) => {
  return (
    <>
      <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3">
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Enter patient personal information
          </p>
        </div>
        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(150px,1fr)_minmax(120px,0.9fr)] sm:gap-4">
          <div className={`${fieldBase} ${requiredMark} ${fullFieldShell}`}>
            <InputField
              control={rhfControl}
              name="name"
              label="Full Name"
              placeholder="Enter name"
              rules={{
                required: "Name is required",
                pattern: {
                  value: /^[A-Za-z ]+$/,
                  message: "Only alphabets and spaces are allowed",
                },
              }}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                let v2 = (t.value || "").replace(/[^A-Za-z ]/g, "");
                v2 = v2.replace(/\s+/g, " ");
                v2 = v2.replace(/^\s+/g, "");
                t.value = v2;
              }}
            />
          </div>
          <div className={`${fieldBase} ${requiredMark} ${fieldShell}`}>
            <SelectField
              control={rhfControl}
              name="gender"
              label="Gender"
              placeholder="Gender"
              rules={{ required: "Gender is required" }}
              options={[
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
                { label: "Other", value: "Other" },
              ]}
            />
          </div>
          <div className={`${fieldBase} ${requiredMark} ${fieldShell}`}>
            <InputField
              control={rhfControl}
              type="number"
              name="age"
              label="Age"
              placeholder="Age"
              rules={{
                required: "Age is required",
                min: {
                  value: 1,
                  message: "Age must be between 1 and 100",
                },
                max: {
                  value: 100,
                  message: "Age must be between 1 and 100",
                },
              }}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;

                let digits = (t.value || "").replace(/\D/g, "");
                digits = digits.replace(/^0+/, "");

                if (!digits) {
                  t.value = "";
                  return;
                }

                if (digits.length <= 2) {
                  t.value = digits;
                  return;
                }

                if (digits.startsWith("100")) {
                  t.value = "100";
                  return;
                }

                t.value = digits.slice(0, 2);
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3">
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Add phone number and address information
          </p>
        </div>
        <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
          <div className={`${fieldBase} ${requiredMark} ${fieldShell}`}>
            <InputField
              control={rhfControl}
              name="mobile"
              label="Phone No"
              type="tel"
              placeholder="10-digit"
              rules={phoneValidation}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
              }}
            />
          </div>

          <div className={`${fieldBase} ${fieldShell}`}>
            <InputField
              control={rhfControl}
              name="alternateMobile"
              label="Alt. Phone No"
              type="tel"
              placeholder="Optional"
              isOptional
              rules={optionalPhoneValidation}
              onInput={(e) => {
                const t = e.target as HTMLInputElement;
                t.value = t.value.replace(/[^0-9]/g, "").slice(0, 10);
              }}
            />
          </div>
        </div>

        <div className="mt-2 w-full">
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <div className="w-full">
                <label className="mb-2 block text-[12px] font-semibold text-[#100E1C]">
                  Address
                </label>

                <textarea
                  {...field}
                  ref={(el) => {
                    field.ref(el);

                    if (el) {
                      requestAnimationFrame(() => resizeTextarea(el));
                    }
                  }}
                  value={field.value ?? ""}
                  placeholder="Enter address"
                  autoComplete="new-password"
                  wrap="soft"
                  rows={1}
                  onKeyDown={() => {
                    addressEditedRef.current = true;
                  }}
                  onPaste={() => {
                    addressEditedRef.current = true;
                  }}
                  onChange={(e) => {
                    addressEditedRef.current = true;

                    const limitedValue = limitAddressText(e.target.value);
                    field.onChange(limitedValue);

                    requestAnimationFrame(() => {
                      resizeTextarea(e.target);
                    });
                  }}
                  onInput={(e) => {
                    resizeTextarea(e.currentTarget);
                  }}
                  className="
                    block
                    min-h-[48px]
                    w-full
                    resize-none
                    overflow-hidden
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-4
                    py-3
                    text-[14px]
                    font-medium
                    leading-5
                    text-[#100E1C]
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-primary
                    focus:ring-2
                    focus:ring-primary/10
                    whitespace-pre-wrap
                    [overflow-wrap:anywhere]
                  "
                />
              </div>
            )}
          />
        </div>

        <div className="mt-3">
          <div
            className={`${compactCityStateFieldBase} ${requiredMark} min-h-[70px] min-w-0`}
          >
            <CitySelector
              control={rhfControl}
              onCityStateChange={onCityStateChange}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default QuickAddPatientFormSections;
