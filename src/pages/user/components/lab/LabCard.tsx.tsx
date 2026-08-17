import { Button } from "@heroui/react";
import type { ReactNode } from "react";
import {
  FiArrowUpRight,
  FiMail,
  FiMapPin,
  FiPhoneCall
} from "react-icons/fi";
import { useNavigate } from "react-router";
import type { Lab } from "./labTypes";

const KNOWN_LAB_NAME_FIXES: Record<string, string> = {
  vijaynagr: "Vijay Nagar",
  vijaynagar: "Vijay Nagar",
};

const toReadableText = (value?: string | null, fallback = "—") => {
  const clean = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!clean || clean === "—") return fallback;

  const knownFix = KNOWN_LAB_NAME_FIXES[clean.toLowerCase().replace(/\s+/g, "")];
  if (knownFix) return knownFix;

  return clean
    .split(" ")
    .map((word) => {
      if (/^[A-Z0-9]{2,4}$/.test(word)) return word;
      if (/[A-Z]/.test(word) && /[a-z]/.test(word)) return word;

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

const formatLabName = (name?: string | null) => {
  const clean = String(name ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  const key = clean.toLowerCase().replace(/\s+/g, "");

  return KNOWN_LAB_NAME_FIXES[key] ?? toReadableText(clean, "Unnamed Lab");
};

const DetailRow = ({
  icon,
  label,
  value,
  valueClassName = "",
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  valueClassName?: string;
}) => (
  <div className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-slate-200">
      {icon}
    </span>
    <span className="shrink-0 text-slate-500">{label}</span>
    <span
      className={`min-w-0 truncate font-semibold text-slate-900 ${valueClassName}`}
      title={String(value ?? "")}
    >
      {value?.trim() || "—"}
    </span>
  </div>
);

const LabCard = ({ lab }: { lab: Lab }) => {
  const navigate = useNavigate();
  const displayName = formatLabName(lab.name);
  const displayAddress = toReadableText(lab.address, "Address not added");

  return (
    <div className="group relative flex min-h-[228px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 " />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-base font-bold text-primary ring-1 ring-primary/20">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-950 md:text-base">
              {displayName}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 md:text-sm">
              <FiMapPin className="shrink-0 text-slate-400" />
              <span className="truncate">{displayAddress}</span>
            </div>
          </div>
        </div>
        {/* <StatusPill status={lab.status} /> */}
      </div>

      <div className="mt-4 grid gap-2.5">
        <DetailRow
          icon={<FiPhoneCall />}
          label="Contact"
          value={lab.contactNo}
        />
        <DetailRow
          icon={<FiMail />}
          label="Email"
          value={lab.email}
          valueClassName="text-xs md:text-sm"
        />
        {/* <DetailRow icon={<FiActivity />} label="Active Tests" value="—" /> */}
      </div>

      <div className="mt-auto border-t border-slate-100 pt-4">
        <Button
          variant="light"
          className="h-10 w-full justify-between rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
          endContent={<FiArrowUpRight className="text-base" />}
          onPress={() => navigate(`/configuration/labs/${lab.id}`)}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default LabCard;
