import { Spinner } from "@heroui/react";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type UseFormSetValue,
} from "react-hook-form";

import {
  useLazyCheckMobileQuery,
  useLazySearchPatientsQuery,
  type FamilyMember,
  type PatientSearchItem,
} from "../../../redux/api/patientApi";

const RELATIONSHIP_OPTIONS = [
  { label: "Spouse", value: "spouse" },
  { label: "Child", value: "child" },
  { label: "Parent", value: "parent" },
  { label: "Sibling", value: "sibling" },
  { label: "Other", value: "other" },
] as const;

export type FamilyRelationship = (typeof RELATIONSHIP_OPTIONS)[number]["value"];

/** Ref handle exposed to parent forms */
export interface FamilyRelationSectionRef {
  checkMobile: (mobile: string) => void;
}

interface FamilyRelationSectionProps<T extends FieldValues> {
  control: Control<T, any, any>;
  setValue: UseFormSetValue<T>;
  /** Live value of the patient's own mobile field */
  mobileValue: string;
  relationshipError?: string;
}

const FamilyRelationSection = forwardRef(function FamilyRelationSectionInner<
  T extends FieldValues,
>(
  {
    control,
    setValue,
    mobileValue,
    relationshipError,
  }: FamilyRelationSectionProps<T>,
  ref: React.ForwardedRef<FamilyRelationSectionRef>,
) {
  const [triggerCheckMobile, { isFetching: isFetchingCheck }] = useLazyCheckMobileQuery();
  const [triggerSearch, { isFetching: isFetchingSearch }] = useLazySearchPatientsQuery();
  const isFetching = isFetchingCheck || isFetchingSearch;

  const [foundPatient, setFoundPatient] = useState<PatientSearchItem | null>(null);
  const [checkedMobile, setCheckedMobile] = useState("");
  const inFlightRef = useRef("");

  const {
    field: { value: relationship, onChange: setRelationship },
  } = useController({ control, name: "relationship" as Path<T> });

  const setField = (name: string, value: unknown) =>
    setValue(name as Path<T>, value as any, {
      shouldDirty: true,
      shouldValidate: false,
    });

  const clearLink = () => {
    setField("linkFamily", false);
    setField("relationship", "");
    setField("primaryPatientId", "");
    setField("primaryPatientName", "");
  };

  useImperativeHandle(ref, () => ({
    checkMobile: (mobile: string) => {
      const trimmed = mobile.trim();

      setFoundPatient(null);
      setCheckedMobile(trimmed);
      clearLink();

      const isValid = /^[6-9]\d{9}$/.test(trimmed);
      if (!isValid) return;

      if (trimmed === inFlightRef.current) return;
      inFlightRef.current = trimmed;

      // Use the dedicated check-mobile endpoint first
      triggerCheckMobile(trimmed, false)
        .unwrap()
        .then((result) => {
          if (result.data?.exists && result.data.patient) {
            const patient = result.data.patient;
            // Patient found via check-mobile, now fetch full details (with family members) via search
            triggerSearch({ search: trimmed, pageNumber: 1, pageSize: 30 }, false)
              .unwrap()
              .then((searchResult) => {
                const fullPatient = searchResult.data?.find(
                  (p) => p.id === patient.id
                ) ?? {
                  id: patient.id,
                  name: patient.name,
                  mobile: patient.mobile,
                  gender: patient.gender ?? null,
                  age: patient.age ?? null,
                  city: patient.city ?? null,
                  state: patient.state ?? null,
                  familyMembers: [],
                } as unknown as PatientSearchItem;

                setFoundPatient(fullPatient);
                setCheckedMobile(trimmed);
                setField("linkFamily", true);
                setField("primaryPatientId", fullPatient.id);
                setField("primaryPatientName", fullPatient.name);
              })
              .catch(() => {
                // Fallback: use the check-mobile data directly
                const fallback = {
                  id: patient.id,
                  name: patient.name,
                  mobile: patient.mobile,
                  gender: patient.gender ?? null,
                  age: patient.age ?? null,
                  city: patient.city ?? null,
                  state: patient.state ?? null,
                  familyMembers: [],
                } as unknown as PatientSearchItem;

                setFoundPatient(fallback);
                setCheckedMobile(trimmed);
                setField("linkFamily", true);
                setField("primaryPatientId", patient.id);
                setField("primaryPatientName", patient.name);
              });
          } else {
            // Patient not found
            setFoundPatient(null);
            clearLink();
          }
        })
        .catch(() => {
          setFoundPatient(null);
          clearLink();
        })
        .finally(() => {
          inFlightRef.current = "";
        });
    },
  }));

  const isValidMobile = /^[6-9]\d{9}$/.test(mobileValue.trim());

  if (!isValidMobile) return null;

  if (isFetching) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
        <Spinner size="sm" color="primary" />
        <span className="text-[13px] text-slate-500">Checking mobile…</span>
      </div>
    );
  }

  if (checkedMobile === mobileValue.trim() && !foundPatient) return null;
  if (!foundPatient) return null;

  const familyMembers: FamilyMember[] = foundPatient.familyMembers ?? [];

  return (
    <div className="space-y-3">
      {/* Patient info card */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[12px] font-bold text-emerald-700">
          {foundPatient.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-900">
            {foundPatient.name}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-slate-500">
            {foundPatient.mobile && <span>{foundPatient.mobile}</span>}
            {foundPatient.gender && <span>{foundPatient.gender}</span>}
            {foundPatient.age && <span>{foundPatient.age} Years</span>}
            {foundPatient.city && <span>{foundPatient.city}</span>}
          </p>
        </div>
      </div>

      {/* Existing family members */}
      {familyMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Family:</span>
          {familyMembers.map((fm) => (
            <span
              key={fm.id}
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200"
            >
              {fm.name}
              <span className="text-violet-400">•</span>
              <span className="capitalize">{fm.relationship}</span>
            </span>
          ))}
        </div>
      )}

      {/* Relationship — mandatory */}
      <div>
        <label className="mb-2 block text-[12px] font-semibold text-slate-900">
          Relationship to {foundPatient.name}
          <span className="ml-0.5 text-red-500">*</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRelationship(opt.value)}
              className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition ${
                relationship === opt.value
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {relationshipError && (
          <p className="mt-1.5 text-xs font-medium text-red-500">
            {relationshipError}
          </p>
        )}
      </div>
    </div>
  );
}) as <T extends FieldValues>(
  props: FamilyRelationSectionProps<T> & {
    ref?: React.ForwardedRef<FamilyRelationSectionRef>;
  },
) => React.ReactElement | null;

export default FamilyRelationSection;
