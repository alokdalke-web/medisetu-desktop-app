import React, { useEffect, useRef, useState } from "react";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import { FiDownload, FiX } from "react-icons/fi";

type AppointmentInvoiceData = {
  invoiceNo: string;
  generatedAt: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  token: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientMobile: string;
  doctorName: string;
  speciality: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicCity: string;
  clinicState: string;
  clinicZipCode: string;
  serviceName: string;
  paymentMode: string;
  paymentStatus: string;
  paymentNotes: string;
  amountText: string;
  totalAmountText: string;
  priceValue: number;
  notes?: string;
  clinicLogo?: string;
  clinicSealUrl?: string;
  clinicSignUrl?: string;
   primaryService?: {
    name: string;
    price: number;
  };
  additionalServices?: Array<{
    name: string;
    price: number;
    paymentMode: string;
    paymentNotes?: string;
  }>;
};

const escapeHtml = (value: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const amountInWords = (amount: number) => {
  const words = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convert = (n: number): string => {
    if (n < 20) return words[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + words[n % 10] : "");
    if (n < 1000)
      return (
        words[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 100000)
      return (
        convert(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convert(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convert(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convert(n % 100000) : "")
      );
    return (
      convert(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convert(n % 10000000) : "")
    );
  };

  return convert(Math.floor(amount)) + " Rupees Only";
};

export const generateAppointmentInvoiceHTML = (
  data: AppointmentInvoiceData,
) => {
  const logo =
    data.clinicLogo ||
    "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1FA7A.svg";
  const seal =
    data.clinicSealUrl ||
    "https://i.ibb.co/YTKDDQbY/IMS-Seal.png";
  // const sign =
  //   data.clinicSignUrl ||
  //   "https://res.cloudinary.com/dc7knjq36/image/upload/v1775217075/strokewidth-removebg-preview_vwvfkt.png";

  const services = [];

  if (data.primaryService) {
    services.push({
      name: data.primaryService.name,
      price: data.primaryService.price,
      paymentMode: data.paymentMode,
      paymentNotes: data.paymentNotes,
      isPrimary: true,
    });
  } else {
    // Fallback to old way
    services.push({
      name: data.serviceName || "Consultation",
      price: data.priceValue,
      paymentMode: data.paymentMode,
      paymentNotes: data.paymentNotes,
      isPrimary: true,
    });
  }

  // Add additional services
  if (data.additionalServices && data.additionalServices.length > 0) {
    data.additionalServices.forEach((service) => {
      services.push({
        name: service.name,
        price: service.price,
        paymentMode: service.paymentMode,
        paymentNotes: service.paymentNotes,
        isPrimary: false,
      });
    });
  }

  // Calculate total (already in priceValue, but we'll recalc from services to ensure accuracy)
  const calculatedTotal = services.reduce((sum, s) => sum + s.price, 0);
  const totalAmount = calculatedTotal > 0 ? calculatedTotal : data.priceValue;

  // Format currency function
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Appointment Invoice - ${escapeHtml(data.invoiceNo)}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Courier New", "Lucida Console", monospace;
          background: #fffdf7;
          padding: 20px;
          color: #000;
          letter-spacing: 1px;
          font-weight: 700;
          text-transform: uppercase;
          image-rendering: pixelated;
          filter: contrast(1.1);
        }

        .percent {
          font-family: Arial, Helvetica, sans-serif;
        }

        .invoice {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          border: 1px solid rgba(0,0,0,0.25);
          padding: 20px 22px;
          background: #fffdf7;
        }

        .clinic-banner {
          text-align: center;
          border-bottom: 2px solid #132f57;
          padding-bottom: 8px;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .clinic-banner h2 {
          font-size: 28px;
          line-height: 1.2;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .logo-wrap {
          width: 110px;
          min-width: 90px;
          height: 52px;
          display: flex;
          align-items: center;
        }

        .logo-wrap img {
          max-height: 52px;
          max-width: 100%;
          object-fit: contain;
        }

        .head-meta {
          font-size: 12px;
          line-height: 1.6;
          text-align: right;
          min-width: 170px;
          word-break: break-word;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .details-grids {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px 14px;
          margin-top: 14px;
          margin-bottom: 18px;
        }

        .patient-item {
          font-size: 12px;
          line-height: 1.5;
          word-break: break-word;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .patient-item .label {
          font-weight: 700;
          margin-right: 4px;
          text-transform: uppercase;
        }

        .company-details {
          font-size: 12px;
          line-height: 1.6;
          margin-top: 12px;
          margin-bottom: 22px;
          text-align: right;
          word-break: break-word;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 18px;
        }

        .info-box {
          min-width: 0;
          font-size: 13px;
          line-height: 1.6;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .section-title {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 8px;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 4px;
          letter-spacing: 1px;
        }

        .info-row {
          display: grid;
          grid-template-columns: 100px minmax(0, 1fr);
          gap: 8px;
          margin-bottom: 6px;
          align-items: start;
        }

        .info-label {
          font-weight: bold;
          text-transform: uppercase;
        }

        .info-value {
          min-width: 0;
          word-wrap: break-word;
          word-break: break-word;
          text-transform: uppercase;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
          margin-top: 10px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        th,
        td {
          border: 1px solid #000;
          font-size: 12px;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          word-break: break-word;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        th {
          background: #f5f5f5;
          font-weight: 700;
          text-transform: uppercase;
        }

        .total td {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .auth-wrap {
          margin-top: 18px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          flex-wrap: wrap;
        }

        .brand-logo {
          width: 150px;
          max-width: 100%;
        }

        .auth-box {
          width: 220px;
          text-align: center;
          position: relative;
          height: 120px;
          max-width: 100%;
        }

        .seal {
          max-height: 120px;
          max-width: 100%;
          opacity: 0.8;
        }

        .sign {
          position: absolute;
          top: 26px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 100px;
        }

        .footer {
          margin-top: 14px;
          font-size: 11px;
          text-align: center;
          border-top: 1px solid #000;
          padding-top: 8px;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @media (max-width: 768px) {
          body {
            padding: 12px;
          }

          .invoice {
            padding: 16px 14px;
          }

          .clinic-banner h2 {
            font-size: 24px;
          }

          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .head-meta {
            min-width: 0;
            width: 100%;
            text-align: left;
          }

          .details-grids {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .company-details {
            text-align: left;
            margin-bottom: 18px;
          }

          .info-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .auth-wrap {
            flex-direction: column;
            align-items: flex-start;
          }

          .auth-box {
            width: 180px;
            height: 110px;
          }
        }

        @media (max-width: 480px) {
          body {
            padding: 8px;
          }

          .invoice {
            padding: 12px 10px;
          }

          .clinic-banner h2 {
            font-size: 20px;
          }

          .details-grids {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .patient-item {
            font-size: 12px;
          }

          .section-title {
            font-size: 12px;
          }

          .info-box {
            font-size: 12px;
          }

          .info-row {
            grid-template-columns: 1fr;
            gap: 2px;
          }

          .info-label {
            min-width: 0;
          }

          th,
          td {
            font-size: 11px;
            padding: 6px;
          }

          .total td {
            font-size: 12px;
          }

          .footer {
            font-size: 10px;
          }
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }

          .invoice {
            border: none;
            max-width: 100%;
            background: #fff;
          }

          @page {
            size: A4;
            margin: 1.2cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="clinic-banner">
          <h2>APPOINTMENT INVOICE</h2>
        </div>

        <div class="header-row clinic-banner">
          <div class="logo-wrap">
            <img src="${escapeHtml(logo)}" alt="Clinic Logo" />
          </div>

          <div class="head-meta">
            <div><strong>Invoice No:</strong> ${escapeHtml(data.invoiceNo)}</div>
            <div><strong>Date:</strong> ${escapeHtml(data.generatedAt)}</div>
          </div>
        </div>

        <div class="details-grids">
          <div class="patient-item">
            <span class="label">Patient Name:</span>
            <span>${escapeHtml(data.patientName)}</span>
          </div>
          <div class="patient-item">
            <span class="label">Age:</span>
            <span>${escapeHtml(data.patientAge)} yr</span>
          </div>
          <div class="patient-item">
            <span class="label">Gender:</span>
            <span>${escapeHtml(data.patientGender)}</span>
          </div>
          <div class="patient-item">
            <span class="label">Mobile No:</span>
            <span>${escapeHtml(data.patientMobile)}</span>
          </div>
        </div>

        <div class="company-details">
          <strong>Appointment Date:</strong> ${escapeHtml(data.appointmentDate || "—")}<br />
          <strong>Slot:</strong> ${escapeHtml(data.token || data.appointmentTime || "—")}
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="section-title">Clinic Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${escapeHtml(data.clinicName || "N/A")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${escapeHtml(data.clinicAddress || "N/A")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">City/State:</span>
              <span class="info-value">
                ${escapeHtml(data.clinicCity || "N/A")}, ${escapeHtml(data.clinicState || "N/A")} - ${escapeHtml(data.clinicZipCode || "N/A")}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${escapeHtml(data.clinicPhone || "N/A")}</span>
            </div>
          </div>

          <div class="info-box">
            <div class="section-title">Doctor Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${escapeHtml(data.doctorName || "N/A")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Speciality:</span>
              <span class="info-value">${escapeHtml(data.speciality || "N/A")}</span>
            </div>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Payment Mode</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${services
                .map(
                  (service) => `
                <tr>
                  <td>${escapeHtml(service.name)}${
                    service.isPrimary ? ' <span style="font-size: 10px; color: #666; text-transform: lowercase;">(Primary)</span>' : ""
                  }</td>
                  <td>
                    ${escapeHtml(service.paymentMode || "—")}
                    ${service.paymentNotes ? ` (${escapeHtml(service.paymentNotes)})` : ""}
                  </td>
                  <td>${escapeHtml(formatCurrency(service.price))}</td>
                </tr>
              `,
                )
                .join("")}
              <tr class="total">
                <td colspan="2" style="text-align: right;">Total</td>
                <td>${escapeHtml(formatCurrency(totalAmount))}</td>
              </tr>
              <tr>
                <td colspan="3">
                  <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Total in Words:</span><br />
                  <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                    ${escapeHtml(amountInWords(totalAmount))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="auth-wrap">
          <img
            class="brand-logo"
            src="/app/assets/images/logoLight.svg"
            alt="Brand Logo" style="height: 30px; width: auto; object-fit: contain;"
          />

          <div class="auth-box">
            <img class="seal" src="${escapeHtml(seal)}" alt="Clinic Seal" />
          </div>
        </div>

        <div class="footer">
          This is a computer-generated appointment invoice.
        </div>
      </div>
    </body>
    </html>
  `;
};

type AppointmentInvoicePreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: AppointmentInvoiceData;
};

const AppointmentInvoicePreviewModal: React.FC<
  AppointmentInvoicePreviewModalProps
> = ({ isOpen, onClose, invoiceData }) => {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [iframeHeight, setIframeHeight] = useState("600px");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    const iframe = iframeRef.current;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: number | undefined;
    let invoiceImages: HTMLImageElement[] = [];

    const updateIframeHeight = () => {
      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const height = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight,
          doc.body.offsetHeight,
          doc.documentElement.offsetHeight,
        );

        setIframeHeight(`${height}px`);
      } catch {
        setIframeHeight("600px");
      }
    };

    const handleLoad = () => {
      updateIframeHeight();
      window.requestAnimationFrame(updateIframeHeight);
      resizeTimer = window.setTimeout(updateIframeHeight, 250);

      try {
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        invoiceImages.forEach((image) => {
          image.removeEventListener("load", updateIframeHeight);
          image.removeEventListener("error", updateIframeHeight);
        });

        invoiceImages = Array.from(doc.images);
        invoiceImages.forEach((image) => {
          image.addEventListener("load", updateIframeHeight);
          image.addEventListener("error", updateIframeHeight);
        });

        resizeObserver?.disconnect();
        if ("ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(updateIframeHeight);
          resizeObserver.observe(doc.body);
        }
      } catch {
        setIframeHeight("600px");
      }
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      resizeObserver?.disconnect();
      if (resizeTimer) window.clearTimeout(resizeTimer);
      invoiceImages.forEach((image) => {
        image.removeEventListener("load", updateIframeHeight);
        image.removeEventListener("error", updateIframeHeight);
      });
    };
  }, [isOpen, invoiceData]);

  const openForPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      addToast({
        title: "Error",
        description: "Popup blocked. Please allow popups for this site.",
        color: "danger",
      });
      return null;
    }

    printWindow.document.write(generateAppointmentInvoiceHTML(invoiceData));
    printWindow.document.close();
    return printWindow;
  };

  const handlePrint = () => {
    const printWindow = openForPrint();
    if (!printWindow) return;
    printWindow.print();
  };

  const handleDownloadAsPDF = () => {
    try {
      setIsDownloadingPDF(true);
      const printWindow = openForPrint();
      if (!printWindow) return;

      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      };

      addToast({
        title: "Info",
        description: "Print dialog opened. Select 'Save as PDF' to download.",
        color: "primary",
        timeout: 3000,
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to open print dialog",
        color: "danger",
      });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <Modal
      hideCloseButton
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      placement="center"
      scrollBehavior="inside"
      size="5xl"
      classNames={{
        wrapper: "items-center p-3 sm:p-4",
        base: "m-0 max-h-[88dvh] w-[calc(100vw-24px)] max-w-[980px] overflow-hidden rounded-[22px] bg-[#E8F6F4] shadow-xl sm:max-h-[86dvh] sm:rounded-[26px]",
        body: "min-h-0 overflow-hidden p-0",
      }}
    >
      <ModalContent>
        {(onCloseModal) => {
          const handleClose = () => {
            onClose();
            onCloseModal();
          };

          return (
            <>
              <div className="flex items-center justify-between border-b border-[#CFEAE5] bg-white px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    Invoice Preview
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {invoiceData.patientName}
                  </p>
                </div>

                <button
                  aria-label="Close invoice preview"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-gray-100"
                  type="button"
                  onClick={handleClose}
                >
                  <FiX size={20} />
                </button>
              </div>

              <ModalBody className="flex min-h-0 flex-col p-0">
                <div className="min-h-0 max-h-[calc(88dvh-68px)] flex-1 overflow-y-auto overscroll-contain bg-[#E8F6F4] sm:max-h-[calc(86dvh-68px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9ECBC4] [&::-webkit-scrollbar-thumb]:hover:bg-primary">
                  <div className="p-2.5 sm:p-3">
                    <div className="rounded-[20px] border border-[#D7ECE7] bg-white p-4 shadow-sm sm:rounded-[22px] sm:p-5 lg:p-6">
                      <div className="flex justify-center">
                        <iframe
                          ref={iframeRef}
                          srcDoc={generateAppointmentInvoiceHTML(invoiceData)}
                          className="block w-full border-0 bg-white rounded-lg"
                          style={{ height: iframeHeight, minHeight: "500px" }}
                          title="Appointment Invoice Preview"
                          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                          scrolling="no"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col-reverse gap-2 border-t border-[#CFEAE5] bg-white/95 px-3 py-3 shadow-[0_-10px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:justify-end sm:px-4">
                  <Button
                    radius="full"
                    variant="flat"
                    className="h-10 min-w-[108px] border border-[#D7ECE7] bg-white px-5 text-slate-700 shadow-none sm:w-auto"
                    onPress={handleClose}
                  >
                    Close
                  </Button>

                  <Button
                    radius="full"
                    startContent={<FiDownload size={16} />}
                    variant="flat"
                    className="h-10 border border-[#BFE0D9] bg-white px-5 text-primary sm:w-auto"
                    onPress={handlePrint}
                  >
                    Print
                  </Button>

                  <Button
                    radius="full"
                    startContent={!isDownloadingPDF && <FiDownload size={16} />}
                    variant="flat"
                    className="h-10 bg-primary px-5 text-white shadow-sm sm:w-auto"
                    onPress={handleDownloadAsPDF}
                    isLoading={isDownloadingPDF}
                    isDisabled={isDownloadingPDF}
                  >
                    PDF
                  </Button>
                </div>
              </ModalBody>
            </>
          );
        }}
      </ModalContent>
    </Modal>
  );
};

export default AppointmentInvoicePreviewModal;