import React from "react";
import { Select, SelectItem } from "@heroui/react";
import { Controller, type Control, type FieldValues } from "react-hook-form";
import InputLabel from "../../../../components/shared/InputLabel";

import type { ClinicServiceOption } from "../types";

type ServiceSelectionSectionProps = {
  rhfControl: Control<FieldValues, FieldValues>;
  serviceFieldRef: React.RefObject<HTMLDivElement | null>;
  clinicServiceOptions: ClinicServiceOption[];
  canPickService: boolean;
  isFetchingServices: boolean;
  formErrors: any;
  onServiceSelectionChange: (
    keys: unknown,
    onChange: (value: string) => void,
  ) => void;
  jiggleKey: string;
};

const ServiceSelectionSection: React.FC<ServiceSelectionSectionProps> = ({
  rhfControl,
  serviceFieldRef,
  clinicServiceOptions,
  canPickService,
  isFetchingServices,
  formErrors,
  onServiceSelectionChange,
  jiggleKey,
}) => {
  return (
    <div
      ref={serviceFieldRef}
      className={[
        "min-w-0",
        jiggleKey === "clinicServiceId" ? "jiggle-anim" : "",
      ].join(" ")}
    >
      <Controller
        control={rhfControl}
        name="clinicServiceId"
        render={({ field }) => {
          const selected = clinicServiceOptions.find(
            (o) => o.value === String(field.value || ""),
          );

          const hasErr = !!formErrors?.clinicServiceId;

          return (
            <div className="mb-0">
              <div className="mb-1.5 flex h-5 items-center justify-between gap-2">
                <InputLabel label="Select Service" />
                {!canPickService && (
                  <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400">
                    Select patient first
                  </span>
                )}
              </div>
              <Select
                aria-label="Select Service"
                placeholder={
                  !canPickService
                    ? "Select patient & doctor first"
                    : isFetchingServices && clinicServiceOptions.length === 0
                      ? "Loading services..."
                      : "Select service"
                }
                isLoading={isFetchingServices}
                isDisabled={!canPickService}
                size="md"
                labelPlacement="outside"
                variant="flat"
                selectedKeys={
                  field.value ? new Set([String(field.value)]) : new Set([])
                }
                onSelectionChange={(keys) =>
                  onServiceSelectionChange(keys, field.onChange)
                }
                items={clinicServiceOptions}
                renderValue={() => {
                  if (!selected) return null;
                  return (
                    <div className="flex h-full w-full items-center justify-between gap-3">
                      <div className="min-w-0 truncate  text-[13px] font-medium text-slate-900 dark:text-white">
                        {selected.name}
                        {selected.priceText ? ` - ${selected.priceText}` : ""}
                      </div>
                      {!!selected.expText && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {selected.expText}
                        </span>
                      )}
                    </div>
                  );
                }}
                classNames={{
                  base: "block w-full",
                  trigger:
                    "!h-10 !min-h-10 items-center !rounded-lg border border-slate-200 bg-white px-3 py-0 shadow-sm " +
                    "data-[hover=true]:border-slate-300 data-[focus=true]:border-primary " +
                    "dark:border-[#38445a] dark:bg-[#0f1728] dark:text-white " +
                    "dark:data-[hover=true]:border-[#46beae] dark:data-[focus=true]:border-[#46beae] " +
                    (hasErr ? "!border-rose-300 ring-2 ring-rose-200 " : ""),
                  innerWrapper: "h-full min-h-0 items-center px-0 py-0",
                  value: "w-full truncate text-[13px] leading-5 text-slate-800 placeholder:text-slate-400 dark:text-white",
                  listboxWrapper: "max-h-64",
                  popoverContent: "rounded-xl border border-slate-200 shadow-xl dark:bg-[#111726] dark:border-[#273244]",
                  selectorIcon: "text-slate-500 dark:text-slate-400",
                }}
              >
                {(item) => (
                  <SelectItem
                    key={item.value}
                    textValue={`${item.name} ${item.priceText ?? ""}`}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        {item.priceText && (
                          <div className="text-[12px] text-slate-500 dark:text-slate-400">
                            {item.priceText}
                          </div>
                        )}
                      </div>
                      {!!item.expText && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {item.expText}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                )}
              </Select>

              {!!formErrors?.clinicServiceId?.message && (
                <p className="mt-1 text-[12px] text-rose-600 dark:text-rose-400">
                  {String(formErrors.clinicServiceId.message)}
                </p>
              )}
              {!canPickService && null}
            </div>
          );
        }}
      />
    </div>
  );
};

export default ServiceSelectionSection;
