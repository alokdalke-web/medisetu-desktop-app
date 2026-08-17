export interface TestDto {
  id: string;
  name: string;
  category: string;
  price: number;

  status: "active" | "inactive";

  // backend response contains clinicId
  clinicId?: string;

  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** ✅ Create payload: include clinicId */
export interface CreateTestDto {
  name: string;
  category: string;
  price: number;
  status: "active" | "inactive";
  clinicId: string; // ✅ send clinic.id here
}

/** ✅ Update payload: include clinicId too (safe) */
export interface UpdateTestDto {
  id: string;
  name: string;
  category: string;
  price: number;
  status: "active" | "inactive";
  clinicId: string; // ✅ send clinic.id here
}
