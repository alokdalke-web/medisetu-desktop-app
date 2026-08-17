const VISITED_PREFIX = "medisetu_visited_";
const TOUR_PREFIX = "medisetu_tour_completed_";

const lsGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const lsSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

/**
 * Check if this is the user's first visit
 * @returns true if first visit, false otherwise
 */
export const checkFirstVisit = (userId?: string): boolean => {
  if (!userId) return true;
  return lsGet(`${VISITED_PREFIX}${userId}`) === null;
};

/**
 * Mark the user as having visited the site
 */
export const markVisited = (userId?: string): void => {
  if (!userId) return;
  lsSet(`${VISITED_PREFIX}${userId}`, "true");
};

/**
 * Check if the user has completed the feature tour
 */
export const checkTourCompleted = (userId?: string): boolean => {
  if (!userId) return false;
  return lsGet(`${TOUR_PREFIX}${userId}`) !== null;
};

/**
 * Mark the feature tour as completed
 */
export const markTourCompleted = (userId?: string): void => {
  if (!userId) return;
  lsSet(`${TOUR_PREFIX}${userId}`, "true");
};

export const deleteTourCompleted = (userId?: string): void => {
  if (!userId) return;
  try {
    localStorage.removeItem(`${TOUR_PREFIX}${userId}`);
  } catch {}
};
