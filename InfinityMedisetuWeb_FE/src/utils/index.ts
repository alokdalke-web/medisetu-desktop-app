export const formatDate = (val: string) => {
  if (!val) return "—";
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  }
  const clean = val.replace(/\//g, "-");
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d2);
  }
  return val;
};

export const formatTime = (isoOrHHmm: string) => {
  const s = (isoOrHHmm ?? "").toString().trim();
  if (/^\d{2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  }
  return s || "—";
};
