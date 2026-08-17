import { z } from "zod";

export const onboardingBusinessTypeOptions = [
  { label: "Individual / Sole Practice", value: "individual" },
  { label: "Proprietorship", value: "proprietorship" },
  { label: "Partnership", value: "partnership" },
  { label: "Private Limited", value: "private_limited" },
  { label: "Public Limited", value: "public_limited" },
] as const;

export const bankAccountTypeOptions = [
  { label: "Savings", value: "savings" },
  { label: "Current", value: "current" },
] as const;

const businessTypeSchema = z.enum([
  "individual",
  "partnership",
  "proprietorship",
  "public_limited",
  "private_limited",
]);

export const onboardingAddressSchema = z.object({
  street: z.string().trim().min(1, "Street address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
});

export const onboardingBusinessDetailsSchema = z.object({
  legalBusinessName: z
    .string()
    .trim()
    .min(2, "Legal business name is required"),
  businessType: businessTypeSchema,
  address: onboardingAddressSchema,
});

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// 4th letter of a PAN encodes the holder type: P = individual, F = firm/partnership, C = company.
const PAN_TYPE_TO_BUSINESS_TYPES: Record<string, string[]> = {
  P: ["individual", "proprietorship"],
  F: ["partnership"],
  C: ["private_limited", "public_limited"],
};

export const onboardingStakeholderSchema = z.object({
  name: z.string().trim().min(2, "Stakeholder name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  pan: z
    .string()
    .trim()
    .toUpperCase()
    .regex(panRegex, "Enter a valid PAN (e.g. ABCDE1234F)"),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date of birth")
    .refine(
      (val) => new Date(val).getTime() <= Date.now(),
      "Date of birth cannot be in the future",
    ),
});

export const onboardingBankDetailsSchema = z.object({
  beneficiaryName: z.string().trim().min(2, "Beneficiary name is required"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{5,35}$/, "Account number must be 5-35 digits"),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code"),
  accountType: z.enum(["savings", "current"]),
});

/** Full wizard schema (steps 1-3 + consent). Step 4 documents are uploaded independently. */
export const onboardRouteFormSchema = z
  .object({
    legalBusinessName: onboardingBusinessDetailsSchema.shape.legalBusinessName,
    businessType: onboardingBusinessDetailsSchema.shape.businessType,
    address: onboardingAddressSchema,
    stakeholder: onboardingStakeholderSchema,
    bankDetails: onboardingBankDetailsSchema,
    tncAccepted: z
      .boolean()
      .refine((val) => val === true, "You must accept the terms to continue"),
  })
  .superRefine((values, ctx) => {
    const panFourthLetter = values.stakeholder.pan[3];
    const allowedBusinessTypes = PAN_TYPE_TO_BUSINESS_TYPES[panFourthLetter];
    if (allowedBusinessTypes && !allowedBusinessTypes.includes(values.businessType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAN type does not match selected business entity type.",
        path: ["stakeholder", "pan"],
      });
    }
  });

export type OnboardRouteFormValues = z.infer<typeof onboardRouteFormSchema>;

export const updateBankDetailsSchema = onboardingBankDetailsSchema;
export type UpdateBankDetailsFormValues = z.infer<typeof updateBankDetailsSchema>;

/** Field paths validated per wizard step, used with react-hook-form's trigger(). */
export const ONBOARDING_STEP_FIELDS = {
  1: ["legalBusinessName", "businessType", "address"],
  2: ["stakeholder"],
  3: ["bankDetails"],
} as const;
