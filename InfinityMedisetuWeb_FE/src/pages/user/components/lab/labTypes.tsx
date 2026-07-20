export type UIStatus = "Active" | "Inactive";

export type Lab = {
  id: string;
  name: string;
  address: string;
  status: UIStatus;
  contactNo?: string;
  email?: string;
};
