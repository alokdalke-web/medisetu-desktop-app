import { useEffect, useMemo, useRef, useState } from "react";
import { IoClose, IoMenu, IoArrowUp, IoSearch } from "react-icons/io5";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router";
import remarkGfm from "remark-gfm";
import Images from "../../constants/images";

// ─── Section Registry ────────────────────────────────────────────────────────
const guideSections = [
  {
    id: "overview",
    title: "Overview",
    file: "docs/overview.md",
    subtitle: "Platform guide",
    category: "Getting Started",
    icon: "📋",
  },
  {
    id: "onboarding",
    title: "Onboarding Setup",
    file: "docs/onboarding.md",
    subtitle: "Clinic setup guide",
    category: "Getting Started",
    icon: "🚀",
  },
  {
    id: "admin",
    title: "Administrator",
    file: "docs/admin.md",
    subtitle: "Clinic administration",
    category: "Role Guides",
    icon: "🛡️",
  },
  {
    id: "doctor",
    title: "Doctor",
    file: "docs/doctor.md",
    subtitle: "Clinical workflow",
    category: "Role Guides",
    icon: "🩺",
  },
  {
    id: "receptionist",
    title: "Receptionist",
    file: "docs/receptionist.md",
    subtitle: "Front desk operations",
    category: "Role Guides",
    icon: "🗓️",
  },
  {
    id: "lab",
    title: "Lab Assistant",
    file: "docs/lab.md",
    subtitle: "Laboratory workflow",
    category: "Role Guides",
    icon: "🔬",
  },
  {
    id: "pharmacy",
    title: "Pharmacist",
    file: "docs/pharmacy.md",
    subtitle: "Pharmacy operations",
    category: "Role Guides",
    icon: "💊",
  },
  {
    id: "dashboard-guide",
    title: "Dashboard",
    file: "docs/dashboard/overview.md",
    subtitle: "Overview & common features",
    category: "Feature Guides",
    icon: "📊",
  },
  {
    id: "dashboard-admin",
    title: "Admin Dashboard",
    file: "docs/dashboard/admin.md",
    subtitle: "Revenue, metrics & charts",
    category: "Feature Guides",
    icon: "🛡️",
    parent: "dashboard-guide",
  },
  {
    id: "dashboard-doctor",
    title: "Doctor Dashboard",
    file: "docs/dashboard/doctor.md",
    subtitle: "Schedule & patient queue",
    category: "Feature Guides",
    icon: "🩺",
    parent: "dashboard-guide",
  },
  {
    id: "dashboard-receptionist",
    title: "Receptionist Dashboard",
    file: "docs/dashboard/receptionist.md",
    subtitle: "Check-ins & availability",
    category: "Feature Guides",
    icon: "🗓️",
    parent: "dashboard-guide",
  },
  {
    id: "dashboard-lab",
    title: "Lab Dashboard",
    file: "docs/dashboard/lab.md",
    subtitle: "Tests & sample tracking",
    category: "Feature Guides",
    icon: "🔬",
    parent: "dashboard-guide",
  },
  {
    id: "dashboard-pharmacy",
    title: "Pharmacy Dashboard",
    file: "docs/dashboard/pharmacy.md",
    subtitle: "Sales & inventory health",
    category: "Feature Guides",
    icon: "💊",
    parent: "dashboard-guide",
  },
  {
    id: "appointments-guide",
    title: "Appointments",
    file: "docs/appointments/overview.md",
    subtitle: "Scheduling & queue",
    category: "Feature Guides",
    icon: "📅",
  },
  {
    id: "patients-guide",
    title: "Patients",
    file: "docs/patients/overview.md",
    subtitle: "Records & registration",
    category: "Feature Guides",
    icon: "👥",
  },
  {
    id: "payments-guide",
    title: "Payments",
    file: "docs/payments/overview.md",
    subtitle: "Transactions & billing",
    category: "Feature Guides",
    icon: "💳",
  },
  {
    id: "users-guide",
    title: "Users",
    file: "docs/users/overview.md",
    subtitle: "Staff accounts & roles",
    category: "Feature Guides",
    icon: "👤",
  },
  {
    id: "subscription-guide",
    title: "Subscription",
    file: "docs/subscription/overview.md",
    subtitle: "Plans & add-ons",
    category: "Feature Guides",
    icon: "⭐",
  },
  {
    id: "reports-guide",
    title: "Reports",
    file: "docs/reports/overview.md",
    subtitle: "Analytics & insights",
    category: "Feature Guides",
    icon: "📈",
  },
  {
    id: "noshow-guide",
    title: "No-Show",
    file: "docs/noshow/overview.md",
    subtitle: "Tracking & follow-up",
    category: "Feature Guides",
    icon: "🚫",
  },
  {
    id: "test-catalog-guide",
    title: "Test Catalog",
    file: "docs/test-catalog/overview.md",
    subtitle: "Lab tests & ranges",
    category: "Feature Guides",
    icon: "🧪",
  },
  {
    id: "profile-guide",
    title: "Profile & Settings",
    file: "docs/profile/overview.md",
    subtitle: "Clinic configuration",
    category: "Feature Guides",
    icon: "⚙️",
  },
  {
    id: "pharmacy-guide",
    title: "Pharmacy & Inventory",
    file: "docs/pharmacy/overview.md",
    subtitle: "Medicines, stock, sales & sub",
    category: "Feature Guides",
    icon: "💊",
  },
  {
    id: "pharmacy-guide-prescriptions",
    title: "Pharmacy: Prescriptions",
    file: "docs/pharmacy/overview.md",
    subtitle: "Dispensing & queue",
    category: "Feature Guides",
    icon: "📋",
    parent: "pharmacy-guide",
  },
  {
    id: "pharmacy-guide-medicines",
    title: "Pharmacy: Medicines",
    file: "docs/pharmacy/overview.md",
    subtitle: "Medicines catalog",
    category: "Feature Guides",
    icon: "📦",
    parent: "pharmacy-guide",
  },
  {
    id: "pharmacy-guide-stock",
    title: "Pharmacy: Stock",
    file: "docs/pharmacy/overview.md",
    subtitle: "Batch & expiry tracking",
    category: "Feature Guides",
    icon: "📊",
    parent: "pharmacy-guide",
  },
  {
    id: "pharmacy-guide-sales",
    title: "Pharmacy: Sales",
    file: "docs/pharmacy/overview.md",
    subtitle: "POS invoicing & refunds",
    category: "Feature Guides",
    icon: "💳",
    parent: "pharmacy-guide",
  },
  {
    id: "pharmacy-guide-suppliers",
    title: "Pharmacy: Suppliers",
    file: "docs/pharmacy/overview.md",
    subtitle: "Suppliers & compliance",
    category: "Feature Guides",
    icon: "👥",
    parent: "pharmacy-guide",
  },
  {
    id: "pharmacy-guide-subscriptions",
    title: "Pharmacy: Subscriptions",
    file: "docs/pharmacy/overview.md",
    subtitle: "Refills & schedules",
    category: "Feature Guides",
    icon: "⭐",
    parent: "pharmacy-guide",
  },
];

const ACCENT = "#30887C";
const ACCENT_DARK = "#1a5e55";
const ACCENT_LIGHT = "#4fbfa8";
const ACCENT_ULTRA_LIGHT = "#e8f5f2";

function getSectionFromParam(search: string): string | null {
  const from = new URLSearchParams(search).get("from") || "";
  if (from.includes("lab")) return "lab";
  if (from.includes("pharmacy")) return "pharmacy";
  if (from.includes("admin")) return "admin";
  if (from.includes("appointment") || from.includes("patients")) return "doctor";
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

interface TocItem {
  text: string;
  level: 2 | 3;
  slug: string;
}

function extractToc(md: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = md.split("\n");
  let inTocBlock = false;
  for (const line of lines) {
    if (/^##\s+Table of Contents/i.test(line)) {
      inTocBlock = true;
      continue;
    }
    if (inTocBlock && /^##\s+/.test(line)) {
      inTocBlock = false;
    }
    if (inTocBlock) continue;

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      items.push({ text, level: 2, slug: slugify(text) });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1].trim();
      items.push({ text, level: 3, slug: slugify(text) });
    }
  }
  return items;
}

interface ParsedDoc {
  h1: string;
  intro: string;
  body: string;
}

function parseDocument(md: string): ParsedDoc {
  const lines = md.split("\n");
  let h1 = "";
  let foundH1 = false;
  const bodyLines: string[] = [];
  const introLines: string[] = [];
  let pastIntro = false;

  for (const line of lines) {
    if (!foundH1 && line.startsWith("# ")) {
      h1 = line.slice(2).trim();
      foundH1 = true;
      continue;
    }
    if (foundH1 && !pastIntro) {
      if (line.startsWith("##") || /^---\s*$/.test(line)) {
        pastIntro = true;
      } else if (line.trim()) {
        introLines.push(line);
      }
    }
    bodyLines.push(line);
  }

  const intro = introLines
    .join(" ")
    .replace(/^>+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { h1, intro, body: bodyLines.join("\n").trim() };
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const IconInfo = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconWarning = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconClock = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconLayers = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IconLink = ({ size = 12, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const IconArrowRight = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconBook = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

// ─── Callout Detection ───────────────────────────────────────────────────────
type CalloutType = "note" | "tip" | "warning" | "important";

function detectCallout(text: string): { type: CalloutType; content: string } | null {
  const lower = text.trim().toLowerCase();
  if (lower.startsWith("note:") || lower.startsWith("note ")) {
    return { type: "note", content: text.replace(/^note:?\s*/i, "") };
  }
  if (lower.startsWith("tip:") || lower.startsWith("tip ")) {
    return { type: "tip", content: text.replace(/^tip:?\s*/i, "") };
  }
  if (lower.startsWith("warning:") || lower.startsWith("warning ")) {
    return { type: "warning", content: text.replace(/^warning:?\s*/i, "") };
  }
  if (lower.startsWith("important:") || lower.startsWith("important ") || lower.startsWith("critical:") || lower.startsWith("critical ")) {
    return { type: "important", content: text.replace(/^(important|critical):?\s*/i, "") };
  }
  return null;
}

const CALLOUT_STYLES: Record<CalloutType, { bg: string; border: string; icon: string; label: string }> = {
  note: { bg: "#eff6ff", border: "#3b82f6", icon: "#2563eb", label: "Note" },
  tip: { bg: "#ecfdf5", border: ACCENT, icon: ACCENT_DARK, label: "Tip" },
  warning: { bg: "#fffbeb", border: "#f59e0b", icon: "#b45309", label: "Warning" },
  important: { bg: "#fef2f2", border: "#ef4444", icon: "#b91c1c", label: "Important" },
};

// ─── Markdown Components ─────────────────────────────────────────────────────
function makeComponents(sectionCounter: { current: number }, dark?: boolean): Components {
  const mdText = dark ? "#e2e8f0" : "#374151";
  const mdHeading = dark ? "#f1f5f9" : "#0f172a";
  const mdMuted = dark ? "#94a3b8" : "#475569";
  const mdBorder = dark ? "#334155" : "#e2e8f0";
  const mdTableHead = dark ? `${ACCENT}12` : `${ACCENT}06`;

  return {
    h2: ({ children, ...p }) => {
      const text = String(children);
      sectionCounter.current += 1;
      const num = sectionCounter.current;
      const slug = slugify(text);
      return (
        <h2
          id={slug}
          className="doc-heading"
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: mdHeading,
            margin: "60px 0 20px",
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
            scrollMarginTop: 32,
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            position: "relative",
            paddingBottom: 14,
            borderBottom: `1px solid ${mdBorder}`,
          }}
          {...p}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              borderRadius: 6,
              padding: "3px 8px",
              fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
              flexShrink: 0,
              letterSpacing: "0.02em",
              minWidth: 28,
              textAlign: "center",
            }}
          >
            {String(num).padStart(2, "0")}
          </span>
          <span style={{ flex: 1 }}>{children}</span>
          <a
            href={`#${slug}`}
            className="anchor-link"
            aria-label="Link to section"
            style={{
              opacity: 0,
              color: ACCENT,
              transition: "opacity 0.15s",
              flexShrink: 0,
              padding: 4,
              textDecoration: "none",
            }}
          >
            <IconLink size={14} />
          </a>
        </h2>
      );
    },
    h3: ({ children, ...p }) => {
      const text = String(children);
      const slug = slugify(text);
      return (
        <h3
          id={slug}
          className="doc-heading"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: mdHeading,
            margin: "36px 0 12px",
            letterSpacing: "-0.015em",
            lineHeight: 1.4,
            scrollMarginTop: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingLeft: 14,
            borderLeft: `3px solid ${ACCENT}40`,
          }}
          {...p}
        >
          <span style={{ flex: 1 }}>{children}</span>
          <a
            href={`#${slug}`}
            className="anchor-link"
            aria-label="Link to section"
            style={{
              opacity: 0,
              color: ACCENT,
              transition: "opacity 0.15s",
              flexShrink: 0,
              padding: 4,
              textDecoration: "none",
            }}
          >
            <IconLink size={12} />
          </a>
        </h3>
      );
    },
    h4: ({ children, ...p }) => (
      <h4
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: mdHeading,
          margin: "28px 0 8px",
          lineHeight: 1.4,
        }}
        {...p}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...p }) => (
      <p
        style={{
          color: mdText,
          lineHeight: 1.8,
          margin: "0 0 20px",
          fontSize: 15.5,
        }}
        {...p}
      >
        {children}
      </p>
    ),
    ul: ({ children, ...p }) => (
      <ul
        style={{
          margin: "0 0 20px",
          paddingLeft: 22,
          color: mdText,
          fontSize: 15.5,
          lineHeight: 1.75,
        }}
        {...p}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...p }) => (
      <ol
        style={{
          margin: "0 0 20px",
          paddingLeft: 24,
          color: mdText,
          fontSize: 15.5,
          lineHeight: 1.75,
        }}
        {...p}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...p }) => (
      <li
        style={{
          marginBottom: 10,
          color: mdText,
          lineHeight: 1.75,
        }}
        {...p}
      >
        {children}
      </li>
    ),
    strong: ({ children, ...p }) => (
      <strong style={{ color: mdHeading, fontWeight: 600 }} {...p}>
        {children}
      </strong>
    ),
    em: ({ children, ...p }) => (
      <em style={{ color: mdMuted, fontStyle: "italic" }} {...p}>
        {children}
      </em>
    ),
    a: ({ href, children, ...p }) => (
      <a
        href={href}
        style={{
          color: ACCENT,
          textDecoration: "none",
          fontWeight: 500,
          borderBottom: `1px solid ${ACCENT}40`,
          transition: "border-color 0.2s, background 0.2s, color 0.2s",
          paddingBottom: 1,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = ACCENT;
          (e.currentTarget as HTMLAnchorElement).style.background = ACCENT_ULTRA_LIGHT;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = `${ACCENT}40`;
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        }}
        {...p}
      >
        {children}
      </a>
    ),
    code: ({ inline, children, ...p }: any) =>
      inline ? (
        <code
          style={{
            background: `${ACCENT}08`,
            color: ACCENT_DARK,
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: "0.87em",
            fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
            fontWeight: 500,
            border: `1px solid ${ACCENT}18`,
          }}
          {...p}
        >
          {children}
        </code>
      ) : (
        <pre
          style={{
            background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
            color: "#e2e8f0",
            padding: "22px 26px",
            borderRadius: 14,
            fontSize: 13.5,
            fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
            overflowX: "auto",
            margin: "0 0 24px",
            lineHeight: 1.7,
            border: "1px solid #334155",
            boxShadow: "0 4px 16px rgba(15,23,42,0.12)",
          }}
        >
          <code {...p}>{children}</code>
        </pre>
      ),
    blockquote: ({ children }) => {
      const firstText = (() => {
        const arr = Array.isArray(children) ? children : [children];
        for (const c of arr) {
          if (typeof c === "string") return c;
          if (c && typeof c === "object" && "props" in c) {
            const props = (c as any).props;
            if (props?.children) {
              const inner = Array.isArray(props.children) ? props.children : [props.children];
              for (const i of inner) {
                if (typeof i === "string") return i;
                if (i && typeof i === "object" && "props" in i) {
                  const ic = (i as any).props?.children;
                  if (typeof ic === "string") return ic;
                }
              }
            }
          }
        }
        return "";
      })();

      const callout = detectCallout(firstText);
      const type: CalloutType = callout?.type || "note";
      const styles = CALLOUT_STYLES[type];

      const calloutBg = dark ? `${styles.border}12` : styles.bg;
      const calloutBorder = dark ? `${styles.border}40` : `${styles.border}25`;
      const calloutText = dark ? "#e2e8f0" : "#1e293b";

      return (
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "18px 22px",
            margin: "0 0 24px",
            background: calloutBg,
            border: `1px solid ${calloutBorder}`,
            borderLeft: `4px solid ${styles.border}`,
            borderRadius: 12,
            boxShadow: dark ? "none" : `0 2px 8px ${styles.border}08`,
          }}
        >
          <div style={{ flexShrink: 0, color: styles.icon, marginTop: 2 }}>
            {type === "warning" || type === "important" ? (
              <IconWarning size={18} color={styles.icon} />
            ) : (
              <IconInfo size={18} color={styles.icon} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: styles.icon,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              {styles.label}
            </div>
            <div
              style={{ color: calloutText, fontSize: 14.5, lineHeight: 1.7 }}
              className="callout-body"
            >
              {children}
            </div>
          </div>
        </div>
      );
    },
    hr: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "52px 0",
          gap: 6,
        }}
      >
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}20)` }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: i === 1 ? ACCENT : "#cbd5e1",
              }}
            />
          ))}
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}20, transparent)` }} />
      </div>
    ),
    table: ({ children, ...p }) => (
      <div
        style={{
          overflowX: "auto",
          margin: "0 0 26px",
          border: `1px solid ${mdBorder}`,
          borderRadius: 14,
          background: dark ? "#0f172a" : "#fff",
          boxShadow: dark ? "none" : "0 1px 4px rgba(15,23,42,0.04)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5 }}
          {...p}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...p }) => (
      <thead
        style={{ background: mdTableHead }}
        {...p}
      >
        {children}
      </thead>
    ),
    th: ({ children, ...p }) => (
      <th
        style={{
          padding: "13px 18px",
          textAlign: "left",
          fontSize: 12,
          fontWeight: 700,
          color: dark ? ACCENT_LIGHT : ACCENT_DARK,
          borderBottom: `2px solid ${mdBorder}`,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
        {...p}
      >
        {children}
      </th>
    ),
    td: ({ children, ...p }) => (
      <td
        style={{
          padding: "12px 18px",
          fontSize: 14.5,
          color: mdText,
          borderTop: `1px solid ${dark ? "#1e293b" : "#f1f5f9"}`,
          lineHeight: 1.65,
        }}
        {...p}
      >
        {children}
      </td>
    ),
    img: ({ src, alt, ...p }) => (
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: "100%",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          margin: "0 0 24px",
          boxShadow: "0 4px 16px rgba(15,23,42,0.06)",
        }}
        {...p}
      />
    ),
    details: ({ children, ...p }) => (
      <details
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "18px 22px",
          margin: "0 0 14px",
          background: "linear-gradient(180deg, #fafbfc 0%, #fff 100%)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        {...p}
      >
        {children}
      </details>
    ),
    summary: ({ children, ...p }) => (
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          color: "#0f172a",
          fontSize: 15,
          listStyle: "none",
          outline: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
        {...p}
      >
        <span
          style={{
            display: "inline-flex",
            width: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
            color: ACCENT,
            fontSize: 11,
            flexShrink: 0,
            background: ACCENT_ULTRA_LIGHT,
            borderRadius: 5,
          }}
        >
          ▸
        </span>
        <span>{children}</span>
      </summary>
    ),
  };
}

// ─── Global Styles (injected once) ───────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
  @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.6 } }

  .doc-heading:hover .anchor-link { opacity: 1 !important; }
  .doc-heading .anchor-link:hover { background: ${ACCENT}15; border-radius: 6px; }

  .nav-card { transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s; }
  .nav-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(48,136,124,0.1); }
  .nav-card:hover .nav-arrow { transform: translateX(4px); }
  .nav-card-prev:hover .nav-arrow { transform: translateX(-4px); }

  .callout-body p:last-child { margin-bottom: 0; }
  .callout-body p { margin-bottom: 10px; }

  details[open] summary span:first-child { transform: rotate(90deg); }
  details summary span:first-child { transition: transform 0.2s; }
  details:hover { border-color: ${ACCENT}40; box-shadow: 0 2px 8px ${ACCENT}08; }

  .doc-content { animation: fadeIn 0.5s ease-out; }

  .back-to-top {
    animation: slideUp 0.3s ease-out;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .back-to-top:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px ${ACCENT}45;
  }

  .sidebar-item {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar-item:hover {
    transform: translateX(2px);
  }

  .toc-item {
    transition: all 0.15s ease;
  }
  .toc-item:hover {
    background: ${ACCENT}06;
    border-radius: 6px;
  }

  .hero-gradient {
    background: linear-gradient(135deg, #ffffff 0%, ${ACCENT}04 40%, ${ACCENT}08 100%);
  }

  :root.dark .hero-gradient {
    background: linear-gradient(135deg, #0f172a 0%, ${ACCENT}08 40%, ${ACCENT}12 100%);
  }

  .loading-skeleton {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .progress-glow {
    box-shadow: 0 0 12px ${ACCENT}60, 0 0 4px ${ACCENT}40;
  }

  /* Scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar { width: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

const sectionIdToSlug: Record<string, string> = {
  "pharmacy-guide-prescriptions": "prescription-queue",
  "pharmacy-guide-medicines": "medicines-inventory",
  "pharmacy-guide-stock": "stock-management",
  "pharmacy-guide-sales": "sales-billing",
  "pharmacy-guide-suppliers": "supplier-management",
  "pharmacy-guide-subscriptions": "patient-subscriptions"
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const GuidelinesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const [activeId, setActiveId] = useState<string>("overview");
  const [rawContent, setRawContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Dark mode detection ────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Color palette based on mode
  const colors = isDark
    ? {
        pageBg: "#0b1321",
        cardBg: "#111726",
        sidebarBg: "#111726",
        headerBg: "rgba(17,23,38,0.92)",
        border: "#273244",
        borderLight: "#1e293b",
        text: "#e2e8f0",
        textMuted: "#94a3b8",
        textHeading: "#f1f5f9",
        hoverBg: "#1e293b",
        activeBg: `${ACCENT}15`,
        activeRing: `${ACCENT}30`,
        progressTrack: "#1e293b",
        searchBg: "#1e293b",
        searchBorder: "#334155",
        tocActive: ACCENT,
        codeBg: `${ACCENT}15`,
        codeBorder: `${ACCENT}25`,
        codeColor: ACCENT_LIGHT,
      }
    : {
        pageBg: "#f8fafb",
        cardBg: "#fff",
        sidebarBg: "#fff",
        headerBg: "rgba(255,255,255,0.92)",
        border: "#e8ecf0",
        borderLight: "#f1f5f9",
        text: "#374151",
        textMuted: "#94a3b8",
        textHeading: "#0f172a",
        hoverBg: "#f8fafc",
        activeBg: `${ACCENT}10`,
        activeRing: `${ACCENT}20`,
        progressTrack: "#e2e8f0",
        searchBg: "#f1f5f9",
        searchBorder: "#e2e8f0",
        tocActive: ACCENT_DARK,
        codeBg: `${ACCENT}08`,
        codeBorder: `${ACCENT}18`,
        codeColor: ACCENT_DARK,
      };

  const isMobile = windowWidth <= 768;
  const isTabletOrBelow = windowWidth <= 1024;
  const contentXPadding = isMobile ? 20 : isTabletOrBelow ? 32 : 40;
  const contentTopGap = isMobile ? 24 : 28;
  const heroBottomGap = isMobile ? 36 : 44;

  const activeSection =
    guideSections.find((s) => s.id === activeId) || guideSections[0];
  const parsedDoc = useMemo(() => parseDocument(rawContent), [rawContent]);
  const toc = useMemo(() => extractToc(rawContent), [rawContent]);
  const hasDesktopToc = !isTabletOrBelow && toc.length > 0;
  const contentMaxWidth = isTabletOrBelow ? 780 : hasDesktopToc ? 920 : 1280;
  const readingTime = useMemo(
    () => estimateReadingTime(rawContent),
    [rawContent],
  );

  // Filter TOC based on search
  const filteredToc = useMemo(() => {
    if (!searchQuery.trim()) return toc;
    const q = searchQuery.toLowerCase();
    return toc.filter((item) => item.text.toLowerCase().includes(q));
  }, [toc, searchQuery]);

  const sectionCounter = useRef({ current: 0 });
  sectionCounter.current.current = 0;

  const components = useMemo(
    () => makeComponents(sectionCounter.current, isDark),
    [isDark],
  );

  const cleanedBody = useMemo(() => {
    return parsedDoc.body
      .replace(/^##\s+Table of Contents[\s\S]*?(?=\n##\s+|\n---|\n$)/im, "")
      .replace(/^---\s*$/m, "")
      .trim();
  }, [parsedDoc.body]);

  const groupedSections = useMemo(() => {
    const groups: Record<string, typeof guideSections> = {};
    for (const s of guideSections) {
      if ((s as any).parent) continue; // children handled inline
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    }
    return groups;
  }, []);

  // Get children for a given parent section
  const getChildren = (parentId: string) =>
    guideSections.filter((s) => (s as any).parent === parentId);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isTabletOrBelow) setIsSidebarOpen(false);
  }, [isTabletOrBelow]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sec = params.get("section");
    if (sec && guideSections.find((s) => s.id === sec)) {
      setActiveId(sec);
      return;
    }
    const from = getSectionFromParam(location.search);
    if (from) setActiveId(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("section") !== activeId) {
      params.set("section", activeId);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [activeId, location.search, navigate]);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: "smooth" });
    if (isTabletOrBelow) setIsSidebarOpen(false);
  }, [activeId, isTabletOrBelow]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/";
        const section = guideSections.find((s) => s.id === activeId) || guideSections[0];
        const file = section.file.replace(/^\//, "");
        const text = await (await fetch(`${base}${file}`)).text();
        setRawContent(text);
      } catch {
        setRawContent(
          "# Error\n\nFailed to load documentation. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [activeId]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const handleScroll = () => {
      const scrollTop = main.scrollTop;
      const scrollHeight = main.scrollHeight - main.clientHeight;
      setProgress(scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0);
      setShowBackToTop(scrollTop > 400);

      if (toc.length > 0) {
        const headings = toc
          .map((h) => document.getElementById(h.slug))
          .filter((el): el is HTMLElement => el !== null);

        let current = "";
        for (const el of headings) {
          if (el.offsetTop - 100 <= scrollTop) {
            current = el.id;
          }
        }
        setActiveHeading(current);
      }
    };

    main.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => main.removeEventListener("scroll", handleScroll);
  }, [toc, rawContent]);

  const scrollTo = (slug: string) => {
    const el = document.getElementById(slug);
    if (el && mainRef.current) {
      const offsetTop = el.offsetTop - 32;
      mainRef.current.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to hash or mapped section id on load or when content changes
  useEffect(() => {
    if (!loading && rawContent) {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const timer = setTimeout(() => {
          scrollTo(hash);
        }, 150);
        return () => clearTimeout(timer);
      } else {
        const mappedSlug = sectionIdToSlug[activeId];
        if (mappedSlug) {
          const timer = setTimeout(() => {
            scrollTo(mappedSlug);
          }, 150);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [loading, rawContent, activeId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: colors.pageBg,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        zIndex: 50,
        overflow: "hidden",
        color: colors.textHeading,
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* READING PROGRESS BAR */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: colors.progressTrack,
          zIndex: 100,
          pointerEvents: "none",
        }}
      >
        <div
          className="progress-glow"
          style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${ACCENT_LIGHT}, ${ACCENT}, ${ACCENT_DARK})`,
            transition: "width 0.15s linear",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      {/* TOPBAR */}
      <header
        style={{
          background: colors.headerBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${colors.border}`,
          padding: isMobile ? "10px 16px" : "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            flex: 1,
          }}
        >
          {isTabletOrBelow && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <IoMenu style={{ width: 18, height: 18, color: colors.textMuted }} />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img
              src={Images.mediSetuLogo}
              alt="MediSetu"
              style={{
                height: 32,
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            {!isMobile && (
              <div
                style={{
                  fontSize: 11.5,
                  color: colors.textMuted,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  borderLeft: `1px solid ${colors.border}`,
                  paddingLeft: 12,
                }}
              >
                <IconBook size={11} color={colors.textMuted} />
                Documentation
              </div>
            )}
          </div>
        </div>

        {/* Current section indicator in header */}
        {!isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: ACCENT_ULTRA_LIGHT,
              borderRadius: 8,
              border: `1px solid ${ACCENT}15`,
            }}
          >
            <span style={{ fontSize: 14 }}>{activeSection.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: ACCENT_DARK }}>
              {activeSection.title}
            </span>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={() => {
            document.documentElement.classList.toggle("dark");
            setIsDark(!isDark);
          }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.hoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.cardBg;
          }}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          aria-label="Close"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            background: colors.cardBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s, border-color 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? "#2d1b1b" : "#fef2f2";
            e.currentTarget.style.borderColor = isDark ? "#7f1d1d" : "#fca5a5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.cardBg;
            e.currentTarget.style.borderColor = colors.border;
          }}
        >
          <IoClose style={{ width: 18, height: 18, color: isDark ? "#f87171" : "#64748b" }} />
        </button>
      </header>

      {/* BODY */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* MOBILE OVERLAY */}
        {isTabletOrBelow && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 40,
              transition: "opacity 0.25s",
            }}
          />
        )}

        {/* SIDEBAR */}
        <aside
          style={{
            width: 280,
            background: colors.sidebarBg,
            borderRight: `1px solid ${colors.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
            position: isTabletOrBelow ? "fixed" : "relative",
            top: isTabletOrBelow ? 0 : "auto",
            left: isTabletOrBelow ? 0 : "auto",
            bottom: isTabletOrBelow ? 0 : "auto",
            height: isTabletOrBelow ? "100vh" : "100%",
            transform: isTabletOrBelow
              ? isSidebarOpen
                ? "translateX(0)"
                : "translateX(-100%)"
              : "translateX(0)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 50,
            boxShadow: isTabletOrBelow && isSidebarOpen
              ? "0 16px 48px rgba(15,23,42,0.2)"
              : "none",
          }}
        >
          {isTabletOrBelow && (
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #e8ecf0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconBook size={16} color={ACCENT} />
                <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                  Documentation
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IoClose style={{ width: 16, height: 16, color: "#334155" }} />
              </button>
            </div>
          )}

          <nav
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 12px",
            }}
          >
            {Object.entries(groupedSections).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 28 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: colors.textMuted,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "0 12px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ width: 16, height: 1, background: colors.border }} />
                  {category}
                </div>

                {items.map((s) => {
                  const on = s.id === activeId;
                  const children = getChildren(s.id);
                  const hasChildren = children.length > 0;
                  const isChildActive = children.some((c) => c.id === activeId);
                  const expanded = on || isChildActive;

                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => setActiveId(s.id)}
                        className="sidebar-item"
                        style={{
                          width: "100%",
                          display: "block",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          background: (on || isChildActive)
                            ? colors.activeBg
                            : "transparent",
                          color: (on || isChildActive) ? (isDark ? ACCENT_LIGHT : ACCENT_DARK) : colors.text,
                          fontWeight: (on || isChildActive) ? 600 : 500,
                          fontSize: 14,
                          textAlign: "left",
                          marginBottom: 3,
                          outline: "none",
                          boxShadow: on
                            ? `0 0 0 1px ${colors.activeRing}, 0 2px 8px ${ACCENT}08`
                            : "none",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => {
                          if (!on && !isChildActive) e.currentTarget.style.background = colors.hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          if (!on && !isChildActive) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>{s.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {on && (
                                <span
                                  style={{
                                    width: 3,
                                    height: 14,
                                    background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                                    borderRadius: 2,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span>{s.title}</span>
                              {hasChildren && (
                                <span style={{ fontSize: 10, color: colors.textMuted, marginLeft: "auto" }}>
                                  {expanded ? "▾" : "▸"}
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 11.5,
                                fontWeight: 400,
                                color: (on || isChildActive) ? ACCENT : colors.textMuted,
                                marginTop: 2,
                                paddingLeft: on ? 9 : 0,
                              }}
                            >
                              {s.subtitle}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Child items (indented sub-nav) */}
                      {hasChildren && expanded && (
                        <div style={{ paddingLeft: 24, marginBottom: 4, marginTop: 2 }}>
                          {children.map((child) => {
                            const childOn = child.id === activeId;
                            return (
                              <button
                                key={child.id}
                                onClick={() => setActiveId(child.id)}
                                className="sidebar-item"
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 12px",
                                  borderRadius: 8,
                                  border: "none",
                                  cursor: "pointer",
                                  background: childOn ? `${ACCENT}08` : "transparent",
                                  color: childOn ? (isDark ? ACCENT_LIGHT : ACCENT_DARK) : colors.textMuted,
                                  fontWeight: childOn ? 600 : 400,
                                  fontSize: 12.5,
                                  textAlign: "left",
                                  marginBottom: 1,
                                  outline: "none",
                                  fontFamily: "inherit",
                                  borderLeft: childOn
                                    ? `2px solid ${ACCENT}`
                                    : `2px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                                }}
                                onMouseEnter={(e) => {
                                  if (!childOn) {
                                    e.currentTarget.style.background = colors.hoverBg;
                                    e.currentTarget.style.color = colors.text;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!childOn) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = colors.textMuted;
                                  }
                                }}
                              >
                                <span style={{ fontSize: 12, flexShrink: 0 }}>{child.icon}</span>
                                <span style={{ lineHeight: 1.3 }}>{child.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          <div
            style={{
              padding: "18px 20px",
              borderTop: `1px solid ${colors.border}`,
              background: isDark
                ? "linear-gradient(180deg, #0f1728 0%, #111726 100%)"
                : "linear-gradient(180deg, #fafbfc 0%, #fff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.textMuted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Need Help?
            </div>
            <a
              href="mailto:support@infinitymedisetu.com"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: ACCENT,
                fontWeight: 500,
                textDecoration: "none",
                padding: "8px 12px",
                background: isDark ? `${ACCENT}15` : ACCENT_ULTRA_LIGHT,
                borderRadius: 8,
                border: `1px solid ${ACCENT}15`,
                transition: "background 0.15s",
              }}
            >
              <span>✉️</span>
              <span style={{ wordBreak: "break-all", lineHeight: 1.4 }}>
                support@infinitymedisetu.com
              </span>
            </a>
          </div>
        </aside>

        {/* MAIN */}
        <main
          ref={mainRef}
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            minWidth: 0,
            background: colors.cardBg,
            position: "relative",
          }}
        >
          <div
            style={{
              maxWidth: contentMaxWidth,
              margin: isTabletOrBelow ? "0 auto" : "0 0 0 28px",
              padding: `0 ${contentXPadding}px ${isMobile ? 64 : 96}px`,
            }}
          >
            {loading ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 400,
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: `3px solid ${ACCENT}20`,
                    borderTopColor: ACCENT,
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <div style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
                  Loading documentation...
                </div>
                {/* Skeleton preview */}
                <div style={{ width: "100%", maxWidth: 500, marginTop: 20 }}>
                  <div className="loading-skeleton" style={{ height: 28, width: "70%", marginBottom: 16 }} />
                  <div className="loading-skeleton" style={{ height: 14, width: "100%", marginBottom: 10 }} />
                  <div className="loading-skeleton" style={{ height: 14, width: "90%", marginBottom: 10 }} />
                  <div className="loading-skeleton" style={{ height: 14, width: "60%", marginBottom: 10 }} />
                </div>
              </div>
            ) : (
              <div className="doc-content">
                {/* HERO */}
                <div
                  className="hero-gradient"
                  style={{
                    margin: `${contentTopGap}px -${contentXPadding}px ${heroBottomGap}px`,
                    padding: isMobile
                      ? `32px ${contentXPadding}px`
                      : `44px ${contentXPadding}px`,
                    borderBottom: `1px solid ${colors.border}`,
                    borderRadius: isMobile ? 0 : "0 0 24px 24px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Decorative circles */}
                  <div
                    style={{
                      position: "absolute",
                      top: -40,
                      right: -40,
                      width: 200,
                      height: 200,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${ACCENT}06 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -60,
                      left: -30,
                      width: 160,
                      height: 160,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${ACCENT}04 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }}
                  />

                  {/* Breadcrumb */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: 13,
                      color: colors.textMuted,
                      marginBottom: 20,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        cursor: "pointer",
                        fontWeight: 500,
                        color: colors.textMuted,
                        transition: "color 0.15s",
                      }}
                      onClick={() => setActiveId("overview")}
                      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = ACCENT; }}
                      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = colors.textMuted; }}
                    >
                      Docs
                    </span>
                    <span style={{ color: isDark ? "#475569" : "#cbd5e1", fontSize: 11 }}>›</span>
                    <span style={{ color: colors.text, fontWeight: 500 }}>
                      {activeSection.category}
                    </span>
                    <span style={{ color: isDark ? "#475569" : "#cbd5e1", fontSize: 11 }}>›</span>
                    <span style={{ color: isDark ? ACCENT_LIGHT : ACCENT_DARK, fontWeight: 600 }}>
                      {activeSection.title}
                    </span>
                  </div>

                  {/* Role Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      background: isDark ? "#1e293b" : "#fff",
                      border: `1px solid ${isDark ? "#334155" : `${ACCENT}20`}`,
                      borderRadius: 999,
                      marginBottom: 20,
                      boxShadow: isDark ? "none" : `0 2px 8px ${ACCENT}08`,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{activeSection.icon}</span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: isDark ? ACCENT_LIGHT : ACCENT_DARK,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {activeSection.subtitle}
                    </span>
                  </div>

                  {/* Title */}
                  <h1
                    style={{
                      fontSize: isMobile ? 34 : 44,
                      fontWeight: 800,
                      color: colors.textHeading,
                      margin: "0 0 16px",
                      lineHeight: 1.1,
                      letterSpacing: "-0.035em",
                      wordBreak: "break-word",
                      position: "relative",
                    }}
                  >
                    {parsedDoc.h1}
                  </h1>

                  {/* Intro */}
                  {parsedDoc.intro && (
                    <p
                      style={{
                        fontSize: isMobile ? 16 : 17.5,
                        color: colors.text,
                        lineHeight: 1.7,
                        margin: "0 0 28px",
                        fontWeight: 400,
                        maxWidth: 620,
                      }}
                    >
                      {parsedDoc.intro}
                    </p>
                  )}

                  {/* Meta strip */}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      paddingTop: 20,
                      borderTop: `1px solid ${isDark ? "#1e293b" : `${ACCENT}12`}`,
                      fontSize: 13,
                      color: colors.textMuted,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "5px 12px",
                        background: isDark ? "#1e293b" : "#fff",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <IconClock size={13} color={ACCENT} />
                      <span>
                        <strong style={{ color: colors.textHeading, fontWeight: 600 }}>
                          {readingTime}
                        </strong>{" "}
                        min read
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "5px 12px",
                        background: isDark ? "#1e293b" : "#fff",
                        borderRadius: 8,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <IconLayers size={13} color={ACCENT} />
                      <span>
                        <strong style={{ color: colors.textHeading, fontWeight: 600 }}>
                          {toc.filter((t) => t.level === 2).length}
                        </strong>{" "}
                        sections
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                <article
                  style={{
                    fontSize: 15.5,
                    color: colors.text,
                    lineHeight: 1.8,
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={components}
                  >
                    {cleanedBody}
                  </ReactMarkdown>
                </article>

                {/* PAGE FOOTER NAV */}
                <PageFooter current={activeId} onNavigate={setActiveId} isDark={isDark} />

                <div
                  style={{
                    marginTop: 56,
                    paddingTop: 24,
                    borderTop: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}`,
                    fontSize: 12,
                    color: "#94a3b8",
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14 }}>💚</span>
                  © {new Date().getFullYear()} Infinity MediSetu. All rights reserved.
                </div>
              </div>
            )}
          </div>
        </main>

        {/* TABLE OF CONTENTS */}
        {toc.length > 0 && !isTabletOrBelow && !loading && (
          <aside
            className="custom-scrollbar"
            style={{
              width: 260,
              background: colors.cardBg,
              borderLeft: `1px solid ${colors.border}`,
              overflowY: "auto",
              flexShrink: 0,
              padding: "32px 16px 56px 8px",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.textMuted,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 14,
                paddingLeft: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 12, height: 1, background: ACCENT }} />
              On this page
            </div>

            {/* TOC Search */}
            <div
              style={{
                margin: "0 8px 16px",
                position: "relative",
              }}
            >
              <IoSearch
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 13,
                  height: 13,
                  color: colors.textMuted,
                }}
              />
              <input
                type="text"
                placeholder="Filter sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  outline: "none",
                  background: isDark ? "#1e293b" : "#fafbfc",
                  color: colors.text,
                  fontFamily: "inherit",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ACCENT;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${ACCENT}10`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Progress indicator */}
            <div
              style={{
                margin: "0 16px 16px",
                height: 3,
                background: isDark ? "#1e293b" : "#f1f5f9",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${ACCENT_LIGHT}, ${ACCENT})`,
                  transition: "width 0.15s linear",
                  borderRadius: 2,
                }}
              />
            </div>

            <nav>
              {filteredToc.map((item, i) => {
                const isActive = activeHeading === item.slug;
                return (
                  <button
                    key={i}
                    onClick={() => scrollTo(item.slug)}
                    className="toc-item"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      fontSize: item.level === 2 ? 12.5 : 12,
                      color: isActive ? (isDark ? ACCENT_LIGHT : ACCENT_DARK) : colors.textMuted,
                      padding:
                        item.level === 2 ? "7px 12px 7px 16px" : "6px 12px 6px 30px",
                      border: "none",
                      background: isActive ? `${ACCENT}06` : "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "block",
                      marginBottom: 1,
                      fontWeight: isActive ? 600 : item.level === 2 ? 500 : 400,
                      lineHeight: 1.5,
                      borderLeft: isActive
                        ? `2px solid ${ACCENT}`
                        : "2px solid transparent",
                      borderRadius: isActive ? "0 6px 6px 0" : 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = colors.textHeading;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLButtonElement).style.color = colors.textMuted;
                    }}
                  >
                    {item.text}
                  </button>
                );
              })}
              {filteredToc.length === 0 && searchQuery && (
                <div style={{ padding: "12px 16px", fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
                  No matching sections
                </div>
              )}
            </nav>
          </aside>
        )}

        {/* BACK TO TOP */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="back-to-top"
            aria-label="Back to top"
            style={{
              position: "absolute",
              bottom: 28,
              right: isTabletOrBelow ? 28 : 284,
              width: 46,
              height: 46,
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 6px 20px ${ACCENT}45`,
              zIndex: 25,
            }}
          >
            <IoArrowUp style={{ width: 20, height: 20 }} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── PAGE FOOTER NAV ─────────────────────────────────────────────────────────
function PageFooter({
  current,
  onNavigate,
  isDark,
}: {
  current: string;
  onNavigate: (id: string) => void;
  isDark: boolean;
}) {
  const idx = guideSections.findIndex((s) => s.id === current);
  const prev = idx > 0 ? guideSections[idx - 1] : null;
  const next =
    idx >= 0 && idx < guideSections.length - 1 ? guideSections[idx + 1] : null;

  if (!prev && !next) return null;

  const cardBg = isDark ? "#1e293b" : "#fff";
  const cardBorder = isDark ? "#334155" : "#e8ecf0";
  const cardHoverBg = isDark ? `${ACCENT}15` : ACCENT_ULTRA_LIGHT;
  const titleColor = isDark ? "#f1f5f9" : "#0f172a";

  return (
    <div
      style={{
        marginTop: 72,
        paddingTop: 36,
        borderTop: `1px solid ${cardBorder}`,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      {prev ? (
        <button
          onClick={() => onNavigate(prev.id)}
          className="nav-card nav-card-prev"
          style={{
            padding: "20px 24px",
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ACCENT;
            e.currentTarget.style.background = cardHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = cardBorder;
            e.currentTarget.style.background = cardBg;
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="nav-arrow"
              style={{
                display: "inline-flex",
                transition: "transform 0.2s",
                transform: "rotate(180deg)",
              }}
            >
              <IconArrowRight size={12} color="#94a3b8" />
            </span>
            Previous
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{prev.icon}</span>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: titleColor,
              }}
            >
              {prev.title}
            </div>
          </div>
        </button>
      ) : (
        <div />
      )}

      {next ? (
        <button
          onClick={() => onNavigate(next.id)}
          className="nav-card"
          style={{
            padding: "20px 24px",
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            cursor: "pointer",
            textAlign: "right",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = ACCENT;
            e.currentTarget.style.background = cardHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = cardBorder;
            e.currentTarget.style.background = cardBg;
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "flex-end",
            }}
          >
            Next
            <span
              className="nav-arrow"
              style={{
                display: "inline-flex",
                transition: "transform 0.2s",
              }}
            >
              <IconArrowRight size={12} color="#94a3b8" />
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: titleColor,
              }}
            >
              {next.title}
            </div>
            <span style={{ fontSize: 16 }}>{next.icon}</span>
          </div>
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}
