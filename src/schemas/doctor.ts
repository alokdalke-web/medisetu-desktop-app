import { z } from "zod";

// Break details
const BreakSchema = z.object({
  id: z.string().uuid(),
  clinicAvailabilityId: z.string().uuid(),
  breakType: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  notes: z.string().nullable(),
  status: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Clinic availability for each day
const AvailabilitySchema = z.object({
  id: z.string().uuid(),
  clinicId: z.string().uuid(),
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breaksStart: z.string().nullable(),
  breaksEnd: z.string().nullable(),
  isAvailable: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  breaks: z.array(BreakSchema),
});

// Service details
const ServiceSchema = z.object({
  id: z.string().uuid(),
  clinicId: z.string().uuid(),
  serviceName: z.string(),
  price: z.number(),
  currency: z.string(),
  additionalServices: z.string().nullable(),
  canBeBookedByPatient: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Doctor profile
const DoctorProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  mobile: z.string(),
  alternateMobile: z.string(),
  gender: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  countryCallingCode: z.string(),
  countryCode: z.string(),
  password: z.string(),
  userType: z.string(),
  userStatus: z.string(),
  emailVerifiedAt: z.string().datetime().nullable(),
  mobileVerifiedAt: z.string().datetime().nullable(),
  tokenVersion: z.number(),
  isCheckedIn: z.boolean(),
  isUserBlocked: z.boolean(),
  locale: z.string(),
  profileImage: z.string().nullable(),
  qualification: z.string().nullable(),
  yearsOfExperience: z.number().nullable(),
  licenseNumber: z.string().nullable(),
  registrationNumber: z.string().nullable().optional(),
  speciality: z.string().nullable(),
  age: z.number().nullable(),
  dob: z.string().nullable(),
  notesMedicalHistory: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  patientId: z.string().nullable(),
});

// Root response schema
export const ClinicDetailsResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    services: z.array(ServiceSchema),
    availability: z.array(AvailabilitySchema),
    doctorProfile: DoctorProfileSchema,
  }),
});

// Update Doctor Request
export const updateDoctorRequestSchema = z.object({
  services: ServiceSchema.partial().optional(),
  availability: AvailabilitySchema.partial().optional(),
  doctorProfile: DoctorProfileSchema.partial().optional(),
});

export type ClinicDetailsResponse = z.infer<typeof ClinicDetailsResponseSchema>;
export type UpdateDoctorRequestDto = z.infer<typeof updateDoctorRequestSchema>;
export type DoctorProfileDto = z.infer<typeof DoctorProfileSchema>;
