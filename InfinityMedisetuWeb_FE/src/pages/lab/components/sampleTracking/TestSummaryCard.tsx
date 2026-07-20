import { addToast } from "@heroui/react";
import { motion } from "framer-motion";
import {
  FiCreditCard,
  FiDownload,
  FiDroplet,
  FiPrinter,
  FiShield,
  FiUser,
} from "react-icons/fi";

import type {
  BarcodeInfo,
  PaymentStatus,
  SampleStatus,
} from "../../../../redux/api/labAssistantApi";
import { Code128Barcode } from "../Code128Barcode";
import { formatCurrency, normalizePaymentStatus } from "../../labData";
import { buildCode128SvgMarkup } from "../../utils/code128Barcode";
import { printBarcodeLabel } from "./barcodeLabelActions";
import { formatTimestamp, makeBarcodeFileName } from "./trackingUtils";

export function TestSummaryCard({
  appointmentTest,
  payment,
  expectedReportReadyAt,
}: {
  appointmentTest: {
    patientName: string | null;
    doctorName: string | null;
    testName: string | null;
    uniqueTestId?: string | null;
    barcode?: BarcodeInfo | null;
    category: string | null;
    price: number;
    dateTime: string;
    appointmentTime: string | null;
    workflowStatus: string;
    sampleStatus: SampleStatus;
  };
  expectedReportReadyAt?: string | null;
  payment: {
    status: PaymentStatus;
    amount: number;
    collectedAt: string | null;
  };
}) {
  const isPaid = normalizePaymentStatus(payment.status) === "PAID";
  const uniqueTestId = appointmentTest.uniqueTestId?.trim() || "--";
  const barcodeValue = appointmentTest.barcode?.value?.trim();

  const printBarcode = () => {
    if (!barcodeValue) return;
    printBarcodeLabel({
      barcodeValue,
      testName: appointmentTest.testName,
      patientName: appointmentTest.patientName,
      doctorName: appointmentTest.doctorName,
      uniqueTestId: appointmentTest.uniqueTestId,
    });
  };

  const downloadBarcode = () => {
    if (!barcodeValue) return;

    try {
      const svg = buildCode128SvgMarkup({
        value: barcodeValue,
        moduleWidth: 2,
        barHeight: 54,
        quietZone: 12,
        showText: true,
      });

      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = makeBarcodeFileName(barcodeValue);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast({
        title: "Barcode download failed",
        description:
          err instanceof Error ? err.message : "Could not download barcode SVG.",
        color: "danger",
      });
    }
  };

  const detailItems = [
    {
      icon: <FiUser />,
      label: "Patient",
      value: appointmentTest.patientName ?? "-",
      tone: "emerald",
    },
    {
      icon: <FiShield />,
      label: "Doctor",
      value: appointmentTest.doctorName ?? "-",
      tone: "blue",
    },
    {
      icon: <FiDroplet />,
      label: "Category",
      value: appointmentTest.category ?? "-",
      tone: "violet",
    },
    {
      icon: <FiCreditCard />,
      label: "Test Price",
      value: formatCurrency(appointmentTest.price),
      tone: "indigo",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[8px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
    >
      <div className="px-4 py-2.5 sm:px-5">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-lg text-rose-500 ring-1 ring-rose-100">
              <FiDroplet />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  title={appointmentTest.testName ?? "-"}
                  className="truncate text-lg font-black leading-tight text-slate-950"
                >
                  {appointmentTest.testName ?? "-"}
                </h2>

                <span
                  title={appointmentTest.category ?? "-"}
                  className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
                >
                  {appointmentTest.category ?? "-"}
                </span>
              </div>
            </div>
          </div>

          {barcodeValue ? (
            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs xl:ml-auto xl:max-w-[450px]">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <p className="shrink-0 text-[11px] font-bold text-slate-500">
                  Barcode
                </p>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                  <div className="h-8 w-full max-w-[300px] overflow-hidden">
                    <Code128Barcode
                      value={barcodeValue}
                      showText={false}
                      className="mx-auto block h-full w-auto"
                    />
                  </div>
                  <span className="font-mono text-[10.5px] font-bold leading-none text-slate-500">
                    {barcodeValue}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={printBarcode}
                  title="Print barcode label"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-[13px] text-primary shadow-sm transition-colors hover:border-primary/25 hover:bg-primary/5 focus:outline-none"
                >
                  <FiPrinter />
                </button>
                <button
                  type="button"
                  onClick={downloadBarcode}
                  title="Download barcode"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-[13px] text-primary shadow-sm transition-colors hover:border-primary/25 hover:bg-primary/5 focus:outline-none"
                >
                  <FiDownload />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-2 xl:ml-auto xl:max-w-[420px]">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm">
                <FiPrinter />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-500">
                  Barcode
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Barcode not generated yet.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-2.5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {detailItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.035)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ring-1",
                    item.tone === "emerald"
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                      : item.tone === "blue"
                        ? "bg-blue-50 text-blue-600 ring-blue-100"
                        : item.tone === "violet"
                          ? "bg-violet-50 text-violet-600 ring-violet-100"
                          : "bg-indigo-50 text-indigo-600 ring-indigo-100",
                  ].join(" ")}
                >
                  {item.icon}
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>

                  <p
                    title={String(item.value)}
                    className="mt-1 truncate text-sm font-bold text-slate-950"
                  >
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={[
            "mt-3 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs sm:grid-cols-2 lg:grid-cols-4",
            expectedReportReadyAt ? "xl:grid-cols-5" : "xl:grid-cols-4",
          ].join(" ")}
        >
          <div className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-2.5 sm:border-r lg:border-b-0">
            <p className="shrink-0 text-[12px] font-bold text-slate-500">
              Payment Status
            </p>

            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                isPaid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700",
              ].join(" ")}
            >
              {isPaid ? "Completed" : "Pending"}
            </span>
          </div>

          <div className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-2.5 sm:border-b lg:border-b-0 lg:border-r">
            <p className="shrink-0 text-[12px] font-bold text-slate-500">
              Test ID
            </p>

            <span
              title={uniqueTestId}
              className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-black text-primary"
            >
              {uniqueTestId}
            </span>
          </div>

          <div className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-2.5 lg:border-b-0 lg:border-r">
            <p className="shrink-0 text-[12px] font-bold text-slate-500">
              Payment Amount
            </p>

            <p className="truncate text-sm font-bold text-slate-950">
              {formatCurrency(payment.amount ?? appointmentTest.price)}
            </p>
          </div>

          {payment.collectedAt && (
            <div className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-2.5 sm:border-r lg:border-b-0">
              <p className="shrink-0 text-[12px] font-bold text-slate-500">
                Collected At
              </p>

              <p className="truncate text-sm font-bold text-slate-950">
                {formatTimestamp(payment.collectedAt)}
              </p>
            </div>
          )}

          {expectedReportReadyAt && (
            <div className="flex min-h-12 items-center gap-3 px-4 py-2.5">
              <p className="shrink-0 text-[12px] font-bold text-slate-500">
                Expected Report
              </p>

              <p className="truncate text-sm font-bold text-slate-950">
                {formatTimestamp(expectedReportReadyAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
