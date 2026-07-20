import React, { useEffect, useState } from "react";
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
} from "@heroui/react";
import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldValues,
} from "react-hook-form";
import { useNavigate } from "react-router";
import { FiUser, FiBookOpen, FiUploadCloud } from "react-icons/fi";

import InputField from "../../components/shared/InputField";
import InputLabel from "../../components/shared/InputLabel";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import {
  useGetDoctorQuery,
  useUpdateDoctorProfileImageMutation,
  useUpdateDoctorProfileRequestMutation,
} from "../../redux/api/doctorApi";
import { useUpdateAddUserMutation } from "../../redux/api/usersApi";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";
import {
  filterChangedQualifications,
  pickChangedProfileFields,
} from "../../utils/profileUpdateChanges";

/* ---------------- Helpers ---------------- */

const cleanString = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
};

const removeEmpty = <T extends Record<string, any>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== "" && v !== null && v !== undefined,
    ),
  ) as Partial<T>;

const isFetchBaseQueryError = (e: unknown): e is FetchBaseQueryError =>
  typeof e === "object" && e !== null && "status" in e;

const isSerializedError = (e: unknown): e is SerializedError =>
  typeof e === "object" && e !== null && "message" in e;

const getErrMessage = (e: unknown): string => {
  if (!e) return "Update failed";

  if (isFetchBaseQueryError(e)) {
    const data: any = e.data;
    if (typeof data === "string" && data.trim()) return data;

    const msg =
      data?.message ||
      data?.error ||
      (typeof data?.errors?.[0]?.message === "string"
        ? data.errors[0].message
        : undefined);

    return typeof msg === "string" && msg.trim() ? msg : "Update failed";
  }

  if (isSerializedError(e)) {
    return e.message && String(e.message).trim()
      ? String(e.message)
      : "Update failed";
  }

  const anyErr = e as any;
  const msg =
    anyErr?.data?.message || anyErr?.error?.message || anyErr?.message;
  return typeof msg === "string" && msg.trim() ? msg : "Update failed";
};

const getSuccessMessage = (
  response: unknown,
  fallback = "Profile updated successfully",
) => {
  const msg = (response as any)?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
};

const hasAnyQualificationValue = (q: any) => {
  return Boolean(
    String(q?.qualificationType ?? "").trim() ||
      String(q?.qualificationTitle ?? "").trim() ||
      String(q?.specialization ?? "").trim() ||
      String(q?.boardUniversity ?? "").trim() ||
      String(q?.yearOfCompletion ?? "").trim(),
  );
};

/* ---------------- Component ---------------- */

const QUAL_TYPES = [
  "B.Sc Nursing",
  "BAMS",
  "BDS",
  "BHMS",
  "DM",
  "MBA Healthcare",
  "MBBS",
  "MCh",
  "MD",
  "MS",
];

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { setDirty } = useUnsavedChanges();

  const { data: user, refetch: refetchUser } = useGetUserQuery();
  const { data: clinics, refetch: refetchClinics } = useGetAllClinicsQuery();
  const { data: doctor, refetch: refetchDoctor } = useGetDoctorQuery();

  const userType = cleanString((user as any)?.userType);
  const userTypeKey = userType?.toLowerCase();
  const isDoctor = userTypeKey === "doctor";
  const isReceptionist = userTypeKey === "receptionist";
  const isPharmacist = userTypeKey === "pharmacist";
  const isStaff = isReceptionist || isPharmacist;

  const YEARS = (() => {
    const current = new Date().getFullYear();
    const start = current;
    const end = current - 70;
    return Array.from({ length: start - end + 1 }, (_, i) => String(start - i));
  })();

  const isAdmin = userTypeKey === "admin";

  const profile = isStaff
    ? (user as any)
    : isAdmin
      ? (clinics as any)?.profile
      : ((doctor as any)?.result?.doctorProfile ?? (clinics as any)?.profile);

  const [updateDoctorProfileRequest, { isLoading: isLoadingDoctor }] =
    useUpdateDoctorProfileRequestMutation();
  const [updateDoctorProfileImage, { isLoading: isLoadingProfileImage }] =
    useUpdateDoctorProfileImageMutation();
  const [updateUser, { isLoading: isLoadingUser }] = useUpdateAddUserMutation();

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

  const [photoPreview, setPhotoPreview] = useState<string | null>(
    profile?.profileImage ?? null,
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    setDirty(Boolean(isDirty || photoFile));
  }, [isDirty, photoFile, setDirty]);

  useEffect(() => {
    if (!profile) return;

    const clinicQuals = (clinics as any)?.qualification;
    const fromProfile = Array.isArray(clinicQuals)
      ? clinicQuals
      : (profile as any)?.qualifications;

    const uiQuals =
      Array.isArray(fromProfile) && fromProfile.length
        ? fromProfile.map((q: any) => ({
            dbId: q?.id ?? q?._id ?? "",
            qualificationType: q?.qualificationType ?? "",
            qualificationTitle: q?.qualificationTitle ?? "",
            specialization: q?.specialization ?? q?.speciality ?? "",
            boardUniversity: q?.boardOrUniversity ?? q?.boardUniversity ?? "",
            yearOfCompletion:
              q?.yearOfCompletion !== null && q?.yearOfCompletion !== undefined
                ? String(q.yearOfCompletion)
                : "",
          }))
        : [
            {
              dbId: "",
              qualificationType: "",
              qualificationTitle: profile?.qualification ?? "",
              specialization: "",
              boardUniversity: "",
              yearOfCompletion: "",
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
    });

    setPhotoPreview(profile?.profileImage ?? null);
    setPhotoFile(null);
    setDirty(false);
  }, [profile, clinics, reset, setDirty]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!Array.isArray(watchedQualifications)) return;

    watchedQualifications.forEach((q, idx) => {
      const anyFilled = hasAnyQualificationValue(q);

      if (!anyFilled) {
        clearErrors([
          `qualifications.${idx}.qualificationType`,
          `qualifications.${idx}.qualificationTitle`,
          `qualifications.${idx}.specialization`,
          `qualifications.${idx}.boardUniversity`,
          `qualifications.${idx}.yearOfCompletion`,
        ]);
      }
    });
  }, [watchedQualifications, clearErrors]);

  const rhfControl = control as unknown as Control<FieldValues, FieldValues>;
  const isSaving = isLoadingDoctor || isLoadingProfileImage || isLoadingUser;
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

  const onSubmit = async (data: any) => {
    try {
      if (!isAdmin && !isDoctor && !isStaff) {
        addToast({
          title: "Error",
          description: "User role missing. Please refresh and try again.",
          color: "danger",
        });
        return;
      }

      const qualificationRows = Array.isArray(data.qualifications)
        ? data.qualifications
        : [];

      const invalidQualificationIndex = qualificationRows.findIndex((q: any) => {
        const anyFilled = hasAnyQualificationValue(q);
        if (!anyFilled) return false;

        return !(
          String(q?.qualificationType ?? "").trim() &&
          String(q?.qualificationTitle ?? "").trim() &&
          String(q?.specialization ?? "").trim() &&
          String(q?.boardUniversity ?? "").trim() &&
          String(q?.yearOfCompletion ?? "").trim()
        );
      });

      if (invalidQualificationIndex !== -1) {
        const q = qualificationRows[invalidQualificationIndex];

        if (!String(q?.qualificationType ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.qualificationType`,
            {
              type: "manual",
              message: "Qualification Type is required",
            },
          );
        }

        if (!String(q?.qualificationTitle ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.qualificationTitle`,
            {
              type: "manual",
              message: "Qualification Title is required",
            },
          );
        }

        if (!String(q?.specialization ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.specialization`,
            {
              type: "manual",
              message: "Specialization / Stream is required",
            },
          );
        }

        if (!String(q?.boardUniversity ?? "").trim()) {
          setError(
            `qualifications.${invalidQualificationIndex}.boardUniversity`,
            {
              type: "manual",
              message: "Board / University is required",
            },
          );
        }

        if (!String(q?.yearOfCompletion ?? "").trim()) {
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

      if (isStaff) {
        const id = (user as any)?.id as string | undefined;
        if (!id) {
          addToast({
            title: "Error",
            description: "User id missing",
            color: "danger",
          });
          return;
        }

        await updateUser({
          id,
          body: {
            name: cleanString(data.name) ?? "",
            email: cleanString(data.email) ?? null,
            mobile: cleanString(data.mobile) ?? null,
            userStatus:
              (data.userStatus as "Active" | "Inactive" | undefined) ??
              ((user as any)?.userStatus as
                | "Active"
                | "Inactive"
                | undefined) ??
              "Active",
          },
        }).unwrap();

        await refetchUser();

        addToast({
          title: "Success",
          description: "Profile updated successfully",
          color: "success",
        });

        setDirty(false);
        navigate(-1);
        return;
      }

      const canSendEducation =
        isDoctor || (isAdmin && !!data.isAdminDoctorAccess);

      const firstQ = Array.isArray(data.qualifications)
        ? data.qualifications[0]
        : undefined;

      const mainQualificationTitle =
        cleanString(firstQ?.qualificationTitle) ??
        cleanString(data.qualificationTitle) ??
        cleanString(data.qualification);

      const mainSpecialization =
        cleanString(firstQ?.specialization) ??
        cleanString(data.specialization) ??
        cleanString(data.speciality);

      const payloadQualifications = canSendEducation
        ? (Array.isArray(data.qualifications) ? data.qualifications : [])
            .map((q: any) => {
              const anyFilled = hasAnyQualificationValue(q);
              if (!anyFilled) return null;

              const yearStr = cleanString(q?.yearOfCompletion);
              const yearNum =
                yearStr && Number.isFinite(parseInt(yearStr, 10))
                  ? parseInt(yearStr, 10)
                  : undefined;

              const title = cleanString(q?.qualificationTitle);

              const obj = removeEmpty({
                id: cleanString(q?.dbId),
                qualificationType:
                  cleanString(q?.qualificationType) ??
                  (title ? "Degree" : undefined),
                qualificationTitle: title,
                specialization: cleanString(q?.specialization),
                boardOrUniversity: cleanString(q?.boardUniversity),
                yearOfCompletion: yearNum,
              });

              return obj;
            })
            .filter((x: any) => x && Object.keys(x).length > 0)
        : undefined;

      const qualificationForPayload = canSendEducation
        ? mainQualificationTitle
        : undefined;

      const qualificationsForPayload =
        canSendEducation && payloadQualifications?.length
          ? payloadQualifications
          : undefined;

      let payloadObj: any;
      let successDescription = "Profile updated successfully";

      if (isAdmin) {
        const adminProfileOnly = removeEmpty({
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
        });

        const changedAdminProfileOnly = removeEmpty(
          pickChangedProfileFields(adminProfileOnly, profile),
        );
        const changedQualifications = filterChangedQualifications(
          qualificationsForPayload,
          currentQualifications,
        );

        payloadObj = removeEmpty({
          doctorProfile:
            Object.keys(changedAdminProfileOnly).length > 0
              ? changedAdminProfileOnly
              : undefined,
          qualifications: changedQualifications?.length
            ? changedQualifications
            : undefined,
        });

        if (
          Object.keys(changedAdminProfileOnly).length === 0 &&
          !changedQualifications?.length &&
          !photoFile
        ) {
          addToast({
            title: "No changes found",
            description: "Please change at least one profile field before saving.",
            color: "warning",
          });
          return;
        }

        const response = await updateDoctorProfileRequest(
          payloadObj as any as UpdateDoctorProfileRequestArg,
        ).unwrap();
        successDescription = getSuccessMessage(response);
      } else {
        const doctorProfileOnly = removeEmpty({
          name: cleanString(data.name),
          email: cleanString(data.email),
          mobile: cleanString(data.mobile),
          alternateMobile: cleanString(data.alternateMobile),

          qualification: qualificationForPayload,
          yearsOfExperience: data.yearsOfExperience ?? null,
          speciality: mainSpecialization,
        });

        const changedDoctorProfileOnly = removeEmpty(
          pickChangedProfileFields(doctorProfileOnly, profile),
        );
        const changedQualifications = filterChangedQualifications(
          qualificationsForPayload,
          currentQualifications,
        );

        payloadObj = removeEmpty({
          doctorProfile:
            Object.keys(changedDoctorProfileOnly).length > 0
              ? changedDoctorProfileOnly
              : undefined,
          qualifications: changedQualifications?.length
            ? changedQualifications
            : undefined,
        });

        if (
          Object.keys(changedDoctorProfileOnly).length === 0 &&
          !changedQualifications?.length &&
          !photoFile
        ) {
          addToast({
            title: "No changes found",
            description: "Please change at least one profile field before saving.",
            color: "warning",
          });
          return;
        }

        const response = await updateDoctorProfileRequest(
          payloadObj as any as UpdateDoctorProfileRequestArg,
        ).unwrap();
        successDescription = getSuccessMessage(response);
      }

      if (photoFile) {
        const imageFormData = new FormData();
        imageFormData.append("profileImage", photoFile);
        await updateDoctorProfileImage(imageFormData).unwrap();
      }

      addToast({
        title: "Success",
        description: successDescription,
        color: "success",
      });

      if (isAdmin) await refetchClinics();
      if (isAdmin || isDoctor) await refetchDoctor();
      await refetchUser();

      setDirty(false);
      navigate(-1);
    } catch (error: unknown) {
      console.error("Update failed:", error);
      addToast({
        title: "Error",
        description: getErrMessage(error),
        color: "danger",
      });
    }
  };

  const showEducation =
    !isStaff && (isDoctor || (isAdmin && isAdminDoctorAccess));

  return (
    <div className="min-w-0">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-[#273244] dark:bg-[#111726] dark:shadow-none">
        <ProfilePageHeader
          icon={<FiUser className="h-4 w-4" />}
          title="Profile Details"
        />

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 sm:px-6 py-6 [&_.text-slate-900]:dark:text-white [&_.text-slate-700]:dark:text-slate-200 [&_.text-slate-600]:dark:text-slate-300 [&_.text-slate-500]:dark:text-slate-400 [&_.border-slate-200]:dark:border-[#273244]">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-[13px] text-slate-900">
              <span className="text-primary">
                <FiUser className="h-4 w-4" />
              </span>
              Basic Details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <InputField
                control={rhfControl}
                name="name"
                label={
                  <>
                    Full Name <span className="text-red-500">*</span>
                  </>
                }
              />

              <InputField
                control={rhfControl}
                name="email"
                isDisabled
                label={
                  <>
                    Email Address 
                  </>
                }
              />

              <InputField
                control={rhfControl}
                name="mobile"
                label={
                  <>
                    Mobile Number <span className="text-red-500">*</span>
                  </>
                }
                type="tel"
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
              />

              {!isStaff && (
                <InputField
                  control={rhfControl}
                  name="alternateMobile"
                  label="Alternate Number (Optional)"
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              )}

              {!isStaff && (
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Profile Photo <span className="text-red-500">*</span>
                  </div>

                  <label className="w-[140px] h-[140px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center text-center px-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setPhotoFile(file);
                        setDirty(true);

                        const url = URL.createObjectURL(file);
                        setPhotoPreview(url);
                      }}
                    />

                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <>
                        <div className="h-9 w-9 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                          <FiUploadCloud className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-[11px] text-slate-600 leading-4">
                          Drag your image here,
                          <br />
                          <span className="text-primary font-semibold">
                            or browse
                          </span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">
                          Support JPG, PNG, JPEG
                        </div>
                      </>
                    )}
                  </label>
                </div>
              )}

            </div>
          </div>

          {showEducation && (
            <div className="mt-8 space-y-4">
              {isAdmin && isAdminDoctorAccess && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <InputField
                    control={rhfControl}
                    name="registrationNumber"
                    label="Registration Number"
                    placeholder="Enter registration number"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 font-semibold text-[13px] text-slate-900">
                <span className="text-primary">
                  <FiBookOpen className="h-4 w-4" />
                </span>
                Education & Qualification
              </div>

              {qualificationFields.map((field, idx) => (
                <div key={field.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-primary">
                      Qualification {idx + 1}
                    </div>

                    {qualificationFields.length > 1 && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-rose-600 hover:opacity-80"
                        onClick={() => removeQualification(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <Controller
                      name={`qualifications.${idx}.qualificationType`}
                      control={control}
                      rules={{
                        validate: (value, formValues) => {
                          const currentQual = formValues?.qualifications?.[idx];
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
                            <InputLabel
                              label={
                                <>
                                  Qualification Type{" "}
                                  <span className="text-red-500">*</span>
                                </>
                              }
                              isOptional={false}
                            />
                          }
                          labelPlacement="outside-top"
                          placeholder="Select qualification type"
                          variant="bordered"
                          radius="full"
                          size="lg"
                          className="w-full"
                          defaultItems={QUAL_TYPES.map((x) => ({
                            label: x,
                            value: x,
                          }))}
                          inputValue={field.value || ""}
                          onInputChange={(val) => field.onChange(val)}
                          onSelectionChange={(key) =>
                            field.onChange(key ? String(key) : "")
                          }
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        >
                          {(item) => (
                            <AutocompleteItem key={item.value}>
                              {item.label}
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                      )}
                    />

                    <InputField
                      control={rhfControl}
                      name={`qualifications.${idx}.qualificationTitle`}
                      label={
                        <>
                          Qualification Title{" "}
                          <span className="text-red-500">*</span>
                        </>
                      }
                      placeholder="e.g. MBBS, B.Sc Nursing, MBA Healthcare"
                      rules={{
                        validate: (value, formValues) => {
                          const currentQual = formValues?.qualifications?.[idx];
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
                      name={`qualifications.${idx}.specialization`}
                      control={control}
                      rules={{
                        validate: (value, formValues) => {
                          const currentQual = formValues?.qualifications?.[idx];
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
                            <InputLabel
                              label={
                                <>
                                  Specialization / Stream{" "}
                                  <span className="text-red-500">*</span>
                                </>
                              }
                              isOptional={false}
                            />
                          }
                          labelPlacement="outside-top"
                          placeholder="Search or select specialization"
                          variant="bordered"
                          radius="full"
                          size="lg"
                          allowsCustomValue
                          className="w-full"
                          defaultItems={DOCTOR_SPECIALITIES.map((s) => ({
                            label: s,
                            value: s,
                          }))}
                          inputValue={field.value || ""}
                          onInputChange={(val) => field.onChange(val)}
                          onSelectionChange={(key) =>
                            field.onChange(key ? String(key) : "")
                          }
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        >
                          {(item) => (
                            <AutocompleteItem key={item.value}>
                              {item.label}
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                      )}
                    />

                    <InputField
                      control={rhfControl}
                      name={`qualifications.${idx}.boardUniversity`}
                      label={
                        <>
                          Board / University{" "}
                          <span className="text-red-500">*</span>
                        </>
                      }
                      placeholder="e.g. Medical Council of India, Delhi University"
                      rules={{
                        validate: (value, formValues) => {
                          const currentQual = formValues?.qualifications?.[idx];
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
                      name={`qualifications.${idx}.yearOfCompletion`}
                      control={control}
                      rules={{
                        validate: (value, formValues) => {
                          const currentQual = formValues?.qualifications?.[idx];
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
                            <InputLabel
                              label={
                                <>
                                  Year of Completion{" "}
                                  <span className="text-red-500">*</span>
                                </>
                              }
                              isOptional={false}
                            />
                          }
                          labelPlacement="outside-top"
                          placeholder="Select year"
                          variant="bordered"
                          radius="full"
                          size="lg"
                          className="w-full"
                          allowsCustomValue
                          defaultItems={YEARS.map((y) => ({
                            label: y,
                            value: y,
                          }))}
                          inputValue={field.value || ""}
                          onInputChange={(val) => {
                            const onlyDigits4 = (val || "")
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            field.onChange(onlyDigits4);
                          }}
                          onSelectionChange={(key) => {
                            const yr = key
                              ? String(key).replace(/\D/g, "").slice(0, 4)
                              : "";
                            field.onChange(yr);
                          }}
                          isInvalid={!!fieldState.error}
                          errorMessage={fieldState.error?.message}
                        >
                          {(item) => (
                            <AutocompleteItem key={item.value}>
                              {item.label}
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                      )}
                    />

                    <div className="hidden md:block" />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="text-sm text-primary font-semibold hover:opacity-80"
                onClick={() =>
                  appendQualification({
                    qualificationType: "",
                    qualificationTitle: "",
                    specialization: "",
                    boardUniversity: "",
                    yearOfCompletion: "",
                  })
                }
              >
                + Add Qualification & Certificate
              </button>
            </div>
          )}

          <div className="mt-10 flex items-center justify-end gap-3">
            <Button
              type="button"
              radius="full"
              variant="bordered"
              className="border-primary text-primary"
              onPress={() => navigate(-1)}
            >
              Cancel Changes
            </Button>

            <Button
              type="submit"
              radius="full"
              color="primary"
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
