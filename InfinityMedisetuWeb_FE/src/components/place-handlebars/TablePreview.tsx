import React from "react";

import { VitalsTableOrientation } from "./types";

interface TablePreviewProps {
  tablePreview: { headers: string[]; row: string[] };
  compact?: boolean;
  orientation?: VitalsTableOrientation;
  fontSizePx?: number;
  forceLight?: boolean;
}

export const TablePreview: React.FC<TablePreviewProps> = ({
  tablePreview,
  compact = false,
  orientation = "horizontal",
  fontSizePx,
  forceLight = false,
}) => {
  const textClass = compact ? "text-[8px]" : "text-[10px]";
  const tableStyle = fontSizePx ? { fontSize: `${fontSizePx}px` } : undefined;

  const bgContent = forceLight ? "bg-transparent text-black" : "bg-content1";
  const bgHeader = forceLight ? "bg-black/10 text-black" : "bg-default-100";
  const borderOuter = forceLight ? "border-black/20" : "border-default-300";
  const borderInner = forceLight ? "border-black/10" : "border-default-200";

  if (orientation === "vertical") {
    return (
      <div
        className={`overflow-hidden rounded border ${borderOuter} ${bgContent}`}
      >
        <table
          className={`w-full border-collapse ${textClass}`}
          style={tableStyle}
        >
          <thead className={bgHeader}>
            <tr>
              <th
                className={`border-b ${borderOuter} px-1 py-1 text-left font-semibold`}
              >
                Vital
              </th>
              <th
                className={`border-b ${borderOuter} px-1 py-1 text-left font-semibold`}
              >
                Reading
              </th>
            </tr>
          </thead>
          <tbody>
            {tablePreview.headers.map((header, index) => (
              <tr key={`${header}-${index}`}>
                <td className={`border-b ${borderInner} px-1 py-1 font-medium`}>
                  {header}
                </td>
                <td className={`border-b ${borderInner} px-1 py-1`}>
                  {tablePreview.row[index] ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded border ${borderOuter} ${bgContent}`}
    >
      <table
        className={`w-full border-collapse ${textClass}`}
        style={tableStyle}
      >
        <thead className={bgHeader}>
          <tr>
            {tablePreview.headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className={`border-b ${borderOuter} px-1 py-1 text-left font-semibold`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {tablePreview.row.map((cell, index) => (
              <td
                key={`${cell}-${index}`}
                className={`border-b ${borderInner} px-1 py-1`}
              >
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
