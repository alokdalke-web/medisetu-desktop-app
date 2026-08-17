import { z } from "zod";

export const createAccessSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const assignAccessSchema = z.object({
  userType: z.enum([
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
  ]),
  permissionId: z.string().uuid(),
});

export const assignRoleSchema = z.object({
  userType: z.enum([
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
  ]),
  permissionId: z.string().uuid(),
});

export type CreateAccessDto = z.infer<typeof createAccessSchema>;
export type AssignAccessDto = z.infer<typeof assignAccessSchema>;
export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
