import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { FiDownload, FiEye, FiPrinter, FiUploadCloud } from "react-icons/fi";

import {
  type LabResultReport,
  type LabResultTemplate,
} from "../../../../../redux/api/labAssistantApi";
import {
  calculateAgeFromDob,
  firstReportDisplayText,
  type ResultPreviewParameter,
} from "../trackingUtils";
import { evaluateFlag } from "./resultFlag";
import { defaultColors } from "../../../../profile/lab-report-templates/helpers/designerOptions";
import {
  compileLabReportTemplate,
  getLabReportTemplateHtml,
} from "../../../../profile/lab-report-templates/helpers/templateHtml";

/** A4 at 96dpi — the fixed pixel size the preview iframe renders before
 * being scaled to fit the modal, matching the Report Template designer's
 * own live-preview sizing so the two stay visually consistent. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export function ResultReportPreviewModal({
  isOpen,
  onOpenChange,
  report,
  appointmentTest,
  template,
  remarks: _remarks,
  previewParameters,
  onDownload,
  isDownloading,
  onUploadGeneratedReport,
  isUploadingGeneratedReport,
  visualTemplate,
  templateDisplayName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: LabResultReport | null;
  appointmentTest: any;
  template: LabResultTemplate | null;
  remarks?: string;
  previewParameters: ResultPreviewParameter[];
  onDownload: () => void | Promise<void>;
  isDownloading?: boolean;
  onUploadGeneratedReport?: () => void | Promise<void>;
  isUploadingGeneratedReport?: boolean;
  visualTemplate?: any;
  templateDisplayName?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the fixed-size A4 iframe to whatever width the modal actually has,
  // the same way the Report Template designer's own live preview does.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const apply = () => {
      const { clientWidth } = stage;
      if (!clientWidth) return;
      setScale(Math.min(1, clientWidth / A4_WIDTH_PX));
    };

    apply();

    const observer = new ResizeObserver(apply);
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  if (!appointmentTest) return null;

  const handleClose = (onClose: () => void) => {
    onOpenChange(false);
    onClose();
  };

  const handlePrint = () => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (frameWindow) {
      frameWindow.print();
      return;
    }
    window.print();
  };

  const reportDateValue =
    report?.generatedAt ||
    (report as any)?.verifiedAt ||
    appointmentTest.readyForReportAt ||
    appointmentTest.updatedAt ||
    appointmentTest.dateTime;

  const reportDate = reportDateValue
    ? new Date(reportDateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const labName = firstReportDisplayText(
    template?.labName,
    appointmentTest.labName,
    appointmentTest.lab?.name,
    appointmentTest.clinicName,
    appointmentTest.clinic?.name,
    (report as any)?.labName,
    (report as any)?.clinicName,
    report?.clinic,
    "Infinity Medisetu",
  );

  const labAddress = firstReportDisplayText(
    template?.labAddress,
    appointmentTest.labAddress,
    appointmentTest.lab?.address,
    appointmentTest.clinicAddress,
    appointmentTest.clinic?.address,
    appointmentTest.address,
    (report as any)?.labAddress,
    (report as any)?.clinicAddress,
    (report as any)?.address,
  );

  const labContact = firstReportDisplayText(
    template?.labContactNumber,
    appointmentTest.labContactNumber,
    appointmentTest.lab?.contactNumber,
    appointmentTest.lab?.mobile,
    appointmentTest.lab?.phone,
    (report as any)?.labContactNumber,
  );

  const doctorDisplay = firstReportDisplayText(
    appointmentTest.doctorName,
    appointmentTest.doctor?.name,
    report?.doctor,
    "—",
  );

  const patientName = firstReportDisplayText(
    appointmentTest.patientName,
    appointmentTest.patient?.name,
    template?.patientName,
    (report as any)?.patientName,
    report?.patient,
    "—",
  );

  const patientAge = firstReportDisplayText(
    appointmentTest.patientAge,
    appointmentTest.patient?.age,
    appointmentTest.age,
    template?.patientAge,
    (report as any)?.patientAge,
    (report as any)?.age,
    calculateAgeFromDob(
      appointmentTest.patientDob ??
      appointmentTest.patient?.dob ??
      appointmentTest.patient?.dateOfBirth ??
      appointmentTest.dob ??
      template?.patientDob ??
      (report as any)?.patientDob ??
      (report as any)?.dob,
    ),
  );

  const patientAgeDisplay = patientAge
    ? /year|yrs?|y\b/i.test(patientAge)
      ? patientAge
      : `${patientAge} Yrs`
    : "—";

  const patientGender = firstReportDisplayText(
    appointmentTest.patientGender,
    appointmentTest.patient?.gender,
    appointmentTest.gender,
    template?.patientGender,
    (report as any)?.patientGender,
    (report as any)?.gender,
    "—",
  );

  // const patientEmail = firstReportDisplayText(
  //   appointmentTest.patientEmail,
  //   appointmentTest.patient?.email,
  //   appointmentTest.email,
  //   template?.patientEmail,
  //   (report as any)?.patientEmail,
  //   (report as any)?.email,
  //   "—",
  // );

  // const patientMobile = firstReportDisplayText(
  //   appointmentTest.patientMobile,
  //   appointmentTest.patient?.mobile,
  //   appointmentTest.patient?.phone,
  //   appointmentTest.patient?.contactNumber,
  //   appointmentTest.mobile,
  //   appointmentTest.phone,
  //   template?.patientMobile,
  //   (report as any)?.patientMobile,
  //   (report as any)?.mobile,
  //   (report as any)?.phone,
  //   "—",
  // );

  const sampleType = firstReportDisplayText(
    template?.sampleType,
    report?.sampleType,
    appointmentTest.sampleType,
    appointmentTest.category,
    "—",
  );

  const testNameDisplay = firstReportDisplayText(
    appointmentTest.testName,
    report?.testName,
    template?.testName,
    template?.templateName,
    "Laboratory Test",
  );

  const evaluatedParameters = previewParameters.map(param => {
    const flag = param.flag || evaluateFlag(param.value, param.referenceRange);

    return {
      ...param,
      flag,
    };
  });

  const templateName = visualTemplate?.templateName || "template1";
  const baseTemplate = getLabReportTemplateHtml(templateName);
  const templateLabel = templateDisplayName || testNameDisplay;

  const fontStyle = visualTemplate?.fontFamily || "Inter, sans-serif";
  const colors = {
    color1: visualTemplate?.color1 || defaultColors.color1,
    color2: visualTemplate?.color2 || defaultColors.color2,
    color3: visualTemplate?.color3 || defaultColors.color3,
    color4: visualTemplate?.color4 || defaultColors.color4,
    color5: visualTemplate?.color5 || defaultColors.color5,
    color6: visualTemplate?.color6 || defaultColors.color6,
    color7: visualTemplate?.color7 || defaultColors.color7,
    color8: visualTemplate?.color8 || defaultColors.color8,
    color9: visualTemplate?.color9 || defaultColors.color9,
    color10: visualTemplate?.color10 || defaultColors.color10,
  };

  const compiledHtml = compileLabReportTemplate(baseTemplate, {
    clinic: {
      name: labName,
      address: `${labAddress || ""} ${labContact ? `(Contact: ${labContact})` : ""}`,
    },
    patient: {
      name: `${patientName} (${patientAgeDisplay} / ${patientGender})`,
    },
    doctor: {
      name: doctorDisplay,
    },
    test: {
      name: testNameDisplay,
      category: appointmentTest.category || "Laboratory Test",
    },
    template: {
      sampleType: sampleType,
    },
    labResult: {
      id: report?.id ? report.id.split("-")[0] : "LR-PREVIEW",
      status: report?.status || "Verified",
      remarks: _remarks || report?.remarks || "",
      verifiedAt: reportDate,
    },
    generatedAt: reportDate,
    values: evaluatedParameters.map(p => ({
      parameterName: p.parameterName,
      value: p.value || "—",
      unit: p.unit || "—",
      referenceRange: p.referenceRange || "—",
      flag: p.flag || ""
    })),
    templateConfig: {
      fontFamily: fontStyle,
      colors,
    },
  });

  return (
    <Modal
      hideCloseButton
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper: "items-center p-3 sm:p-4",
        base: "m-0 max-h-[92dvh] w-[calc(100vw-24px)] max-w-[820px] overflow-hidden rounded-xl bg-surface shadow-xl sm:max-h-[90dvh]",
        body: "min-h-0 overflow-hidden p-0",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <ModalBody className="flex min-h-0 flex-col bg-surface p-0">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2 sm:px-4">
                <FiEye size={13} className="shrink-0 text-primary" />
                <h3 className="text-[12px] font-semibold text-text">Live Preview</h3>
                <span className="truncate text-[11px] text-text-subtle">
                  · {templateLabel}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background-secondary [scrollbar-gutter:stable] [scrollbar-width:thin]">
              <div ref={stageRef} className="p-3 sm:p-4">
                <div
                  className="mx-auto overflow-hidden rounded-xl border border-line bg-white shadow-sm"
                  style={{
                    width: A4_WIDTH_PX * scale,
                    height: A4_HEIGHT_PX * scale,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    srcDoc={compiledHtml}
                    title="Lab report preview"
                    style={{
                      width: A4_WIDTH_PX,
                      height: A4_HEIGHT_PX,
                      border: 0,
                      transformOrigin: "top left",
                      transform: `scale(${scale})`,
                    }}
                  />
                </div>
              </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-4">
              <Button
                radius="full"
                variant="flat"
                className="h-10 min-w-[108px] border border-primary/15 bg-white px-5 text-slate-700 shadow-none sm:w-auto font-bold"
                onPress={() => handleClose(onClose)}
              >
                Close
              </Button>

              <Button
                radius="full"
                startContent={<FiPrinter size={16} />}
                className="h-10 border border-primary/25 bg-white px-5 text-primary hover:bg-primary/5 transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                onPress={handlePrint}
              >
                Print Report
              </Button>

              {onUploadGeneratedReport && (
                <Button
                  radius="full"
                  isLoading={isUploadingGeneratedReport}
                  startContent={!isUploadingGeneratedReport && <FiUploadCloud size={16} />}
                  className="h-10 border border-primary bg-primary px-5 text-white shadow-md hover:bg-primary-active transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                  onPress={onUploadGeneratedReport}
                >
                  Upload Report
                </Button>
              )}

              <Button
                radius="full"
                isLoading={isDownloading}
                startContent={!isDownloading && <FiDownload size={16} />}
                className="h-10 border border-primary bg-primary px-5 text-white shadow-md hover:bg-primary-active transition active:scale-95 sm:w-auto font-bold animate-fade-in"
                onPress={onDownload}
              >
                Download PDF
              </Button>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
}
