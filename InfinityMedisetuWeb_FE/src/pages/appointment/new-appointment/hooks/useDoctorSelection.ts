import React from "react";
import type {
  UseFormClearErrors,
  UseFormGetValues,
  UseFormSetValue,
} from "react-hook-form";

import { useGetAllUsersQuery } from "../../../../redux/api/usersApi";
import {
  buildDoctorDraftSnapshot,
  buildDoctorSummary,
} from "../helpers/appointmentSummaryHelpers";
import type { DoctorOption, NewAppointmentForm } from "../types";

type UseDoctorSelectionParams = {
  doctorSelect: string;
  prefillDoctorId: string;
  draftDoctorSnapshot: any;
  meResp: any;
  getValues: UseFormGetValues<NewAppointmentForm>;
  setValue: UseFormSetValue<NewAppointmentForm>;
  clearErrors: UseFormClearErrors<NewAppointmentForm>;
};

const isGenericDoctorName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === "doctor" || normalized === "dr. doctor";
};

const useDoctorSelection = ({
  doctorSelect,
  prefillDoctorId,
  draftDoctorSnapshot,
  meResp,
  getValues,
  setValue,
  clearErrors,
}: UseDoctorSelectionParams) => {
  const {
    data: usersResp,
    isFetching: isFetchingDoctors,
    isError: isDoctorsError,
    error: doctorsError,
  } = useGetAllUsersQuery({ page: 1, pageSize: 100, userType: "Doctor" });

  const allUsers: any[] = React.useMemo(() => {
    const r =
      (usersResp as any)?.result?.allUser ??
      (usersResp as any)?.result?.users ??
      (usersResp as any)?.users ??
      (usersResp as any)?.result ??
      [];
    return Array.isArray(r)
      ? r
      : Array.isArray((r as any)?.data)
        ? (r as any).data
        : [];
  }, [usersResp]);

  const doctorUsers = React.useMemo(
    () =>
      allUsers.filter((u) => {
        const t = String(u?.userType ?? u?.role ?? u?.user_type ?? "")
          .trim()
          .toLowerCase();
        return t === "doctor" || t === "admin" || u?.isAdminDoctorAccess;
      }),
    [allUsers],
  );

  const doctorOptions: DoctorOption[] = React.useMemo(() => {
    const me = (meResp as any)?.result ?? meResp;
    if (!me) return [];

    const t = String(me?.userType ?? me?.role ?? "").toLowerCase();
    const myId = String(me?.id ?? me?._id ?? "");
    const isDoctor = t === "doctor";

    if (isDoctor && myId) {
      return [
        {
          label: me?.name ?? "You",
          value: myId,
          serviceCount: me?.serviceCount,
          status: me?.status,
          badgeText: me?.status,
          badgeTone: me?.status === "Active" ? "success" : "danger",
        },
      ];
    }

    const base = doctorUsers
      .filter((d) => d?.id || d?._id)
      .map((d: any) => ({
        label: "Dr. " + (d?.name ?? "Unknown"),
        value: String(d?.id ?? d?._id),
        serviceCount: d?.serviceCount,
        status: d?.status,
        badgeText: d?.status,
        badgeTone:
          d?.status === "Active" ? ("success" as const) : ("danger" as const),
      }));

    const draftDoctorName = String(draftDoctorSnapshot?.name ?? "").trim();

    if (
      draftDoctorSnapshot?.id &&
      draftDoctorName &&
      !isGenericDoctorName(draftDoctorName)
    ) {
      const draftId = String(draftDoctorSnapshot.id);
      const exists = base.some((o) => o.value === draftId);

      if (!exists) {
        base.unshift({
          label: draftDoctorName,
          value: draftId,
          serviceCount: draftDoctorSnapshot?.serviceCount,
          status: draftDoctorSnapshot?.status,
          badgeText: draftDoctorSnapshot?.status,
          badgeTone:
            draftDoctorSnapshot?.status === "Active" ? "success" : "danger",
        });
      }
    }

    return base;
  }, [doctorUsers, meResp, draftDoctorSnapshot]);

  // Set doctor selection when options are loaded and prefillDoctorId exists
  React.useEffect(() => {
    if (prefillDoctorId && doctorOptions.length > 0) {
      const doctorExists = doctorOptions.some(
        (option) => option.value === prefillDoctorId,
      );
      if (doctorExists) {
        // Always set the doctor, even if already set, to handle navigation changes
        setValue("doctorSelect", prefillDoctorId, { shouldValidate: true });
        setValue("doctorId", prefillDoctorId, { shouldValidate: true });
      }
    }
  }, [prefillDoctorId, doctorOptions, setValue, getValues]);

  React.useEffect(() => {
    if (isFetchingDoctors) return;
    if (!doctorSelect || doctorOptions.length === 0) return;

    const exists = doctorOptions.some(
      (option) => String(option.value) === String(doctorSelect),
    );
    if (exists) return;

    setValue("doctorSelect", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("doctorId", "", { shouldDirty: true, shouldValidate: true });
  }, [doctorSelect, doctorOptions, isFetchingDoctors, setValue]);

  React.useEffect(() => {
    const next = doctorSelect ? String(doctorSelect) : "";
    const curr = String(getValues("doctorId") ?? "");
    if (curr === next) return;
    setValue("doctorId", next, { shouldValidate: true, shouldDirty: true });
    if (next) clearErrors("doctorSelect");
  }, [doctorSelect, getValues, setValue, clearErrors]);

  React.useEffect(() => {
    const me = (meResp as any)?.result ?? meResp;
    if (!me) return;
    const t = String(me?.userType ?? me?.role ?? "").toLowerCase();
    const isDoc = t === "doctor" || t === "admin" || me?.isAdminDoctorAccess;
    if (!isDoc) return;
    const id = String(me?.id ?? me?._id ?? "");
    if (!id) return;
    // Only auto-select when options are loaded and doctor isn't already chosen
    if (doctorOptions.length === 0) return;
    const current = getValues("doctorSelect");
    if (!current) {
      setValue("doctorSelect", id, {
        shouldDirty: false,
        shouldValidate: true,
      });
      setValue("doctorId", id, { shouldDirty: false, shouldValidate: true });
      clearErrors("doctorSelect");
    }
  }, [meResp, doctorOptions, getValues, setValue, clearErrors]);

  const selectedDoctorData = React.useMemo(() => {
    const id = String(doctorSelect || "");
    if (!id) return null;

    const fromList =
      doctorUsers.find((d) => String(d?.id ?? d?._id) === id) ?? null;
    if (fromList) return fromList;

    const me = (meResp as any)?.result ?? meResp;
    if (me && String(me?.id ?? me?._id) === id) return me;

    return null;
  }, [doctorSelect, doctorUsers, meResp]);

  const showDoctorSummary = !!doctorSelect;

  const { doctorName, doctorRole, doctorFee } = React.useMemo(
    () =>
      buildDoctorSummary({
        selectedDoctorData,
        doctorOptions,
        doctorSelect,
      }),
    [selectedDoctorData, doctorOptions, doctorSelect],
  );

  const doctorDraftSnapshot = React.useMemo(
    () =>
      buildDoctorDraftSnapshot({
        doctorSelect,
        selectedDoctorData,
        doctorName,
      }),
    [doctorSelect, selectedDoctorData, doctorName],
  );

  return {
    isFetchingDoctors,
    isDoctorsError,
    doctorsError,
    allUsers,
    doctorUsers,
    doctorOptions,
    selectedDoctorData,
    showDoctorSummary,
    doctorName,
    doctorRole,
    doctorFee,
    doctorDraftSnapshot,
  };
};

export default useDoctorSelection;
