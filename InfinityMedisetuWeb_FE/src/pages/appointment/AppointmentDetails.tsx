import { addToast } from "@heroui/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router";

import { useAppointmentRealtime } from "../../hooks/useAppointmentRealtime";
import FeatureInfoTip from "../../components/shared/FeatureInfoTip";
import { appointmentDetailTips } from "../../constants/featureTips";

import {
  type CreateTestInput,
  type TestSelectOption,
} from "../../components/prescription/AddNewTestModal";

import { type SelectedMed } from "../../components/PrescriptionWorkspace";
import {
  type PrescriptionDetailsValue,
  emptyPrescriptionDetails,
} from "../../components/prescription/PrescriptionDetails";
import {
  useGetAppointmentByIdQuery,
  useGetAppointmentReportsQuery,
  useGetMedicalCertificateQuery,
  useGetMultipleServicesQuery,
  useSaveMedicalCertificateMutation,
  useUpdateAppointmentMutation,
  useUploadAppointmentConsentMutation,
} from "../../redux/api/appointmentApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetAllClinicsQuery } from "../../redux/api/clinicApi";
import { useGetDoctorPreferencesQuery } from "../../redux/api/medicineApi";
import {
  useCreatePrescriptionMutation,
  useGetDoctorPrescriptionTypeQuery,
} from "../../redux/api/prescriptionApi";
import { useUpdateDoctorManualPrescriptionMutation } from "../../redux/api/prescriptionScannerApi";

import {
  useAssignAppointmentTestMutation,
  useCreateTestMutation,
  useGetAppointmentTestsByAppointmentIdQuery,
  useLazyGetAllTestsByClinicIdQuery,
} from "../../redux/api/testApi";
import { AppointmentInfoSkeleton } from "./components/AppointmentDetailsSkeletons";
import AppointmentDetailsModals from "./components/AppointmentDetailsModals";
import AppointmentDetailsTabs from "./components/AppointmentDetailsTabs";
import AppointmentServicesCard from "./components/AppointmentServicesCard";
import AppointmentSummaryCard from "./components/AppointmentSummaryCard";
import AppointmentVitalsSection from "./components/AppointmentVitalsSection";
import PayLaterPaymentBanner from "./components/PayLaterPaymentBanner";
import {
  mapReportPrescriptionToSelectedMed,
  mergeReportCardToDetails,
  safe,
  to12h,
} from "./helpers/appointmentDetailsHelpers";
import {
  mapAppointment,
  mapClinic,
  mapClinicService,
  mapDoctor,
  mapFullPatientAddress,
  mapPatient,
  mapPatientIdRaw,
  mapPdfPatient,
  mapReferEntry,
  mapSymptomsFromApi,
  mapSymptomsToRender,
} from "./helpers/appointmentDataMappers";
import {
  buildConsentPrintHtml as buildConsentPrintHtmlHelper,
  buildMedicalCertificatePrintHtml as buildMedicalCertificatePrintHtmlHelper,
  buildPrescriptionPayload,
  buildReferPrintHtml as buildReferPrintHtmlHelper,
  FIELD_CN,
} from "./helpers/appointmentDetailsPrintHelpers";
import { buildAppointmentInvoicePayload } from "./helpers/invoicePayloadHelper";
import useAppointmentVitals from "./hooks/useAppointmentVitals";
import useAppointmentKeyboardShortcuts from "./hooks/useAppointmentKeyboardShortcuts";
import useConsentUpload from "./hooks/useConsentUpload";
import useManualPrescription from "./hooks/useManualPrescription";
import useMedicalCertificateActions from "./hooks/useMedicalCertificateActions";

/* ---------- Component ---------- */

const AppointmentDetails: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ Real-time: auto-refresh when this appointment changes
  useAppointmentRealtime({ skipOwnActions: true });

  const { data: me } = useGetUserQuery();

  const rawMe = (me as any) ?? {};
  const meDoc = rawMe.result ?? rawMe.data ?? rawMe;

  const currentUserId = String(
    meDoc?.id ?? rawMe?.id ?? (me as any)?.id ?? "",
  ).trim();

  const userTypeRaw = meDoc.userType ?? rawMe.userType ?? null;
  const isAdminDoctorAccess = meDoc.isAdminDoctorAccess ?? false;

  const role = typeof userTypeRaw === "string" ? userTypeRaw.toLowerCase() : "";
  const isAdmin = role === "admin" || role === "superadmin";
  const isReceptionist = role === "receptionist";

  const [activeTab, setActiveTab] = useState<string>("history");
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isPayLaterModalOpen, setIsPayLaterModalOpen] = useState(false);
  const [isAdminConfirmReasonModalOpen, setIsAdminConfirmReasonModalOpen] =
    useState(false);
  const [isManualPrescriptionPreviewOpen, setIsManualPrescriptionPreviewOpen] =
    useState(false);
  const [isReferPreviewOpen, setIsReferPreviewOpen] = useState(false);
  const [referPreviewHtml, setReferPreviewHtml] = useState("");
  const [adminConfirmReason, setAdminConfirmReason] = useState("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);

  const [hasLocalMedicines, setHasLocalMedicines] = useState(false);

  const [medicalCertificateRestrictions, setMedicalCertificateRestrictions] =
    useState("");

  const [medicalCertificateReason, setMedicalCertificateReason] = useState("");

  const [medicalCertificateRestDays, setMedicalCertificateRestDays] =
    useState("");
  const [isMedicalCertificateModalOpen, setIsMedicalCertificateModalOpen] =
    useState(false);

  const [isMedicalCertificatePrinting, setIsMedicalCertificatePrinting] =
    useState(false);
  const [isMedicalCertificatePreviewOpen, setIsMedicalCertificatePreviewOpen] =
    useState(false);
  const [medicalCertificatePreviewHtml, setMedicalCertificatePreviewHtml] =
    useState("");

  const [adminConfirmError, setAdminConfirmError] = useState("");
  const [consentNotes, setConsentNotes] = useState("");
  const [isConsentPrinting, setIsConsentPrinting] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [confirmAfterPay, setConfirmAfterPay] = useState(false);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  const [showCancelHint, setShowCancelHint] = useState(false);
  // Set default tab based on role once data is available
  const [addTestOpen, setAddTestOpen] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [isSummaryAccordionOpen, setIsSummaryAccordionOpen] = useState(true);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [isEditingConsent, setIsEditingConsent] = useState(false);

  type FormType = "consent" | "refer";

  const [, setActiveFormType] = useState<FormType>("consent");
  const [isFormTypeModalOpen, setIsFormTypeModalOpen] = useState(false);

  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [referNotes, setReferNotes] = useState("");

  const [referredName, setReferredName] = useState("");
  const [referredAddress, setReferredAddress] = useState("");
  const [referredDoctorClinic, setReferredDoctorClinic] = useState("");
  const [referredPhone, setReferredPhone] = useState("");
  const tabsSectionRef = useRef<HTMLDivElement | null>(null);

  const [rxTests, setRxTests] = useState<string[]>([]);

  const [prescriptionProcessing, setPrescriptionProcessing] = useState(false);
  const handlePrescriptionCompletionStateChange = ({
    isProcessing,
    isSuccess,
    error,
  }: {
    isProcessing: boolean;
    isSuccess: boolean;
    error?: string | null;
  }) => {
    setPrescriptionProcessing(isProcessing);
    setActiveTab("prescription");

    if (!isProcessing && !isSuccess && error) {
      addToast({
        title: "Prescription processing failed",
        description: error,
        color: "danger",
        variant: "flat",
      });
    }

    if (!isProcessing && isSuccess) {
      refetchAppointment();
      refetchReports();
    }
  };
  const { data: clinicData } = useGetAllClinicsQuery();
  const clinicId: string | undefined = (clinicData as any)?.clinic?.id;
  const isClinicLoading = !clinicData;

  const [
    fetchTests,
    {
      data: testsResp,
      isFetching: isTestsFetching,
      isUninitialized: isTestsUninitialized,
    },
  ] = useLazyGetAllTestsByClinicIdQuery();

  const { data: appointmentTestsRaw } =
    useGetAppointmentTestsByAppointmentIdQuery(id, { skip: !id });

  useEffect(() => {
    if (!appointmentTestsRaw || rxTests.length) return;

    const list: any[] = Array.isArray(appointmentTestsRaw)
      ? (appointmentTestsRaw as any[])
      : [];

    const names = Array.from(
      new Set(
        list
          .map((t) => t?.test?.name)
          .filter((n) => typeof n === "string" && n.trim().length > 0)
          .map((n) => String(n)),
      ),
    );

    if (names.length) {
      setRxTests(names);
    }
  }, [appointmentTestsRaw, rxTests.length]);

  const apiTests = useMemo(() => {
    const arr = (testsResp as any)?.result;
    return Array.isArray(arr) ? arr : [];
  }, [testsResp]);

  const ensureTestsLoaded = () => {
    if (!clinicId) return;
    fetchTests({ clinicId, page: 1, pageSize: 200 }, true);
  };

  const [updateDoctorManualPrescription] =
    useUpdateDoctorManualPrescriptionMutation();

  const [createTest, { isLoading: isCreatingTest }] = useCreateTestMutation();
  const [assignAppointmentTest, { isLoading: isAssigning }] =
    useAssignAppointmentTestMutation();

  const doctorId: string | undefined =
    (clinicData as any)?.profile?.id ?? meDoc?.id;

  const assignedTestIds = useMemo(() => {
    const ids: string[] = [];
    if (Array.isArray(appointmentTestsRaw)) {
      appointmentTestsRaw.forEach((t: any) => {
        if (t?.test?.id) {
          ids.push(String(t.test.id));
        }
      });
    }
    return ids;
  }, [appointmentTestsRaw]);

  const addTestModalOptions = useMemo<TestSelectOption[]>(() => {
    if (!clinicId)
      return [{ label: "Clinic not found", value: "", disabled: true }];
    if (isTestsUninitialized)
      return [{ label: "Select to load tests", value: "", disabled: false }];
    if (isTestsFetching)
      return [{ label: "Loading tests...", value: "", disabled: true }];
    if (!apiTests.length)
      return [{ label: "No tests found", value: "", disabled: true }];
    return [
      { label: "Select Test", value: "", disabled: true },
      ...apiTests
        .filter((t: any) => t?.id && t?.name)
        .map((t: any) => ({
          label: String(t.name),
          value: String(t.id),
          disabled:
            String(t.status ?? "").toLowerCase() !== "active" &&
            String(t.status ?? "").toLowerCase() !== "",
        })),
    ];
  }, [clinicId, apiTests, isTestsFetching, isTestsUninitialized]);

  const handleAddTestFromPrescription = async () => {
    if (
      !selectedTestIds.length ||
      !patientIdRaw ||
      !appointment.id ||
      !doctorId
    )
      return;
    try {
      await assignAppointmentTest({
        patientId: patientIdRaw,
        appointmentId: appointment.id,
        testIds: selectedTestIds,
        doctorId,
      } as any).unwrap();

      // Map selected test IDs to their names so PrescriptionDetails can display them.
      const addedNames = apiTests
        .filter((t: any) =>
          selectedTestIds.some((id) => String(t.id) === String(id)),
        )
        .map((t: any) => String(t.name))
        .filter((name: string) => name.trim().length > 0);

      if (addedNames.length) {
        setRxTests((prev) => {
          const next = [...prev];
          addedNames.forEach((name) => {
            if (!next.includes(name)) next.push(name);
          });
          return next;
        });
      }

      setSelectedTestIds([]);
      setAddTestOpen(false);
      addToast({ title: "Tests added", color: "success" });
    } catch {
      addToast({ title: "Failed to add tests", color: "danger" });
    }
  };

  const [uploadAppointmentConsent] = useUploadAppointmentConsentMutation();

  const handleSaveAndPrintConsent = async () => {
    if (!appointment.id) return;

    if (!consentNotes.trim()) {
      addToast({
        title: "Consent notes required",
        description: "Please enter consent notes before printing.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      setIsConsentPrinting(true);

      // First save the consent notes
      await updateAppointment({
        appointmentId: appointment.id,
        data: {
          consentNotes: consentNotes.trim(),
        } as any,
      }).unwrap();

      addToast({
        title: "Consent saved",
        description: "Consent form has been saved successfully.",
        color: "success",
        variant: "flat",
      });

      // After saving, print the consent form
      const printWindow = window.open("", "_blank", "width=900,height=1000");

      if (!printWindow) {
        addToast({
          title: "Popup blocked",
          description: "Please allow popups for printing.",
          color: "warning",
        });
        return;
      }

      const printHtml = buildConsentPrintHtml();

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      };

      setIsEditingConsent(false);
      setShowConsentForm(false);
      refetchAppointment();
    } catch (e: any) {
      addToast({
        title: "Failed to save consent",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsConsentPrinting(false);
    }
  };

  const handleDownloadConsent = async () => {
    const fileUrl = String(a?.consentFile ?? "").trim();

    if (!fileUrl) {
      addToast({
        title: "Consent file not found",
        description: "No consent file is available to download.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    // try {
    //   const response = await fetch(fileUrl);
    //   const blob = await response.blob();

    //   const objectUrl = window.URL.createObjectURL(blob);
    //   const link = document.createElement("a");
    //   link.href = objectUrl;

    //   const urlParts = fileUrl.split("/");
    //   const fileName =
    //     urlParts[urlParts.length - 1]?.split("?")[0] || "consent-file";

    //   link.download = fileName;
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);

    //   window.URL.revokeObjectURL(objectUrl);
    // } catch {
    //   addToast({
    //     title: "Download failed",
    //     description: "Unable to download the consent file.",
    //     color: "danger",
    //     variant: "flat",
    //   });
    // }
    try {
      const newWindow = window.open(fileUrl, "_blank");

      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = "";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        addToast({
          title: "Download started",
          description: "If download doesn't start, check your popup blocker.",
          color: "warning",
          variant: "flat",
        });
      } else {
        addToast({
          title: "File opened",
          description: "The consent file is opening in a new tab.",
          color: "success",
          variant: "flat",
        });
      }
    } catch (error) {
      console.error("Download error:", error);
      addToast({
        title: "Download failed",
        description: "Please try right-clicking and selecting 'Save link as' on the consent button.",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const handlePrintReferForm = async () => {
    if (!appointment.id || isConsentPrinting) return;

    if (!referNotes.trim()) {
      addToast({
        title: "Refer note required",
        description: "Please enter refer note before saving.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=1000");

    if (!printWindow) {
      addToast({
        title: "Popup blocked",
        description: "Please allow popups to print the refer form.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      setIsConsentPrinting(true);

      await updateAppointment({
        appointmentId: appointment.id,
        data: {
          referrals: {
            Refernote: referNotes.trim(),
            referredName: referredName.trim(),
            referredaddress: referredAddress.trim(),
            referredDoctorClinic: referredDoctorClinic.trim(),
            referredPhone: referredPhone.trim(),
          },
        } as any,
      }).unwrap();

      const printHtml = referPreviewHtml || buildReferPrintHtml();

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch { }
        }, 300);
      };

      printWindow.onafterprint = () => {
        refetchAppointment();
        refetchReports();

        try {
          printWindow.close();
        } catch { }
      };

      addToast({
        title: "Refer form saved",
        description: "Refer note saved successfully.",
        color: "success",
        variant: "flat",
      });

      setIsReferPreviewOpen(false);
      setIsReferModalOpen(false);
    } catch (e: any) {
      try {
        printWindow.close();
      } catch { }

      addToast({
        title: "Failed to save refer form",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsConsentPrinting(false);
    }
  };
  const handleCreateTestFromPrescription = async (
    payload: CreateTestInput,
  ): Promise<TestSelectOption> => {
    const res: any = await createTest(payload as any).unwrap();
    const t = res?.result ?? res;
    if (clinicId) fetchTests({ clinicId, page: 1, pageSize: 200 }, false);
    return {
      label: String(t?.name ?? payload.name),
      value: String(t?.id ?? t?._id ?? ""),
    };
  };
  const {
    data,
    isFetching,
    isError,
    error,
    refetch: refetchAppointment,
  } = useGetAppointmentByIdQuery(id, { skip: !id });

  const apiResult = useMemo(() => (data?.result as any) ?? {}, [data]);
  const a = useMemo(() => apiResult.appointment ?? apiResult ?? {}, [apiResult]);

  const manualPrescriptionData =
    (apiResult as any)?.manualPrescription ??
    (a as any)?.manualPrescription ??
    null;

  const manualPrescriptionImageUrl = String(
    manualPrescriptionData?.doctorManualPrescription ?? "",
  ).trim();

  const hasManualPrescription = !!manualPrescriptionImageUrl;

  const referEntry = useMemo(() => mapReferEntry(a), [a]);

  useEffect(() => {
    const appointmentData = a;

    if (isConsentModalOpen) {
      setConsentNotes(String(appointmentData?.consentNotes ?? ""));
    }

    if (isReferModalOpen) {
      setReferNotes(String(referEntry?.Refernote ?? ""));
      setReferredName(String(referEntry?.referredName ?? ""));
      setReferredAddress(String(referEntry?.referredaddress ?? ""));
      setReferredDoctorClinic(String(referEntry?.referredDoctorClinic ?? ""));
      setReferredPhone(String(referEntry?.referredPhone ?? ""));
    }
  }, [isConsentModalOpen, isReferModalOpen, a, referEntry]);

  const {
    data: reportsData,
    isFetching: isReportsFetching,
    isError: isReportsError,
    error: reportsError,
    refetch: refetchReports,
  } = useGetAppointmentReportsQuery(id, { skip: !id });

  const { data: additionalServicesData } = useGetMultipleServicesQuery(id, {
    skip: !id,
  });

  const additionalServices = useMemo(() => {
    if (!additionalServicesData) return [];

    // Try result, then data, then the object itself
    const res =
      additionalServicesData.result ??
      additionalServicesData.data ??
      additionalServicesData;

    if (Array.isArray(res)) return res;

    // If it's an object, look for a services array inside it
    if (res && typeof res === "object") {
      if (Array.isArray(res.services)) return res.services;
      if (Array.isArray(res.additionalServices)) return res.additionalServices;
    }

    return [];
  }, [additionalServicesData]);

  const additionalServicesTotal = useMemo(() => {
    if (!additionalServices.length) return 0;

    return additionalServices.reduce((total: number, svc: any) => {
      const serviceObj = svc.service || svc;
      const price = Number(serviceObj.price || svc.price || 0);
      return total + price;
    }, 0);
  }, [additionalServices]);

  const [updateAppointment, { isLoading: isUpdating }] =
    useUpdateAppointmentMutation();

  const [createPrescription, { isLoading: isSaving }] =
    useCreatePrescriptionMutation();

  // Note: AppointmentDetailsTabs also subscribes to this same query (with
  // refetchOnMountOrArgChange) to support its own refetch-after-mutation flow.
  // We rely on that shared RTK Query cache here instead of forcing a second
  // network request for the same data on every mount.
  const {
    data: doctorPrescriptionTypeData,
    isFetching: isDoctorPrescriptionTypeFetching,
  } = useGetDoctorPrescriptionTypeQuery();

  const getDoctorPrescriptionTypeValue = (
    response: unknown,
  ): "Digital" | "Manual" | "" => {
    const res = response as any;

    const prescriptionType =
      res?.prescriptionType ??
      res?.data?.prescriptionType ??
      res?.result?.prescriptionType ??
      "";

    if (prescriptionType === "Digital" || prescriptionType === "Manual") {
      return prescriptionType;
    }

    return "";
  };

  const doctorPrescriptionType =
    getDoctorPrescriptionTypeValue(doctorPrescriptionTypeData);
  const apptLoading = isFetching && !data;
  const reportsLoading = isReportsFetching && !reportsData;

  // Reports error toast
  useEffect(() => {
    if (!isReportsError) return;
    const msg =
      (reportsError as any)?.data?.message ||
      (reportsError as any)?.error ||
      "Failed to load appointment reports.";
    addToast({
      title: "Reports",
      description: msg,
      color: "danger",
      variant: "flat",
    });
  }, [isReportsError, reportsError]);

  /* ---------- Map appointment + patient ---------- */

  const patientIdRaw: string | undefined = useMemo(
    () => mapPatientIdRaw(apiResult, a),
    [apiResult, a],
  );
  const patient = useMemo(
    () => mapPatient(apiResult, a, patientIdRaw),
    [apiResult, a, patientIdRaw],
  );

  const fullPatientAddress = useMemo(
    () => mapFullPatientAddress(patient),
    [patient],
  );

  const appointment = useMemo(() => mapAppointment(a, id), [a, id]);

  const {
    isManualPrescriptionModalOpen,
    manualPrescriptionModalVariant,
    openManualPrescriptionModal,
    manualPrescriptionFiles,
    setManualPrescriptionFiles,
    isSavingManualPrescription,
    handleManualPrescriptionOpenChange,
    handleManualPrescriptionFileChange,
    handleSaveManualPrescription,
  } = useManualPrescription({
    appointmentId: appointment.id,
    updateDoctorManualPrescription,
    refetchAppointment,
    refetchReports,
  });

  const {
    isConsentUploadModalOpen,
    setIsConsentUploadModalOpen,
    pickedConsentFiles,
    setPickedConsentFiles,
    consentUploadNote,
    setConsentUploadNote,
    isUploadingConsent,
    handleConsentUploadOpenChange,
    handleSaveConsentUpload,
  } = useConsentUpload({
    appointmentId: appointment.id,
    uploadAppointmentConsent,
    refetchAppointment,
    refetchReports,
    setActiveFormType,
  });

  const hasTokenAppointment =
    appointment.tokenNo !== "" &&
    appointment.tokenNo !== null &&
    appointment.tokenNo !== undefined;

  /** ✅ IMPORTANT: clinicService is NOT inside `appointment` memo
   *  Your API response has it at `data.result.clinicService`
   */
  const clinicService = useMemo(
    () => mapClinicService(apiResult, a),
    [apiResult, a],
  );

  // ✅ Symptoms from API: result.symptoms[].name (preferred)
  const symptomsFromApi = useMemo(
    () => mapSymptomsFromApi(apiResult),
    [apiResult],
  );

  const symptomsToRender = useMemo(
    () => mapSymptomsToRender(symptomsFromApi),
    [symptomsFromApi],
  );

  const hasSymptoms = symptomsToRender.length > 0;

  const appointmentPriceRaw =
    (a as any)?.price ?? apiResult?.appointment?.price ?? null;

  const priceValue = Number(appointmentPriceRaw ?? clinicService?.price ?? 0);

  const primaryServicePriceValue = Number(
    (a as any)?.primaryServicePrice ??
    apiResult?.appointment?.primaryServicePrice ??
    0,
  );
  const primaryServicePriceText =
    Number.isFinite(primaryServicePriceValue) && primaryServicePriceValue > 0
      ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(primaryServicePriceValue)
      : "-";

  const priceText =
    Number.isFinite(priceValue) && priceValue > 0
      ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(priceValue)
      : "-";

  const paymentModeText =
    (a as any)?.paymentMode === "Pay Later"
      ? "Pay on Visit"
      : (a as any)?.paymentMode || "Covered";

  const paymentNotesText = String((a as any)?.paymentNotes ?? "").trim();

  const paymentModeDisplay = paymentNotesText
    ? `${paymentModeText} {${paymentNotesText}}`
    : paymentModeText;

  // paste here
  const cancellationReasonText = String(
    (a as any)?.reReasonForCancellation ?? "",
  ).trim();

  const rescheduleReasonText = String(
    (a as any)?.reasionForReSchedule ?? "",
  ).trim();

  const reasonText = cancellationReasonText || rescheduleReasonText;

  const reasonLabel = cancellationReasonText
    ? "Cancellation Reason"
    : rescheduleReasonText
      ? "Reschedule Reason"
      : "";

  const showReasonColumn = !!reasonText;

  const handleOpenInvoice = () => {
    const paymentMode = (a as any)?.paymentMode;
    if (
      paymentMode === null ||
      paymentMode === undefined ||
      !String(paymentMode).trim()
    ) {
      addToast({
        title: "Invoice unavailable",
        description:
          "Invoice can be generated only after payment mode is added.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    const invoicePayload = buildAppointmentInvoicePayload({
      appointment,
      appointmentData: a,
      apiResult,
      clinicData,
      clinicService,
      primaryServicePriceValue,
      primaryServicePriceText,
      additionalServices,
      patient,
      doctor,
      paymentMode,
      to12h,
    });

    setSelectedInvoice(invoicePayload);
    setIsInvoiceModalOpen(true);
  };

  const statusLower = (appointment.status || "").toLowerCase();
  const isConfirmedStatus = statusLower === "confirmed";
  const isCompletedStatus = statusLower === "completed";
  const isCancelledStatus = statusLower === "cancelled";
  const isPendingStatus = statusLower === "pending";
  const isPatientArrivedStatus = statusLower === "patient arrived";
  const isNoShowStatus = ["noshow", "no-show", "no show"].includes(statusLower);
  const hasConsentNotes = !!String(a?.consentNotes ?? "").trim();
  const hasConsentFile = !!String(a?.consentFile ?? "").trim();

  const canShowConsentFormButton =
    (isConfirmedStatus || isCompletedStatus) &&
    !isCancelledStatus &&
    !hasConsentFile;

  const canShowUploadConsentButton =
    (isConfirmedStatus || isCompletedStatus) &&
    !isCancelledStatus &&
    hasConsentNotes &&
    !hasConsentFile;

  const canShowDownloadConsentButton =
    (isConfirmedStatus || isCompletedStatus) &&
    !isCancelledStatus &&
    hasConsentFile;

  const canShowReferFormButton =
    (isConfirmedStatus || isCompletedStatus) && !isCancelledStatus;

  const isPaid = appointment.paymentMode;

  const expireText = useMemo(() => {
    const appointmentDate = a?.appointmentDate as string | undefined;
    if (!appointmentDate) return "-";

    const d = new Date(appointmentDate);
    if (Number.isNaN(d.getTime())) return "-";

    // same logic as your Service card (+5 days)
    d.setDate(d.getDate() + 5);

    const date = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return date;
  }, [a?.appointmentDate]);

  const isPastAppointment: boolean = (() => {
    const dateRaw = a?.appointmentDate as string | undefined;
    const hasTokenNo = a?.tokenNo !== null && a?.tokenNo !== undefined;

    if (!dateRaw) return false;

    const apptDate = new Date(dateRaw);
    if (Number.isNaN(apptDate.getTime())) return false;

    // ✅ Token appointment: full-day logic
    if (hasTokenNo) {
      const apptEnd = new Date(apptDate);
      apptEnd.setHours(23, 59, 59, 999); // ends at end of the day
      return apptEnd.getTime() < Date.now();
    }

    // ✅ Time-slot appointment: also full-day now (ignore time)
    const apptEnd = new Date(apptDate);
    apptEnd.setHours(23, 59, 59, 999); // end of the appointment day
    return apptEnd.getTime() < Date.now();
  })();

  const appointmentDoctorId = String(
    (a as any)?.doctorId ||
    (a as any)?.doctor?.id ||
    (apiResult as any)?.doctorId ||
    (apiResult as any)?.doctor?.id ||
    "",
  ).trim();
  const isDoctorByRole = role === "doctor" || isAdminDoctorAccess;
  const isDoctorByAppointment =
    !!currentUserId &&
    !!appointmentDoctorId &&
    currentUserId === appointmentDoctorId;

  const isDoctor = isDoctorByRole || isDoctorByAppointment;
  const canConfirmAppointment = isDoctor || isAdmin;

  useEffect(() => {
    if (isDoctor) {
      setActiveTab((prev) => (prev === "history" ? "prescription" : prev));
      return;
    }

    if (isAdmin) {
      setActiveTab((prev) => (prev === "history" ? "history" : prev));
    }
  }, [isDoctor, isAdmin, appointmentDoctorId, currentUserId]);

  const { data: doctorPreferencesData } = useGetDoctorPreferencesQuery(
    appointmentDoctorId,
    {
      skip: !appointmentDoctorId,
      refetchOnMountOrArgChange: true,
    },
  );

  const doctorPreferenceFollowUpDays = useMemo(() => {
    const raw =
      doctorPreferencesData?.result?.followUpDays ??
      doctorPreferencesData?.result?.followupDays ??
      null;

    if (raw == null) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [doctorPreferencesData]);
  /* ---------- Prescription state ---------- */
  const [rxMeds, setRxMeds] = useState<SelectedMed[]>([]);
  const [rxDetails, setRxDetails] = useState<PrescriptionDetailsValue>(
    emptyPrescriptionDetails,
  );
  const [reportApplied, setReportApplied] = useState(false);
  const hasAddedPrescriptionMeds = rxMeds.length > 0;

  useEffect(() => {
    if (!doctorPreferenceFollowUpDays) return;

    setRxDetails((prev) => {
      if (prev.followUpDays && prev.followUpDays > 0) return prev;

      return {
        ...prev,
        followUpDays: doctorPreferenceFollowUpDays,
      };
    });
  }, [doctorPreferenceFollowUpDays]);

  useEffect(() => {
    if (!reportsData || reportApplied) return;

    const res: any = (reportsData as any).result ?? (reportsData as any).data ?? reportsData;
    let rc = null;
    let list: any[] = [];

    if (Array.isArray(res) && res.length > 0) {
      rc = res[0];
      list = Array.isArray(res[0].prescriptions) ? res[0].prescriptions : [];
    } else if (res && typeof res === 'object' && !Array.isArray(res)) {
      rc = res.reportCard ?? res;
      list = Array.isArray(res.prescriptions) ? res.prescriptions : [];
    }

    if (list.length && !rxMeds.length) {
      const mapped = list.map(mapReportPrescriptionToSelectedMed);
      setRxMeds(mapped as any);
    }
    // Inside the reportsData useEffect, after the existing mapping:

    if (rc) setRxDetails((prev) => mergeReportCardToDetails(rc, prev));

    if ((rc || list.length) && !reportApplied) setReportApplied(true);
  }, [reportsData, reportApplied, rxMeds.length]);

  // ✅ For doctor role, always source vitals from the appointment record
  // instead of report cards, so prescription vitals stay in sync with
  // receptionist-entered vitals stored on the appointment.
  const appointmentVitals = useMemo(() => (a as any)?.vitals, [a]);
  useEffect(() => {
    if (!isDoctor) return;
    if (!appointmentVitals) return;

    setRxDetails((prev) => ({
      ...prev,
      vitals: {
        ...(prev as any).vitals,
        ...appointmentVitals,
      },
    }));
  }, [isDoctor, appointmentVitals]);

  const handlePickerDone = (
    meds: SelectedMed[],
    details: PrescriptionDetailsValue,
  ) => {
    setRxMeds(meds as any);
    setRxDetails(details);
  };

  const [saveMedicalCertificate, { isLoading: isSavingCertificate }] =
    useSaveMedicalCertificateMutation();
  const {
    data: medicalCertificateData,
    refetch: refetchMedicalCertificate,
    isFetching: isFetchingCertificate,
  } = useGetMedicalCertificateQuery(appointment.id, { skip: !appointment.id });

  useEffect(() => {
    if (medicalCertificateData?.data) {
      const certData = medicalCertificateData.data;
      setMedicalCertificateReason(certData.medicalCondition || "");
      setMedicalCertificateRestDays(certData.restDays?.toString() || "");
      // Notes is an array, join with newlines for textarea
      if (certData.notes && Array.isArray(certData.notes)) {
        setMedicalCertificateRestrictions(certData.notes.join("\n"));
      }
    }
  }, [medicalCertificateData]);

  const handleSavePrescription = async () => {
    if (!appointment.id) return;

    if (!rxMeds.length) {
      addToast({
        title: "Add at least one medicine",
        description: "Use the picker to add medicines before saving.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    try {
      const payload = buildPrescriptionPayload({
        appointmentId: String(appointment.id),
        rxMeds,
      });
      await createPrescription(payload).unwrap();

      addToast({
        title: "Prescription saved",
        color: "success",
        variant: "flat",
      });

      refetchReports();
    } catch (e: any) {
      addToast({
        title: "Failed to save prescription",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    }
  };

  const handleClearPrescription = () => {
    setRxMeds([]);
    setRxDetails(emptyPrescriptionDetails);
    setReportApplied(false);
  };

  const [isRefundProcessing, setIsRefundProcessing] = useState(false);

  // Open refund modal on button click

  // Handle refund submission from modal
  const handleRefundSubmit = async (data: {
    refundMode: string;
    refundAmount: number;
    refundNotes: string;
  }) => {
    if (!appointment.id) return;
    try {
      setIsRefundProcessing(true);
      await updateAppointment({
        appointmentId: appointment.id,
        data: {
          paymentStatus: "Refunded",
          refundMode: data.refundMode,
          refundedAmount: data.refundAmount,
          refundNotes: data.refundNotes,
        } as any,
      }).unwrap();

      addToast({
        title: "Payment refunded",
        description: "Payment status has been updated to Refunded",
        color: "success",
        variant: "flat",
      });

      refetchAppointment();
    } catch (e: any) {
      addToast({
        title: "Failed to process refund",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
      throw e; // Re-throw to let modal know about the error
    } finally {
      setIsRefundProcessing(false);
    }
  };

  const [actionLoading, setActionLoading] = useState<
    "cancel" | "confirm" | null
  >(null);

  const isActionBusy = actionLoading !== null;
  const actionsDisabled =
    apptLoading || isUpdating || isActionBusy || isRefundProcessing;
  const appointmentStatusForPayment = String(
    (a as any)?.appointmentStatus ?? appointment.status ?? "",
  )
    .trim()
    .toLowerCase();

  const paymentStatusForPayment = String((a as any)?.paymentStatus ?? "")
    .trim()
    .toLowerCase();

  const isPayLaterPaymentPending =
    (a as any)?.paymentMode === "Pay Later" &&
    !["paid", "already paid"].includes(paymentStatusForPayment) &&
    ["pending", "patient arrived"].includes(appointmentStatusForPayment);

  const handleCancel = async () => {
    refetchAppointment();
    refetchReports();
  };

  const closeCancelModal = () => {
    setIsCancelConfirmOpen(false);
  };

  const handleConfirm = async () => {
    if (!appointment.id) return;

    if (
      a?.paymentStatus !== "Paid" &&
      (a as any)?.paymentMode === "Pay Later"
    ) {
      // Don't open modal, just show toast and highlight button
      addToast({
        title: "⚠️ Payment Required",
        description:
          "Please click the highlighted 'Mark as Paid' button to complete the payment before confirming.",
        color: "warning",
        variant: "flat",
        timeout: 5000,
      });

      // Highlight the Mark as Paid button
      const markAsPaidButton = document.querySelector(
        '[data-mark-as-paid="true"]',
      );
      if (markAsPaidButton) {
        markAsPaidButton.classList.add(
          "animate-pulse",
          "ring-4",
          "ring-red-400",
          "ring-offset-2",
        );
        setTimeout(() => {
          markAsPaidButton.classList.remove(
            "animate-pulse",
            "ring-4",
            "ring-red-400",
            "ring-offset-2",
          );
        }, 5000);
      }
      return;
    }

    if (requiresAdminDoctorConfirm) {
      setAdminConfirmReason("");
      setAdminConfirmError("");
      setIsAdminConfirmReasonModalOpen(true);
      return;
    }

    try {
      setActionLoading("confirm");
      await updateAppointment({
        appointmentId: appointment.id,
        data: { appointmentStatus: "Confirmed" },
      }).unwrap();
      addToast({
        title: "Appointment confirmed",
        color: "success",
        variant: "flat",
      });

      if (isDoctor) setActiveTab("prescription");
      else if (isAdmin) setActiveTab("history");

      scrollToTabsSection();

      refetchAppointment();
      refetchReports();

      if (isDoctor) setActiveTab("prescription");
      else if (isAdmin) setActiveTab("history");
      setIsSummaryAccordionOpen(false);
    } catch (e: any) {
      addToast({
        title: "Failed to confirm appointment",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePatientArrived = async () => {
    if (!appointment.id) return;

    if (isPayLaterPaymentPending) {
      addToast({
        title: "Payment required",
        description:
          "Please mark the payment as paid before marking patient arrived.",
        color: "warning",
        variant: "flat",
      });

      const markAsPaidButton = document.querySelector(
        '[data-mark-as-paid="true"]',
      );

      if (markAsPaidButton) {
        markAsPaidButton.classList.add(
          "animate-pulse",
          "ring-4",
          "ring-red-400",
          "ring-offset-2",
        );

        setTimeout(() => {
          markAsPaidButton.classList.remove(
            "animate-pulse",
            "ring-4",
            "ring-red-400",
            "ring-offset-2",
          );
        }, 5000);
      }

      return;
    }

    try {
      setActionLoading("confirm");

      await updateAppointment({
        appointmentId: appointment.id,
        data: { appointmentStatus: "Patient Arrived" },
      }).unwrap();

      addToast({
        title: "Patient marked as arrived",
        color: "success",
        variant: "flat",
      });

      if (isDoctor || isAdmin) {
        if (requiresAdminDoctorConfirm) {
          setAdminConfirmReason("");
          setAdminConfirmError("");
          setIsAdminConfirmReasonModalOpen(true);
        } else {
          await updateAppointment({
            appointmentId: appointment.id,
            data: { appointmentStatus: "Confirmed" },
          }).unwrap();

          addToast({
            title: "Appointment confirmed",
            color: "success",
            variant: "flat",
          });

          if (isDoctor) setActiveTab("prescription");
          else if (isAdmin) setActiveTab("history");

          scrollToTabsSection();
          setIsSummaryAccordionOpen(false);
        }
      }

      refetchAppointment();
      refetchReports();
    } catch (e: any) {
      addToast({
        title: "Failed to mark patient as arrived",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmWithReason = async () => {
    if (!appointment.id) return;

    const reason = adminConfirmReason?.trim();
    if (!reason) {
      setAdminConfirmError(
        "Please enter reason for confirming another doctor's appointment.",
      );
      return;
    }

    try {
      setActionLoading("confirm");

      // Check if payment is pending for Pay Later
      const isPayLaterPending =
        (a as any)?.paymentMode === "Pay Later" &&
        (a as any)?.paymentStatus !== "Paid";

      // First update: confirm appointment with reason
      await updateAppointment({
        appointmentId: appointment.id,
        data: {
          appointmentStatus: "Confirmed",
          reason,
        } as any,
      }).unwrap();

      addToast({
        title: "Appointment confirmed",
        description: "Confirmation reason saved",
        color: "success",
        variant: "flat",
      });

      setIsAdminConfirmReasonModalOpen(false);
      setAdminConfirmReason("");
      setAdminConfirmError("");

      if (isDoctor) setActiveTab("prescription");
      else if (isAdmin) setActiveTab("history");

      scrollToTabsSection();

      refetchAppointment();
      refetchReports();
      // If payment was pending, show toast and highlight the Mark as Paid button
      if (isPayLaterPending) {
        addToast({
          title: "⚠️ Payment Pending",
          description:
            "Please click the highlighted 'Mark as Paid' button above to complete the payment.",
          color: "warning",
          variant: "flat",
          timeout: 10000, // Show for 10 seconds
        });

        // Add a highlight effect to the Mark as Paid button
        const markAsPaidButton = document.querySelector(
          '[data-mark-as-paid="true"]',
        );
        if (markAsPaidButton) {
          markAsPaidButton.classList.add(
            "animate-pulse",
            "ring-2",
            "ring-yellow-400",
            "ring-offset-2",
          );
          setTimeout(() => {
            markAsPaidButton.classList.remove(
              "animate-pulse",
              "ring-2",
              "ring-yellow-400",
              "ring-offset-2",
            );
          }, 5000);
        }
      }
    } catch (e: any) {
      addToast({
        title: "Failed to confirm appointment",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!appointment.id) return;

    try {
      setActionLoading("confirm");

      await updateAppointment({
        appointmentId: appointment.id,
        data: { appointmentStatus: "Completed" },
      }).unwrap();

      addToast({
        title: "Appointment marked as completed",
        color: "success",
        variant: "flat",
      });

      refetchAppointment();
      refetchReports();
    } catch (e: any) {
      addToast({
        title: "Failed to mark appointment as completed",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- Clinic / Doctor / PDF Patient for PrescriptionSection ---------- */
  const reportsResult: any =
    (reportsData as any)?.result ?? reportsData ?? null;

  const clinic = useMemo(
    () => mapClinic(reportsResult, apiResult, a),
    [reportsResult, apiResult, a],
  );

  const doctor = useMemo(
    () => mapDoctor(a, apiResult, meDoc),
    [a, apiResult, meDoc],
  );

  const pdfPatient = useMemo(
    () => mapPdfPatient(patient, fullPatientAddress),
    [patient, fullPatientAddress],
  );

  const {
    vitals,
    vitalErrors,
    isSavingVitals,
    handleAutoFillVitals,
    handleVitalChange,
    handleSaveVitals,
  } = useAppointmentVitals({
    appointmentId: appointment.id,
    appointmentVitals: (a as any)?.vitals,
    updateAppointment,
    refetchAppointment,
  });

  /* ---------- Header actions ---------- */
  const canReschedule =
    !isPastAppointment &&
    !isCompletedStatus &&
    !isConfirmedStatus &&
    !isCancelledStatus;

  const canCancel =
    !isPastAppointment &&
    !isCompletedStatus &&
    !isCancelledStatus &&
    !isConfirmedStatus &&
    rxMeds.length === 0;

  const requiresAdminDoctorConfirm =
    !isReceptionist &&
    appointmentDoctorId &&
    currentUserId &&
    appointmentDoctorId !== currentUserId;

  const canShowPatientArrived =
    isPendingStatus &&
    !isPastAppointment &&
    !isCompletedStatus &&
    !isCancelledStatus &&
    !isConfirmedStatus &&
    isReceptionist &&
    !!appointment.id;

  const canShowConfirm =
    !isPastAppointment &&
    !isCompletedStatus &&
    !isCancelledStatus &&
    !isReceptionist &&
    canConfirmAppointment &&
    (isPendingStatus || isPatientArrivedStatus);

  const canShowMarkAsCompleted =
    isConfirmedStatus &&
    doctorPrescriptionType !== "Digital" &&
    !isCancelledStatus &&
    (isDoctor || isAdmin) &&
    !!appointment.id;

  const canUpdateVitals =
    !isPastAppointment &&
    !isConfirmedStatus &&
    !isCompletedStatus &&
    !isCancelledStatus &&
    isReceptionist;

  const isPastAppointmentDateTime = (() => {
    const dateRaw = a?.appointmentDate as string | undefined;
    if (!dateRaw) return false;

    let year = 0, month = 0, day = 0;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateRaw.trim());
    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]) - 1;
      day = Number(isoMatch[3]);
    } else {
      const dmyMatch = /^(\d{2})-(\d{2})-(\d{4})/.exec(dateRaw.trim());
      if (dmyMatch) {
        day = Number(dmyMatch[1]);
        month = Number(dmyMatch[2]) - 1;
        year = Number(dmyMatch[3]);
      } else {
        const fallbackDate = new Date(dateRaw);
        if (Number.isNaN(fallbackDate.getTime())) return false;
        year = fallbackDate.getFullYear();
        month = fallbackDate.getMonth();
        day = fallbackDate.getDate();
      }
    }

    const apptDate = new Date(year, month, day);

    const hasTokenNo = a?.tokenNo !== null && a?.tokenNo !== undefined && a?.tokenNo !== "";
    if (hasTokenNo) {
      apptDate.setHours(23, 59, 59, 999);
      return apptDate.getTime() < Date.now();
    }

    const timeRaw = a?.appointmentTime as string | undefined;
    if (timeRaw) {
      const timeMatch = /(\d{1,2}):(\d{2})/.exec(timeRaw.trim());
      if (timeMatch) {
        let hours = Number(timeMatch[1]);
        const minutes = Number(timeMatch[2]);
        if (/pm/i.test(timeRaw) && hours < 12) {
          hours += 12;
        }
        if (/am/i.test(timeRaw) && hours === 12) {
          hours = 0;
        }
        apptDate.setHours(hours, minutes, 0, 0);
        return apptDate.getTime() < Date.now();
      }
    }

    apptDate.setHours(23, 59, 59, 999);
    return apptDate.getTime() < Date.now();
  })();

  const canMarkNoShow =
    !isCompletedStatus &&
    !isCancelledStatus &&
    !isConfirmedStatus &&
    !isNoShowStatus &&
    isPendingStatus &&
    isPastAppointmentDateTime &&
    !!appointment.id;

  const canEditPrescription =
    isDoctor &&
    (isConfirmedStatus || isPatientArrivedStatus) &&
    !isPastAppointment &&
    !isCancelledStatus &&
    !isCompletedStatus;

  const canShowRescheduleButton = canReschedule && !hasTokenAppointment;

  useAppointmentKeyboardShortcuts({
    isCancelConfirmOpen,
    actionLoading,
    closeCancelModal,
    handleCancel,
    canShowConfirm,
    actionsDisabled,
    handleConfirm,
    canCancel,
    setIsCancelConfirmOpen,
  });

  useEffect(() => {
    if (!canShowConfirm) {
      setShowConfirmHint(false);
      return;
    }

    setShowConfirmHint(true);

    const hideTimer = window.setTimeout(() => {
      setShowConfirmHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [canShowConfirm, appointment.id]);

  useEffect(() => {
    if (!canCancel) {
      setShowCancelHint(false);
      return;
    }

    setShowCancelHint(true);

    const hideTimer = window.setTimeout(() => {
      setShowCancelHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [canCancel, appointment.id]);

  const handleSummaryAccordionToggle = () => {
    const nextOpen = !isSummaryAccordionOpen;
    setIsSummaryAccordionOpen(nextOpen);

    if (!nextOpen) {
      window.setTimeout(() => {
        tabsSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 320);
    }
  };
  const scrollToTabsSection = () => {
    window.setTimeout(() => {
      tabsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildMedicalCertificatePrintHtml = () =>
    buildMedicalCertificatePrintHtmlHelper({
      clinicData,
      doctor,
      appointment,
      medicalCertificateRestDays,
      medicalCertificateRestrictions,
      patient,
      medicalCertificateReason,
      escapeHtml,
    });

  const buildConsentPrintHtml = () =>
    buildConsentPrintHtmlHelper({
      clinicData,
      clinic,
      consentNotes,
      patient,
      doctor,
      escapeHtml,
    });

  const buildReferPrintHtml = () =>
    buildReferPrintHtmlHelper({
      clinicData,
      clinic,
      doctor,
      referredName,
      referredAddress,
      referredDoctorClinic,
      referredPhone,
      patient,
      referNotes,
      escapeHtml,
    });

  const handleOpenReferPreview = () => {
    if (!referNotes.trim()) {
      addToast({
        title: "Refer note required",
        description: "Please enter refer note before preview.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    if (referredPhone && referredPhone.trim()) {
      const phone = referredPhone.trim();
      if (phone.length !== 10) {
        addToast({
          title: "Invalid Phone Number",
          description: "Phone number must be exactly 10 digits.",
          color: "warning",
          variant: "flat",
        });
        return;
      }
      const firstDigit = phone[0];
      if (!["6", "7", "8", "9"].includes(firstDigit)) {
        addToast({
          title: "Invalid Phone Number",
          description: "Mobile number must start with 6, 7, 8, or 9",
          color: "warning",
          variant: "flat",
        });
        return;
      }
    }

    if (!referredName.trim()) {
      addToast({
        title: "Referred name required",
        description: "Please enter the name of the person you are referring.",
        color: "warning",
        variant: "flat",
      });
      return;
    }

    const html = buildReferPrintHtml();
    setReferPreviewHtml(html);
    setIsReferPreviewOpen(true);
  };
  const handlePrintConsentForm = async () => {
    if (!appointment.id || isConsentPrinting) return;

    const printWindow = window.open("", "_blank", "width=900,height=1000");

    if (!printWindow) {
      addToast({
        title: "Popup blocked",
        description: "Please allow popups for printing.",
        color: "warning",
      });
      return;
    }

    try {
      setIsConsentPrinting(true);

      // print click ke baad modal close
      setIsConsentModalOpen(false);

      await updateAppointment({
        appointmentId: appointment.id,
        data: {
          consentNotes: consentNotes.trim(),
        } as any,
      }).unwrap();

      const printHtml = buildConsentPrintHtml();

      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      };

      refetchAppointment();
    } catch (e: any) {
      try {
        printWindow.close();
      } catch { }

      addToast({
        title: "Failed to save consent notes",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
    } finally {
      setIsConsentPrinting(false);
    }
  };

  const {
    handleDownloadMedicalCertificate,
    handleOpenMedicalCertificatePreview,
    handlePrintMedicalCertificate,
  } = useMedicalCertificateActions({
    appointmentId: appointment.id,
    medicalCertificateReason,
    medicalCertificateRestDays,
    medicalCertificateRestrictions,
    patient,
    buildMedicalCertificatePrintHtml,
    saveMedicalCertificate,
    refetchMedicalCertificate,
    isMedicalCertificatePrinting,
    setIsMedicalCertificatePrinting,
    setMedicalCertificatePreviewHtml,
    setIsMedicalCertificatePreviewOpen,
  });

  const handleAddTestOpenChange = (open: boolean) => {
    setAddTestOpen(open);
    if (!open) setSelectedTestIds([]);
  };

  const handleEnsureTestsLoadedFromModal = () => {
    ensureTestsLoaded();
    setAddTestOpen(true);
  };

  const isAddTestDisabled =
    selectedTestIds.length === 0 ||
    !patientIdRaw ||
    !appointment.id ||
    !doctorId;

  const handleNoShowSuccess = () => {
    refetchAppointment();
    refetchReports();
  };

  const handleAddMultipleServicesSuccess = () => {
    refetchAppointment();
  };

  const handleSelectConsentFormType = () => {
    setActiveFormType("consent");
    setIsFormTypeModalOpen(false);
    setIsEditingConsent(true);
    setShowConsentForm(true);
  };

  const handleSelectReferFormType = () => {
    setActiveFormType("refer");
    setIsFormTypeModalOpen(false);
    setIsReferModalOpen(true);
  };

  const handleCloseInvoice = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const handlePayLaterSubmit = async (data: {
    paymentMode: string;
    paymentNotes?: string;
  }) => {
    if (!appointment.id) return;
    try {
      setIsPaymentProcessing(true);

      const updateData: any = {
        paymentMode: data.paymentMode || "Cash",
        paymentStatus: "Paid",
        paymentNotes: data.paymentNotes?.trim() || "",
      };

      if (confirmAfterPay) {
        updateData.appointmentStatus = "Confirmed";
      }

      await updateAppointment({
        appointmentId: appointment.id,
        data: updateData,
      }).unwrap();

      if (confirmAfterPay) {
        addToast({
          title: "Payment marked Paid & appointment confirmed",
          color: "success",
          variant: "flat",
        });
        if (isDoctor) setActiveTab("prescription");
        else if (isAdmin) setActiveTab("history");
      } else {
        addToast({
          title: "Payment marked as Paid",
          color: "success",
          variant: "flat",
        });
      }
      refetchAppointment();
    } catch (e: any) {
      addToast({
        title: "Failed to update payment",
        description: e?.data?.message || e?.message || "Unknown error",
        color: "danger",
        variant: "flat",
      });
      throw e;
    } finally {
      setIsPaymentProcessing(false);
      setConfirmAfterPay(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f8fbfd] dark:bg-[#0b1321]">
      <div className="mx-auto w-full max-w-[1800px]">
        <div className="mb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white sm:text-sm">
            <Link
              to="/appointment"
              className="hover:text-slate-900 hover:underline dark:hover:text-white underline-offset-4"
            >
              Appointment
            </Link>

            <FiChevronRight className="opacity-60" />

            {id ? (
              <Link
                to={`/appointment/${id}`}
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline dark:text-[#46beae] dark:hover:text-[#78d8cc] underline-offset-4"
              >
                Appointment Details
              </Link>
            ) : (
              <span className="font-semibold text-teal-700 dark:text-[#46beae]">
                Appointment Details
              </span>
            )}

            <FeatureInfoTip
              title="Appointment Detail Tips"
              tips={appointmentDetailTips}
              guideSection={isDoctor ? "doctor" : "appointments-guide"}
              linkLabel="Read appointment details guide"
            />
          </div>

        </div>

        {/* {!isReceptionist && (
          <AppointmentFlowStepper
            isConfirmedStatus={isConfirmedStatus}
            hasPrescriptionStarted={hasPrescriptionStartedForFlow}
            isCompletedStatus={isCompletedStatus}
            isCancelledStatus={isCancelledStatus}
          />
        )} */}

        {isError && (
          <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-red-600">
            {(error as any)?.data?.message ||
              (error as any)?.error ||
              "Failed to load appointment."}
          </div>
        )}

        <div className="space-y-3">
          {apptLoading ? (
            <AppointmentInfoSkeleton />
          ) : (
            <AppointmentSummaryCard
              isSummaryAccordionOpen={isSummaryAccordionOpen}
              onSummaryAccordionToggle={handleSummaryAccordionToggle}
              patient={patient}
              appointment={appointment}
              doctor={doctor}
              id={id}
              navigate={navigate}
              safe={safe}
              canShowConsentFormButton={canShowConsentFormButton}
              canShowUploadConsentButton={canShowUploadConsentButton}
              canShowDownloadConsentButton={canShowDownloadConsentButton}
              canShowReferFormButton={canShowReferFormButton}
              setIsEditingConsent={setIsEditingConsent}
              setShowConsentForm={setShowConsentForm}
              setActiveFormType={setActiveFormType}
              setIsConsentUploadModalOpen={setIsConsentUploadModalOpen}
              handleDownloadConsent={handleDownloadConsent}
              setIsReferModalOpen={setIsReferModalOpen}
              isPendingStatus={isPendingStatus}
              canCancel={canCancel}
              canShowConfirm={canShowConfirm}
              isPaid={isPaid}
              handleOpenInvoice={handleOpenInvoice}
              expireText={expireText}
              isCompletedStatus={isCompletedStatus}
              setIsMedicalCertificateModalOpen={
                setIsMedicalCertificateModalOpen
              }
              refetchMedicalCertificate={refetchMedicalCertificate}
              isFetchingCertificate={isFetchingCertificate}
              canShowRescheduleButton={canShowRescheduleButton}
              canMarkNoShow={canMarkNoShow}
              isCancelledStatus={isCancelledStatus}
              appointmentData={a}
              clinicService={
                clinicService || apiResult?.clinicService || a?.clinicService
              }
              additionalServices={additionalServices}
              priceText={priceText}
              additionalServicesTotal={additionalServicesTotal}
              setIsAddServiceModalOpen={setIsAddServiceModalOpen}
              isActionBusy={isActionBusy}
              canShowPatientArrived={canShowPatientArrived}
              handlePatientArrived={handlePatientArrived}
              actionsDisabled={actionsDisabled}
              actionLoading={actionLoading}
              showConfirmHint={showConfirmHint}
              handleConfirm={handleConfirm}
              canShowMarkAsCompleted={canShowMarkAsCompleted}
              handleMarkAsCompleted={handleMarkAsCompleted}
              setIsNoShowModalOpen={setIsNoShowModalOpen}
              setIsCancelConfirmOpen={setIsCancelConfirmOpen}
              showCancelHint={showCancelHint}
              setIsRefundModalOpen={setIsRefundModalOpen}
            />
          )}

          <PayLaterPaymentBanner
            appointmentData={a}
            isActionBusy={isActionBusy}
            isPaymentProcessing={isPaymentProcessing}
            onMarkAsPaid={() => {
              setConfirmAfterPay(false);
              setIsPayLaterModalOpen(true);
            }}
          />

          <AppointmentServicesCard
            appointmentData={a}
            clinicService={clinicService}
            priceText={priceText}
            additionalServices={additionalServices}
            additionalServicesTotal={additionalServicesTotal}
            setIsAddServiceModalOpen={setIsAddServiceModalOpen}
            isConfirmedStatus={isConfirmedStatus}
            isCompletedStatus={isCompletedStatus}
            isCancelledStatus={isCancelledStatus}
            isActionBusy={isActionBusy}
            showReasonColumn={showReasonColumn}
            hasSymptoms={hasSymptoms}
            symptoms={symptomsToRender}
            primaryServicePriceText={primaryServicePriceText}
            expireText={expireText}
            paymentModeDisplay={paymentModeDisplay}
            reasonLabel={reasonLabel}
            reasonText={reasonText}
          />

          <AppointmentVitalsSection
            canUpdateVitals={canUpdateVitals}
            vitals={vitals}
            vitalErrors={vitalErrors}
            isSavingVitals={isSavingVitals}
            isActionBusy={isActionBusy}
            fieldClassNames={FIELD_CN}
            handleAutoFillVitals={handleAutoFillVitals}
            handleVitalChange={handleVitalChange}
            handleSaveVitals={handleSaveVitals}
          />

          {/* Tabs */}
          <div ref={tabsSectionRef}></div>
          <AppointmentDetailsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isDoctor={isDoctor}
            isAdmin={isAdmin}
            isReceptionist={isReceptionist}
            reportsLoading={reportsLoading}
            apptLoading={apptLoading}
            appointment={appointment}
            meds={rxMeds}
            details={rxDetails}
            onPrescriptionChange={handlePickerDone}
            onSavePrescription={handleSavePrescription}
            onClearPrescription={handleClearPrescription}
            doctorId={appointmentDoctorId}
            isSavingPrescription={isSaving}
            canEditPrescription={canEditPrescription}
            isConfirmedStatus={isConfirmedStatus}
            isPastAppointment={isPastAppointment}
            patientId={patientIdRaw || ""}
            appointmentTime={to12h((a as any)?.appointmentTime)}
            patient={pdfPatient}
            doctor={doctor}
            clinic={clinic}
            reportResult={reportsResult}
            onRefreshAfterSave={refetchReports}
            onAddTest={() => setAddTestOpen(true)}
            addedTests={rxTests}
            prescriptionProcessing={prescriptionProcessing}
            onCompletionStateChange={handlePrescriptionCompletionStateChange}
            hasManualPrescription={hasManualPrescription}
            onViewManualPrescription={() =>
              setIsManualPrescriptionPreviewOpen(true)
            }
            onReuploadManualPrescription={() => {
              openManualPrescriptionModal("upload");
            }}
            onMedicinesChange={setHasLocalMedicines}
            currentDoctorId={currentUserId}
            hasAddedPrescriptionMeds={hasAddedPrescriptionMeds}
            hasLocalMedicines={hasLocalMedicines}
            openManualPrescriptionModal={openManualPrescriptionModal}
            doctorPrescriptionType={doctorPrescriptionType}
            isDoctorPrescriptionTypeFetching={isDoctorPrescriptionTypeFetching}
            showFlowStepper={false}
          />
        </div>
      </div>

      {appointment.id && (
        <AppointmentDetailsModals
          appointment={appointment}
          appointmentData={a}
          addTestOpen={addTestOpen}
          onAddTestOpenChange={handleAddTestOpenChange}
          clinicId={clinicId}
          isClinicLoading={isClinicLoading}
          addTestModalOptions={addTestModalOptions}
          assignedTestIds={assignedTestIds}
          selectedTestIds={selectedTestIds}
          setSelectedTestIds={setSelectedTestIds}
          ensureTestsLoadedFromModal={handleEnsureTestsLoadedFromModal}
          handleAddTestFromPrescription={handleAddTestFromPrescription}
          isAddTestDisabled={isAddTestDisabled}
          isAssigning={isAssigning}
          handleCreateTestFromPrescription={handleCreateTestFromPrescription}
          isCreatingTest={isCreatingTest}
          isNoShowModalOpen={isNoShowModalOpen}
          setIsNoShowModalOpen={setIsNoShowModalOpen}
          handleNoShowSuccess={handleNoShowSuccess}
          isRefundModalOpen={isRefundModalOpen}
          setIsRefundModalOpen={setIsRefundModalOpen}
          handleRefundSubmit={handleRefundSubmit}
          isRefundProcessing={isRefundProcessing}
          maxRefundAmount={Number(
            (a as any)?.price ?? clinicService?.price ?? 0,
          )}
          isCancelConfirmOpen={isCancelConfirmOpen}
          setIsCancelConfirmOpen={setIsCancelConfirmOpen}
          closeCancelModal={closeCancelModal}
          handleCancel={handleCancel}
          actionLoading={actionLoading}
          isManualPrescriptionModalOpen={isManualPrescriptionModalOpen}
          manualPrescriptionModalVariant={manualPrescriptionModalVariant}
          handleManualPrescriptionOpenChange={
            handleManualPrescriptionOpenChange
          }
          manualPrescriptionFiles={manualPrescriptionFiles}
          setManualPrescriptionFiles={setManualPrescriptionFiles}
          handleManualPrescriptionFileChange={
            handleManualPrescriptionFileChange
          }
          handleSaveManualPrescription={handleSaveManualPrescription}
          isSavingManualPrescription={isSavingManualPrescription}
          isMedicalCertificateModalOpen={isMedicalCertificateModalOpen}
          setIsMedicalCertificateModalOpen={setIsMedicalCertificateModalOpen}
          medicalCertificateReason={medicalCertificateReason}
          medicalCertificateRestDays={medicalCertificateRestDays}
          medicalCertificateRestrictions={medicalCertificateRestrictions}
          fieldClassNames={FIELD_CN}
          setMedicalCertificateReason={setMedicalCertificateReason}
          setMedicalCertificateRestDays={setMedicalCertificateRestDays}
          setMedicalCertificateRestrictions={setMedicalCertificateRestrictions}
          handleOpenMedicalCertificatePreview={
            handleOpenMedicalCertificatePreview
          }
          isSavingCertificate={isSavingCertificate}
          isMedicalCertificatePreviewOpen={isMedicalCertificatePreviewOpen}
          setIsMedicalCertificatePreviewOpen={
            setIsMedicalCertificatePreviewOpen
          }
          medicalCertificatePreviewHtml={medicalCertificatePreviewHtml}
          isMedicalCertificatePrinting={isMedicalCertificatePrinting}
          handleDownloadMedicalCertificate={handleDownloadMedicalCertificate}
          handlePrintMedicalCertificate={handlePrintMedicalCertificate}
          isReferModalOpen={isReferModalOpen}
          setIsReferModalOpen={setIsReferModalOpen}
          clinicData={clinicData}
          clinic={clinic}
          doctor={doctor}
          patient={patient}
          referredName={referredName}
          setReferredName={setReferredName}
          referredAddress={referredAddress}
          setReferredAddress={setReferredAddress}
          referredDoctorClinic={referredDoctorClinic}
          setReferredDoctorClinic={setReferredDoctorClinic}
          referredPhone={referredPhone}
          setReferredPhone={setReferredPhone}
          referNotes={referNotes}
          setReferNotes={setReferNotes}
          addToast={addToast}
          handleOpenReferPreview={handleOpenReferPreview}
          isReferPreviewOpen={isReferPreviewOpen}
          setIsReferPreviewOpen={setIsReferPreviewOpen}
          referPreviewHtml={referPreviewHtml}
          handlePrintReferForm={handlePrintReferForm}
          isConsentPrinting={isConsentPrinting}
          isAdminConfirmReasonModalOpen={isAdminConfirmReasonModalOpen}
          setIsAdminConfirmReasonModalOpen={setIsAdminConfirmReasonModalOpen}
          adminConfirmReason={adminConfirmReason}
          setAdminConfirmReason={setAdminConfirmReason}
          adminConfirmError={adminConfirmError}
          setAdminConfirmError={setAdminConfirmError}
          handleConfirmWithReason={handleConfirmWithReason}
          isConsentUploadModalOpen={isConsentUploadModalOpen}
          handleConsentUploadOpenChange={handleConsentUploadOpenChange}
          pickedConsentFiles={pickedConsentFiles}
          setPickedConsentFiles={setPickedConsentFiles}
          consentUploadNote={consentUploadNote}
          setConsentUploadNote={setConsentUploadNote}
          handleSaveConsentUpload={handleSaveConsentUpload}
          isUploadingConsent={isUploadingConsent}
          isAddServiceModalOpen={isAddServiceModalOpen}
          setIsAddServiceModalOpen={setIsAddServiceModalOpen}
          handleAddMultipleServicesSuccess={handleAddMultipleServicesSuccess}
          showConsentForm={showConsentForm}
          setShowConsentForm={setShowConsentForm}
          isEditingConsent={isEditingConsent}
          setIsEditingConsent={setIsEditingConsent}
          consentNotes={consentNotes}
          setConsentNotes={setConsentNotes}
          hasConsentNotes={hasConsentNotes}
          handleSaveAndPrintConsent={handleSaveAndPrintConsent}
          handlePrintConsentForm={handlePrintConsentForm}
          isFormTypeModalOpen={isFormTypeModalOpen}
          setIsFormTypeModalOpen={setIsFormTypeModalOpen}
          handleSelectConsentFormType={handleSelectConsentFormType}
          handleSelectReferFormType={handleSelectReferFormType}
          selectedInvoice={selectedInvoice}
          isInvoiceModalOpen={isInvoiceModalOpen}
          handleCloseInvoice={handleCloseInvoice}
          isPayLaterModalOpen={isPayLaterModalOpen}
          setIsPayLaterModalOpen={setIsPayLaterModalOpen}
          handlePayLaterSubmit={handlePayLaterSubmit}
          isPaymentProcessing={isPaymentProcessing}
          isManualPrescriptionPreviewOpen={isManualPrescriptionPreviewOpen}
          setIsManualPrescriptionPreviewOpen={
            setIsManualPrescriptionPreviewOpen
          }
          manualPrescriptionImageUrl={manualPrescriptionImageUrl}
        />
      )}
    </div>
  );
};
export default AppointmentDetails;
