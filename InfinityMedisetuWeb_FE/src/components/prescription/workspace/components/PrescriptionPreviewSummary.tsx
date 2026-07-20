import React from "react";
import { FiFileText } from "react-icons/fi";

type ReportCard = {
    vitals?: { bp?: string | null; pulse?: number | null; temperature?: number | null } | null;
    comorbidities?: string[];
    habits?: string[];
    allergies?: string[];
    generalExamination?: string[];
    systemExamination?: string;
    provisionalDiagnosis?: string;
    differentialDiagnosis?: string;
    finalDiagnosis?: string;
    investigations?: string;
    advice?: string;
    clinicalNotes?: string;
    followUpInDays?: number | string | null;
    followUpDate?: string | null;
};

type Patient = {
    name?: string | null;
    age?: number | null;
    gender?: string | null;
};

type Props = {
    reportCard?: ReportCard | null;
    patient?: Patient;
    adviceText?: string;
};

const Item: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-baseline gap-1.5 text-[12px]">
        <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">{label}:</span>
        <span className="text-slate-900 dark:text-white">{value}</span>
    </div>
);

const PrescriptionPreviewSummary: React.FC<Props> = ({ reportCard, patient, adviceText }) => {
    if (!reportCard) return null;

    const { vitals, comorbidities, habits, allergies, provisionalDiagnosis, finalDiagnosis, investigations, clinicalNotes, followUpInDays, followUpDate } = reportCard;

    const hasVitals = vitals && (vitals.bp || vitals.pulse || vitals.temperature);
    const hasDiagnosis = provisionalDiagnosis || finalDiagnosis;
    const hasNotes = clinicalNotes || investigations;
    const hasFollowUp = followUpInDays || followUpDate;
    const hasAllergies = allergies && allergies.length > 0;
    const hasHistory = (comorbidities && comorbidities.length > 0) || (habits && habits.length > 0);
    const advice = adviceText || reportCard.advice;

    if (!hasVitals && !hasDiagnosis && !hasNotes && !hasFollowUp && !hasAllergies && !hasHistory && !advice) {
        return null;
    }

    const formatFollowUp = () => {
        if (followUpDate) {
            const d = new Date(followUpDate);
            if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            return followUpDate;
        }
        if (followUpInDays) return `After ${followUpInDays} days`;
        return null;
    };

    const vitalsText = [
        vitals?.bp ? `BP ${vitals.bp}` : "",
        vitals?.pulse ? `Pulse ${vitals.pulse}` : "",
        vitals?.temperature ? `Temp ${vitals.temperature}°F` : "",
    ].filter(Boolean).join(" · ");

    const historyItems = [...(comorbidities ?? []), ...(habits ?? [])];

    return (
        <div className="mx-4 mb-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 dark:border-[#273244] dark:bg-[#0b1321]/50">
            {/* Single compact header row */}
            <div className="flex items-center gap-2 mb-1.5">
                <FiFileText className="h-3.5 w-3.5 text-primary dark:text-[#9be7dc]" />
                <span className="text-[12px] font-bold text-slate-900 dark:text-white">Clinical Summary</span>
                {patient?.name && (
                    <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                        {patient.name}{patient.age ? `, ${patient.age}y` : ""}{patient.gender ? ` / ${patient.gender}` : ""}
                    </span>
                )}
            </div>

            {/* Compact inline details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {hasVitals && <Item label="Vitals" value={vitalsText} />}
                {hasDiagnosis && <Item label="Dx" value={finalDiagnosis || provisionalDiagnosis || ""} />}
                {hasAllergies && (
                    <Item label="Allergies" value={
                        <span className="text-amber-700 dark:text-amber-400">{allergies!.join(", ")}</span>
                    } />
                )}
                {hasHistory && <Item label="Hx" value={historyItems.join(", ")} />}
                {hasNotes && <Item label={investigations ? "Inv" : "Notes"} value={investigations || clinicalNotes || ""} />}
                {advice && <Item label="Advice" value={advice} />}
                {hasFollowUp && (
                    <Item label="Follow-up" value={
                        <span className="font-semibold text-primary dark:text-[#9be7dc]">{formatFollowUp()}</span>
                    } />
                )}
            </div>
        </div>
    );
};

export default PrescriptionPreviewSummary;
