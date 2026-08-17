import {
  addToast,
  Button,
  Card,
  CardBody,
  Tab,
  Tabs,
} from "@heroui/react";
import React from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiFileText,
  FiImage,
  FiSettings,
  FiUpload,
  FiSmartphone,
  FiLock,
  FiXCircle,
  FiUserX,
} from "react-icons/fi";
import { GiBackwardTime } from "react-icons/gi";
import { LuTestTubeDiagonal } from "react-icons/lu";
import { useNavigate } from "react-router";

import AppointmentHistory from "../../../components/appointment/AppointmentHistory";
import MyGallery from "../../../components/appointment/MyGallery";
import PatientGallery from "../../../components/appointment/PatientGallery";
import TestDetailsTab from "../../../components/prescription/TestDetailsTab";
import type { ManualPrescriptionModalVariant } from "../hooks/useManualPrescription";
import {
  useGetDoctorPrescriptionTypeQuery,
  useSetDoctorPrescriptionTypeMutation,
  type DoctorPrescriptionType,
} from "../../../redux/api/prescriptionApi";
import PrescriptionSection from "../../patient/PrescriptionSection";
import Tooltip from "../../../components/shared/Tooltip";
import { useConnectivityState } from "../../../hooks/useConnectivityState";
import { BigSectionSkeleton } from "./AppointmentDetailsSkeletons";
import AppointmentTabTitle from "./tabs/AppointmentTabTitle";
import PrescriptionTabActions from "./tabs/PrescriptionTabActions";
import type {
  AppointmentDetailsTabsProps,
  AppointmentFlowStepperProps,
} from "../../../types/appointment";

const getPrescriptionTypeFromResponse = (
  response: any,
): DoctorPrescriptionType | "" => {
  const prescriptionType =
    response?.data?.prescriptionType ??
    response?.result?.prescriptionType ??
    response?.prescriptionType ??
    "";

  if (prescriptionType === "Digital" || prescriptionType === "Manual") {
    return prescriptionType;
  }

  return "";
};

export const AppointmentFlowStepper: React.FC<AppointmentFlowStepperProps> = ({
  isConfirmedStatus,
  hasPrescriptionStarted,
  isCompletedStatus,
  isCancelledStatus = false,
}) => {
  const isAppointmentConfirmed = isConfirmedStatus || isCompletedStatus;

  const steps = [
    {
      id: 1,
      title: "Confirm Appointment",
      description: "Mark patient arrival",
      isDone: isAppointmentConfirmed && !isCancelledStatus,
      isActive: !isAppointmentConfirmed && !isCancelledStatus,
    },
    {
      id: 2,
      title: "Add Prescription",
      description: "Add medicines, diagnosis & more",
      isDone:
        (hasPrescriptionStarted || isCompletedStatus) && !isCancelledStatus,
      isActive:
        isAppointmentConfirmed &&
        !hasPrescriptionStarted &&
        !isCompletedStatus &&
        !isCancelledStatus,
    },
    {
      id: 3,
      title: "Complete Consultation",
      description: "Review & complete",
      isDone: isCompletedStatus && !isCancelledStatus,
      isActive:
        hasPrescriptionStarted && !isCompletedStatus && !isCancelledStatus,
    },
  ];

  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface p-2 shadow-sm dark:shadow-none sm:p-3 lg:px-5">
      <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 lg:flex lg:items-start lg:gap-3">
        {steps.map((step, index) => {
          // Brand token, not raw `teal-*`: the tab cursor and every other
          // accent on this screen resolve from `--color-primary`, so the
          // stepper sitting directly above the tabs has to read from the same
          // source or the two greens drift apart.
          const circleClass = isCancelledStatus
            ? "bg-surface-muted text-text-subtle"
            : step.isDone
              ? "bg-primary text-white shadow-sm"
              : step.isActive
                ? "bg-primary/10 text-primary ring-2 ring-primary/50 dark:text-primary-hover"
                : "bg-surface-muted text-text-muted";

          const titleClass = isCancelledStatus
            ? "text-text-muted"
            : step.isDone || step.isActive
              ? "text-text"
              : "text-text-muted";

          const cardClass = isCancelledStatus
            ? "border-line bg-surface-muted"
            : step.isDone
              ? "border-primary/20 bg-primary/5"
              : step.isActive
                ? "border-primary/30 bg-surface ring-1 ring-primary/10"
                : "border-line bg-surface-muted";

          return (
            <React.Fragment key={step.id}>
              <div
                className={[
                  "min-w-0 rounded-xl border px-2 py-2 transition-all",
                  "flex flex-col items-center justify-start gap-1.5 text-center",
                  "sm:px-3 sm:py-2.5",
                  "lg:min-w-[230px] lg:flex-row lg:items-center lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:text-left lg:ring-0",
                  cardClass,
                ].join(" ")}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-all sm:h-9 sm:w-9 sm:text-sm ${circleClass}`}
                >
                  {step.isDone ? <FiCheckCircle size={16} /> : step.id}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-[11px] font-bold leading-[14px] sm:text-[13px] sm:leading-4 lg:text-sm ${titleClass}`}
                  >
                    {step.title}
                  </p>

                  <p className="mt-0.5 hidden text-[10px] font-medium leading-3 text-text-muted sm:block lg:text-xs lg:leading-4">
                    {step.description}
                  </p>
                </div>
              </div>

              {index !== steps.length - 1 && (
                <div className="mt-4 hidden h-px min-w-[70px] flex-1 border-t border-dashed border-line lg:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const CancelledAppointmentState: React.FC<{
  appointment: any;
  appointmentTime: string;
  variant?: "cancelled" | "noshow";
}> = ({ variant = "cancelled" }) => {
  const navigate = useNavigate();
  const isNoShow = variant === "noshow";

  const theme = isNoShow
    ? {
      border: "border-amber-100 dark:border-amber-900/30",
      accent: "from-amber-500/0 via-amber-500/50 to-amber-500/0",
      iconWrap:
        "bg-amber-100 text-amber-600 ring-4 ring-amber-50 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-900/10",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
      dot: "bg-amber-500",
      gradient: "dark:from-[#111726] dark:to-[#221c10]",
      bgFrom: "from-white to-amber-50/50",
    }
    : {
      border: "border-rose-100 dark:border-rose-900/30",
      accent: "from-rose-500/0 via-rose-500/50 to-rose-500/0",
      iconWrap:
        "bg-rose-100 text-rose-600 ring-4 ring-rose-50 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-900/10",
      badge:
        "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
      dot: "bg-rose-500",
      gradient: "dark:from-[#111726] dark:to-[#1a1520]",
      bgFrom: "from-white to-rose-50/50",
    };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div
        className={`relative rounded-2xl border ${theme.border} bg-gradient-to-b ${theme.bgFrom} px-5 py-8 sm:px-8 sm:py-10 ${theme.gradient}`}
      >
        {/* Top accent */}
        <div
          className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${theme.accent}`}
        />

        <div className="mx-auto max-w-lg flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${theme.iconWrap}`}
          >
            {isNoShow ? <FiUserX size={24} /> : <FiXCircle size={24} />}
          </div>

          {/* Badge */}
          <div
            className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${theme.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot} animate-pulse`} />
            {isNoShow ? "No-Show" : "Cancelled"}
          </div>

          {/* Title */}
          <h2 className="text-[18px] font-bold text-text sm:text-[20px]">
            {isNoShow ? "Patient Did Not Show Up" : "Appointment Cancelled"}
          </h2>

          {/* Description */}
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-text-muted">
            {isNoShow
              ? "This appointment was marked as No-Show. Prescription, pathology, activity history, and gallery sections are not available."
              : "This appointment has been cancelled. Prescription, pathology, activity history, and gallery sections are not available."}
          </p>

          {/* Action */}
          <Button
            radius="lg"
            variant="bordered"
            className="mt-6 h-10 border-line px-5 text-[13px] font-semibold text-text hover:border-primary/40 hover:bg-surface-muted"
            startContent={<FiArrowLeft size={15} />}
            onPress={() => navigate("/appointment/new")}
          >
            Book New Appointment
          </Button>
        </div>
      </div>
    </div>
  );
};

const ManualPrescriptionOnlyState: React.FC<{
  isConfirmedStatus: boolean;
  isPastAppointment: boolean;
  hasAddedPrescriptionMeds: boolean;
  hasLocalMedicines: boolean;
  openManualPrescriptionModal: (
    variant?: ManualPrescriptionModalVariant,
  ) => void;
  appointmentId?: string;
}> = ({
  isConfirmedStatus,
  isPastAppointment,
  hasAddedPrescriptionMeds,
  hasLocalMedicines,
  openManualPrescriptionModal,
  appointmentId,
}) => {
    const isDisabled =
      !isConfirmedStatus ||
      isPastAppointment ||
      hasAddedPrescriptionMeds ||
      hasLocalMedicines;

    const disabledMessage = !isConfirmedStatus
      ? "Please confirm the appointment first"
      : isPastAppointment
        ? "Appointment time has passed. Upload is not allowed"
        : hasAddedPrescriptionMeds || hasLocalMedicines
          ? "Manual prescription is disabled because medicines are already added"
          : undefined;

    return (
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className={[
          "relative rounded-2xl border overflow-hidden",
          isDisabled
            ? "border-line bg-surface-muted"
            : "border-line bg-surface",
          "px-5 py-8 sm:px-8 sm:py-10"
        ].join(" ")}>

          {/* Subtle top accent line */}
          {!isDisabled && (
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" />
          )}

          <div className="mx-auto max-w-lg">
            <div className="flex flex-col items-center text-center">

              {/* Icon with ring accent */}
              <Tooltip content={disabledMessage} isDisabled={!disabledMessage} showArrow delay={200}>
                <div
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => { if (!isDisabled) openManualPrescriptionModal(); }}
                  className={[
                    "relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                    isDisabled
                      ? "cursor-not-allowed bg-surface-muted text-text-subtle"
                      : "cursor-pointer bg-primary/10 text-primary ring-4 ring-primary/5 hover:bg-primary/15 hover:ring-primary/10 hover:scale-105 dark:text-primary-hover"
                  ].join(" ")}
                  aria-label="Upload digital prescription"
                >
                  <FiUpload size={26} />
                  {!isDisabled && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-sm">
                      +
                    </span>
                  )}
                </div>
              </Tooltip>

              {/* Title */}
              <h3 className="text-[18px] font-bold text-text sm:text-[20px]">
                Upload Digital Prescription
              </h3>

              {/* Description */}
              <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-text-muted">
                Upload prescription images or scan from your phone. The preview will be available instantly for this appointment.
              </p>

              {/* Action Buttons */}
              <Tooltip content={disabledMessage} isDisabled={!disabledMessage} showArrow delay={200}>
                <div className="mt-7 flex flex-col gap-3 w-full sm:flex-row sm:justify-center sm:w-auto">
                  <Button
                    radius="lg"
                    isDisabled={isDisabled}
                    startContent={<FiUpload size={15} />}
                    className={[
                      "h-11 px-6 text-[13px] font-semibold shadow-sm w-full sm:w-auto",
                      isDisabled
                        ? "bg-surface-muted text-text-subtle cursor-not-allowed shadow-none"
                        : "bg-primary text-white hover:bg-teal-800 active:scale-[0.98] shadow-primary/20",
                    ].join(" ")}
                    onPress={() => openManualPrescriptionModal()}
                  >
                    Upload Prescription
                  </Button>

                  {appointmentId && (
                    <Button
                      radius="lg"
                      variant="bordered"
                      isDisabled={isDisabled}
                      startContent={<FiSmartphone size={15} />}
                      className={[
                        "h-11 px-6 text-[13px] font-semibold w-full sm:w-auto",
                        isDisabled
                          ? "border-line text-text-subtle cursor-not-allowed"
                          : "border-line text-text hover:border-primary/40 hover:bg-surface-muted",
                      ].join(" ")}
                      onPress={() => openManualPrescriptionModal("phone-link")}
                    >
                      Send to Device
                    </Button>
                  )}
                </div>
              </Tooltip>

              {/* Secure note */}
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
                <FiLock size={12} className="text-text-muted" />
                <span className="text-[11px] font-medium text-text-muted">
                  Your data is secure and encrypted
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

const AppointmentDetailsTabs: React.FC<AppointmentDetailsTabsProps> = ({
  activeTab,
  onTabChange,
  isDoctor,
  isAdmin,
  isReceptionist,
  reportsLoading,
  apptLoading,
  appointment,
  meds,
  details,
  onPrescriptionChange,
  onSavePrescription,
  onClearPrescription,
  doctorId,
  isSavingPrescription,
  canEditPrescription,
  isConfirmedStatus,
  isPastAppointment,
  patientId,
  appointmentTime,
  patient,
  doctor,
  clinic,
  reportResult,
  onRefreshAfterSave,
  onAddTest,
  addedTests,
  prescriptionProcessing,
  onCompletionStateChange,
  hasManualPrescription,
  onViewManualPrescription,
  onReuploadManualPrescription,
  onMedicinesChange,
  currentDoctorId,
  hasAddedPrescriptionMeds,
  hasLocalMedicines,
  openManualPrescriptionModal,
  showFlowStepper = true,
}) => {
  const navigate = useNavigate();
  const [isDigitalPrescription, setIsDigitalPrescription] =
    React.useState(false);

  const {
    data: doctorPrescriptionTypeData,
    isFetching: isDoctorPrescriptionTypeFetching,
    refetch: refetchDoctorPrescriptionType,
  } = useGetDoctorPrescriptionTypeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [setDoctorPrescriptionType, { isLoading: isPrescriptionTypeSaving }] =
    useSetDoctorPrescriptionTypeMutation();

  const doctorPrescriptionType = getPrescriptionTypeFromResponse(
    doctorPrescriptionTypeData,
  );

  React.useEffect(() => {
    if (isDoctorPrescriptionTypeFetching) return;
    if (!doctorPrescriptionType) return;

    setIsDigitalPrescription(doctorPrescriptionType === "Digital");
  }, [doctorPrescriptionType, isDoctorPrescriptionTypeFetching]);

  const rawAppointmentStatus =
    appointment?.appointmentStatus ??
    appointment?.appointment_status ??
    appointment?.appointment?.appointmentStatus ??
    appointment?.appointment?.appointment_status ??
    appointment?.status ??
    "";

  const appointmentStatus = String(rawAppointmentStatus).trim().toLowerCase();

  const shouldHideAppointmentTabs =
    appointmentStatus === "pending" || appointmentStatus === "patient arrived";

  const isCompletedStatus =
    appointmentStatus === "completed" ||
    appointmentStatus === "complete" ||
    appointmentStatus === "consulted" ||
    appointmentStatus === "done";

  const isCancelledStatus =
    appointmentStatus === "cancelled" ||
    appointmentStatus === "canceled" ||
    appointmentStatus === "cancel";

  const isNoShowStatus =
    appointmentStatus === "noshow" ||
    appointmentStatus === "no-show" ||
    appointmentStatus === "no show";

  const hasPrescriptionStarted =
    hasManualPrescription ||
    hasAddedPrescriptionMeds ||
    hasLocalMedicines ||
    Boolean(meds?.length);

  const canShowManualPrescriptionAction =
    !isReceptionist &&
    (isDoctor || isAdmin) &&
    !prescriptionProcessing &&
    !hasManualPrescription &&
    !hasAddedPrescriptionMeds;
  const canShowPrescriptionPreferenceAction =
    activeTab === "prescription" &&
    isDoctor &&
    !isCompletedStatus &&
    !prescriptionProcessing;
  // The section-preference shortcut now lives in the clinical-details drawer
  // header, beside the very sections it configures, so it is no longer part of
  // the tab bar's own actions.
  const hasTabBarActions = canShowManualPrescriptionAction;
  const connectivityState = useConnectivityState();
  const isOffline = connectivityState !== 'online';

  const isDigitalPrescriptionToggleDisabled =
    !isConfirmedStatus || hasAddedPrescriptionMeds || hasLocalMedicines;

  const digitalPrescriptionToggleDisabledMessage = !isConfirmedStatus
    ? "Please confirm the appointment first"
    : hasAddedPrescriptionMeds || hasLocalMedicines
      ? "Digital prescription type cannot be changed because medicines are already added"
      : undefined;

  const shouldShowManualUploadOnly =
    !isDigitalPrescription &&
    !hasManualPrescription &&
    !hasAddedPrescriptionMeds &&
    !hasLocalMedicines;

  const handleDigitalPrescriptionChange = async (value: boolean) => {
    if (isDigitalPrescriptionToggleDisabled || hasManualPrescription) {
      return;
    }

    const previousValue = isDigitalPrescription;

    setIsDigitalPrescription(value);
    onTabChange("prescription");

    try {
      const updateResponse = await setDoctorPrescriptionType().unwrap();

      let latestPrescriptionType =
        getPrescriptionTypeFromResponse(updateResponse);

      if (!latestPrescriptionType) {
        const latestResponse = await refetchDoctorPrescriptionType().unwrap();
        latestPrescriptionType =
          getPrescriptionTypeFromResponse(latestResponse);
      } else {
        refetchDoctorPrescriptionType();
      }

      if (latestPrescriptionType) {
        setIsDigitalPrescription(latestPrescriptionType === "Digital");
      } else {
        setIsDigitalPrescription(value);
      }

      addToast({
        title: "Success",
        description: "Prescription type updated successfully.",
        color: "success",
      });
    } catch (error) {
      console.error("Failed to update prescription type:", error);

      setIsDigitalPrescription(previousValue);

      addToast({
        title: "Error",
        description: "Failed to update prescription type.",
        color: "danger",
      });
    }
  };

  /**
   * The tab strip scrolls on its own; the actions are a real flex sibling
   * beside it (below it under `lg`), so no reserve gutter has to be guessed
   * here and nothing is hidden from narrow screens.
   */
  const tabListClassName = [
    "w-full max-w-full gap-2 sm:gap-4 relative rounded-none p-0 border-0",
    "overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  ].join(" ");

  return (
    <Card shadow="none" radius="lg" className="bg-transparent">
      <CardBody className="p-0 ">
        {showFlowStepper && !isReceptionist && (
          <AppointmentFlowStepper
            isConfirmedStatus={isConfirmedStatus}
            hasPrescriptionStarted={hasPrescriptionStarted}
            isCompletedStatus={isCompletedStatus}
            isCancelledStatus={isCancelledStatus}
          />
        )}

        {isCancelledStatus || isNoShowStatus ? (
          <CancelledAppointmentState
            appointment={appointment}
            appointmentTime={appointmentTime}
            variant={isNoShowStatus ? "noshow" : "cancelled"}
          />
        ) : shouldHideAppointmentTabs ? null : (
          /* Grid rather than a flex row, because `Tabs` renders its tab list
             and its panels as *siblings* — wrapping it would drag the panel
             into the same narrow column as the tab strip. Explicit row/column
             placement on the `base`/`panel` slots keeps the actions beside the
             tabs while the panel still spans the full width. */
          <div
            className={[
              "relative grid grid-cols-1",
              hasTabBarActions ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "",
            ].join(" ")}
          >
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={(key) => {
                if (key === "manual-prescription-action") return;
                onTabChange(key as string);
              }}
              aria-label="Appointment sections"
              variant="underlined"
              destroyInactiveTabPanel={false}
              classNames={{
                base: "col-start-1 row-start-1 min-w-0 border-b border-line",
                tabList: tabListClassName,
                // The panel always spans the full width, on its own row, so
                // the actions column never narrows the tab content.
                // All five panels get their top spacing here rather than each
                // wrapping div choosing its own (pt-3/p-5/none), so every tab's
                // content starts on the same line under the strip.
                panel: "px-0 pb-0 mt-0 pt-3 sm:pt-4 col-start-1 row-start-3 lg:row-start-2 lg:col-span-2",
                // `--color-primary` is not remapped under `.dark` (it stays
                // #0a6c74), so the dark pair here is load-bearing, not the
                // redundant-hex trap — `primary-hover` is the light-on-dark
                // teal from the same token set.
                cursor: "w-full bg-primary dark:bg-primary-hover",
                tab: "max-w-fit px-1.5 sm:px-2 h-10 sm:h-12 shrink-0",
                tabContent:
                  "whitespace-nowrap text-xs sm:text-sm text-text-muted group-data-[selected=true]:text-primary group-data-[selected=true]:dark:text-primary-hover font-semibold",
              }}
            >
              {isDoctor && (
                <Tab
                  key="prescription"
                  title={
                    <AppointmentTabTitle
                      icon={<FiFileText />}
                      label="Prescription Details"
                      shortLabel="Prescription"
                    />
                  }
                >
                  <div>
                    {reportsLoading ? (
                      <BigSectionSkeleton title="Prescription" />
                    ) : shouldShowManualUploadOnly ? (
                      <ManualPrescriptionOnlyState
                        isConfirmedStatus={isConfirmedStatus}
                        isPastAppointment={isPastAppointment}
                        hasAddedPrescriptionMeds={hasAddedPrescriptionMeds}
                        hasLocalMedicines={hasLocalMedicines}
                        openManualPrescriptionModal={openManualPrescriptionModal}
                        appointmentId={appointment?.id ? String(appointment.id) : undefined}
                      />
                    ) : (
                      <PrescriptionSection
                        meds={meds}
                        details={details}
                        onChange={onPrescriptionChange}
                        onSave={onSavePrescription}
                        onClear={onClearPrescription}
                        doctorId={doctorId}
                        isSaving={isSavingPrescription}
                        editingAllowed={canEditPrescription}
                        disabledTooltip={
                          !isConfirmedStatus
                            ? "Please confirm the appointment"
                            : isPastAppointment
                              ? "Appointment time has passed. Editing is not allowed"
                              : undefined
                        }
                        title="Prescription"
                        patientId={patientId || ""}
                        appointmentId={appointment.id}
                        appointmentTime={appointmentTime}
                        patient={patient}
                        doctor={doctor}
                        clinic={clinic}
                        appointmentStatus={rawAppointmentStatus}
                        reportResult={reportResult}
                        onRefreshAfterSave={onRefreshAfterSave}
                        onAddTest={onAddTest}
                        addedTests={addedTests}
                        prescriptionProcessing={prescriptionProcessing}
                        onCompletionStateChange={onCompletionStateChange}
                        hasManualPrescription={hasManualPrescription}
                        onViewManualPrescription={onViewManualPrescription}
                        onReuploadManualPrescription={
                          onReuploadManualPrescription
                        }
                        onMedicinesChange={onMedicinesChange}
                        onOpenPreference={
                          canShowPrescriptionPreferenceAction
                            ? () => navigate("/profile/prescription-preference")
                            : undefined
                        }
                      />
                    )}
                  </div>
                </Tab>
              )}

              {(isDoctor || isAdmin || isReceptionist) && (
                <Tab
                  key="test-details"
                  title={
                    <AppointmentTabTitle
                      icon={<LuTestTubeDiagonal />}
                      label="Pathology Test Details"
                      shortLabel="Tests"
                    />
                  }
                >
                  <div>
                    {reportsLoading ? (
                      <BigSectionSkeleton title="Pathology Test Details" />
                    ) : (
                      <Card
                        shadow="none"
                        radius="lg"
                        className="overflow-hidden bg-transparent"
                      >
                        <CardBody className="p-0">
                          <TestDetailsTab
                            patientId={patientId || ""}
                            appointmentId={appointment.id}
                            appointmentStatus={rawAppointmentStatus}
                            hideAddNewButton={!isDoctor}
                            pdfMeta={{
                              patientId: patientId || undefined,
                              patientName: patient?.name ?? undefined,
                              patientEmail: patient?.email ?? undefined,
                              patientMobile: patient?.mobile ?? undefined,
                              patientGender: patient?.gender ?? undefined,
                              patientAge: patient?.age ?? undefined,
                              patientDob: patient?.dob ?? undefined,
                              patientAddress: patient?.address || [
                                patient?.city,
                                patient?.state,
                                patient?.country
                              ].filter(Boolean).join(", ") || undefined,
                              doctorName: doctor?.name ?? undefined,
                              clinicName: clinic?.name ?? undefined,
                              clinicAddress: [
                                clinic?.addressLine1,
                                clinic?.addressLine2,
                              ]
                                .filter(Boolean)
                                .join(", "),
                              appointmentId: appointment?.id ?? undefined,
                              appointmentTime: appointmentTime ?? undefined,
                              appointmentStatus: rawAppointmentStatus ?? undefined,
                            }}
                          />
                        </CardBody>
                      </Card>
                    )}
                  </div>
                </Tab>
              )}

              <Tab
                key="history"
                title={
                  <AppointmentTabTitle
                    icon={<GiBackwardTime />}
                    label="Activity History"
                    shortLabel="History"
                  />
                }
              >
                <div>
                  {activeTab === "history" && !apptLoading && appointment.id && (
                    <AppointmentHistory appointmentId={appointment.id} />
                  )}
                </div>
              </Tab>

              {(isDoctor || isAdmin || isReceptionist) && (
                <Tab
                  key="patient-gallery"
                  title={
                    <AppointmentTabTitle
                      icon={<FiImage />}
                      label="Patient Gallery"
                    />
                  }
                >
                  <div>
                    <PatientGallery
                      appointmentId={appointment.id}
                      appointmentStatus={rawAppointmentStatus}
                      patientId={patientId || ""}
                      currentDoctorId={currentDoctorId}
                      isDoctor={isDoctor}
                      isAdmin={isAdmin}
                      isReceptionist={isReceptionist}
                    />
                  </div>
                </Tab>
              )}

              {(isDoctor || isAdmin || isReceptionist) && (
                <Tab
                  key="my-gallery"
                  title={
                    <AppointmentTabTitle
                      icon={<FiImage />}
                      label="Doctor Gallery"
                      shortLabel="My Gallery"
                    />
                  }
                >
                  <div>
                    <MyGallery
                      appointmentId={appointment.id}
                      appointmentStatus={rawAppointmentStatus}
                      patientId={patientId || ""}
                      currentDoctorId={currentDoctorId}
                      isDoctor={isDoctor}
                      isAdmin={isAdmin}
                      isReceptionist={isReceptionist}
                    />
                  </div>
                </Tab>
              )}

            </Tabs>

            {hasTabBarActions && (
              <div className="col-start-1 row-start-2 py-2 lg:col-start-2 lg:row-start-1 lg:flex lg:items-center lg:border-b lg:border-line lg:py-0">
                <PrescriptionTabActions
                  showDigitalToggle={canShowManualPrescriptionAction}
                  isDigitalPrescription={isDigitalPrescription}
                  isToggleDisabled={isDigitalPrescriptionToggleDisabled}
                  disabledMessage={digitalPrescriptionToggleDisabledMessage}
                  isToggleBusy={
                    isDoctorPrescriptionTypeFetching || isPrescriptionTypeSaving
                  }
                  onDigitalPrescriptionChange={handleDigitalPrescriptionChange}
                />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default AppointmentDetailsTabs;
