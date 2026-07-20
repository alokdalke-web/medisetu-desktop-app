/**
 * CouponFormModal — Create or edit a coupon.
 *
 * Uses the shared UpdateModal component (same as CreatePlanModal),
 * react-hook-form + zod for validation, InputField + SelectField shared components.
 * Uses HeroUI DatePicker with granularity="minute" for date/time selection.
 * Conditional fields show/hide based on discountType and appliesTo values.
 */
import { addToast, DatePicker, Switch } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  parseAbsoluteToLocal,
  now,
  getLocalTimeZone,
  type ZonedDateTime,
} from "@internationalized/date";
import InputField from "../../../components/shared/InputField";
import SelectField from "../../../components/shared/SelectField";
import InputLabel from "../../../components/shared/InputLabel";
import UpdateModal from "../../../components/shared/Modals/UpdateModal";
import {
  useCreateCouponMutation,
  useUpdateCouponMutation,
  type Coupon,
} from "../../../redux/api/couponApi";
import { couponSchema, type CouponFormValues } from "../../../schemas/coupon";

interface CouponFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Coupon | null;
}

// ─── Select options ────────────────────────────────────────
const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Trial", value: "trial" },
];

const APPLIES_TO_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Plans Only", value: "plans" },
  { label: "Add-ons Only", value: "addons" },
  { label: "Specific Plans", value: "specific_plans" },
  { label: "Specific Add-ons", value: "specific_addons" },
];

// ─── Date helpers ──────────────────────────────────────────

/** Convert an ISO string to a ZonedDateTime for HeroUI DatePicker */
function isoToZoned(isoString: string): ZonedDateTime | null {
  if (!isoString) return null;
  try {
    return parseAbsoluteToLocal(new Date(isoString).toISOString());
  } catch {
    return null;
  }
}

/** Convert a ZonedDateTime to an ISO string for form storage */
function zonedToIso(zdt: ZonedDateTime): string {
  return zdt.toDate().toISOString();
}

const CouponFormModal: React.FC<CouponFormModalProps> = ({
  isOpen,
  onOpenChange,
  editData,
}) => {
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const isLoading = isCreating || isUpdating;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema) as any,
    mode: "onChange",
    defaultValues: getDefaultValues(),
  });

  // Watch fields for conditional rendering
  const discountType = watch("discountType");
  const appliesTo = watch("appliesTo");

  // Reset form when modal opens/closes or editData changes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        reset({
          code: editData.code,
          description: editData.description || "",
          discountType: editData.discountType,
          discountValue: Number(editData.discountValue),
          maxDiscountAmount: editData.maxDiscountAmount
            ? Number(editData.maxDiscountAmount)
            : null,
          trialDays: editData.trialDays ?? null,
          appliesTo: editData.appliesTo,
          applicablePlanIds: editData.applicablePlanIds ?? [],
          applicableAddOnIds: editData.applicableAddOnIds ?? [],
          maxUses: editData.maxUses ?? null,
          maxUsesPerClinic: editData.maxUsesPerClinic ?? 1,
          minOrderValue: editData.minOrderValue
            ? Number(editData.minOrderValue)
            : null,
          firstTimeOnly: editData.firstTimeOnly ?? false,
          startsAt: editData.startsAt || "",
          expiresAt: editData.expiresAt || "",
        });
      } else {
        reset(getDefaultValues());
      }
    }
  }, [isOpen, editData, reset]);

  // ─── Submit handler ─────────────────────────────────────
  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    handleSubmit(async (data: CouponFormValues) => {
      try {
        // startsAt/expiresAt are already ISO strings from the DatePicker
        const payload = {
          ...data,
          startsAt: new Date(data.startsAt).toISOString(),
          expiresAt: new Date(data.expiresAt).toISOString(),
          // Clear conditional fields that don't apply
          maxDiscountAmount:
            data.discountType === "percentage" ? data.maxDiscountAmount : undefined,
          trialDays: data.discountType === "trial" ? data.trialDays : undefined,
          applicablePlanIds:
            data.appliesTo === "specific_plans" ? data.applicablePlanIds : undefined,
          applicableAddOnIds:
            data.appliesTo === "specific_addons" ? data.applicableAddOnIds : undefined,
        };

        if (editData) {
          await updateCoupon({ id: editData.id, body: payload }).unwrap();
          addToast({
            title: "Success",
            description: "Coupon updated successfully",
            color: "success",
          });
        } else {
          await createCoupon(payload).unwrap();
          addToast({
            title: "Success",
            description: "Coupon created successfully",
            color: "success",
          });
        }

        onOpenChange(false);
      } catch (err: any) {
        const message =
          err?.data?.message || `Failed to ${editData ? "update" : "create"} coupon`;
        addToast({ title: "Error", description: message, color: "danger" });
      }
    })(e);
  };

  // ─── Form body (passed to UpdateModal) ──────────────────
  const formBody = (
    <div className="space-y-5 max-h-[65vh] overflow-y-auto px-1">
      {/* Code & Description */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="code"
          label="Coupon Code"
          placeholder="e.g. MONSOON50"
          control={control}
          error={errors.code?.message}
          classNames={{ input: "uppercase font-mono" }}
          parse={(val) => val.toUpperCase()}
        />
        <InputField
          name="description"
          label="Description"
          placeholder="e.g. 50% off monsoon special"
          control={control}
          error={errors.description?.message}
          isRequired={false}
        />
      </div>

      {/* Discount Type & Value */}
      <div className="grid grid-cols-3 gap-4">
        <SelectField
          name="discountType"
          label="Discount Type"
          control={control}
          options={DISCOUNT_TYPE_OPTIONS}
          errorMessage={errors.discountType?.message}
        />
        <InputField
          name="discountValue"
          label={discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
          type="number"
          placeholder={discountType === "percentage" ? "e.g. 50" : "e.g. 500"}
          control={control}
          error={errors.discountValue?.message}
          parse={(val) => {
            const num = parseFloat(val);
            return Number.isNaN(num) ? 0 : num;
          }}
        />

        {/* Conditional: maxDiscountAmount for percentage */}
        {discountType === "percentage" && (
          <InputField
            name="maxDiscountAmount"
            label="Max Discount (₹)"
            type="number"
            placeholder="e.g. 500"
            control={control}
            error={errors.maxDiscountAmount?.message}
            isRequired={false}
            parse={(val) => {
              if (!val) return null;
              const num = parseFloat(val);
              return Number.isNaN(num) ? null : num;
            }}
          />
        )}

        {/* Conditional: trialDays for trial type */}
        {discountType === "trial" && (
          <InputField
            name="trialDays"
            label="Trial Days"
            type="number"
            placeholder="e.g. 14"
            control={control}
            error={errors.trialDays?.message}
            parse={(val) => {
              if (!val) return null;
              const num = parseInt(val, 10);
              return Number.isNaN(num) ? null : num;
            }}
          />
        )}
      </div>

      {/* Applies To & Min Order Value */}
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          name="appliesTo"
          label="Applies To"
          control={control}
          options={APPLIES_TO_OPTIONS}
          errorMessage={errors.appliesTo?.message}
        />
        <InputField
          name="minOrderValue"
          label="Min Order Value (₹)"
          type="number"
          placeholder="Optional"
          control={control}
          error={errors.minOrderValue?.message}
          isRequired={false}
          parse={(val) => {
            if (!val) return null;
            const num = parseFloat(val);
            return Number.isNaN(num) ? null : num;
          }}
        />
      </div>

      {/* Conditional: specific plan/addon IDs */}
      {appliesTo === "specific_plans" && (
        <InputField
          name="applicablePlanIds"
          label="Plan IDs (comma-separated)"
          placeholder="e.g. 1, 2, 3"
          control={control}
          error={errors.applicablePlanIds?.message}
          parse={(val) =>
            val
              .split(",")
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !Number.isNaN(n))
          }
        />
      )}
      {appliesTo === "specific_addons" && (
        <InputField
          name="applicableAddOnIds"
          label="Add-on IDs (comma-separated)"
          placeholder="e.g. 1, 2, 3"
          control={control}
          error={errors.applicableAddOnIds?.message}
          parse={(val) =>
            val
              .split(",")
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !Number.isNaN(n))
          }
        />
      )}

      {/* Usage Limits */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="maxUses"
          label="Max Uses (Global)"
          type="number"
          placeholder="Unlimited if empty"
          control={control}
          error={errors.maxUses?.message}
          isRequired={false}
          parse={(val) => {
            if (!val) return null;
            const num = parseInt(val, 10);
            return Number.isNaN(num) ? null : num;
          }}
        />
        <InputField
          name="maxUsesPerClinic"
          label="Max Uses per Clinic"
          type="number"
          placeholder="e.g. 1"
          control={control}
          error={errors.maxUsesPerClinic?.message}
          parse={(val) => {
            const num = parseInt(val, 10);
            return Number.isNaN(num) ? 1 : num;
          }}
        />
      </div>

      {/* First-Time Only Toggle */}
      <Controller
        name="firstTimeOnly"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#0f1728] px-4 py-3 border border-slate-200 dark:border-[#273244]">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">
                First-Time Subscribers Only
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Only clinics that have never had a paid plan can use this coupon.
              </p>
            </div>
            <Switch
              isSelected={field.value}
              onValueChange={field.onChange}
              size="sm"
              color="primary"
            />
          </div>
        )}
      />

      {/* Validity Period — HeroUI DatePicker with time */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="startsAt"
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <DatePicker
                label={<InputLabel label="Starts At" />}
                labelPlacement="outside"
                variant="bordered"
                radius="full"
                granularity="minute"
                hourCycle={12}
                showMonthAndYearPickers
                value={field.value ? isoToZoned(field.value) : null}
                onChange={(val) => {
                  if (val) {
                    field.onChange(zonedToIso(val as ZonedDateTime));
                  } else {
                    field.onChange("");
                  }
                }}
                minValue={now(getLocalTimeZone())}
                isInvalid={!!fieldState.error || !!errors.startsAt}
                errorMessage={errors.startsAt?.message}
                classNames={{
                  inputWrapper:
                    "border-1 border-border-color hover:border-primary/60 focus-within:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728]",
                }}
              />
            </div>
          )}
        />
        <Controller
          name="expiresAt"
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <DatePicker
                label={<InputLabel label="Expires At" />}
                labelPlacement="outside"
                variant="bordered"
                radius="full"
                granularity="minute"
                hourCycle={12}
                showMonthAndYearPickers
                value={field.value ? isoToZoned(field.value) : null}
                onChange={(val) => {
                  if (val) {
                    field.onChange(zonedToIso(val as ZonedDateTime));
                  } else {
                    field.onChange("");
                  }
                }}
                isInvalid={!!fieldState.error || !!errors.expiresAt}
                errorMessage={errors.expiresAt?.message}
                classNames={{
                  inputWrapper:
                    "border-1 border-border-color hover:border-primary/60 focus-within:border-primary dark:!border-[#38445a] dark:!bg-[#0f1728]",
                }}
              />
            </div>
          )}
        />
      </div>
    </div>
  );

  return (
    <UpdateModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={editData ? "Edit Coupon" : "Create Coupon"}
      isLoading={isLoading}
      isDisabled={!isDirty}
      onSubmit={onSubmit}
      body={formBody}
    />
  );
};

// ─── Helpers ──────────────────────────────────────────────

/** Default form values for a new coupon */
function getDefaultValues(): CouponFormValues {
  return {
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: 0,
    maxDiscountAmount: null,
    trialDays: null,
    appliesTo: "all",
    applicablePlanIds: [],
    applicableAddOnIds: [],
    maxUses: null,
    maxUsesPerClinic: 1,
    minOrderValue: null,
    firstTimeOnly: false,
    startsAt: "",
    expiresAt: "",
  };
}

export default CouponFormModal;
