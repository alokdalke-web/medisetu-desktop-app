// src/pages/report/PatientReport.tsx
import React from "react";
import { Card, CardBody, Button, Chip } from "@heroui/react";
import { FiDownload } from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa";

type Report = {
  id: string;
  title: string;
  date: string;
  fileName: string;
  fileSize: string;
  // url?: string; // optional if you later add download link
};

const reports: Report[] = [
  {
    id: "1",
    title: "Blood Test",
    date: "July 30, 2025",
    fileName: "Reports.pdf",
    fileSize: "500 KB",
  },
  {
    id: "2",
    title: "Blood Test",
    date: "July 30, 2025",
    fileName: "Reports.pdf",
    fileSize: "500 KB",
  },
];

const FilePill: React.FC<{ name: string; size: string }> = ({ name, size }) => (
  <div className="inline-flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-600">
      <FaFilePdf />
    </span>
    <div className="leading-tight">
      <div className="text-xs font-medium text-slate-900">{name}</div>
      <div className="text-[10px] text-slate-500">{size}</div>
    </div>
  </div>
);

const PatientReport: React.FC = () => {
  const handleDownload = (_r: Report) => {
    // later you can do:
    // if (_r.url) window.open(_r.url, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card radius="lg" className="border border-black/10 bg-white shadow-sm">
        <CardBody className="p-0">
          {reports.map((r, idx) => (
            <div
              key={r.id}
              className={[
                "flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center",
                idx !== reports.length - 1 ? "border-b border-gray-200" : "",
              ].join(" ")}
            >
              {/* Title */}
              <div className="min-w-0 md:w-64">
                <div className="text-[15px] font-semibold text-slate-900">
                  {r.title}
                </div>
                <Chip size="sm" variant="flat" color="default" className="mt-1 w-fit">
                  Report
                </Chip>
              </div>

              {/* Date */}
              <div className="min-w-0 md:w-60">
                <div className="text-sm font-medium text-slate-900">{r.date}</div>
                <div className="mt-1 text-xs text-slate-500">Date</div>
              </div>

              {/* File chip */}
              <div className="min-w-0 md:flex-1">
                <FilePill name={r.fileName} size={r.fileSize} />
              </div>

              {/* Download button */}
              <div className="md:w-44 md:text-right">
                <Button
                  radius="full"
                  variant="bordered"
                  className="border-gray-300 text-slate-700"
                  startContent={<FiDownload />}
                  onPress={() => handleDownload(r)}
                  aria-label={`Download ${r.title}`}
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
};

export default PatientReport;
