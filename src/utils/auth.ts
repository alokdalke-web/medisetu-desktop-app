const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "authRefreshToken";
const USER_KEY = "authUser";

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
};

/** Persists both tokens to the same storage (localStorage if `persistent`, else sessionStorage), clearing the other. */
export const setAuthTokens = (
  accessToken: string,
  refreshToken: string,
  persistent: boolean,
) => {
  const storage = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;

  storage.setItem(TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  other.removeItem(TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
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
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ✅ OPTIONAL (recommended)
export const clearAuthUser = () => {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
};
