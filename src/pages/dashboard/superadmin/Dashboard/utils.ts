/**
 * Get current month range
 */
export const getCurrentMonthRange = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
};

/**
 * Convert YMD format to ISO start of day
 */
export const toStartIso = (ymd: string): string => {
  return `${ymd}T00:00:00.000Z`;
};

/**
 * Convert YMD format to ISO end of day
 */
export const toEndIso = (ymd: string): string => {
  return `${ymd}T23:59:59.999Z`;
};

/**
 * Format currency
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format number with abbreviations (K, M, B)
 */
export const formatNumberAbbr = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (
  current: number,
  previous: number,
): { value: number; isPositive: boolean } => {
  if (previous === 0) {
    return { value: 0, isPositive: current >= 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(change),
    isPositive: change >= 0,
  };
};
