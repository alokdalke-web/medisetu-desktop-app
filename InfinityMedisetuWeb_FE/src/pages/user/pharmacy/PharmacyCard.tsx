import { Button } from "@heroui/react";
import type { ReactNode } from "react";
import {
    FiArrowUpRight,
    FiMapPin,
    FiPhoneCall,
    FiUsers,
} from "react-icons/fi";
import type { Pharmacy } from "../../../redux/api/pharmacyApi";

interface PharmacyCardProps {
    pharmacy: Pharmacy;
    onViewDetails: (id: string) => void;
}

const toReadableText = (value?: string | null, fallback = "-") => {
    const clean = String(value ?? "")
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

    if (!clean || clean === "-") return fallback;

    return clean
        .split(" ")
        .map((word) => {
            if (/^[A-Z0-9]{2,4}$/.test(word)) return word;
            if (/[A-Z]/.test(word) && /[a-z]/.test(word)) return word;

            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
};

const getStatusMeta = (status?: string | null) => {
    const normalized = String(status ?? "").trim().toLowerCase();
    const isActive = normalized === "active";

    return {
        label: isActive ? "Active" : "Inactive",
        classes: isActive
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-rose-200 bg-rose-50 text-rose-700",
        dotClass: isActive ? "bg-primary/100" : "bg-rose-500",
    };
};

const DetailRow = ({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) => (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm ring-1 ring-slate-200">
            {icon}
        </span>
        <span className="shrink-0 text-slate-500">{label}</span>
        <span className="min-w-0 truncate font-semibold text-slate-900" title={value}>
            {value}
        </span>
    </div>
);

const PharmacyCard: React.FC<PharmacyCardProps> = ({
    pharmacy,
    onViewDetails,
}) => {
    const statusMeta = getStatusMeta(pharmacy.status);
    const displayName = toReadableText(pharmacy.name, "Unnamed Pharmacy");
    const displayAddress = toReadableText(pharmacy.address, "Address not added");
    const contactNumber = String(pharmacy.contactNumber ?? "").trim() || "-";
    const staffCount = Number(pharmacy.staffCount ?? 0) || 0;

    return (
        <div className="group flex min-h-[228px] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-base font-bold text-primary ring-1 ring-primary/20">
                        {displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-950 md:text-base">
                            {displayName}
                        </h3>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 md:text-sm">
                            <FiMapPin className="shrink-0 text-slate-400" />
                            <span className="truncate">{displayAddress}</span>
                        </div>
                    </div>
                </div>

                <span
                    className={[
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                        statusMeta.classes,
                    ].join(" ")}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`} />
                    {statusMeta.label}
                </span>
            </div>

            <div className="mt-4 grid gap-2.5">
                <DetailRow
                    icon={<FiPhoneCall />}
                    label="Contact"
                    value={contactNumber}
                />
                <DetailRow
                    icon={<FiUsers />}
                    label="Staff"
                    value={`${staffCount} ${staffCount === 1 ? "member" : "members"}`}
                />
            </div>

            <div className="mt-auto border-t border-slate-100 pt-4">
                <Button
                    variant="light"
                    className="h-10 w-full justify-between rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
                    endContent={<FiArrowUpRight className="text-base" />}
                    onPress={() => onViewDetails(pharmacy.id)}
                >
                    View Details
                </Button>
            </div>
        </div>
    );
};

export default PharmacyCard;
