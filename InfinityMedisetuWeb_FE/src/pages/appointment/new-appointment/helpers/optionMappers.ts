import type { PatientOption } from "../types";

export const buildPatientOption = (p: any, idx = 0): PatientOption => {
  const name = String(p?.name ?? "").trim();
  const mobile = String(p?.mobile ?? p?.phoneNumber ?? "").trim();

  const baseLabel = mobile
    ? `${name} (${mobile})`
    : name || p?.email || `Patient ${idx + 1}`;

  const rawStatus = String(
    p?.noShowStatus ?? p?.noShowAction ?? "",
  ).toLowerCase();

  const count = Number(p?.noShowCount ?? 0);

  let statusLabel = "";
  if (rawStatus === "warning") statusLabel = "Warning";
  else if (rawStatus === "penalty") statusLabel = "Penalty";
  else if (rawStatus === "advance_required") statusLabel = "Advance required";
  else if (rawStatus === "blocked") statusLabel = "Blocked";

  const badgeText =
    statusLabel && count > 0
      ? `No-Show: ${statusLabel} (${count})`
      : statusLabel
        ? `No-Show: ${statusLabel}`
        : "";

  const badgeTone: PatientOption["badgeTone"] =
    rawStatus === "warning"
      ? "warning"
      : rawStatus === "penalty"
        ? "danger"
        : rawStatus === "advance_required"
          ? "info"
          : rawStatus === "blocked"
            ? "danger"
            : "muted";

  return {
    label: baseLabel,
    value: String(p?.id ?? p?._id),
    data: p,
    badgeText: badgeText || undefined,
    badgeTone,
  };
};

export const getInitials = (name: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "•";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

export const formatPhone = (raw: any) => {
  const s = String(raw ?? "").trim();
  if (!s) return "-";
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  return s;
};

export const formatGender = (raw: any) => {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!s) return "Other";
  if (s === "m" || s.includes("male")) return "Male";
  if (s === "f" || s.includes("female")) return "Female";
  return "Other";
};

export const formatFeeRange = (doc: any) => {
  const from =
    doc?.feeFrom ??
    doc?.minFee ??
    doc?.feeMin ??
    doc?.consultationFeeFrom ??
    doc?.fee_start;
  const to =
    doc?.feeTo ??
    doc?.maxFee ??
    doc?.feeMax ??
    doc?.consultationFeeTo ??
    doc?.fee_end;

  const f = from != null && String(from).trim() !== "" ? String(from) : "";
  const t = to != null && String(to).trim() !== "" ? String(to) : "";

  if (f && t) return `₹${f} - ₹${t}`;
  if (f) return `₹${f}`;
  if (t) return `₹${t}`;
  return "-";
};

export const extractUsersArray = (resp: any): any[] => {
  const r =
    resp?.result?.allUser ??
    resp?.result?.users ??
    resp?.result?.data ??
    resp?.users ??
    resp?.data ??
    resp?.result ??
    [];
  if (Array.isArray(r)) return r;
  if (Array.isArray(r?.data)) return r.data;
  return [];
};

export const extractServicesFromGetService = (resp: any): any[] => {
  if (!resp) return [];

  if (Array.isArray(resp?.data)) return resp.data;
  if (Array.isArray(resp?.result)) return resp.result;
  if (Array.isArray(resp)) return resp;

  const root = resp?.result ?? resp?.data ?? resp;
  if (Array.isArray(root)) return root;

  const direct =
    root?.services ??
    root?.doctor?.services ??
    root?.result?.services ??
    root?.result?.doctor?.services;

  if (Array.isArray(direct)) return direct;

  const allUser = root?.allUser ?? root?.result?.allUser ?? root?.data?.allUser;
  if (Array.isArray(allUser)) {
    const doc = allUser.find(
      (u: any) => String(u?.userType ?? "").toLowerCase() === "doctor",
    );
    if (Array.isArray(doc?.services)) return doc.services;
  }

  return [];
};

export const formatExpDate = (raw: any) => {
  if (!raw) return "";
  const d = new Date(String(raw));
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return String(raw);
};
