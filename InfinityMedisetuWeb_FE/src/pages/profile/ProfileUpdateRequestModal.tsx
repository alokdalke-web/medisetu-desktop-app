import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import React, { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";
import {
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiEdit2,
  FiHash,
  FiLock,
  FiMail,
  FiPhone,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import {
  useGetDoctorQuery,
  useUpdateDoctorProfileRequestMutation,
} from "../../redux/api/doctorApi";
import {
  filterChangedQualifications,
  pickChangedProfileFields,
} from "../../utils/profileUpdateChanges";

type ProfileUpdateRequestModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted?: () => void;
};

export const QUAL_TYPES = [
  "MBBS",
  "BDS",
  "BAMS",
  "BHMS",
  "BUMS",
  "BSMS",

  "MD General Medicine",
  "MD Anaesthesiology",
  "MD Anatomy",
  "MD Biochemistry",
  "MD Community Medicine",
  "MD Dermatology",
  "MD Emergency Medicine",
  "MD Forensic Medicine",
  "MD Geriatric Medicine",
  "MD Hospital Administration",
  "MD Immunohematology & Blood Transfusion",
  "MD Microbiology",
  "MD Nuclear Medicine",
  "MD Obstetrics & Gynaecology",
  "MD Palliative Medicine",
  "MD Paediatrics",
  "MD Pathology",
  "MD Pharmacology",
  "MD Physical Medicine & Rehabilitation",
  "MD Physiology",
  "MD Psychiatry",
  "MD Pulmonary Medicine",
  "MD Radiodiagnosis",
  "MD Radiation Oncology",
  "MD Respiratory Medicine",
  "MD Sports Medicine",
  "MD Transfusion Medicine",
  "MD Tropical Medicine",
  "MD Ayurveda",
  "MD Homoeopathy",
  "MD Unani",
  "MD Siddha",

  "MS General Surgery",
  "MS Orthopaedics",
  "MS ENT",
  "MS Ophthalmology",
  "MS Obstetrics & Gynaecology",
  "MS Ayurveda",
  "MS Unani",
  "MS Siddha",

  "DM Cardiology",
  "DM Clinical Haematology",
  "DM Clinical Immunology",
  "DM Endocrinology",
  "DM Gastroenterology",
  "DM Hepatology",
  "DM Infectious Diseases",
  "DM Medical Genetics",
  "DM Medical Oncology",
  "DM Neonatology",
  "DM Nephrology",
  "DM Neurology",
  "DM Neuroradiology",
  "DM Pulmonary & Critical Care Medicine",
  "DM Rheumatology",

  "MCh Cardiovascular & Thoracic Surgery",
  "MCh Cardiac Surgery",
  "MCh Endocrine Surgery",
  "MCh Gastrointestinal Surgery",
  "MCh Hand Surgery",
  "MCh Neurosurgery",
  "MCh Paediatric Surgery",
  "MCh Plastic Surgery",
  "MCh Reconstructive Surgery",
  "MCh Surgical Gastroenterology",
  "MCh Surgical Oncology",
  "MCh Urology",
  "MCh Vascular Surgery",

  "DNB General Medicine",
  "DNB General Surgery",
  "DNB Anaesthesiology",
  "DNB Dermatology",
  "DNB Emergency Medicine",
  "DNB ENT",
  "DNB Family Medicine",
  "DNB Gastroenterology",
  "DNB Nephrology",
  "DNB Neurology",
  "DNB Neurosurgery",
  "DNB Obstetrics & Gynaecology",
  "DNB Oncology",
  "DNB Ophthalmology",
  "DNB Orthopaedics",
  "DNB Paediatrics",
  "DNB Pathology",
  "DNB Psychiatry",
  "DNB Pulmonary Medicine",
  "DNB Radiodiagnosis",
  "DNB Surgical Oncology",
  "DNB Urology",

  "DrNB Cardiology",
  "DrNB Gastroenterology",
  "DrNB Nephrology",
  "DrNB Neurology",
  "DrNB Neurosurgery",
  "DrNB Medical Oncology",
  "DrNB Surgical Oncology",
  "DrNB Urology",
  "DrNB Critical Care Medicine",

  "Diploma Anaesthesiology",
  "Diploma Child Health",
  "Diploma Clinical Pathology",
  "Diploma Dermatology",
  "Diploma ENT",
  "Diploma Family Medicine",
  "Diploma Gynaecology & Obstetrics",
  "Diploma Ophthalmology",
  "Diploma Orthopaedics",
  "Diploma Psychiatry",
  "Diploma Public Health",
  "Diploma TB & Chest Diseases",

  "MDS Conservative Dentistry & Endodontics",
  "MDS Oral & Maxillofacial Surgery",
  "MDS Oral Medicine & Radiology",
  "MDS Oral Pathology",
  "MDS Orthodontics",
  "MDS Paediatric Dentistry",
  "MDS Periodontology",
  "MDS Prosthodontics",
  "MDS Public Health Dentistry",

  "MRCP (UK)",
  "MRCS (UK)",
  "FRCP (UK)",
  "FRCS (UK)",
  "FACP",
  "FACC",
  "FCCP",
  "FAAP",
  "FACS",
  "FRCR",
  "FRCOG",

  "Fellowship of the National Board",
  "Fellowship in Minimal Access Surgery",
  "Fellowship of Indian Association of Gastrointestinal Endo Surgeons",
  "Fellowship of the International College of Surgeons",
  "Fellowship of Indian Academy of Pediatrics",
  "Fellowship in Critical Care Medicine",
  "Fellowship in Diabetology",
  "Fellowship in Critical Care",
  "Fellowship in Reproductive Medicine",
  "Fellowship in Pain Medicine",
  "Fellowship in Cosmetic Surgery",
  "Fellowship in Arthroscopy",
  "Fellowship in Joint Replacement",
  "Fellowship in Spine Surgery",
  "Fellowship in Endoscopy"
];

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const removeEmpty = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  ) as Partial<T>;

const isFetchBaseQueryError = (error: unknown): error is FetchBaseQueryError =>
  typeof error === "object" && error !== null && "status" in error;

const isSerializedError = (error: unknown): error is SerializedError =>
  typeof error === "object" && error !== null && "message" in error;

const getErrMessage = (error: unknown): string => {
  if (!error) return "Update request failed";

  if (isFetchBaseQueryError(error)) {
    const data: any = error.data;
    if (typeof data === "string" && data.trim()) return data;

    const msg =
      data?.message ||
      data?.error ||
      (typeof data?.errors?.[0]?.message === "string"
        ? data.errors[0].message
        : undefined);

    return typeof msg === "string" && msg.trim()
      ? msg
      : "Update request failed";
  }

  if (isSerializedError(error)) {
    return error.message && String(error.message).trim()
      ? String(error.message)
      : "Update request failed";
  }

  const anyErr = error as any;
  const msg =
    anyErr?.data?.message || anyErr?.error?.message || anyErr?.message;
  return typeof msg === "string" && msg.trim()
    ? msg
    : "Update request failed";
};

const getSuccessMessage = (
  response: unknown,
  fallback = "Profile update request submitted successfully",
) => {
  const apiResponse = response as any;
  const msg =
    apiResponse?.message ||
    apiResponse?.data?.message ||
    apiResponse?.result?.message ||
    apiResponse?.raw;

  return typeof msg === "string" && msg.trim() ? msg.trim() : fallback;
};

const getSuccessTitle = (message: string) =>
  message.toLowerCase().includes("existing pending update request")
    ? "Request Updated"
    : "Success";

const hasAnyQualificationValue = (qualification: any) => {
  return Boolean(
    String(qualification?.qualificationType ?? "").trim() ||
      String(qualification?.qualificationTitle ?? "").trim() ||
      String(qualification?.specialization ?? "").trim() ||
      String(qualification?.boardUniversity ?? "").trim() ||
      String(qualification?.yearOfCompletion ?? "").trim(),
  );
};

const FieldLabel = ({
  isOptional,
  label,
}: {
  isOptional?: boolean;
  label: React.ReactNode;
}) => (
  <span className="text-xs font-semibold text-slate-700">
    {label}
    {isOptional && (
      <span className="ml-1 font-normal text-slate-400">(Optional)</span>
    )}
  </span>
);

type FormInputProps = {
  control: Control<any>;
  icon?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  isDisabled?: boolean;
  isOptional?: boolean;
  label: React.ReactNode;
  maxLength?: number;
  name: string;
  pattern?: string;
  placeholder?: string;
  rules?: any;
  type?: string;
};

const FormInput = ({
  control,
  icon,
  inputMode,
  isDisabled,
  isOptional,
  label,
  maxLength,
  name,
  pattern,
  placeholder,
  rules,
  type = "text",
}: FormInputProps) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState }) => (
      <Input
        id={field.name}
        name={field.name}
        value={
          field.value === null || field.value === undefined
            ? ""
            : String(field.value)
        }
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
        ref={field.ref}
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isInvalid={!!fieldState.error}
        errorMessage={fieldState.error?.message}
        label={<FieldLabel label={label} isOptional={isOptional} />}
        labelPlacement="outside-top"
        radius="sm"
        size="lg"
        variant="bordered"
        startContent={
          icon ? (
            <span className="shrink-0 text-slate-400">{icon}</span>
          ) : undefined
        }
        classNames={{
          input:
            "text-sm font-semibold text-slate-800 placeholder:text-slate-400",
          inputWrapper:
            "h-12 rounded-xl border-slate-200 bg-white shadow-none transition-colors data-[hover=true]:border-primary/40 data-[focus=true]:border-primary group-data-[disabled=true]:border-slate-200 group-data-[disabled=true]:bg-slate-100/80",
        }}
      />
    )}
  />
);

const FormTextarea = ({
  control,
  label,
  name,
  placeholder,
  rules,
}: {
  control: Control<any>;
  label: React.ReactNode;
  name: string;
  placeholder?: string;
  rules?: any;
}) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field, fieldState }) => (
      <Textarea
        id={field.name}
        name={field.name}
        value={field.value ?? ""}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        minRows={4}
        placeholder={placeholder}
        isInvalid={!!fieldState.error}
        errorMessage={fieldState.error?.message}
        label={<FieldLabel label={label} />}
        labelPlacement="outside-top"
        radius="sm"
        size="lg"
        variant="bordered"
        classNames={{
          input:
            "text-sm font-medium leading-6 text-slate-800 placeholder:text-slate-400",
          inputWrapper:
            "rounded-xl border-slate-200 bg-white shadow-none transition-colors data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
        }}
      />
    )}
  />
);

const SectionHeader = ({
  description,
  icon,
  title,
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
}) => (
  <div className="mb-5 flex items-start gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
      {icon}
    </span>
    <div className="min-w-0">
      <h3 className="text-base font-bold leading-6 text-slate-950">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  </div>
);

const ProfileUpdateRequestModal: React.FC<ProfileUpdateRequestModalProps> = ({
  isOpen,
  onOpenChange,
  onRequestSubmitted,
}) => {
  const { data: user, refetch: refetchUser } = useGetUserQuery();
  const { data: clinics, refetch: refetchClinics } = useGetAllClinicsQuery();
  const { data: doctor, refetch: refetchDoctor } = useGetDoctorQuery();

  const userType = cleanString((user as any)?.userType);
  const userTypeKey = userType?.toLowerCase();
  const isDoctor = userTypeKey === "doctor";
  const isAdmin = userTypeKey === "admin";
  const isReceptionist = userTypeKey === "receptionist";
  const isPharmacist = userTypeKey === "pharmacist";
  const isStaff = isReceptionist || isPharmacist;

  const profile = isStaff
    ? (user as any)
    : isAdmin
      ? (clinics as any)?.profile
      : ((doctor as any)?.result?.doctorProfile ?? (clinics as any)?.profile);

  const years = React.useMemo(() => {
    const current = new Date().getFullYear();
    const start = current;
    const end = current - 70;
    return Array.from({ length: start - end + 1 }, (_, i) => String(start - i));
  }, []);

  const [updateDoctorProfileRequest, { isLoading: isLoadingDoctor }] =
    useUpdateDoctorProfileRequestMutation();
  const submitLockedRef = React.useRef(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false);

  type UpdateDoctorProfileRequestArg = Parameters<
    typeof updateDoctorProfileRequest
  >[0];

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { isDirty },
  } = useForm<any>({
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      alternateMobile: "",
      userStatus: "Active",
      isAdminDoctorAccess: false,
      qualifications: [
        {
          qualificationType: "",
          qualificationTitle: "",
          specialization: "",
          boardUniversity: "",
          yearOfCompletion: "",
        },
      ],
      qualification: "",
      yearsOfExperience: null,
      address: "",
      city: "",
      dob: "",
      speciality: "",
      registrationNumber: "",
      reason: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const {
    fields: qualificationFields,
    append: appendQualification,
    remove: removeQualification,
  } = useFieldArray({
    control,
    name: "qualifications",
  });

  const watchedQualifications = useWatch({
    control,
    name: "qualifications",
  });

  const isAdminDoctorAccess = useWatch({
    control,
    name: "isAdminDoctorAccess",
  });

  useEffect(() => {
    if (!isOpen) return;

    submitLockedRef.current = false;
    setIsSubmittingRequest(false);
  }, [isOpen]);

  useEffect(() => {
    if (!profile) return;

    const clinicQuals = (clinics as any)?.qualification;
    const fromProfile = Array.isArray(clinicQuals)
      ? clinicQuals
      : (profile as any)?.qualifications;

    const uiQuals =
      Array.isArray(fromProfile) && fromProfile.length
        ? fromProfile.map((qualification: any) => ({
            dbId: qualification?.id ?? qualification?._id ?? "",
            qualificationType: qualification?.qualificationType ?? "",
            qualificationTitle: qualification?.qualificationTitle ?? "",
            specialization:
              qualification?.specialization ?? qualification?.speciality ?? "",
            boardUniversity:
              qualification?.boardOrUniversity ??
              qualification?.boardUniversity ??
              "",
            yearOfCompletion:
              qualification?.yearOfCompletion !== null &&
              qualification?.yearOfCompletion !== undefined
                ? String(qualification.yearOfCompletion)
                : "",
          }))
        : [
            {
              dbId: "",
              qualificationType: "",
              qualificationTitle: profile?.qualification ?? "",
              specialization: profile?.speciality ?? "",
              boardUniversity:
                (profile as any)?.boardOrUniversity ??
                (profile as any)?.boardUniversity ??
                "",
              yearOfCompletion:
                (profile as any)?.yearOfCompletion !== null &&
                (profile as any)?.yearOfCompletion !== undefined
                  ? String((profile as any).yearOfCompletion)
                  : "",
            },
          ];

    reset({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      mobile: profile?.mobile ?? "",
      alternateMobile: profile?.alternateMobile ?? "",
      userStatus: (profile as any)?.userStatus ?? "Active",
      isAdminDoctorAccess: profile?.isAdminDoctorAccess ?? false,
      qualifications: uiQuals,
      qualification: profile?.qualification ?? "",
      yearsOfExperience: (profile?.yearsOfExperience ?? null) as any,
      address: profile?.address ?? "",
      city: profile?.city ?? "",
      dob: profile?.dob ?? "",
      speciality: profile?.speciality ?? "",
      registrationNumber: (profile as any)?.registrationNumber ?? "",
      reason: "",
    });

  }, [profile, clinics, reset]);

  useEffect(() => {
    if (!Array.isArray(watchedQualifications)) return;

    watchedQualifications.forEach((qualification, index) => {
      if (!hasAnyQualificationValue(qualification)) {
        clearErrors([
          `qualifications.${index}.qualificationType`,
          `qualifications.${index}.qualificationTitle`,
          `qualifications.${index}.specialization`,
          `qualifications.${index}.boardUniversity`,
          `qualifications.${index}.yearOfCompletion`,
        ]);
      }
    });
  }, [watchedQualifications, clearErrors]);

  const isSaving = isLoadingDoctor || isSubmittingRequest;
  const showEducation =
    !isStaff && (isDoctor || (isAdmin && isAdminDoctorAccess));
  const currentQualifications = React.useMemo(() => {
    const clinicQualifications = (clinics as any)?.qualification;
    if (Array.isArray(clinicQualifications)) return clinicQualifications;

    const profileQualifications = (profile as any)?.qualifications;
    if (Array.isArray(profileQualifications)) return profileQualifications;

    const fallbackQualification = {
      qualificationTitle: profile?.qualification ?? "",
      qualificationType: profile?.qualification ?? "",
      specialization: profile?.speciality ?? "",
      boardOrUniversity:
        (profile as any)?.boardOrUniversity ?? (profile as any)?.boardUniversity,
      yearOfCompletion: (profile as any)?.yearOfCompletion,
    };

    return hasAnyQualificationValue({
      ...fallbackQualification,
      boardUniversity: fallbackQualification.boardOrUniversity,
    })
      ? [fallbackQualification]
      : [];
  }, [clinics, profile]);

  const closeModal = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data: any) => {
    try {
      if (!isAdmin && !isDoctor) {
        addToast({
          title: "Error",
          description: "Profile update requests are available for doctors only.",
          color: "danger",
        });
        return;
      }

      const reason = cleanString(data.reason);

      if (!reason) {
        setError("reason", {
          type: "manual",
          message: "Reason for change is required",
        });
        addToast({
          title: "Error",
          description: "Please enter a reason for this profile update request.",
          color: "danger",
        });
        return;
      }

      const qualificationRows = Array.isArray(data.qualifications)
        ? data.qualifications
        : [];

      const invalidQualificationIndex = qualificationRows.findIndex(
        (qualification: any) => {
          const anyFilled = hasAnyQualificationValue(qualification);
          if (!anyFilled) return false;

          return !(
            String(qualification?.qualificationType ?? "").trim() &&
            String(qualification?.qualificationTitle ?? "").trim() &&
            String(qualification?.specialization ?? "").trim() &&
            String(qualification?.boardUniversity ?? "").trim() &&
            String(qualification?.yearOfCompletion ?? "").trim()
          );
        },
      );

      if (invalidQualificationIndex !== -1) {
        const qualification = qualificationRows[invalidQualificationIndex];

        if (!String(qualification?.qualificationType ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.qualificationType`,
            {
              type: "manual",
              message: "Qualification Type is required",
            },
          );
        }

        if (!String(qualification?.qualificationTitle ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.qualificationTitle`,
            {
              type: "manual",
              message: "Qualification Title is required",
            },
          );
        }

        if (!String(qualification?.specialization ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.specialization`,
            {
              type: "manual",
              message: "Specialization / Stream is required",
            },
          );
        }

        if (!String(qualification?.boardUniversity ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.boardUniversity`,
            {
              type: "manual",
              message: "Board / University is required",
            },
          );
        }

        if (!String(qualification?.yearOfCompletion ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.yearOfCompletion`,
            {
              type: "manual",
              message: "Year of Completion is required",
            },
          );
        }

        addToast({
          title: "Error",
          description: `Please complete all fields in Qualification ${
            invalidQualificationIndex + 1
          }`,
          color: "danger",
        });
        return;
      }

      const canSendEducation =
        isDoctor || (isAdmin && !!data.isAdminDoctorAccess);

      const firstQualification = Array.isArray(data.qualifications)
        ? data.qualifications[0]
        : undefined;

      const mainQualificationTitle =
        cleanString(firstQualification?.qualificationTitle) ??
        cleanString(data.qualificationTitle) ??
        cleanString(data.qualification);

      const mainSpecialization =
        cleanString(firstQualification?.specialization) ??
        cleanString(data.specialization) ??
        cleanString(data.speciality);

      const payloadQualifications = canSendEducation
        ? (Array.isArray(data.qualifications) ? data.qualifications : [])
            .map((qualification: any) => {
              if (!hasAnyQualificationValue(qualification)) return null;

              const yearStr = cleanString(qualification?.yearOfCompletion);
              const yearNum =
                yearStr && Number.isFinite(parseInt(yearStr, 10))
                  ? parseInt(yearStr, 10)
                  : undefined;
              const title = cleanString(qualification?.qualificationTitle);

              return removeEmpty({
                id: cleanString(qualification?.dbId),
                qualificationType:
                  cleanString(qualification?.qualificationType) ??
                  (title ? "Degree" : undefined),
                qualificationTitle: title,
                specialization: cleanString(qualification?.specialization),
                boardOrUniversity: cleanString(qualification?.boardUniversity),
                yearOfCompletion: yearNum,
              });
            })
            .filter(
              (qualification: any) =>
                qualification && Object.keys(qualification).length > 0,
            )
        : undefined;

      const qualificationForPayload = canSendEducation
        ? mainQualificationTitle
        : undefined;
      const qualificationsForPayload =
        canSendEducation && payloadQualifications?.length
          ? payloadQualifications
          : undefined;

      const profilePayload = isAdmin
        ? removeEmpty({
            name: cleanString(data.name),
            email: cleanString(data.email),
            mobile: cleanString(data.mobile),
            alternateMobile: cleanString(data.alternateMobile),
            yearsOfExperience: data.yearsOfExperience ?? null,
            isAdminDoctorAccess: !!data.isAdminDoctorAccess,
            qualification: !data.isAdminDoctorAccess
              ? undefined
              : qualificationForPayload,
            speciality: !data.isAdminDoctorAccess
              ? undefined
              : mainSpecialization,
            registrationNumber: !data.isAdminDoctorAccess
              ? undefined
              : cleanString(data.registrationNumber),
          })
        : removeEmpty({
            name: cleanString(data.name),
            email: cleanString(data.email),
            mobile: cleanString(data.mobile),
            alternateMobile: cleanString(data.alternateMobile),
            qualification: qualificationForPayload,
            yearsOfExperience: data.yearsOfExperience ?? null,
            speciality: mainSpecialization,
          });

      const changedProfilePayload = removeEmpty(
        pickChangedProfileFields(profilePayload, profile),
      );
      const changedQualifications = filterChangedQualifications(
        qualificationsForPayload,
        currentQualifications,
      );

      if (
        Object.keys(changedProfilePayload).length === 0 &&
        !changedQualifications?.length
      ) {
        addToast({
          title: "No changes found",
          description: "Please change at least one profile field before submitting.",
          color: "warning",
        });
        return;
      }

      const payloadObj = removeEmpty({
        reason,
        doctorProfile:
          Object.keys(changedProfilePayload).length > 0
            ? changedProfilePayload
            : undefined,
        qualifications: changedQualifications?.length
          ? changedQualifications
          : undefined,
      });

      if (submitLockedRef.current) return;

      submitLockedRef.current = true;
      setIsSubmittingRequest(true);

      const response = await updateDoctorProfileRequest(
        payloadObj as any as UpdateDoctorProfileRequestArg,
      ).unwrap();

      const successMessage = getSuccessMessage(response);

      addToast({
        title: getSuccessTitle(successMessage),
        description: successMessage,
        color: "success",
      });

      if (isAdmin) await refetchClinics();
      if (isAdmin || isDoctor) await refetchDoctor();
      await refetchUser();
      onRequestSubmitted?.();
      closeModal();
    } catch (error: unknown) {
      submitLockedRef.current = false;
      setIsSubmittingRequest(false);
      console.error("Profile update request failed:", error);
      addToast({
        title: "Error",
        description: getErrMessage(error),
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSaving) closeModal();
      }}
      isDismissable={!isSaving}
      isKeyboardDismissDisabled={isSaving}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper:
          "items-end px-0 py-0 sm:items-center sm:px-4 sm:py-6",
        backdrop: "bg-slate-950/45 backdrop-blur-[1px]",
        base: [
          "m-0",
          "w-full",
          "max-w-full",
          "overflow-hidden",
          "rounded-b-none",
          "rounded-t-[28px]",
          "bg-white",
          "shadow-2xl",
          "sm:m-4",
          "sm:max-w-5xl",
          "sm:rounded-[28px]",
        ].join(" "),
        body: "p-0",
        closeButton:
          "right-4 top-4 z-30 rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-800",
      }}
    >
      <ModalContent className="max-h-[94dvh] sm:max-h-[90vh]">
        {() => (
          <form
            id="profile-update-request-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex max-h-[94dvh] min-h-0 flex-col bg-white sm:max-h-[90vh]"
          >
            <ModalHeader className="shrink-0 border-b border-slate-100 bg-white px-4 pb-4 pt-4 sm:px-6">
              <div className="flex w-full flex-col gap-4 pr-10 sm:flex-row sm:items-center sm:justify-between sm:pr-12">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                    <FiEdit2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base  leading-7 text-slate-950 sm:text-lg">
                      Profile Update Request
                    </h2>
                    <p className="mt-1 text-sm  leading-5 text-slate-500">
                      Edit locked profile details and send them for approval.
                    </p>
                  </div>
                </div>

                {/* <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <FiShield className="h-3.5 w-3.5" />
                    Admin review
                  </span>
                  {userType ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {userType}
                    </span>
                  ) : null}
                </div> */}
              </div>
            </ModalHeader>

            <ModalBody className="min-h-0 flex-1 gap-0 overflow-y-auto overscroll-contain bg-slate-50 px-3 py-3 sm:px-5 sm:py-5">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                      <FiLock className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-950">
                        Verified profile details are locked
                      </p>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                        Changes to verified details are sent to admin review
                        before they update your profile.
                      </p>
                    </div>
                  </div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <SectionHeader
                    icon={<FiUser className="h-5 w-5" />}
                    title="Personal information"
                    description="Update contact details that identify your profile."
                  />

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                    <FormInput
                      control={control}
                      name="name"
                      label={
                        <>
                          Full Name <span className="text-red-500">*</span>
                        </>
                      }
                      icon={<FiUser className="h-4 w-4" />}
                    />

                    <FormInput
                      control={control}
                      name="email"
                      isDisabled
                      label="Email Address"
                      icon={<FiMail className="h-4 w-4" />}
                    />

                    <FormInput
                      control={control}
                      name="mobile"
                      label={
                        <>
                          Mobile Number{" "}
                          <span className="text-red-500">*</span>
                        </>
                      }
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      icon={<FiPhone className="h-4 w-4" />}
                    />

                    <FormInput
                      control={control}
                      name="alternateMobile"
                      label="Alternate Number"
                      isOptional
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      icon={<FiPhone className="h-4 w-4" />}
                    />
                  </div>
                </section>

                {showEducation && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <SectionHeader
                      icon={<FiBookOpen className="h-5 w-5" />}
                      title="Education & qualifications"
                      description="Keep degrees, streams, and registration details ready for verification."
                    />

                    {isAdmin && isAdminDoctorAccess && (
                      <div className="mb-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                        <FormInput
                          control={control}
                          name="registrationNumber"
                          label="Registration Number"
                          placeholder="Enter registration number"
                          icon={<FiHash className="h-4 w-4" />}
                        />
                      </div>
                    )}

                    {qualificationFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="mb-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 last:mb-0"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-slate-200">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900">
                                Qualification {index + 1}
                              </p>
                              <p className="text-xs font-medium text-slate-500">
                                Degree, stream, institute, and completion year
                              </p>
                            </div>
                          </div>

                          {qualificationFields.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              radius="full"
                              variant="flat"
                              color="danger"
                              className="w-full font-semibold sm:w-auto"
                              startContent={<FiTrash2 className="h-3.5 w-3.5" />}
                              onPress={() => removeQualification(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                          <Controller
                            name={`qualifications.${index}.qualificationType`}
                            control={control}
                            rules={{
                              validate: (value: unknown, formValues: any) => {
                                const currentQual =
                                  formValues?.qualifications?.[index];
                                const anyFilled =
                                  hasAnyQualificationValue(currentQual);

                                if (anyFilled && !String(value || "").trim()) {
                                  return "Qualification Type is required";
                                }

                                return true;
                              },
                            }}
                            render={({ field, fieldState }) => (
                              <Autocomplete
                                label={
                                  <FieldLabel
                                    label={
                                      <>
                                        Qualification Type{" "}
                                        <span className="text-red-500">*</span>
                                      </>
                                    }
                                  />
                                }
                                labelPlacement="outside-top"
                                placeholder="Select qualification type"
                                variant="bordered"
                                radius="sm"
                                size="lg"
                                className="w-full"
                                defaultItems={QUAL_TYPES.map((item) => ({
                                  label: item,
                                  value: item,
                                }))}
                                inputValue={field.value || ""}
                                onInputChange={(value) =>
                                  field.onChange(value)
                                }
                                onSelectionChange={(key) =>
                                  field.onChange(key ? String(key) : "")
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={
                                  <FiBookOpen className="h-4 w-4 text-slate-400" />
                                }
                              >
                                {(item) => (
                                  <AutocompleteItem key={item.value}>
                                    {item.label}
                                  </AutocompleteItem>
                                )}
                              </Autocomplete>
                            )}
                          />

                          <FormInput
                            control={control}
                            name={`qualifications.${index}.qualificationTitle`}
                            label={
                              <>
                                Qualification Title{" "}
                                <span className="text-red-500">*</span>
                              </>
                            }
                            placeholder="e.g. MBBS, B.Sc Nursing, MBA Healthcare"
                            icon={<FiAward className="h-4 w-4" />}
                            rules={{
                              validate: (value: unknown, formValues: any) => {
                                const currentQual =
                                  formValues?.qualifications?.[index];
                                const anyFilled =
                                  hasAnyQualificationValue(currentQual);

                                if (anyFilled && !String(value || "").trim()) {
                                  return "Qualification Title is required";
                                }

                                return true;
                              },
                            }}
                          />

                          <Controller
                            name={`qualifications.${index}.specialization`}
                            control={control}
                            rules={{
                              validate: (value: unknown, formValues: any) => {
                                const currentQual =
                                  formValues?.qualifications?.[index];
                                const anyFilled =
                                  hasAnyQualificationValue(currentQual);

                                if (anyFilled && !String(value || "").trim()) {
                                  return "Specialization / Stream is required";
                                }

                                return true;
                              },
                            }}
                            render={({ field, fieldState }) => (
                              <Autocomplete
                                label={
                                  <FieldLabel
                                    label={
                                      <>
                                        Specialization / Stream{" "}
                                        <span className="text-red-500">*</span>
                                      </>
                                    }
                                  />
                                }
                                labelPlacement="outside-top"
                                placeholder="Search or select specialization"
                                variant="bordered"
                                radius="sm"
                                size="lg"
                                allowsCustomValue
                                className="w-full"
                                defaultItems={DOCTOR_SPECIALITIES.map(
                                  (speciality) => ({
                                    label: speciality,
                                    value: speciality,
                                  }),
                                )}
                                inputValue={field.value || ""}
                                onInputChange={(value) =>
                                  field.onChange(value)
                                }
                                onSelectionChange={(key) =>
                                  field.onChange(key ? String(key) : "")
                                }
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={
                                  <FiBriefcase className="h-4 w-4 text-slate-400" />
                                }
                              >
                                {(item) => (
                                  <AutocompleteItem key={item.value}>
                                    {item.label}
                                  </AutocompleteItem>
                                )}
                              </Autocomplete>
                            )}
                          />

                          <FormInput
                            control={control}
                            name={`qualifications.${index}.boardUniversity`}
                            label={
                              <>
                                Board / University{" "}
                                <span className="text-red-500">*</span>
                              </>
                            }
                            placeholder="e.g. Medical Council of India, Delhi University"
                            icon={<FiBookOpen className="h-4 w-4" />}
                            rules={{
                              validate: (value: unknown, formValues: any) => {
                                const currentQual =
                                  formValues?.qualifications?.[index];
                                const anyFilled =
                                  hasAnyQualificationValue(currentQual);

                                if (anyFilled && !String(value || "").trim()) {
                                  return "Board / University is required";
                                }

                                return true;
                              },
                            }}
                          />

                          <Controller
                            name={`qualifications.${index}.yearOfCompletion`}
                            control={control}
                            rules={{
                              validate: (value: unknown, formValues: any) => {
                                const currentQual =
                                  formValues?.qualifications?.[index];
                                const anyFilled =
                                  hasAnyQualificationValue(currentQual);

                                if (anyFilled && !String(value || "").trim()) {
                                  return "Year of Completion is required";
                                }

                                return true;
                              },
                            }}
                            render={({ field, fieldState }) => (
                              <Autocomplete
                                label={
                                  <FieldLabel
                                    label={
                                      <>
                                        Year of Completion{" "}
                                        <span className="text-red-500">*</span>
                                      </>
                                    }
                                  />
                                }
                                labelPlacement="outside-top"
                                placeholder="Select year"
                                variant="bordered"
                                radius="sm"
                                size="lg"
                                className="w-full"
                                allowsCustomValue
                                defaultItems={years.map((year) => ({
                                  label: year,
                                  value: year,
                                }))}
                                inputValue={field.value || ""}
                                onInputChange={(value) => {
                                  const onlyDigits4 = (value || "")
                                    .replace(/\D/g, "")
                                    .slice(0, 4);
                                  field.onChange(onlyDigits4);
                                }}
                                onSelectionChange={(key) => {
                                  const year = key
                                    ? String(key)
                                        .replace(/\D/g, "")
                                        .slice(0, 4)
                                    : "";
                                  field.onChange(year);
                                }}
                                isInvalid={!!fieldState.error}
                                errorMessage={fieldState.error?.message}
                                startContent={
                                  <FiCalendar className="h-4 w-4 text-slate-400" />
                                }
                              >
                                {(item) => (
                                  <AutocompleteItem key={item.value}>
                                    {item.label}
                                  </AutocompleteItem>
                                )}
                              </Autocomplete>
                            )}
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      size="sm"
                      radius="full"
                      variant="flat"
                      className="mt-1 bg-primary/10 px-4 font-semibold text-primary"
                      startContent={<FiPlus className="h-4 w-4" />}
                      onPress={() =>
                        appendQualification({
                          qualificationType: "",
                          qualificationTitle: "",
                          specialization: "",
                          boardUniversity: "",
                          yearOfCompletion: "",
                        })
                      }
                    >
                      Add Qualification
                    </Button>
                  </section>
                )}

                <section className="rounded-xl border border-primary/20 bg-white p-4 shadow-sm sm:p-5">
                  <SectionHeader
                    icon={<FiShield className="h-5 w-5" />}
                    title="Review reason"
                    description="Add context so the admin can approve the requested profile changes."
                  />

                  <FormTextarea
                    control={control}
                    name="reason"
                    label={
                      <>
                        Reason for Change{" "}
                        <span className="text-red-500">*</span>
                      </>
                    }
                    placeholder="Explain why you need these profile details changed..."
                    rules={{
                      validate: (value: unknown) =>
                        String(value ?? "").trim()
                          ? true
                          : "Reason for change is required",
                    }}
                  />

                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                    <FiCheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    Your profile remains unchanged until this request is
                    approved.
                  </div>
                </section>
              </div>
            </ModalBody>

            <ModalFooter className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] sm:px-6 sm:py-4">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
                  <FiCheckCircle className="h-4 w-4 text-primary" />
                  Only changed profile fields are sent for approval.
                </div>

                <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    radius="full"
                    variant="bordered"
                    className="border-slate-200 bg-white px-5 font-semibold text-slate-700"
                    isDisabled={isSaving}
                    onPress={closeModal}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    radius="full"
                    color="primary"
                    className="bg-primary px-5 font-semibold text-white shadow-sm hover:bg-primary-active"
                    isLoading={isSaving}
                    isDisabled={isSaving || !profile || !isDirty}
                    startContent={
                      !isSaving ? <FiEdit2 className="h-4 w-4" /> : null
                    }
                  >
                    Request Permission
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ProfileUpdateRequestModal;
