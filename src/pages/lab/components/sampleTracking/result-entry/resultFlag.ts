export function evaluateFlag(valueStr: string | null, rangeStr: string | null): "High" | "Low" | "Normal" | null {
  if (!rangeStr || !valueStr) return null;
  const val = parseFloat(valueStr);
  if (Number.isNaN(val)) return null;

  const cleanRange = rangeStr.trim().toLowerCase();

  // Case: < 200 or <200
  if (cleanRange.startsWith("<")) {
    const limit = parseFloat(cleanRange.replace("<", "").trim());
    if (!Number.isNaN(limit)) {
      return val >= limit ? "High" : "Normal";
    }
  }

  // Case: > 40 or >40
  if (cleanRange.startsWith(">")) {
    const limit = parseFloat(cleanRange.replace(">", "").trim());
    if (!Number.isNaN(limit)) {
      return val <= limit ? "Low" : "Normal";
    }
  }

  // Case: 13.0 - 17.0 or 13-17 or 13.0-17.0
  if (cleanRange.includes("-")) {
    const parts = cleanRange.split("-").map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      if (val < parts[0]) return "Low";
      if (val > parts[1]) return "High";
      return "Normal";
    }
  }

  return "Normal";
}
