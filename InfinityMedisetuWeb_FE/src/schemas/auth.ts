import { z } from "zod";

/**
 * ✅ Password rule:
 * - allow spaces ONLY in middle
 * - disallow leading/trailing spaces
 * - no trim() used
 */
const NO_EDGE_SPACES = /^\S(?:.*\S)?$/;

const noEdgeSpaceMsg =
  "Password cannot start or end with a space. Spaces are allowed only in the middle.";

/* ================= REGISTER ================= */

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z
      .string()
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email")
      .optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((v) => NO_EDGE_SPACES.test(v), {
        message: noEdgeSpaceMsg,
      })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
        "Password must be at least 8 characters long, with at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    token: z.string().optional(),
    captchaToken: z.string().optional(),
    referralCode: z.string().optional(),
    userStatus: z.string().optional(),
  })
  .refine(
    (data) => !!data.token || !!data.email,
    {
      message: "Email is required when token is not provided",
      path: ["email"],
    },
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ================= OTP / LOGIN ================= */

export const requestRegistrationSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"),
  captchaToken: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const loginSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"),
  password: z
    .string()
    .min(1, "Password required")
    .refine((v) => NO_EDGE_SPACES.test(v), {
      message: noEdgeSpaceMsg,
    }),
  captchaToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

/* ================= RESET PASSWORD ================= */

export const requestPasswordResetSchema = z.object({
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"),
  captchaToken: z.string().optional(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((v) => NO_EDGE_SPACES.test(v), {
        message: noEdgeSpaceMsg,
      }),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ================= EMAIL VERIFY ================= */

export const sendVerificationSchema = z.object({
  userId: z.uuid().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token required"),
});

/* ================= PATIENT ================= */

export const createPetientSchemas = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email"),
  gender: z.string().min(1, "Gender is required"),
  age: z.number().min(1, "Age is required"),
  dob: z.string().min(1, "DOB is required"),
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

export const userSchema = z.object({
  success: z.boolean().optional(),
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  mobile: z.string().nullable(),
  alternateMobile: z.string().nullable(),
  gender: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  country: z.string().nullable(),
  countryCallingCode: z.string().nullable(),
  countryCode: z.string().nullable(),
  userType: z.string(),
  userStatus: z.string(),
  emailVerifiedAt: z.string().nullable(),
  mobileVerifiedAt: z.string().nullable(),
  tokenVersion: z.number().optional(),
  isCheckedIn: z.boolean().optional(),
  isUserBlocked: z.boolean().optional(),
  locale: z.string().optional(),
  profileImage: z.string().nullable(),
  qualification: z.string().nullable(),
  yearsOfExperience: z.number().nullable(),
  licenseNumber: z.string().nullable(),
  speciality: z.string().nullable(),
  age: z.number().nullable(),
  dob: z.string().nullable(),
  notesMedicalHistory: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  patientId: z.string().nullable(),
  isAdminDoctorAccess: z.boolean().optional(),
  paymentVisible: z.boolean().optional(),
  registrationNumber: z.string().nullable().optional(),
  noSubscriptionTakenTillNow: z.boolean().optional(),
});

export const addUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    "Please provide a valid email address"
  ),
  userType: z.enum([
    "Doctor",
    "Receptionist",
    "Nurse",
    "Pharmacist",
    "Lab_Assistant",
    "Radiologist",
  ]),
  mobile: z.string().optional(),
  speciality: z.string().nullable().optional(),
  registrationNumber: z.string().optional(),
  labId: z.string().optional(),
  pharmacyId: z.string().optional(),
});

/* ================= TYPES ================= */

export type SignupFormValues = z.infer<typeof registerSchema>;
export type RegisterDto = Omit<SignupFormValues, "confirmPassword">;
export type LoginDto = z.infer<typeof loginSchema>;
export type requestPasswordResetDto = z.infer<typeof requestPasswordResetSchema>;
export type RequestRegistrationDto = z.infer<typeof requestRegistrationSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type CreatePetientDto = z.infer<typeof createPetientSchemas>;
export type UpdatePetientDto = z.infer<typeof updatePetientSchemas>;
export type getAllPetientsDto = z.infer<typeof getAllPetientsSchema>;
export type UserDto = z.infer<typeof userSchema>;
export type AddUserDto = z.infer<typeof addUserSchema>;
