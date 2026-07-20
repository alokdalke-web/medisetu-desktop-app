import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import { useMemo } from "react";
import { FiDownload, FiPrinter, FiRefreshCw, FiShare2 } from "react-icons/fi";

import {
  getLabApiErrorMessage,
  useGetLabAppointmentTestInvoiceQuery,
  type LabInvoice,
  type LabInvoiceItem,
} from "../../../redux/api/labAssistantApi";

type LabInvoiceModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentTestId?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
};

const invoiceElementId = "lab-print-invoice";

function numberValue(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date
    .toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
}

function safeText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getInvoiceCode(invoice: LabInvoice) {
  return (
    safeText(invoice.invoiceNumber, "") ||
    (invoice.id ? `LAB-${invoice.id.slice(-8).toUpperCase()}` : "LAB-INVOICE")
  );
}

function buildPrintableHtml(invoiceHtml: string, title: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 12px; background: #fff; }
    @page { size: A4; margin: 8mm; }
  </style>
</head>
<body>
  ${invoiceHtml}
</body>
</html>`;
}

function getInvoiceShareText(invoice: LabInvoice) {
  const code = getInvoiceCode(invoice);
  const patientName = safeText(invoice.patientName, "patient");
  const total = formatCurrency(invoice.totalAmount);

  return `Lab invoice ${code} for ${patientName}. Total amount: ${total}.`;
}

function getItemTotal(item: LabInvoiceItem) {
  const itemTotal = numberValue(item.total);
  if (itemTotal > 0) return itemTotal;

  const quantity = Math.max(1, numberValue(item.quantity));
  return numberValue(item.price) * quantity;
}

function hasMoneyValue(value: unknown) {
  return value !== null && value !== undefined && numberValue(value) !== 0;
}

function LabInvoiceContent({ invoice }: { invoice: LabInvoice }) {
  const invoiceCode = getInvoiceCode(invoice);
  const invoiceItems: LabInvoiceItem[] =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: invoice.id,
            appointmentTestId: invoice.appointmentTestId,
            testId: invoice.testId,
            testName: invoice.testName ?? "Lab test",
            category: invoice.category,
            sampleType: invoice.sampleType,
            barcodeValue: invoice.barcodeValue,
            quantity: invoice.quantity ?? 1,
            price: invoice.price ?? invoice.totalAmount ?? 0,
            discountPercent: invoice.discountPercent ?? "0.00",
            gstPercentage: invoice.gstPercentage ?? "0.00",
            total: invoice.totalAmount ?? 0,
          },
        ];
  const itemsTotal = invoiceItems.reduce(
    (sum, item) => sum + getItemTotal(item),
    0,
  );
  const subtotal = invoice.subtotal ?? itemsTotal;
  const discountAmount = numberValue(invoice.discountAmount);
  const gstAmount = numberValue(invoice.gstAmount);
  const totalAmount =
    invoice.totalAmount ?? numberValue(subtotal) - discountAmount + gstAmount;
  const showDiscount =
    hasMoneyValue(invoice.discountAmount) ||
    invoiceItems.some((item) => hasMoneyValue(item.discountPercent));
  const showGst =
    hasMoneyValue(invoice.gstAmount) ||
    invoiceItems.some((item) => hasMoneyValue(item.gstPercentage));

  return (
    <div
      id={invoiceElementId}
      className="mx-auto w-full max-w-[980px] border border-[#aeb6c2] bg-white p-4 text-[#14203a] print:border-[#aeb6c2] print:bg-white"
      style={{
        fontFamily: '"Courier New", "Lucida Console", monospace',
        letterSpacing: "0.7px",
        fontWeight: 700,
        textTransform: "uppercase",
        color: "#14203a",
        background: "#fff",
      }}
    >
      <div className="border-b border-[#ccd5e2] pb-2 text-center">
        <h1 className="text-[22px] font-black leading-7 tracking-[0.12em] text-[#0f172a]">
          {safeText(invoice.labName, "Lab")}
        </h1>
        <p className="mt-1 text-[13px] leading-4 tracking-[0.14em] text-[#22304d]">
          {safeText(invoice.labAddress)}
        </p>
        <p className="text-[13px] leading-4 tracking-[0.08em] text-[#22304d]">
          Phone: {safeText(invoice.labContactNumber)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-5 sm:grid-cols-2">
        <div>
          Invoice ID: <span className="text-[#4f5f7c]">{invoiceCode}</span>
        </div>
        <div className="sm:text-right">
          Date:{" "}
          <span className="text-[#4f5f7c]">
            {formatDate(invoice.createdAt)} ({formatTime(invoice.createdAt)})
          </span>
        </div>
      </div>

      <div className="mt-3 flex min-h-[68px] flex-col justify-between gap-4 border-l-2 border-r-2 border-black bg-white px-8 py-2 sm:flex-row">
        <div>
          <p className="mb-1 text-[12px] text-[#14203a]">Patient Details</p>
          <p className="text-[13px] leading-5 text-[#14203a]">
            {safeText(invoice.patientName)}
          </p>
          <p className="text-[13px] leading-5 text-[#14203a]">
            {safeText(invoice.patientMobile)}
          </p>
          <p className="text-[13px] leading-5 text-[#14203a]">
            Doctor: {safeText(invoice.doctorName)}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="mb-1 text-[12px] text-[#14203a]">Payment Details</p>
          <p className="text-[13px] leading-5 text-[#14203a]">
            {safeText(invoice.paymentMethod)}
          </p>
          {invoice.paymentNotes && (
            <p className="text-[13px] leading-5 text-[#14203a]">
              {invoice.paymentNotes}
            </p>
          )}
        </div>
      </div>

      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-[13px] leading-5 text-[#14203a]">
          <thead>
            <tr className="border-b border-[#ccd5e2]">
              <th className="w-[28%] px-2 py-2 text-left text-[#14203a]">
                Test
              </th>
              <th className="w-[18%] px-2 py-2 text-left text-[#14203a]">
                Category
              </th>
              <th className="w-[17%] px-2 py-2 text-left text-[#14203a]">
                Sample
              </th>
              <th className="w-[9%] px-2 py-2 text-center text-[#14203a]">
                Qty
              </th>
              <th className="w-[14%] px-2 py-2 text-right text-[#14203a]">
                Price
              </th>
              <th className="w-[14%] px-2 py-2 text-right text-[#14203a]">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {invoiceItems.length > 0 ? (
              invoiceItems.map((item, index) => (
                <tr
                  key={`${item.id}-${item.appointmentTestId ?? index}`}
                  className="border-b border-[#e7ecf3]"
                >
                  <td className="px-2 py-2.5 text-[#14203a]">
                    {safeText(item.testName)}
                  </td>
                  <td className="px-2 py-2.5 text-[#14203a]">
                    {safeText(item.category)}
                  </td>
                  <td className="px-2 py-2.5 text-[#14203a]">
                    {safeText(item.sampleType)}
                  </td>
                  <td className="px-2 py-2.5 text-center text-[#14203a]">
                    {numberValue(item.quantity) || 1}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#14203a]">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#14203a]">
                    {formatCurrency(getItemTotal(item))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-2 py-6 text-center text-[#14203a]"
                  colSpan={6}
                >
                  No invoice items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end">
        <div className="w-full sm:w-[340px]">
          <div className="flex justify-between border-b border-[#e0e6ef] py-2 text-[13px] text-[#14203a]">
            <span>Sub-total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {showDiscount && (
            <div className="flex justify-between border-b border-[#e0e6ef] py-2 text-[13px] text-[#14203a]">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {showGst && (
            <div className="flex justify-between border-b border-[#e0e6ef] py-2 text-[13px] text-[#14203a]">
              <span>GST (CGST+SGST)</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-[17px] font-black text-[#0f172a]">
            <span>Total Amount</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-y border-[#d7dfe9] py-1 text-[10px] leading-4 text-[#14203a]">
        <p>◦ This invoice is generated for diagnostic laboratory services.</p>
        <p>◦ Please verify patient, test and payment details.</p>
        <p>
          ◦ Reports are subject to sample quality and laboratory verification.
        </p>
      </div>

      <div className="border-t border-[#eef2f7] pt-3">
        <img
          src="https://infinitymedisetu.com/assets/images/logoDark.svg"
          alt="MediSetu Logo"
          className="mx-auto w-20 object-contain grayscale"
        />
      </div>
    </div>
  );
}

export function LabInvoiceModal({
  isOpen,
  onOpenChange,
  appointmentTestId,
  invoiceId,
  invoiceNumber,
}: LabInvoiceModalProps) {
  const queryArg = useMemo(
    () => ({
      appointmentTestId: appointmentTestId || undefined,
      invoiceId: invoiceId || undefined,
    }),
    [appointmentTestId, invoiceId],
  );

  const shouldSkip =
    !isOpen || (!queryArg.appointmentTestId && !queryArg.invoiceId);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetLabAppointmentTestInvoiceQuery(queryArg, {
      skip: shouldSkip,
    });

  const invoice = data?.data ?? null;
  const isBusy = !shouldSkip && (isLoading || (isFetching && !invoice));
  const displayInvoiceNumber = invoice
    ? getInvoiceCode(invoice)
    : invoiceNumber;

  const getInvoiceElement = () => document.getElementById(invoiceElementId);

  const handlePrint = () => {
    const invoiceElement = getInvoiceElement();
    if (!invoiceElement) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) return;

    printWindow.document.write(
      buildPrintableHtml(
        invoiceElement.outerHTML,
        displayInvoiceNumber || "Lab Invoice",
      ),
    );
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleDownload = () => {
    const invoiceElement = getInvoiceElement();
    if (!invoiceElement || !invoice) return;

    const html = buildPrintableHtml(
      invoiceElement.outerHTML,
      getInvoiceCode(invoice),
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${getInvoiceCode(invoice)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!invoice) return;

    const text = getInvoiceShareText(invoice);

    try {
      if (navigator.share) {
        await navigator.share({
          title: getInvoiceCode(invoice),
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        addToast({
          title: "Invoice details copied",
          description: "Share text was copied to clipboard.",
          color: "success",
        });
      }
    } catch (_err) {
      addToast({
        title: "Share cancelled",
        description: "Invoice details were not shared.",
        color: "warning",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      backdrop="blur"
      classNames={{
        base: "max-h-[92vh]",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="block text-base font-bold text-slate-950">
                  Lab Invoice
                </span>
              </div>

              {invoice && (
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={handleShare}
                    startContent={<FiShare2 />}
                    className="border-black/20 bg-white text-black"
                  >
                    Share
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={handleDownload}
                    startContent={<FiDownload />}
                    className="border-black/20 bg-white text-black"
                  >
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    onPress={handlePrint}
                    startContent={<FiPrinter />}
                    className="border-black bg-white text-black"
                  >
                    Print
                  </Button>
                </div>
              )}
            </ModalHeader>

            <ModalBody className="px-4 py-6 sm:px-6">
              {isBusy ? (
                <div className="flex items-center justify-center py-14">
                  <Spinner label="Loading invoice..." />
                </div>
              ) : isError ? (
                <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
                  <p className="text-sm font-bold text-red-700">
                    Unable to load invoice
                  </p>
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {getLabApiErrorMessage(
                      error,
                      "Invoice details could not be loaded.",
                    )}
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => refetch()}
                    startContent={<FiRefreshCw />}
                  >
                    Retry
                  </Button>
                </div>
              ) : invoice ? (
                <LabInvoiceContent invoice={invoice} />
              ) : (
                <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    No invoice found
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    The payment may still be syncing. Try again in a moment.
                  </p>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
