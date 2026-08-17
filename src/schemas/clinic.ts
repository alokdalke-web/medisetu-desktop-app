import { z } from "zod";

//  Create Clinic Details
const clinicDetailsSchema = z.object({
  clinicName: z.string().min(2),
  Tagline: z.string().optional(),
  clinicAddress: z.string().optional(),
  Country: z.string(),
  State: z.string(),
  City: z.string(),
  ZipCode: z.number().int().min(100000), // assuming Indian PIN codes
  clinicLogo: z.string().optional(),
});

//  Create Clinic Admin Details
const clinicAdminProfileSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  alternateMobile: z.string().min(10).optional(),
  countryCallingCode: z.string().min(1).optional(),
  countryCode: z.string().min(1).optional(),
  profileImage: z.string().url().optional(),
  speciality: z.string().optional(),
  isAdminDoctorAccess: z.boolean().optional(),
});

// Main Schema (Create Clinic Request)
export const createClinicRequestSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  adminProfile: clinicAdminProfileSchema.partial().optional(),
});

// Update Clinic Details
const updateClinicDetailsSchema = z.object({
  clinicName: z.string().min(2).optional(),
  clinicPhone: z.string()
  .length(10, "Phone number must be exactly 10 digits")
  .regex(/^[6-9]\d{9}$/, "Phone number invalid")
  .optional(),
  Tagline: z.string().optional().optional(),
  clinicAddress: z.string().optional().optional(),
  State: z.string().optional(),
  City: z.string().optional(),
  ZipCode: z.number().int().min(100000).optional(), // assuming Indian PIN codes
  clinicLogo: z.string().optional().optional(),
  status: z.enum(["Active", "Inactive", "Blocked"]).optional(),
});

// Update Admin Profile
const updateClinicAdminProfileSchema = z.object({
  name: z.string().min(2).optional(),
  mobile: z.string().min(10).optional(),
  alternateMobile: z.string().min(10).optional().optional(),
  profileImage: z.string().url().optional().optional(),
  speciality: z.string().optional(),
  upiIds: z.array(z.string()).optional(),
  isAdminDoctorAccess: z.boolean().optional(),
});

// Main Schema (Update Clinic Request)
export const updateClinicRequestSchema = z.object({
  clinicDetails: updateClinicDetailsSchema.partial().optional(),
  adminProfile: updateClinicAdminProfileSchema.partial().optional(),
});

export type CreateClinicRequestDto = z.infer<typeof createClinicRequestSchema>;
export type UpdateClinicRequestDto = z.infer<typeof updateClinicRequestSchema>;
export type ClinicAdminProfileDto = z.infer<
  typeof updateClinicAdminProfileSchema
>;
