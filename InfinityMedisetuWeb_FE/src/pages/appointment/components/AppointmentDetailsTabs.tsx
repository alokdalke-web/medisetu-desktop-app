import {
  addToast,
  Button,
  Card,
  CardBody,
  Switch,
  Tab,
  Tabs,
  Tooltip,
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
import { BigSectionSkeleton } from "./AppointmentDetailsSkeletons";

type AppointmentDetailsTabsProps = {
  activeTab: string;
  onTabChange: (key: string) => void;
  isDoctor: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
  reportsLoading: boolean;
  apptLoading: boolean;
  appointment: any;
  meds: any[];
  details: any;
  onPrescriptionChange: (meds: any[], details: any) => void;
  onSavePrescription: () => void | Promise<void>;
  onClearPrescription: () => void;
  doctorId: string;
  isSavingPrescription: boolean;
  canEditPrescription: boolean;
  isConfirmedStatus: boolean;
  isPastAppointment: boolean;
  patientId: string;
  appointmentTime: string;
  patient: any;
  doctor: any;
  clinic: any;
  reportResult: any;
  onRefreshAfterSave: () => any;
  onAddTest: () => void;
  addedTests: string[];
  prescriptionProcessing: boolean;
  onCompletionStateChange: (state: any) => void;
  hasManualPrescription: boolean;
  onViewManualPrescription: () => void;
  onReuploadManualPrescription: () => void;
  onMedicinesChange: (hasMedicines: boolean) => void;
  currentDoctorId: string;
  hasAddedPrescriptionMeds: boolean;
  hasLocalMedicines: boolean;
  openManualPrescriptionModal: () => void;
  showFlowStepper?: boolean;

  doctorPrescriptionType?: "Digital" | "Manual" | "";
  isDoctorPrescriptionTypeFetching?: boolean;
};

type AppointmentFlowStepperProps = {
  isConfirmedStatus: boolean;
  hasPrescriptionStarted: boolean;
  isCompletedStatus: boolean;
  isCancelledStatus?: boolean;
};

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
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-[#273244] dark:bg-[#111726] dark:shadow-none sm:p-3 lg:px-5">
      <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 lg:flex lg:items-start lg:gap-3">
        {steps.map((step, index) => {
          const circleClass = isCancelledStatus
            ? "bg-slate-100 text-slate-400 dark:bg-[#172033] dark:text-white"
            : step.isDone
              ? "bg-teal-600 text-white shadow-md shadow-teal-100"
              : step.isActive
                ? "bg-teal-50 text-teal-700 ring-2 ring-teal-500 dark:bg-[#123730] dark:text-white"
                : "bg-slate-100 text-slate-500 dark:bg-[#172033] dark:text-white";

          const titleClass = isCancelledStatus
            ? "text-slate-500"
            : step.isDone || step.isActive
              ? "text-slate-900"
              : "text-slate-500";

          const cardClass = isCancelledStatus
            ? "border-slate-100 bg-slate-50"
            : step.isDone
              ? "border-teal-100 bg-teal-50/70"
              : step.isActive
                ? "border-teal-200 bg-white ring-1 ring-teal-100"
                : "border-slate-100 bg-slate-50/70";

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
                    className={`text-[11px] font-bold leading-[14px] dark:text-white sm:text-[13px] sm:leading-4 lg:text-sm ${titleClass}`}
                  >
                    {step.title}
                  </p>

                  <p className="mt-0.5 hidden text-[10px] font-medium leading-3 text-slate-500 dark:text-white sm:block lg:text-xs lg:leading-4">
                    {step.description}
                  </p>
                </div>
              </div>

              {index !== steps.length - 1 && (
                <div className="mt-4 hidden h-px min-w-[70px] flex-1 border-t border-dashed border-slate-300 dark:border-[#38445a] lg:block" />
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
}> = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="relative rounded-2xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/50 px-5 py-8 sm:px-8 sm:py-10 dark:border-rose-900/30 dark:from-[#111726] dark:to-[#1a1520]">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-rose-500/0 via-rose-500/50 to-rose-500/0" />

        <div className="mx-auto max-w-lg flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-4 ring-rose-50 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-900/10">
            <FiXCircle size={24} />
          </div>

          {/* Badge */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            Cancelled
          </div>

          {/* Title */}
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white sm:text-[20px]">
            Appointment Cancelled
          </h2>

          {/* Description */}
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            This appointment has been cancelled. Prescription, pathology, activity history, and gallery sections are not available.
          </p>

          {/* Action */}
          <Button
            radius="lg"
            variant="bordered"
            className="mt-6 h-10 border-slate-200 px-5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-[#273244] dark:text-slate-300 dark:hover:bg-[#1a2535]"
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
            ? "border-slate-200 bg-slate-50 dark:border-[#273244] dark:bg-[#0f1728]"
            : "border-slate-200 bg-gradient-to-b from-white to-slate-50/80 dark:border-[#273244] dark:bg-gradient-to-b dark:from-[#111726] dark:to-[#0f1728]",
          "px-5 py-8 sm:px-8 sm:py-10"
        ].join(" ")}>

          {/* Subtle top accent line */}
          {!isDisabled && (
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" />
          )}

          <div className="mx-auto max-w-lg">
            <div className="flex flex-col items-center text-center">

              {/* Icon with ring accent */}
              <Tooltip content={disabledMessage} isDisabled={!disabledMessage}>
                <div
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => { if (!isDisabled) openManualPrescriptionModal(); }}
                  className={[
                    "relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                    isDisabled
                      ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-[#1a2535] dark:text-slate-600"
                      : "cursor-pointer bg-primary/10 text-primary ring-4 ring-primary/5 hover:ring-primary/10 hover:bg-primary/15 hover:scale-105 dark:bg-[#1a3a35] dark:text-[#9be7dc] dark:ring-[#46beae]/10 dark:hover:ring-[#46beae]/20"
                  ].join(" ")}
                  aria-label="Upload digital prescription"
                >
                  <FiUpload size={26} />
                  {!isDisabled && (
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold shadow-sm dark:bg-[#46beae] dark:text-[#0b1321]">
                      +
                    </span>
                  )}
                </div>
              </Tooltip>

              {/* Title */}
              <h3 className="text-[18px] font-bold text-slate-900 dark:text-white sm:text-[20px]">
                Upload Digital Prescription
              </h3>

              {/* Description */}
              <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                Upload prescription images or scan from your phone. The preview will be available instantly for this appointment.
              </p>

              {/* Action Buttons */}
              <Tooltip content={disabledMessage} isDisabled={!disabledMessage}>
                <div className="mt-7 flex flex-col gap-3 w-full sm:flex-row sm:justify-center sm:w-auto">
                  <Button
                    radius="lg"
                    isDisabled={isDisabled}
                    startContent={<FiUpload size={15} />}
                    className={[
                      "h-11 px-6 text-[13px] font-semibold shadow-sm w-full sm:w-auto",
                      isDisabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none dark:bg-[#1a2535] dark:text-slate-600"
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
                          ? "border-slate-200 text-slate-400 cursor-not-allowed dark:border-[#273244] dark:text-slate-600"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-[#38445a] dark:text-slate-300 dark:hover:bg-[#1a2535]",
                      ].join(" ")}
                      onPress={() => openManualPrescriptionModal("phone-link")}
                    >
                      Send to Device
                    </Button>
                  )}
                </div>
              </Tooltip>

              {/* Secure note */}
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#0f1728]">
                <FiLock size={12} className="text-slate-400 dark:text-slate-500" />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
  const hasTabBarActions =
    canShowManualPrescriptionAction || canShowPrescriptionPreferenceAction;
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

  const tabListClassName = [
    "w-full max-w-full gap-2 sm:gap-4 relative rounded-none p-0 border-b border-divider dark:border-[#273244]",
    "overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    hasTabBarActions ? "xl:pr-[17rem] 2xl:pr-[22rem]" : "",
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

        {isCancelledStatus ? (
          <CancelledAppointmentState
            appointment={appointment}
            appointmentTime={appointmentTime}
          />
        ) : shouldHideAppointmentTabs ? null : (
          <div className="relative">
            {hasTabBarActions && (
              <div className="pointer-events-none absolute right-0 top-0 z-20 hidden h-12 items-center justify-end gap-2 xl:flex">
                {canShowManualPrescriptionAction && (
                  <div
                    className={[
                      "pointer-events-auto group flex h-8 min-w-fit items-center overflow-hidden rounded-lg border shadow-sm transition-all duration-200 px-1",
                      isDigitalPrescriptionToggleDisabled
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60 dark:border-[#273244] dark:bg-[#151c2d] dark:text-white dark:opacity-100"
                        : isDigitalPrescription
                          ? "border-primary/30 bg-primary/5 text-primary shadow-sm dark:border-[#46beae]/50 dark:bg-[#123730] dark:text-[#d8fff8] dark:shadow-none"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:bg-[#1a2535] dark:hover:shadow-none",
                    ].join(" ")}
                  >
                    <Tooltip
                      content={
                        digitalPrescriptionToggleDisabledMessage
                          ? digitalPrescriptionToggleDisabledMessage
                          : isDigitalPrescription
                            ? "Digital prescription is active — medicines are typed digitally"
                            : "Enable to type prescriptions digitally instead of handwriting"
                      }
                    >
                      <div
                        className={[
                          "flex h-full select-none items-center gap-1.5 px-1.5 pr-2 text-[12px] font-bold outline-none transition-all",
                          isDigitalPrescriptionToggleDisabled
                            ? "cursor-not-allowed"
                            : "cursor-default",
                        ].join(" ")}
                      >
                        <span className="leading-none 2xl:hidden">
                          Digital Rx
                        </span>
                        <span className="hidden leading-none 2xl:inline">
                          Digital Prescription
                        </span>
                      </div>
                    </Tooltip>

                    <Tooltip
                      content={
                        digitalPrescriptionToggleDisabledMessage
                          ? digitalPrescriptionToggleDisabledMessage
                          : isDigitalPrescription
                            ? "Click to switch to handwritten mode"
                            : "Click to enable digital prescription"
                      }
                    >
                      <Switch
                        size="sm"
                        color="success"
                        isSelected={isDigitalPrescription}
                        isDisabled={
                          isDigitalPrescriptionToggleDisabled ||
                          isDoctorPrescriptionTypeFetching ||
                          isPrescriptionTypeSaving
                        }
                        onValueChange={handleDigitalPrescriptionChange}
                        aria-label="Digital prescription mode"
                      />
                    </Tooltip>
                  </div>
                )}

                {canShowPrescriptionPreferenceAction && (
                  <Tooltip
                    content="Customize which sections appear in prescription form"
                    placement="bottom"
                  >
                    <Button
                      radius="sm"
                      size="sm"
                      className="pointer-events-auto h-8 border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 dark:border-[#273244] dark:bg-[#111726] dark:text-slate-300 dark:hover:bg-[#1a2535]"
                      startContent={<FiSettings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
                      onPress={() =>
                        navigate("/profile/prescription-preference")
                      }
                    >
                      <span className="2xl:hidden">Settings</span>
                      <span className="hidden 2xl:inline">
                        Customize Sections
                      </span>
                    </Button>
                  </Tooltip>
                )}
              </div>
            )}

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
                tabList: tabListClassName,
                panel: "p-0 pt-0 mt-0",
                cursor: "w-full bg-teal-600",
                tab: "max-w-fit px-1.5 sm:px-2 h-10 sm:h-12 shrink-0",
                tabContent:
                  "whitespace-nowrap text-xs sm:text-sm text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] font-semibold",
              }}
            >
              {isDoctor && (
                <Tab
                  key="prescription"
                  title={
                    <div className="flex items-center gap-2">
                      <FiFileText className="text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] transition-colors" />
                      <span className="sm:hidden text-[13px]">Prescription</span>
                      <span className="hidden sm:inline">
                        Prescription Details
                      </span>
                    </div>
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
                      />
                    )}
                  </div>
                </Tab>
              )}

              {(isDoctor || isAdmin || isReceptionist) && (
                <Tab
                  key="test-details"
                  title={
                    <div className="flex items-center gap-2">
                      <LuTestTubeDiagonal className="text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] transition-colors" />
                      <span className="sm:hidden text-[13px]">Tests</span>
                      <span className="hidden sm:inline">
                        Pathology Test Details
                      </span>
                    </div>
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
                        <CardBody className="p-3 sm:p-5">
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
                  <div className="flex items-center gap-2">
                    <GiBackwardTime className="text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] text-[13px] transition-colors" />
                    <span className="sm:hidden text-[13px]">History</span>
                    <span className="hidden sm:inline">Activity History</span>
                  </div>
                }
              >
                <div className="pt-3 sm:pt-4">
                  {activeTab === "history" && !apptLoading && appointment.id && (
                    <AppointmentHistory appointmentId={appointment.id} />
                  )}
                </div>
              </Tab>

              {(isDoctor || isAdmin || isReceptionist) && (
                <Tab
                  key="patient-gallery"
                  title={
                    <div className="flex items-center gap-2">
                      <FiImage className="text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] transition-colors" />
                      <span className="sm:hidden text-[13px]">
                        Patient Gallery
                      </span>
                      <span className="hidden sm:inline">Patient Gallery</span>
                    </div>
                  }
                >
                  <div className="pt-3 sm:pt-4">
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
                    <div className="flex items-center gap-2">
                      <FiImage className="text-slate-500 dark:text-white group-data-[selected=true]:text-teal-600 group-data-[selected=true]:dark:text-[#46beae] transition-colors" />
                      <span className="sm:hidden text-[13px]">My Gallery</span>
                      <span className="hidden sm:inline">Doctor Gallery</span>
                    </div>
                  }
                >
                  <div className="pt-3 sm:pt-4">
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
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default AppointmentDetailsTabs;
