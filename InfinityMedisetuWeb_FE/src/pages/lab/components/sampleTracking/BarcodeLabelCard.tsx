import { addToast } from "@heroui/react";
import { motion } from "framer-motion";
import { FiDownload, FiPrinter } from "react-icons/fi";

import type { BarcodeInfo } from "../../../../redux/api/labAssistantApi";
import { Code128Barcode } from "../Code128Barcode";
import { buildCode128SvgMarkup } from "../../utils/code128Barcode";
import { printBarcodeLabel } from "./barcodeLabelActions";
import { makeBarcodeFileName } from "./trackingUtils";

type BarcodeAppointmentTest = {
  id: string;
  uniqueTestId?: string | null;
  barcode?: BarcodeInfo | null;
  patientName: string | null;
  doctorName: string | null;
  testName: string | null;
};

export function BarcodeLabelCard({
  appointmentTest,
}: {
  appointmentTest: BarcodeAppointmentTest;
}) {
  const barcode = appointmentTest.barcode;
  const barcodeValue = barcode?.value?.trim();

  if (!barcodeValue) return null;

  const printBarcode = () => {
    printBarcodeLabel({
      barcodeValue,
      testName: appointmentTest.testName,
      patientName: appointmentTest.patientName,
      doctorName: appointmentTest.doctorName,
      uniqueTestId: appointmentTest.uniqueTestId,
    });
  };

  const downloadBarcode = () => {
    try {
      const svg = buildCode128SvgMarkup({
        value: barcodeValue,
        moduleWidth: 2,
        barHeight: 70,
        quietZone: 14,
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-950">Barcode Label</h2>

          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Scan value: <span className="font-mono font-bold">{barcodeValue}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={printBarcode}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            <FiPrinter />
            Print
          </button>
          <button
            type="button"
            onClick={downloadBarcode}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-3 text-xs font-bold text-white transition-colors hover:bg-primary-active"
          >
            <FiDownload />
            Download
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Code128Barcode value={barcodeValue} className="mx-auto h-auto w-full max-w-xl" />
      </div>
    </motion.section>
  );
}
