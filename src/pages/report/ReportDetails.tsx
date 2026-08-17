// pages/report/ReportDetails.tsx
import React from "react";
import { useParams, useLocation } from "react-router"; // ✅ correct package
import {
  FiChevronRight,
  FiPhone,
  FiMail,
  FiFileText,
  FiTrash2,
  FiDownload,
  FiShare2,
  FiUpload,
} from "react-icons/fi";
import { Card, CardBody, Button, Avatar } from "@heroui/react";
import AppButton from "../../components/shared/AppButton";

/* ---- type-safe guard for location.state ---- */
type ReportLocationState = { id?: string };
const hasReportState = (v: unknown): v is ReportLocationState =>
  !!v && typeof v === "object" && "id" in (v as Record<string, unknown>);

const ReportDetails: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();

  const stateId = hasReportState(location.state)
    ? location.state.id
    : undefined;

  const reconstructed = id.startsWith("details-")
    ? `R#${id.replace("details-", "")}`
    : decodeURIComponent(id);

  const displayId = stateId ?? reconstructed;

  // ---- Demo data (swap with API) ----
  const patient = {
    name: "Rajesh Kumar",
    age: 35,
    gender: "Male",
    avatar: "", // fallback used below
    patientId: "#PT1025",
    contact: "+91 9876543210",
    email: "rajeshkumar@example.com",
  };

  const reports = [
    {
      title: "Blood Test",
      date: "July 30, 2025",
      file: { name: "Reports.pdf", size: "500 KB" },
    },
    {
      title: "Blood Test",
      date: "July 30, 2025",
      file: { name: "Reports.pdf", size: "500 KB" },
    },
  ];
  // -----------------------------------

  const avatarSrc =
    patient.avatar || "https://i.pravatar.cc/100?u=report-patient-fallback";

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav
        className="mb-4 flex items-center gap-2 text-sm text-slate-500"
        aria-label="Breadcrumb"
      >
        <span>Report</span>
        <FiChevronRight className="opacity-60" aria-hidden />
        <span className="font-medium text-teal-700">Report Details</span>
      </nav>

      <div className="space-y-5">
        {/* Patient Information */}
        <Card
          shadow="none"
          radius="lg"
          className="border border-gray-200 bg-white"
        >
          <CardBody className="p-0">
            <div className="px-5 pt-4">
              <h2 className="text-[15px] font-semibold">Patient Information</h2>
            </div>
            <hr className="mt-3 border-t border-gray-200" />
            <div className="p-5">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                {/* Left: avatar + name */}
                <div className="flex items-center gap-4">
                  <Avatar src={avatarSrc} radius="full" />
                  <div>
                    <div className="text-base font-semibold">
                      {patient.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {patient.age} yrs, {patient.gender}
                    </div>
                  </div>
                </div>

                {/* Right: 3 columns */}
                <div className="grid w-full gap-4 md:w-auto md:grid-cols-3">
                  <div>
                    <div className="text-xs text-slate-500">Patient ID</div>
                    <div className="font-medium text-teal-700">
                      {patient.patientId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Contact</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <FiPhone className="opacity-60" />
                      <span>{patient.contact}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Email</div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <FiMail className="opacity-60" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Reports / Documents */}
        <Card
          shadow="none"
          radius="lg"
          className="border border-gray-200 bg-white"
        >
          <CardBody className="p-0">
            <div className="px-5 pt-4">
              <h2 className="text-[15px] font-semibold">Reports/Documents</h2>
            </div>
            <hr className="mt-3 border-t border-gray-200" />
            <div className="p-5">
              <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                {reports.map((r, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-start justify-between gap-4 md:flex-row md:items-center ${
                      idx !== reports.length - 1
                        ? "pb-4 md:pb-3 border-b border-gray-200"
                        : ""
                    }`}
                  >
                    {/* Report title */}
                    <div className="w-full md:w-1/4">
                      <div className="text-xs text-slate-500">Report</div>
                      <div className="mt-1 font-medium">{r.title}</div>
                    </div>

                    {/* Date */}
                    <div className="w-full md:w-1/4">
                      <div className="text-xs text-slate-500">Date</div>
                      <div className="mt-1 font-medium">{r.date}</div>
                    </div>

                    {/* File chip */}
                    <div className="w-full md:w-1/4">
                      <div className="text-xs text-slate-500">File</div>
                      <div className="mt-1 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-rose-100 text-rose-600">
                          <FiFileText className="h-4 w-4" />
                        </span>
                        <div className="leading-tight">
                          <div className="text-sm font-medium">
                            {r.file.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {r.file.size}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full items-center gap-2 md:w-1/4 md:justify-end">
                      <Button
                        variant="bordered"
                        radius="full"
                        className="border-gray-300 text-slate-700"
                        startContent={<FiTrash2 className="h-4 w-4" />}
                        size="sm"
                      >
                        Delete
                      </Button>
                      <Button
                        variant="bordered"
                        radius="full"
                        className="border-gray-300 text-slate-700"
                        startContent={<FiDownload className="h-4 w-4" />}
                        size="sm"
                      >
                        Download
                      </Button>
                      <Button
                        variant="bordered"
                        radius="full"
                        className="border-gray-300 text-slate-700"
                        startContent={<FiShare2 className="h-4 w-4" />}
                        size="sm"
                      >
                        Share
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Upload new report button */}
                <div>
                  
                  <AppButton text="Upload New Report"
                  startContent={<FiUpload className="h-4 w-4" />} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* keep ID accessible to avoid unused warnings and help a11y */}
        <span className="sr-only">Report ID: {displayId}</span>
      </div>
    </div>
  );
};

export default ReportDetails;
