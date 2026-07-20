export interface TestDto {
  id: string;
  name: string;
  category: string;
  price: number;

  status: "active" | "inactive";

  // backend response contains clientId
  clientId?: string;

  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** ✅ Create payload: include clientId (clinic id) */
export interface CreateTestDto {
  name: string;
  category: string;
  price: number;
  status: "active" | "inactive";
  clientId: string; // ✅ send clinic.id here
}

/** ✅ Update payload: include clientId too (safe) */
export interface UpdateTestDto {
  id: string;
  name: string;
  category: string;
  price: number;
  status: "active" | "inactive";
  clientId: string; // ✅ send clinic.id here
}
