import React from "react";
import type {
  UseFormClearErrors,
  UseFormGetValues,
  UseFormSetValue,
} from "react-hook-form";

import { useLazyGetUserServiceQuery } from "../../../../redux/api/doctorApi";
import {
  formatExpDate,
  extractServicesFromGetService,
} from "../helpers/optionMappers";
import { getServiceExpiryIso } from "../helpers/dateTimeHelpers";
import type { ClinicServiceOption, NewAppointmentForm } from "../types";

type FocusField = (
  ref: React.RefObject<HTMLDivElement | null>,
  selector?: string,
  delay?: number,
) => void;

type UseAppointmentServicePaymentParams = {
  patientId: string;
  doctorId: string;
  dateParam: string;
  todayIso: string;
  selectedServiceFlow: string;
  setValue: UseFormSetValue<NewAppointmentForm>;
  getValues: UseFormGetValues<NewAppointmentForm>;
  clearErrors: UseFormClearErrors<NewAppointmentForm>;
  focusSlotSelection: () => void;
  focusField: FocusField;
  paymentFieldRef: React.RefObject<HTMLDivElement | null>;
  toastError: (title: string, obj?: any, fallback?: string) => void;
  setHasActiveSubscription: React.Dispatch<React.SetStateAction<boolean>>;
};

const useAppointmentServicePayment = ({
  patientId,
  doctorId,
  dateParam,
  todayIso,
  selectedServiceFlow,
  setValue,
  getValues,
  clearErrors,
  focusSlotSelection,
  focusField,
  paymentFieldRef,
  toastError,
  setHasActiveSubscription,
}: UseAppointmentServicePaymentParams) => {
  const [
    triggerGetUserService,
    {
      data: userServiceResp,
      isFetching: isUserServiceFetching,
      isError: isUserServiceError,
      error: userServiceError,
    },
  ] = useLazyGetUserServiceQuery();

  const hasAppointmentDates = React.useMemo(() => {
    const root =
      (userServiceResp as any)?.data ??
      (userServiceResp as any)?.result ??
      userServiceResp;
    const raw =
      root?.hasAppointmentToday ??
      root?.hasTodayAppointment ??
      (userServiceResp as any)?.hasAppointmentToday ??
      (userServiceResp as any)?.hasTodayAppointment;
    if (Array.isArray(raw)) {
      return raw
        .map((x: any) => {
          const s = String(x ?? "");
          if (!s) return null;
          const iso = s.slice(0, 10).replace(/\//g, "-");
          return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
        })
        .filter(Boolean) as string[];
    }
    if (raw === true) {
      return [todayIso];
    }
    return [];
  }, [userServiceResp, todayIso]);

  const shouldLockSlotsForToday = React.useMemo(
    () =>
      !!dateParam &&
      Array.isArray(hasAppointmentDates) &&
      hasAppointmentDates.includes(dateParam),
    [hasAppointmentDates, dateParam],
  );

  const lastServiceFetchRef = React.useRef<{
    patientId: string;
    doctorId: string;
  } | null>(null);

  React.useEffect(() => {
    const p = String(patientId || "");
    const d = String(doctorId || "");
    if (!p || !d) return;

    const last = lastServiceFetchRef.current;
    if (last && last.patientId === p && last.doctorId === d) return;

    lastServiceFetchRef.current = { patientId: p, doctorId: d };
    triggerGetUserService({ patientId: p, doctorId: d });
  }, [patientId, doctorId, triggerGetUserService]);

  React.useEffect(() => {
    if (isUserServiceError) {
      toastError(
        "Load services failed",
        userServiceError,
        "Failed to fetch services for selected patient & doctor.",
      );
    }
  }, [isUserServiceError, userServiceError]);

  const clinicServices = React.useMemo(() => {
    if (!patientId || !doctorId) return [];
    const list = extractServicesFromGetService(userServiceResp);
    return Array.isArray(list) ? list : [];
  }, [userServiceResp, patientId, doctorId]);

  const canPickService = !!patientId && !!doctorId;
  const isFetchingServices = canPickService && isUserServiceFetching;

  const clinicServiceOptions: ClinicServiceOption[] = React.useMemo(() => {
    return clinicServices
      .filter((s: any) => s && (s.id || s._id) && !s.isDeleted)
      .map((s: any) => {
        const exp =
          s?.["Expiring on"] ??
          s?.expiringOn ??
          s?.expiryDate ??
          s?.expireOn ??
          null;

        const name = String(s?.serviceName ?? s?.name ?? "Service");
        const priceText = s?.price != null ? `₹${s.price}` : "";

        return {
          value: String(s.id ?? s._id),
          name,
          priceText,
          expText: exp ? `Exp: ${formatExpDate(exp)}` : undefined,
          data: s,
        };
      });
  }, [clinicServices]);

  const focusAfterServiceSelection = React.useCallback(
    (nextServiceId: string) => {
      const nextService = clinicServiceOptions.find(
        (o) => String(o.value) === String(nextServiceId),
      );

      const nextServiceName = String(
        nextService?.data?.serviceName ?? nextService?.data?.name ?? "",
      )
        .trim()
        .toLowerCase();

      const nextServicePrice = Number(
        nextService?.data?.price ??
          nextService?.data?.amount ??
          nextService?.data?.fees ??
          -1,
      );

      const isFreeService =
        nextServiceName === "free consultation" ||
        nextServiceName.includes("free consultation") ||
        nextServicePrice === 0;

      const nextExpiryIso = getServiceExpiryIso(nextService?.data);
      const isCovered =
        !!nextExpiryIso && !!dateParam && dateParam <= nextExpiryIso;

      // If payment is not needed, go directly to slot selection
      if (isFreeService || isCovered) {
        focusSlotSelection();
        return;
      }

      // If payment is needed, go to payment section
      focusField(
        paymentFieldRef,
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    },
    [clinicServiceOptions, dateParam, focusField, focusSlotSelection],
  );

  React.useEffect(() => {
    if (!canPickService) return;
    if (isFetchingServices) return;
    if (clinicServiceOptions.length === 0) return;

    const current = String(getValues("clinicServiceId") ?? "");
    const stillValid =
      current &&
      clinicServiceOptions.some((o) => String(o.value) === String(current));
    if (stillValid) return;

    const first = clinicServiceOptions[0];
    if (!first?.value) return;

    setValue("clinicServiceId", String(first.value), {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors("clinicServiceId");
  }, [
    canPickService,
    isFetchingServices,
    clinicServiceOptions,
    getValues,
    setValue,
    clearErrors,
  ]);

  const selectedServiceData = React.useMemo(() => {
    const id = String(selectedServiceFlow || "");
    if (!id) return null;

    const opt = clinicServiceOptions.find((o) => String(o.value) === id);
    if (opt?.data) return opt.data;

    return (
      clinicServices.find((s: any) => String(s?.id ?? s?._id ?? "") === id) ??
      null
    );
  }, [selectedServiceFlow, clinicServiceOptions, clinicServices]);

  const isFreeConsultationService = React.useMemo(() => {
    const serviceName = String(
      selectedServiceData?.serviceName ?? selectedServiceData?.name ?? "",
    )
      .trim()
      .toLowerCase();

    const servicePrice = Number(
      selectedServiceData?.price ??
        selectedServiceData?.amount ??
        selectedServiceData?.fees ??
        -1,
    );

    return (
      serviceName === "free consultation" ||
      serviceName.includes("free consultation") ||
      servicePrice === 0
    );
  }, [selectedServiceData]);

  const appointmentIso = dateParam;

  const selectedServiceExpiryIso = React.useMemo(
    () => getServiceExpiryIso(selectedServiceData),
    [selectedServiceData],
  );

  const isServiceCoveredForSelectedDate = React.useMemo(() => {
    if (!selectedServiceExpiryIso) return false;
    if (!appointmentIso) return false;
    return appointmentIso <= selectedServiceExpiryIso;
  }, [appointmentIso, selectedServiceExpiryIso]);

  const paymentModeOptions = [
    { label: "Cash", value: "Cash" },
    { label: "UPI", value: "UPI" },
    { label: "Card", value: "Card" },
    { label: "Pay on Visit", value: "Pay Later" },
  ];

  React.useEffect(() => {
    setHasActiveSubscription(true);
  }, [patientId, doctorId]);

  React.useEffect(() => {
    if (isServiceCoveredForSelectedDate || isFreeConsultationService) {
      setValue("paymentMode", "", {
        shouldDirty: true,
        shouldValidate: false,
      });
      clearErrors("paymentMode");
    }
  }, [
    isServiceCoveredForSelectedDate,
    isFreeConsultationService,
    setValue,
    clearErrors,
  ]);

  return {
    userServiceResp,
    hasAppointmentDates,
    shouldLockSlotsForToday,
    clinicServices,
    canPickService,
    isFetchingServices,
    isUserServiceError,
    clinicServiceOptions,
    selectedServiceData,
    isFreeConsultationService,
    selectedServiceExpiryIso,
    isServiceCoveredForSelectedDate,
    paymentModeOptions,
    focusAfterServiceSelection,
  };
};

export default useAppointmentServicePayment;
