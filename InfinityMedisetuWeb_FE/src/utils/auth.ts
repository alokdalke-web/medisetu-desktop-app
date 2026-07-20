const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};


export const getAuthUser = (): any | null => {
  const user =
    localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

// ✅ ADD THIS (token clear from both storages)
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

// ✅ OPTIONAL (recommended)
export const clearAuthUser = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};
