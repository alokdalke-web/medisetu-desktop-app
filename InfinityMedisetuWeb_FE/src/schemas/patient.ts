import { z } from "zod";

/** Family relationship enum (patient → primary/family head) */
export const familyRelationshipEnum = z.enum([
  "spouse",
  "child",
  "parent",
  "sibling",
  "other",
]);

export type FamilyRelationship = z.infer<typeof familyRelationshipEnum>;

export const createPetientSchemas = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "invalid email").optional(),
  gender: z.string().min(1, "gender is required"),
  age: z.number().min(1, "age is required"),
  dob: z.string().min(1, "dob is required"),
  countryCallingCode: z.string().min(1, "countryCallingCode is required"),
  countryCode: z.string().min(1, "countryCode is required"),
  mobile: z.string().min(1, "mobile is required"),
  alternateMobile: z.string().min(1, "alternateMobile is required").optional(),
  address: z.string().min(1, "address is required"),
  city: z.string().min(1, "city is required"),
  state: z.string().min(1, "state is required"),
  zipCode: z.string().min(1, "zipCode is required"),
  country: z.string().min(1, "country is required"),
  profileImage: z.string().min(1, "profileImage is required").optional(),
  notesMedicalHistory: z
    .string()
    .min(1, "notesMedicalHistory is required")
    .optional(),
  bloodGroup: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),

  /**
   * Optional family-relation fields.
   * `relationship` must be paired with either `primaryPatientId`
   * or `primaryPatientMobile`. `primaryPatientName` is only used when
   * linking by mobile and the primary may not exist yet.
   */
  relationship: familyRelationshipEnum.optional(),
  primaryPatientId: z.string().optional(),
  primaryPatientMobile: z.string().optional(),
  primaryPatientName: z.string().optional(),
});

export const updatePetientSchemas = z.object({
  peteintId: z.string().min(1, "petientId is required"),
  name: z.string().min(1, "name is required").optional(),
  email: z
    .string()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "invalid email")
    .optional(),
  gender: z.string().min(1, "gender is required").optional(),
  age: z.number().min(1, "age is required").optional(),
  dob: z.string().min(1, "dob is required").optional(),
  countryCallingCode: z
    .string()
    .min(1, "countryCallingCode is required")
    .optional(),
  countryCode: z.string().min(1, "countryCode is required").optional(),
  mobile: z.string().min(1, "mobile is required").optional(),
  alternateMobile: z
    .string()
    .min(1, "alternateMobile is required")
    .optional()
    .optional(),
  address: z.string().min(1, "address is required").optional(),
  city: z.string().min(1, "city is required").optional(),
  state: z.string().min(1, "state is required").optional(),
  zipCode: z.string().min(1, "zipCode is required").optional(),
  country: z.string().min(1, "country is required").optional(),
  profileImage: z.string().min(1, "profileImage is required").optional(),
  notesMedicalHistory: z
    .string()
    .min(1, "notesMedicalHistory is required")
    .optional(),
  bloodGroup: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
});

export const getPetientSchema = z.object({
  peteintId: z.string().min(1, "petientId is required"),
});

export const getAllPetientsSchema = z.object({
  pageSize: z.string().min(1, "pageSize is required").optional(),
  pageNumber: z.string().min(1, "pageNumber is required").optional(),
  searchBy: z.string().optional(),
  userType: z
    .enum([
      "Admin",
      "User",
      "Super_Admin",
      "Doctor",
      "Receptionist",
      "Nurse",
      "Patient",
      "Pharmacist",
      "Lab_Assistant",
      "Radiologist",
    ])
    .optional(),
  userStatus: z.enum(["Active", "Inactive", "Blocked", "New"]).optional(),
});

// export types
export type CreatePetientDto = z.infer<typeof createPetientSchemas>;
export type UpdatePetientDto = z.infer<typeof updatePetientSchemas>;
export type getAllPetientsDto = z.infer<typeof getAllPetientsSchema>;
