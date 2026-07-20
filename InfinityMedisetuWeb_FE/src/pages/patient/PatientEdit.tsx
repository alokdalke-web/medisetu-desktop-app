import React, { useEffect } from "react";
import { useForm, type FieldValues, type Control } from "react-hook-form";
import { FiChevronRight } from "react-icons/fi";
import { useNavigate, useParams } from "react-router";
import { addToast, Spinner } from "@heroui/react";
import AppButton from "../../components/shared/AppButton";
import PatientFormSections from "./components/PatientFormSections";
import {
  useGetPatientByIdQuery,
  useUpdatePatientMutation,
} from "../../redux/api/patientApi";

type GenderOpt = "Male" | "Female" | "Other" | "";

type FormValues = {
  name: string;
  email?: string;
  gender: GenderOpt;
  age?: number | string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  notesMedicalHistory?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  allergies?: string[];
  chronicConditions?: string[];
};

const MAX_ADDRESS_WORDS = 25;
const MAX_ADDRESS_CHARS = 250;

const limitAddressText = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  let limitedValue = value;
  if (words.length > MAX_ADDRESS_WORDS) {
    limitedValue = words.slice(0, MAX_ADDRESS_WORDS).join(" ");
  }
  if (limitedValue.length > MAX_ADDRESS_CHARS) {
    limitedValue = limitedValue.slice(0, MAX_ADDRESS_CHARS);
  }
  return limitedValue;
};

const pickPatient = (raw: unknown) => {
  const r = raw as any;
  return r?.result?.patient ?? r?.result ?? r ?? null;
};

const PatientEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    data: rawPatient,
    isFetching,
    isError,
  } = useGetPatientByIdQuery(id ?? "", { skip: !id });

  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      gender: "" as GenderOpt,
      age: undefined,
      mobile: "",
      alternateMobile: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      notesMedicalHistory: "",
      bloodGroup: "",
      height: "",
      weight: "",
      allergies: [] as string[],
      chronicConditions: [] as string[],
    },
  });

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;

  const watchedName = watch("name");
  const watchedAge = watch("age");
  const watchedGender = watch("gender");
  const watchedMobile = watch("mobile");
  const watchedCity = watch("city");
  const watchedState = watch("state");
  const watchedBloodGroup = watch("bloodGroup");
  const watchedHeight = watch("height");
  const watchedWeight = watch("weight");

  const patient = pickPatient(rawPatient) as any;

  // Prefill form when patient data arrives
  useEffect(() => {
    if (!patient) return;
    reset({
      name: patient?.name ?? "",
      email: patient?.email ?? "",
      gender:
        patient?.gender === "Male" ||
          patient?.gender === "Female" ||
          patient?.gender === "Other"
          ? patient.gender
          : "",
      age: patient?.age ?? "",
      mobile: patient?.mobile ?? patient?.linkedNumber ?? "",
      alternateMobile: patient?.alternateMobile ?? "",
      address: patient?.address ?? "",
      city: patient?.city ?? "",
      state: patient?.state ?? "",
      country: patient?.country ?? "India",
      notesMedicalHistory: patient?.notesMedicalHistory ?? "",
      bloodGroup: patient?.bloodGroup ?? "",
      height: patient?.height ?? "",
      weight: patient?.weight ?? "",
      allergies: Array.isArray(patient?.allergies) ? patient.allergies : (patient?.allergies ? [patient.allergies] : []),
      chronicConditions: Array.isArray(patient?.chronicConditions) ? patient.chronicConditions : (patient?.chronicConditions ? [patient.chronicConditions] : []),
    });
  }, [patient, reset]);

  const handleCityStateChange = (city: string, state: string) => {
    setValue("city", city, { shouldDirty: true, shouldValidate: true });
    setValue("state", state, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    try {
      const payload = {
        peteintId: id,
        name: v.name?.trim(),
        email: v.email?.trim() || undefined,
        gender: v.gender?.trim(),
        age:
          v.age === undefined || v.age === null || v.age === ""
            ? undefined
            : Number(v.age),
        mobile: v.mobile?.trim(),
        alternateMobile: v.alternateMobile?.trim() || undefined,
        address: v.address ? limitAddressText(v.address).trim() : undefined,
        city: v.city?.trim() || undefined,
        state: v.state?.trim() || undefined,
        country: v.country?.trim() || undefined,
        notesMedicalHistory: v.notesMedicalHistory?.trim() || undefined,
        bloodGroup: v.bloodGroup?.trim() || undefined,
        height: v.height ? String(v.height) : undefined,
        weight: v.weight ? String(v.weight) : undefined,
        allergies: Array.isArray(v.allergies) && v.allergies.length > 0
          ? v.allergies
          : undefined,
        chronicConditions: Array.isArray(v.chronicConditions) && v.chronicConditions.length > 0
          ? v.chronicConditions
          : undefined,
      };

      await updatePatient(payload as any).unwrap();

      addToast({
        title: "Patient updated ✅",
        description: "Patient details have been successfully updated.",
        color: "success",
        variant: "flat",
      });

      navigate(`/patient/${id}`);
    } catch (err: any) {
      const backendErrors =
        err?.data?.errors || err?.error?.errors || err?.errors;

      if (Array.isArray(backendErrors) && backendErrors.length > 0) {
        backendErrors.forEach((e: any) => {
          const field = e?.path as keyof FormValues | undefined;
          const message = e?.message || "Invalid value";
          if (field) {
            setError(field as any, { type: "server", message });
          }
        });

        addToast({
          title: "Validation failed ❌",
          description: "Please correct the highlighted fields.",
          color: "danger",
          variant: "flat",
        });
        return;
      }

      const msg =
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        err?.message ||
        "Failed to update patient";

      addToast({
        title: "Update failed ❌",
        description: msg,
        color: "danger",
        variant: "flat",
      });
    }
  }, () => {
    // RHF validation failed — scroll to the first errored field in the form
    setTimeout(() => {
      const firstInvalid = document.querySelector(
        'form [aria-invalid="true"], form [data-invalid="true"]',
      ) as HTMLElement | null;
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => firstInvalid.focus?.(), 400);
      }
    }, 100);

    addToast({
      title: "Missing required",
      description: "Please fill all mandatory fields.",
      color: "danger",
      variant: "flat",
    });
  });

  const resetForm = () => {
    if (patient) {
      reset({
        name: patient?.name ?? "",
        email: patient?.email ?? "",
        gender:
          patient?.gender === "Male" ||
            patient?.gender === "Female" ||
            patient?.gender === "Other"
            ? patient.gender
            : "",
        age: patient?.age ?? "",
        mobile: patient?.mobile ?? patient?.linkedNumber ?? "",
        alternateMobile: patient?.alternateMobile ?? "",
        address: patient?.address ?? "",
        city: patient?.city ?? "",
        state: patient?.state ?? "",
        country: patient?.country ?? "India",
        notesMedicalHistory: patient?.notesMedicalHistory ?? "",
        bloodGroup: patient?.bloodGroup ?? "",
        height: patient?.height ?? "",
        weight: patient?.weight ?? "",
        allergies: Array.isArray(patient?.allergies) ? patient.allergies : (patient?.allergies ? [patient.allergies] : []),
        chronicConditions: Array.isArray(patient?.chronicConditions) ? patient.chronicConditions : (patient?.chronicConditions ? [patient.chronicConditions] : []),
      });
    }
  };

  if (isFetching)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spinner label="Loading patient details..." />
      </div>
    );

  if (isError)
    return (
      <div className="text-center text-red-600 mt-10">
        Failed to load patient data.
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-slate-50/70 dark:bg-transparent">
      <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-[22px] font-semibold text-slate-900 dark:text-white sm:text-2xl">
            Edit Patient
          </h1>
          <div className="mt-1 flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="font-medium text-slate-500 transition hover:text-primary"
            >
              Patients
            </button>
            <FiChevronRight className="text-[14px] opacity-70" />
            <button
              type="button"
              onClick={() => navigate(`/patient/${id}`)}
              className="font-medium text-slate-500 transition hover:text-primary"
            >
              {patient?.name || "Details"}
            </button>
            <FiChevronRight className="text-[14px] opacity-70" />
            <span className="font-medium text-primary">Edit</span>
          </div>
        </div>

        {/* Main layout: Form + Sidebar */}
        <div className="flex gap-5 items-start">
          {/* Form (left) */}
          <form
            onSubmit={onSubmit}
            noValidate
            className="
              flex-1 min-w-0 flex flex-col

              [&_[data-slot='label']]:text-[12px]
              [&_[data-slot='label']]:font-semibold
              [&_[data-slot='label']]:!text-slate-900
              dark:[&_[data-slot='label']]:!text-slate-200
              dark:[&_label]:!text-slate-200

              [&_[data-slot='input-wrapper']]:!rounded-lg
              [&_[data-slot='input-wrapper']]:!border
              [&_[data-slot='input-wrapper']]:!border-gray-200
              [&_[data-slot='input-wrapper']]:!bg-white
              [&_[data-slot='input-wrapper']]:!shadow-none
              [&_[data-slot='input-wrapper']]:!h-11
              [&_[data-slot='input-wrapper']]:!px-4
              sm:[&_[data-slot='input-wrapper']]:!h-12
              dark:[&_[data-slot='input-wrapper']]:!bg-[#0f1728]
              dark:[&_[data-slot='input-wrapper']]:!border-[#38445a]

              [&_[data-slot='trigger']]:!rounded-lg
              [&_[data-slot='trigger']]:!border
              [&_[data-slot='trigger']]:!border-gray-200
              [&_[data-slot='trigger']]:!bg-white
              [&_[data-slot='trigger']]:!shadow-none
              [&_[data-slot='trigger']]:!h-11
              [&_[data-slot='trigger']]:!px-4
              sm:[&_[data-slot='trigger']]:!h-12
              dark:[&_[data-slot='trigger']]:!bg-[#0f1728]
              dark:[&_[data-slot='trigger']]:!border-[#38445a]

              [&_[data-slot='input']]:!text-[13px]
              [&_[data-slot='helper-wrapper']]:min-h-[18px]
              dark:[&_[data-slot='input']]:!text-slate-100
            "
          >
            <PatientFormSections
              control={rhfControl}
              onCityStateChange={handleCityStateChange}
              disableMobile={!patient?.mobile && !!patient?.linkedNumber}
            />

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-2 py-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={isUpdating}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Clear All
              </button>

              <AppButton
                text={isUpdating ? "Saving…" : "Save Changes"}
                type="submit"
                isDisabled={isUpdating}
                className="rounded-xl px-6 h-11"
              />
            </div>
          </form>

          {/* Sidebar (right) - sticky */}
          <div className="hidden lg:flex flex-col gap-4 w-[280px] shrink-0 sticky top-4 self-start">
            {/* Patient Profile Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-[#111726] dark:border-[#273244]">
              <div className="flex flex-col items-center text-center">
                <img
                  src={
                    patient?.profileImage ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(patient?.name || "P")}&background=EEE&color=444&size=80`
                  }
                  alt={patient?.name || "Patient"}
                  className="h-[72px] w-[72px] rounded-full object-cover border-2 border-gray-100"
                />
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {watchedName || "—"}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Patient ID</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {patient?.patientId ?? patient?.patientCode ?? `PT-${String(id).slice(0, 4)}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Age</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {watchedAge ? `${watchedAge} Years` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Gender</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {watchedGender || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Phone</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {watchedMobile || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Address</span>
                  <span className="font-medium text-slate-900 text-right max-w-[140px] truncate">
                    {[watchedCity, watchedState].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Blood Group</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {watchedBloodGroup || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Height / Weight</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {watchedHeight || watchedWeight
                      ? `${watchedHeight ? `${watchedHeight} cm` : "—"} / ${watchedWeight ? `${watchedWeight} kg` : "—"}`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#677294] dark:text-slate-400">Registered On</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {patient?.createdAt
                      ? new Date(patient.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:bg-[#111726] dark:border-[#273244]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <h4 className="text-sm font-semibold text-slate-900">Quick Tips</h4>
              </div>
              <p className="text-xs text-[#677294] leading-relaxed">
                Ensure all information is accurate to provide better care and communication.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientEdit;
