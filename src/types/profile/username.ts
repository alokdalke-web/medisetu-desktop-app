export type CheckUsernameRequest = {
  userName: string;
};

export type CheckUsernameResponse = {
  success?: boolean;
  available?: boolean;
  message?: string;
};

export type UpdateUsernameRequest = {
  userName: string;
};

export type UpdateUsernameResponse = {
  success?: boolean;
  message?: string;
  userName?: string;
};
