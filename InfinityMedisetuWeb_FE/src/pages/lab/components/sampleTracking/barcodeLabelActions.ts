import { addToast } from "@heroui/react";

import { buildCode128SvgMarkup } from "../../utils/code128Barcode";
import { escapeHtml } from "./trackingUtils";

export function printBarcodeLabel({
  barcodeValue,
  testName,
  patientName,
  doctorName,
  uniqueTestId,
}: {
  barcodeValue: string;
  testName?: string | null;
  patientName?: string | null;
  doctorName?: string | null;
  uniqueTestId?: string | null;
}) {
  try {
    const barcodeSvg = buildCode128SvgMarkup({
      value: barcodeValue,
      moduleWidth: 2,
      barHeight: 70,
      quietZone: 14,
      showText: true,
    });
    const popup = window.open("", "_blank", "width=520,height=420");

    if (!popup) {
      addToast({
        title: "Print window blocked",
        description: "Allow popups for this page to print barcode labels.",
        color: "warning",
      });
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Barcode ${escapeHtml(barcodeValue)}</title>
          <style>
            @page { size: 58mm 38mm; margin: 3mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #fff;
            }
            .label {
              width: 100%;
              min-height: 32mm;
              display: grid;
              gap: 4px;
              align-content: start;
            }
            .title {
              font-size: 12px;
              font-weight: 800;
              line-height: 1.15;
            }
            .meta {
              display: grid;
              gap: 2px;
              font-size: 9px;
              font-weight: 700;
              line-height: 1.2;
            }
            .barcode svg {
              width: 100%;
              height: auto;
              display: block;
            }
          </style>
        </head>
        <body>
          <main class="label">
            <div class="title">${escapeHtml(testName || "Lab Test")}</div>
            <div class="meta">
              <span>Patient: ${escapeHtml(patientName || "-")}</span>
              <span>Doctor: ${escapeHtml(doctorName || "-")}</span>
              <span>Test ID: ${escapeHtml(uniqueTestId || barcodeValue)}</span>
            </div>
            <div class="barcode">${barcodeSvg}</div>
          </main>
          <script>
            window.addEventListener("load", function () {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    popup.document.close();
  } catch (err) {
    addToast({
      title: "Barcode print failed",
      description:
        err instanceof Error ? err.message : "Could not prepare barcode label.",
      color: "danger",
    });
  }
}
