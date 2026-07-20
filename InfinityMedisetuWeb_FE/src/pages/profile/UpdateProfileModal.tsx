
// // import {
// //   addToast,
// //   Autocomplete,
// //   AutocompleteItem,
// //   Switch,
// // } from "@heroui/react";
// // import type { SerializedError } from "@reduxjs/toolkit";
// // import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
// // import { useEffect } from "react";
// // import {
// //   Controller,
// //   useForm,
// //   useWatch,
// //   type Control,
// //   type FieldValues,
// // } from "react-hook-form";

// // import InputField from "../../components/shared/InputField";
// // import InputLabel from "../../components/shared/InputLabel";
// // import UpdateModal from "../../components/shared/Modals/UpdateModal";
// // import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
// // import { useGetUserQuery } from "../../redux/api/authApi";
// // import {
// //   useGetAllClinicsQuery,
// //   useUpdateClinicMutation,
// // } from "../../redux/api/clinicApi";
// // import {
// //   useGetDoctorQuery,
// //   useUpdateDoctorMutation,
// // } from "../../redux/api/doctorApi";

// // interface UpdateProfileModalProps {
// //   isOpen: boolean;
// //   onOpenChange: (isOpen: boolean) => void;
// //   onSaved?: () => void;
// // }

// // /** ✅ helpers: keep types clean */
// // const cleanString = (v: unknown): string | undefined => {
// //   if (typeof v !== "string") return undefined;
// //   const t = v.trim();
// //   return t ? t : undefined;
// // };

// // const removeEmpty = <T extends Record<string, any>>(obj: T): Partial<T> =>
// //   Object.fromEntries(
// //     Object.entries(obj).filter(
// //       ([, v]) => v !== "" && v !== null && v !== undefined,
// //     ),
// //   ) as Partial<T>;

// // const isFetchBaseQueryError = (e: unknown): e is FetchBaseQueryError =>
// //   typeof e === "object" && e !== null && "status" in e;

// // const isSerializedError = (e: unknown): e is SerializedError =>
// //   typeof e === "object" && e !== null && "message" in e;

// // const getErrMessage = (e: unknown): string => {
// //   if (!e) return "Update failed";

// //   // RTK Query unwrap() commonly throws FetchBaseQueryError
// //   if (isFetchBaseQueryError(e)) {
// //     const data: any = e.data;
// //     if (typeof data === "string" && data.trim()) return data;
// //     const msg =
// //       data?.message ||
// //       data?.error ||
// //       (typeof data?.errors?.[0]?.message === "string"
// //         ? data.errors[0].message
// //         : undefined);

// //     return typeof msg === "string" && msg.trim() ? msg : "Update failed";
// //   }

// //   // Or SerializedError
// //   if (isSerializedError(e)) {
// //     return e.message && String(e.message).trim()
// //       ? String(e.message)
// //       : "Update failed";
// //   }

// //   // Fallback for custom errors
// //   const anyErr = e as any;
// //   const msg =
// //     anyErr?.data?.message || anyErr?.error?.message || anyErr?.message;

// //   return typeof msg === "string" && msg.trim() ? msg : "Update failed";
// // };

// // const UpdateProfileModal = ({
// //   isOpen,
// //   onOpenChange,
// //   onSaved,
// // }: UpdateProfileModalProps) => {
// //   const { data: user } = useGetUserQuery();
// //   const isAdmin = user?.userType === "Admin";

// //   const { data: clinics } = useGetAllClinicsQuery();
// //   const { data: doctor } = useGetDoctorQuery();

// //   // NOTE: keep your existing shape usage
// //   const profile = isAdmin
// //     ? (clinics as any)?.profile
// //     : (doctor as any)?.result?.doctorProfile;

// //   const [updateDoctor, { isLoading: isLoadingDoctor }] =
// //     useUpdateDoctorMutation();
// //   const [updateClinic, { isLoading: isLoadingClinic }] =
// //     useUpdateClinicMutation();

// //   // ✅ infer exact arg types expected by mutation triggers
// //   type UpdateDoctorArg = Parameters<typeof updateDoctor>[0];
// //   type UpdateClinicArg = Parameters<typeof updateClinic>[0];

// //   const { control, handleSubmit, reset } = useForm<any>({
// //     defaultValues: {
// //       name: profile?.name ?? "",
// //       email: profile?.email ?? "",
// //       mobile: profile?.mobile ?? "",
// //       alternateMobile: profile?.alternateMobile ?? "",
// //       qualification: profile?.qualification ?? "",
// //       yearsOfExperience: (profile?.yearsOfExperience ?? null) as any,
// //       address: profile?.address ?? "",
// //       city: profile?.city ?? "",
// //       dob: profile?.dob ?? "",
// //       isAdminDoctorAccess: profile?.isAdminDoctorAccess ?? false,
// //       speciality: profile?.speciality ?? "",
// //     },
// //   });

// //   const isAdminDoctorAccess = useWatch({
// //     control,
// //     name: "isAdminDoctorAccess",
// //   });

// //   useEffect(() => {
// //     if (!profile) return;
// //     reset({
// //       name: profile?.name ?? "",
// //       email: profile?.email ?? "",
// //       mobile: profile?.mobile ?? "",
// //       alternateMobile: profile?.alternateMobile ?? "",
// //       qualification: profile?.qualification ?? "",
// //       yearsOfExperience: (profile?.yearsOfExperience ?? null) as any,
// //       address: profile?.address ?? "",
// //       city: profile?.city ?? "",
// //       dob: profile?.dob ?? "",
// //       isAdminDoctorAccess: profile?.isAdminDoctorAccess ?? false,
// //       speciality: profile?.speciality ?? "",
// //     });
// //   }, [profile, reset]);

// //   const onSubmit = async (data: any) => {
// //     try {
// //       const cleaned: any = removeEmpty({
// //         name: cleanString(data.name),
// //         email: cleanString(data.email),
// //         mobile: cleanString(data.mobile),
// //         alternateMobile: cleanString(data.alternateMobile),
// //         qualification: cleanString(data.qualification),
// //         yearsOfExperience: data.yearsOfExperience ?? null,
// //         address: cleanString(data.address),
// //         city: cleanString(data.city),
// //         dob: cleanString(data.dob),
// //         isAdminDoctorAccess: !!data.isAdminDoctorAccess,
// //         speciality: data.isAdminDoctorAccess
// //           ? cleanString(data.speciality)
// //           : undefined,
// //       });

// //       const payload = isAdmin
// //         ? { adminProfile: cleaned }
// //         : { doctorProfile: cleaned };

// //       if (isAdmin) {
// //         // ✅ FIX: pass clinicId (your RTK requires { clinicId, body })
// //         const clinicId =
// //           (clinics as any)?.clinic?.id || (clinics as any)?.data?.clinic?.id;

// //         if (!clinicId) {
// //           console.error(
// //             "❌ clinicId missing from getAllClinics response. clinics=",
// //             clinics,
// //           );
// //           return;
// //         }

// //         await updateClinic({
// //           clinicId,
// //           body: payload as any,
// //         } as UpdateClinicArg).unwrap();
// //       } else {
// //         await updateDoctor(payload as UpdateDoctorArg).unwrap();
// //       }

// //       onSaved?.();
// //       onOpenChange(false);
// //       reset(data as any);
// //     } catch (error: unknown) {
// //       console.error("Update failed:", error);

// //       addToast({
// //         title: "Error",
// //         description: getErrMessage(error),
// //         color: "danger",
// //       });
// //     }
// //   };

// //   const rhfControl = control as unknown as Control<FieldValues, FieldValues>;
// //   const isLoading = isLoadingDoctor || isLoadingClinic;

// //   return (
// //     <UpdateModal
// //       isOpen={isOpen}
// //       onOpenChange={onOpenChange}
// //       title="Update Profile"
// //       onSubmit={handleSubmit(onSubmit)}
// //       isLoading={isLoading}
// //       body={
// //         <div className="grid grid-cols-2 gap-x-4 gap-y-6">
// //           <InputField
// //             control={rhfControl}
// //             name="name"
// //             label={isAdmin ? "Admin Name" : "Doctor Name"}
// //           />

// //           {!isAdmin && (
// //             <>
// //               <InputField
// //                 control={rhfControl}
// //                 name="qualification"
// //                 label="Qualification"
// //               />
// //               <InputField
// //                 control={rhfControl}
// //                 name="yearsOfExperience"
// //                 label="Years of Experience"
// //                 type="number"
// //               />
// //             </>
// //           )}

// //           <InputField
// //             control={rhfControl}
// //             name="mobile"
// //             label="Phone Number"
// //             type="tel"
// //             maxLength={10}
// //             inputMode="numeric"
// //             pattern="[0-9]*"
// //           />

// //           <InputField
// //             control={rhfControl}
// //             name="alternateMobile"
// //             label="Alternate Number"
// //             type="tel"
// //             maxLength={10}
// //             inputMode="numeric"
// //             pattern="[0-9]*"
// //           />

// //           {isAdmin && (
// //             <div className="col-span-2 mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
// //               <div className="flex items-center justify-between">
// //                 <div>
// //                   <h4 className="text-sm font-semibold text-slate-800">
// //                     Doctor Access
// //                   </h4>
// //                   <p className="text-xs text-slate-500">
// //                     Enable doctor features for this admin account
// //                   </p>
// //                 </div>
// //                 <Controller
// //                   name="isAdminDoctorAccess"
// //                   control={control}
// //                   render={({ field: { value, onChange } }) => (
// //                     <Switch
// //                       isSelected={value}
// //                       onValueChange={onChange}
// //                       color="success"
// //                       size="sm"
// //                     />
// //                   )}
// //                 />
// //               </div>

// //               {isAdminDoctorAccess && (
// //                 <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
// //                   <Controller
// //                     name="speciality"
// //                     control={control}
// //                     render={({ field }) => (
// //                       <Autocomplete
// //                         label={
// //                           <InputLabel label="Speciality" isOptional={false} />
// //                         }
// //                         labelPlacement="outside-top"
// //                         placeholder="Search or select speciality"
// //                         variant="bordered"
// //                         radius="full"
// //                         size="lg"
// //                         allowsCustomValue
// //                         className="w-full"
// //                         defaultItems={DOCTOR_SPECIALITIES.map((s) => ({
// //                           label: s,
// //                           value: s,
// //                         }))}
// //                         inputValue={field.value || ""}
// //                         onInputChange={(val) => field.onChange(val)}
// //                         onSelectionChange={(key) => {
// //                           if (key) field.onChange(String(key));
// //                         }}
// //                         classNames={{
// //                           base: "w-full",
// //                           listbox: "text-slate-700",
// //                           popoverContent: "border-border-color",
// //                         }}
// //                       >
// //                         {(item) => (
// //                           <AutocompleteItem key={item.value}>
// //                             {item.label}
// //                           </AutocompleteItem>
// //                         )}
// //                       </Autocomplete>
// //                     )}
// //                   />
// //                 </div>
// //               )}
// //             </div>
// //           )}
// //         </div>
// //       }
// //     />
// //   );
// // };

// // export default UpdateProfileModal;

// import React, { useEffect, useMemo, useState } from "react";
// import {
//   addToast,
//   Autocomplete,
//   AutocompleteItem,
// } from "@heroui/react";
// import type { SerializedError } from "@reduxjs/toolkit";
// import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
// import {
//   Controller,
//   useForm,
//   useWatch,
//   type Control,
//   type FieldValues,
// } from "react-hook-form";
// import { FiMail, FiPhone, FiUser } from "react-icons/fi";
// import { PiGraduationCapLight } from "react-icons/pi"; // (optional) if you have this, else remove

// import InputField from "../../components/shared/InputField";
// import InputLabel from "../../components/shared/InputLabel";
// import UpdateModal from "../../components/shared/Modals/UpdateModal";
// import { DOCTOR_SPECIALITIES } from "../../constants/specialities";
// import { useGetUserQuery } from "../../redux/api/authApi";
// import {
//   useGetAllClinicsQuery,
//   useUpdateClinicMutation,
// } from "../../redux/api/clinicApi";
// import {
//   useGetDoctorQuery,
//   useUpdateDoctorMutation,
// } from "../../redux/api/doctorApi";

// interface UpdateProfileModalProps {
//   isOpen: boolean;
//   onOpenChange: (isOpen: boolean) => void;
//   onSaved?: () => void;
// }

// /** ✅ helpers: keep types clean */
// const cleanString = (v: unknown): string | undefined => {
//   if (typeof v !== "string") return undefined;
//   const t = v.trim();
//   return t ? t : undefined;
// };

// const removeEmpty = <T extends Record<string, any>>(obj: T): Partial<T> =>
//   Object.fromEntries(
//     Object.entries(obj).filter(
//       ([, v]) => v !== "" && v !== null && v !== undefined,
//     ),
//   ) as Partial<T>;

// const isFetchBaseQueryError = (e: unknown): e is FetchBaseQueryError =>
//   typeof e === "object" && e !== null && "status" in e;

// const isSerializedError = (e: unknown): e is SerializedError =>
//   typeof e === "object" && e !== null && "message" in e;

// const getErrMessage = (e: unknown): string => {
//   if (!e) return "Update failed";

//   if (isFetchBaseQueryError(e)) {
//     const data: any = e.data;
//     if (typeof data === "string" && data.trim()) return data;
//     const msg =
//       data?.message ||
//       data?.error ||
//       (typeof data?.errors?.[0]?.message === "string"
//         ? data.errors[0].message
//         : undefined);

//     return typeof msg === "string" && msg.trim() ? msg : "Update failed";
//   }

//   if (isSerializedError(e)) {
//     return e.message && String(e.message).trim()
//       ? String(e.message)
//       : "Update failed";
//   }

//   const anyErr = e as any;
//   const msg =
//     anyErr?.data?.message || anyErr?.error?.message || anyErr?.message;

//   return typeof msg === "string" && msg.trim() ? msg : "Update failed";
// };

// const UpdateProfileModal = ({
//   isOpen,
//   onOpenChange,
//   onSaved,
// }: UpdateProfileModalProps) => {
//   const { data: user } = useGetUserQuery();
//   const isAdmin = user?.userType === "Admin";

//   const { data: clinics } = useGetAllClinicsQuery();
//   const { data: doctor } = useGetDoctorQuery();

//   const profile = isAdmin
//     ? (clinics as any)?.profile
//     : (doctor as any)?.result?.doctorProfile;

//   const [updateDoctor, { isLoading: isLoadingDoctor }] =
//     useUpdateDoctorMutation();
//   const [updateClinic, { isLoading: isLoadingClinic }] =
//     useUpdateClinicMutation();

//   type UpdateDoctorArg = Parameters<typeof updateDoctor>[0];
//   type UpdateClinicArg = Parameters<typeof updateClinic>[0];

//   const { control, handleSubmit, reset } = useForm<any>({
//     defaultValues: {
//       name: profile?.name ?? "",
//       email: profile?.email ?? "",
//       mobile: profile?.mobile ?? "",
//       alternateMobile: profile?.alternateMobile ?? "",
//       qualification: profile?.qualification ?? "",
//       yearsOfExperience: (profile?.yearsOfExperience ?? null) as any,
//       address: profile?.address ?? "",
//       city: profile?.city ?? "",
//       dob: profile?.dob ?? "",
//       isAdminDoctorAccess: profile?.isAdminDoctorAccess ?? false,
//       speciality: profile?.speciality ?? "",
//     },
//   });

//   const isAdminDoctorAccess = useWatch({
//     control,
//     name: "isAdminDoctorAccess",
//   });

//   // ✅ Profile photo UI only (not sent to API)
//   const [photoPreview, setPhotoPreview] = useState<string | null>(
//     profile?.profileImage ?? null,
//   );

//   useEffect(() => {
//     if (!profile) return;
//     reset({
//       name: profile?.name ?? "",
//       email: profile?.email ?? "",
//       mobile: profile?.mobile ?? "",
//       alternateMobile: profile?.alternateMobile ?? "",
//       qualification: profile?.qualification ?? "",
//       yearsOfExperience: (profile?.yearsOfExperience ?? null) as any,
//       address: profile?.address ?? "",
//       city: profile?.city ?? "",
//       dob: profile?.dob ?? "",
//       isAdminDoctorAccess: profile?.isAdminDoctorAccess ?? false,
//       speciality: profile?.speciality ?? "",
//     });

//     setPhotoPreview(profile?.profileImage ?? null);
//   }, [profile, reset]);

//   useEffect(() => {
//     return () => {
//       if (photoPreview?.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
//     };
//   }, [photoPreview]);

//   const onSubmit = async (data: any) => {
//     try {
//       const cleaned: any = removeEmpty({
//         name: cleanString(data.name),
//         email: cleanString(data.email),
//         mobile: cleanString(data.mobile),
//         alternateMobile: cleanString(data.alternateMobile),
//         qualification: cleanString(data.qualification),
//         yearsOfExperience: data.yearsOfExperience ?? null,
//         address: cleanString(data.address),
//         city: cleanString(data.city),
//         dob: cleanString(data.dob),
//         isAdminDoctorAccess: !!data.isAdminDoctorAccess,
//         speciality: data.isAdminDoctorAccess ? cleanString(data.speciality) : undefined,
//       });

//       const payload = isAdmin
//         ? { adminProfile: cleaned }
//         : { doctorProfile: cleaned };

//       if (isAdmin) {
//         const clinicId =
//           (clinics as any)?.clinic?.id || (clinics as any)?.data?.clinic?.id;

//         if (!clinicId) {
//           console.error("❌ clinicId missing. clinics=", clinics);
//           return;
//         }

//         await updateClinic({
//           clinicId,
//           body: payload as any,
//         } as UpdateClinicArg).unwrap();
//       } else {
//         await updateDoctor(payload as UpdateDoctorArg).unwrap();
//       }

//       onSaved?.();
//       onOpenChange(false);
//       reset(data as any);
//     } catch (error: unknown) {
//       console.error("Update failed:", error);

//       addToast({
//         title: "Error",
//         description: getErrMessage(error),
//         color: "danger",
//       });
//     }
//   };

//   const rhfControl = control as unknown as Control<FieldValues, FieldValues>;
//   const isLoading = isLoadingDoctor || isLoadingClinic;

//   // ✅ Small reusable section header (Figma style)
//   const SectionHeader = ({
//     icon,
//     title,
//   }: {
//     icon: React.ReactNode;
//     title: string;
//   }) => (
//     <div className="flex items-center gap-2 text-slate-900 font-semibold text-[13px]">
//       <span className="text-primary">{icon}</span>
//       <span>{title}</span>
//     </div>
//   );

//   return (
//     <UpdateModal
//       isOpen={isOpen}
//       onOpenChange={onOpenChange}
//       title="Profile Details"
//       onSubmit={handleSubmit(onSubmit)}
//       isLoading={isLoading}
//       body={
//         <div className="space-y-6">
//           {/* ---------------- Basic Details ---------------- */}
//           <div className="space-y-4">
//             <SectionHeader icon={<FiUser className="h-4 w-4" />} title="Basic Details" />

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
//               <InputField control={rhfControl} name="name" label="Full Name" />
//               <InputField control={rhfControl} name="email" label="Email Address" />

//               <InputField
//                 control={rhfControl}
//                 name="mobile"
//                 label="Mobile Number"
//                 type="tel"
//                 maxLength={10}
//                 inputMode="numeric"
//                 pattern="[0-9]*"
//               />

//               <InputField
//                 control={rhfControl}
//                 name="alternateMobile"
//                 label="Alternate Number (Optional)"
//                 type="tel"
//                 maxLength={10}
//                 inputMode="numeric"
//                 pattern="[0-9]*"
//               />

//               {/* Profile Photo (UI only) */}
//               <div className="md:col-span-2">
//                 <div className="text-xs font-semibold text-slate-700 mb-2">
//                   Profile Photo
//                 </div>

//                 <label className="w-[140px] h-[140px] rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center text-center px-3">
//                   <input
//                     type="file"
//                     accept="image/*"
//                     className="hidden"
//                     onChange={(e) => {
//                       const file = e.target.files?.[0];
//                       if (!file) return;
//                       const url = URL.createObjectURL(file);
//                       setPhotoPreview(url);
//                     }}
//                   />

//                   {photoPreview ? (
//                     <img
//                       src={photoPreview}
//                       alt="Profile"
//                       className="h-full w-full rounded-2xl object-cover"
//                     />
//                   ) : (
//                     <>
//                       <div className="h-9 w-9 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
//                         <FiUser className="h-4 w-4 text-primary" />
//                       </div>
//                       <div className="text-[11px] text-slate-600 leading-4">
//                         Drag your image here,
//                         <br />
//                         <span className="text-primary font-semibold">or browse</span>
//                       </div>
//                       <div className="mt-2 text-[10px] text-slate-400">
//                         Support JPG, PNG, JPEG
//                       </div>
//                     </>
//                   )}
//                 </label>
//               </div>

//               {/* Admin-only question (Figma radio style) */}
//               {isAdmin && (
//                 <div className="md:col-span-2 pt-2">
//                   <div className="text-xs font-semibold text-slate-700 mb-2">
//                     Do you also consult patients as a doctor?
//                   </div>

//                   <Controller
//                     name="isAdminDoctorAccess"
//                     control={control}
//                     render={({ field: { value, onChange } }) => (
//                       <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
//                         <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
//                           <input
//                             type="radio"
//                             className="h-4 w-4 accent-primary"
//                             checked={value === true}
//                             onChange={() => onChange(true)}
//                           />
//                           Yes, I am a doctor
//                         </label>

//                         <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
//                           <input
//                             type="radio"
//                             className="h-4 w-4 accent-primary"
//                             checked={value === false}
//                             onChange={() => onChange(false)}
//                           />
//                           No, I am only an admin
//                         </label>
//                       </div>
//                     )}
//                   />
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* ---------------- Education & Qualification ---------------- */}
//           {(!isAdmin || isAdminDoctorAccess) && (
//             <div className="space-y-4">
//               <SectionHeader
//                 icon={<PiGraduationCapLight className="h-4 w-4" />}
//                 title="Education & Qualification"
//               />

//               <div className="text-xs font-semibold text-primary">
//                 Qualification 1
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
//                 <InputField
//                   control={rhfControl}
//                   name="qualification"
//                   label="Qualification Title"
//                 />

//                 {/* Specialization / Stream (same UI like Figma) */}
//                 <Controller
//                   name="speciality"
//                   control={control}
//                   render={({ field }) => (
//                     <Autocomplete
//                       label={
//                         <InputLabel label="Specialization / Stream" isOptional={false} />
//                       }
//                       labelPlacement="outside-top"
//                       placeholder="Search or select specialization"
//                       variant="bordered"
//                       radius="full"
//                       size="lg"
//                       allowsCustomValue
//                       className="w-full"
//                       defaultItems={DOCTOR_SPECIALITIES.map((s) => ({
//                         label: s,
//                         value: s,
//                       }))}
//                       inputValue={field.value || ""}
//                       onInputChange={(val) => field.onChange(val)}
//                       onSelectionChange={(key) => {
//                         if (key) field.onChange(String(key));
//                       }}
//                       classNames={{
//                         base: "w-full",
//                         listbox: "text-slate-700",
//                         popoverContent: "border-border-color",
//                       }}
//                     >
//                       {(item) => (
//                         <AutocompleteItem key={item.value}>
//                           {item.label}
//                         </AutocompleteItem>
//                       )}
//                     </Autocomplete>
//                   )}
//                 />

//                 <InputField
//                   control={rhfControl}
//                   name="yearsOfExperience"
//                   label="Years of Experience"
//                   type="number"
//                 />

//                 {/* empty cell to keep 2-col alignment like figma */}
//                 <div className="hidden md:block" />
//               </div>

//               <button
//                 type="button"
//                 className="text-sm text-primary font-semibold hover:opacity-80"
//               >
//                 + Add Qualification & Certificate
//               </button>
//             </div>
//           )}
//         </div>
//       }
//     />
//   );
// };

// export default UpdateProfileModal;
