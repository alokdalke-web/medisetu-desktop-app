// src/pages/patient/PatientDetails.tsx
import type { ChipProps } from "@heroui/react";
import { Avatar, Button, Card, CardBody, Chip, Tab, Tabs } from "@heroui/react";
import React from "react";
import { FiChevronRight, FiEdit2, FiMapPin } from "react-icons/fi";
import {
  generatePath,
  Link,
  useNavigate,
  useParams,
} from "react-router";

import AppButton from "../../components/shared/AppButton";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetPatientByIdQuery, useGetReportCardsByPatientIdQuery } from "../../redux/api/patientApi";
import PrescriptionsHistory, {
  type ClinicSummary,
  type DoctorSummary,
  type PatientSummary,
  type PrescriptionHistoryItem as PrescriptionRow,
} from "./PrescriptionsHistory";

/* ---------- Config (change if your route differs) ---------- */
const APPT_VIEW_ROUTE = "/appointment/:id";

/* ---------- Types ---------- */

// ⬇️ Show status as-is from backend
type AStatus = string;
type PStatus = "Active";

type AppointmentRow = {
  id: string;
  dateRange: string;
  type: string;
  status: AStatus; // raw from API
  tokenNo: number,
  doctorName?: string;
  doctorSpeciality?: string;
};

type HistoryRow = {
  date: string;
  label: string;
  value?: string | null;
};

/* ---------- Chips ---------- */

// Map any status string to a color + label (fallback = default)
const getStatusStyle = (
  status?: string,
): { color: NonNullable<ChipProps["color"]>; dot: string; label: string } => {
  const v = (status ?? "").toLowerCase();
  if (v.includes("confirm"))
    return { color: "success", dot: "bg-emerald-400", label: "Confirmed" };
  if (v.includes("pending"))
    return { color: "warning", dot: "bg-amber-400", label: "Pending" };
  if (v.includes("complete") || v.includes("done"))
    return { color: "success", dot: "bg-emerald-400", label: "Completed" };
  if (v.includes("cancel"))
    return { color: "danger", dot: "bg-rose-400", label: "Cancelled" };
  if (v.includes("resched"))
    return { color: "secondary", dot: "bg-sky-400", label: "Rescheduled" };
  if (v.includes("noshow") || v.includes("no show"))
    return { color: "danger", dot: "bg-rose-400", label: "No Show" };
  if (v.includes("upcoming"))
    return { color: "warning", dot: "bg-amber-400", label: "Upcoming" };
  return { color: "default", dot: "bg-slate-400", label: status ?? "—" };
};

const StatusBadge: React.FC<{ status?: AStatus }> = ({ status }) => {
  const s = getStatusStyle(status);
  return (
    <Chip
      size="sm"
      variant="flat"
      color={s.color}
      className="gap-2"
      startContent={<span className={`h-2 w-2 rounded-full ${s.dot}`} />}
    >
      {s.label}
    </Chip>
  );
};

const ActiveBadge: React.FC<{ status?: PStatus }> = () => (
  <Chip
    size="sm"
    variant="flat"
    color="success"
    className="gap-2"
    startContent={<span className="h-2 w-2 rounded-full bg-emerald-400" />}
  >
    Active
  </Chip>
);

/* ---------- Helpers ---------- */

const shortId = (id?: string) => (id ? `#${String(id).slice(0, 6)}` : "—");

const to12h = (hhmm?: string) => {
  if (!hhmm) return "";
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const [, hh, mm] = m;
  const d = new Date();
  d.setHours(Number(hh), Number(mm), 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const fmtDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

const calcAgeFromDob = (dob?: string | Date) => {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age < 0 || age > 120 ? "—" : age;
};

/* ---------- Skeleton helpers ---------- */
const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />
);

const PatientInfoSkeleton = () => (
  <Card shadow="none" radius="lg" className="border border-gray-200 bg-white">
    <CardBody className="p-0">
      <div className="px-5 pt-4">
        <Skel className="h-4 w-48" />
      </div>
      <hr className="mt-3 border-t border-gray-200" />
      <div className="p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Skel className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skel className="h-4 w-44" />
                <Skel className="h-3 w-28" />
                <div className="mt-2 flex items-center gap-2">
                  <Skel className="h-6 w-20 rounded-full" />
                  <Skel className="h-8 w-20 rounded-full" />
                </div>
              </div>
            </div>

            <div className="grid w-full gap-4 md:w-auto md:grid-cols-5">
              <div />
              <div className="space-y-2">
                <Skel className="h-3 w-16" />
                <Skel className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skel className="h-3 w-32" />
                <Skel className="h-4 w-32" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Skel className="h-3 w-16" />
                <Skel className="h-4 w-56" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skel className="h-3 w-16" />
              <Skel className="h-4 w-full max-w-[520px]" />
            </div>
          </div>

          <div className="mt-2 space-y-2">
            <Skel className="h-3 w-40" />
            <Skel className="h-4 w-full max-w-[720px]" />
          </div>
        </div>
      </div>
    </CardBody>
  </Card>
);

const AppointmentRowSkeleton = () => (
  <div className="rounded-xl border border-gray-200 px-4 py-3">
    <div className="grid gap-6 md:grid-cols-4">
      <div className="space-y-2">
        <Skel className="h-3 w-20" />
        <Skel className="h-4 w-40" />
      </div>
      <div className="space-y-2">
        <Skel className="h-3 w-28" />
        <Skel className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <Skel className="h-3 w-12" />
        <Skel className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skel className="h-3 w-16" />
        <Skel className="h-4 w-44" />
      </div>
    </div>
  </div>
);

/* ---------- Static clinic info (edit as per your clinic) ---------- */

const DEFAULT_CLINIC: ClinicSummary = {
  name: "Care Clinic",
  addressLine1: "Near Axis Bank, Kothrud, Pune - 411038",
  addressLine2: "AM - 02:00 PM | Closed: Thursday",
  phone: "094223380390",
  timing: "Timing: 09:00 AM - 02:00 PM",
  logoUrl: "",
};

/* ========== Component ========== */

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const [patient, setPatient] = React.useState({
    name: "—",
    age: "—" as number | string,
    gender: "—",
    avatar: "",
    patientId: shortId(id),
    contact: "—",
    altContact: "—",
    isLinkedNumber: false,
    email: "—",
    address: "—",
    assignedDoctor: "—",
    notes: "—",
    bloodGroup: "—",
    height: "—",
    weight: "—",
    allergies: "—",
    chronicConditions: "—",
    createdAt: "—",
    lastVisit: "—",
    totalAppointments: "—" as number | string,
    totalPaidPayments: "—" as number | string,
    totalReports: "—" as number | string,
  });

  const [patientSummary, setPatientSummary] = React.useState<
    PatientSummary | undefined
  >();
  const [doctorSummary, setDoctorSummary] = React.useState<
    DoctorSummary | undefined
  >();

  const [tab, setTab] = React.useState<
    "appointments" | "prescriptions" | "medical-records" | "billing" | "add-notes"
  >("appointments");

  const [appointments, setAppointments] = React.useState<AppointmentRow[]>([]);
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionRow[]>(
    [],
  );
  const [_history, setHistory] = React.useState<HistoryRow[]>([]);

  /* ---------- Current logged-in doctor details ---------- */
  const { data: authUser } = useGetUserQuery(undefined);

  React.useEffect(() => {
    if (!authUser) return;
    const raw: any = (authUser as any).result ?? authUser;

    setDoctorSummary({
      id: raw.id ?? raw._id,
      name: raw.name ?? raw.fullName ?? null,
      speciality: raw.speciality ?? null,
      qualification: raw.qualification ?? null,
      licenseNumber: raw.licenseNumber ?? null,
      mobile: raw.mobile ?? raw.phone ?? null,
      email: raw.email ?? null,
    });
  }, [authUser]);

  /* ---------- 1. Fetch patient core details (RTK Query) ---------- */
  const { data: rawPatientData, isLoading: isPatientLoading } =
    useGetPatientByIdQuery(id, { skip: !id });

  const loadingPatient = isPatientLoading;

  React.useEffect(() => {
    if (!rawPatientData) return;

    const anyRes: any = rawPatientData;
    const result = anyRes?.result ?? anyRes;
    const p = result?.patient ?? result;

    const pid = p?.id ?? p?._id ?? id;
    const name = p?.name ?? p?.fullName ?? "—";
    const ageDisplay =
      typeof p?.age === "number" ? p.age : calcAgeFromDob(p?.dob);
    const gender = p?.gender ?? "—";

    const avatar =
      p?.profileImage ||
      (name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=EEE&color=444`
        : "");

    const address = [p?.address, p?.city, p?.state, p?.zipCode, p?.country]
      .filter(Boolean)
      .join(", ");

    const notes = p?.notesMedicalHistory ?? p?.notes ?? "—";

    const assignedDoctor =
      p?.assignedDoctorName ??
      p?.doctorName ??
      result?.assignedDoctor?.name ??
      result?.doctor?.name ??
      "—";

    setPatient({
      name,
      age: ageDisplay,
      gender,
      avatar,
      patientId: shortId(String(pid)),
      contact: p?.mobile ?? p?.phone ?? p?.linkedNumber ?? "—",
      altContact: p?.alternateMobile ?? p?.altPhone ?? "—",
      isLinkedNumber: !p?.mobile && !!p?.linkedNumber,
      email: p?.email ?? "—",
      address: address || "—",
      assignedDoctor,
      notes,
      bloodGroup: p?.bloodGroup ?? "—",
      height: p?.height ?? "—",
      weight: p?.weight ?? "—",
      allergies: Array.isArray(p?.allergies)
        ? p.allergies.join(", ") || "—"
        : p?.allergies ?? "—",
      chronicConditions: Array.isArray(p?.chronicConditions)
        ? p.chronicConditions.join(", ") || "—"
        : p?.chronicConditions ?? "—",
      createdAt: p?.createdAt ? fmtDate(p.createdAt) : "—",
      lastVisit: p?.lastVisit ? fmtDate(p.lastVisit) : "—",
      totalAppointments: p?.totalAppointments ?? "—",
      totalPaidPayments: p?.totalPaidPayments ?? "—",
      totalReports: p?.totalReports ?? "—",
    });

    setPatientSummary({
      id: pid,
      patientId: p?.patientId ?? p?.patientCode ?? null,
      name,
      age: typeof p?.age === "number" ? p.age : null,
      gender: p?.gender ?? null,
      mobile: p?.mobile ?? p?.phone ?? p?.linkedNumber ?? null,
      email: p?.email ?? null,
      address: address || null,
    });
  }, [rawPatientData, id]);

  /* ---------- 2. Report cards via RTK ---------- */
  const currentType =
    tab === "appointments"
      ? "Appointments"
      : tab === "prescriptions"
        ? "Prescriptions"
        : "Medcial history"; // (backend spelling)

  const { data: reportCardsRes, isLoading: isReportsLoading } =
    useGetReportCardsByPatientIdQuery(
      {
        patientId: id,
        pageNumber: 1,
        pageSize: 10,
        typeOfPaginations: currentType,
      },
      { skip: !id },
    );

  React.useEffect(() => {
    if (!reportCardsRes) return;

    const anyRes: any = reportCardsRes;
    const result = anyRes.result ?? anyRes;

    // Appointments tab
    if (currentType === "Appointments") {
      const raw = Array.isArray(result.appointments) ? result.appointments : [];

      const mapped: AppointmentRow[] = raw.map((a: any) => {
        const id = String(a.id ?? a._id ?? "");
        const date = fmtDate(a.appointmentDate ?? a.date ?? a.createdAt);
        const time = to12h(a.appointmentTime ?? a.time);
        const type = a.appointmentType ?? "Consultation";
        const status = String(a.appointmentStatus ?? a.status ?? "—");
        const tokenNo = a?.tokenNo;
        const dateRange = date 
        ? tokenNo 
          ? `${date} (Token: ${tokenNo})` 
          : time 
            ? `${date} (Time: ${time})` 
            : date
        : "—";

        return {
          id,
          dateRange,
          type,
          status,
          tokenNo,
          doctorName: a.doctor?.name ?? "—",
          doctorSpeciality: a.doctor?.speciality ?? "—",
        };
      });

      setAppointments(mapped);
      return;
    }

    // Prescriptions tab
    if (currentType === "Prescriptions") {
      const raw = Array.isArray(result.prescriptions)
        ? result.prescriptions
        : [];

      const mapped: PrescriptionRow[] = raw.map(
        (r: any): PrescriptionRow => ({
          id: r.id,
          appointmentId: r.appointmentId,
          date: r.appointmentDate
            ? new Date(r.appointmentDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "—",
          appointmentTime: r.appointmentTime ?? "",
          prescriptionPdf: r.prescriptionPdf ?? null,
          doctorName: r.doctorName ?? null,
          doctorSpeciality: r.doctorSpeciality ?? null,
        }),
      );

      setPrescriptions(mapped);
      return;
    }

    // Medical History tab
    const raw = Array.isArray(result.medicalHistories)
      ? result.medicalHistories
      : [];

    const mapped: HistoryRow[] = raw.map((h: any) => ({
      date: fmtDate(h.createdAt ?? h.followUpDate ?? h.date) || "—",
      label: h.finalDiagnosis ?? h.provisionalDiagnosis ?? "Medical History",
      value: h.clinicalNotes ?? h.systemExamination ?? h.advice ?? null,
    }));

    setHistory(mapped);
  }, [reportCardsRes, currentType]);

  /* ---------- Misc ---------- */
  const goToEdit = () =>
    navigate(generatePath("/patient/:id/edit", { id: id || "" }));

  const avatarSrc =
    patient.avatar || "https://i.pravatar.cc/100?u=patient-fallback";

  /* ========== JSX ========== */

  return (
    <div className="p-4">
      {/* Breadcrumbs */}
      <nav
        className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500"
        aria-label="Breadcrumb"
      >
        <Link
          to="/patients"
          className="hover:text-slate-900 hover:underline underline-offset-4"
        >
          Patients
        </Link>
        <FiChevronRight className="opacity-60" aria-hidden />

        {id ? (
          <span className="font-semibold text-teal-700">
            Patient Details
          </span>
        ) : (
          <span className="font-medium text-teal-700">Patient Details</span>
        )}
      </nav>

      <div className="space-y-3">
        {/* Patient Information (Skeleton) */}
        {loadingPatient ? (
          <PatientInfoSkeleton />
        ) : (
          <Card
            shadow="none"
            radius="lg"
            className="border border-gray-200 bg-white"
          >
            <CardBody className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                {/* Left: Avatar + Info */}
                <div className="flex flex-1 items-start gap-3">
                  {/* Avatar with initials */}
                  <Avatar
                    src={avatarSrc}
                    radius="full"
                    className="h-[56px] w-[56px] text-xl shrink-0"
                    showFallback
                    name={patient.name !== "—" ? patient.name : undefined}
                  />
                  <div className="flex flex-col gap-1">
                    {/* Name + Active badge */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {patient.name}
                      </h2>
                      <ActiveBadge />
                    </div>
                    {/* Demographics line */}
                    <p className="text-sm text-[#677294]">
                      {patient.age} yrs, {patient.gender} • Patient ID: {patient.patientId}
                    </p>
                    {/* Address */}
                    {patient.address && patient.address !== "—" && (
                      <div className="flex items-center gap-1.5">
                        <FiMapPin className="h-4 w-4 text-[#677294] shrink-0" />
                        <span className="text-sm text-[#677294]">
                          {patient.address}
                        </span>
                      </div>
                    )}
                    {/* Edit button */}
                    <div className="pt-1.5">
                      <Button
                        variant="bordered"
                        radius="full"
                        className="border-gray-300 text-slate-900 h-7 text-xs px-3"
                        startContent={<FiEdit2 className="h-3.5 w-3.5" />}
                        onPress={goToEdit}
                        size="sm"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right: Meta info (separated by border) */}
                <div className="border-t pt-3 lg:border-t-0 lg:border-l lg:border-black/10 lg:pt-0 lg:pl-6 lg:w-[420px] shrink-0">
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div>
                      <div className="text-xs text-[#677294]">Last Visit</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900">{patient.lastVisit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#677294]">Registered On</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900">{patient.createdAt}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#677294]">Contact</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900">
                        {patient.contact}
                        {patient.isLinkedNumber && (
                          <span className="ml-1.5 text-[10px] font-medium text-slate-400">(Linked)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#677294]">Alternate Contact</div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900">
                        {patient.altContact}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Total Appointments */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 shadow-sm">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{patient.totalAppointments}</div>
              <div className="mt-1 text-sm font-medium text-[#677294]">Total Appointments</div>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-emerald-500/10">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
          {/* Total Prescriptions */}
          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 shadow-sm">
            <div>
              <div className="text-2xl font-semibold text-slate-900">—</div>
              <div className="mt-1 text-sm font-medium text-[#677294]">Total Prescriptions</div>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-blue-500/10">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          {/* Total Paid Payments */}
          <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 shadow-sm">
            <div>
              <div className="text-2xl font-semibold text-slate-900">
                {patient.totalPaidPayments !== "—" ? `₹${Number(patient.totalPaidPayments).toLocaleString("en-IN")}` : "—"}
              </div>
              <div className="mt-1 text-sm font-medium text-[#677294]">Total Paid Payments</div>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-amber-500/10">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
          </div>
          {/* Total Reports */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 shadow-sm">
            <div>
              <div className="text-2xl font-semibold text-slate-900">{patient.totalReports}</div>
              <div className="mt-1 text-sm font-medium text-[#677294]">Total Reports</div>
            </div>
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-indigo-500/10">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabs + Patient Summary Row */}
        <div className="flex gap-4 items-start">
          {/* Tabs (main content) */}
          <Card
            shadow="none"
            radius="lg"
            className="flex-1 min-w-0 border border-gray-200 bg-white"
          >
          <CardBody className="p-0">
            <div className="px-5 pt-4">
              <Tabs
                selectedKey={tab}
                onSelectionChange={(k) =>
                  setTab(k as "appointments" | "prescriptions" | "medical-records" | "billing" | "add-notes")
                }
                classNames={{
                  tabList: "bg-transparent gap-0 p-0 border-b border-gray-200",
                  tab:
                    "h-[34px] px-4 text-[14px] font-normal whitespace-nowrap bg-transparent rounded-none " +
                    "data-[hover=true]:bg-transparent data-[selected=true]:font-medium " +
                    "data-[selected=true]:text-primary data-[selected=true]:border-b-2 data-[selected=true]:border-primary",
                  tabContent:
                    "text-[#677294] group-data-[selected=true]:!text-primary",
                  cursor: "hidden",
                }}
              >
                <Tab key="appointments" title="Appointments" />
                <Tab key="prescriptions" title="Prescription" />
                <Tab key="medical-records" title="Medical Records" />
                <Tab key="billing" title="Billing" />
                <Tab key="add-notes" title="Add Notes" />
              </Tabs>
            </div>

            <div className="p-5">
              {/* Appointments - Timeline View */}
              {tab === "appointments" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">
                      Appointment Timeline
                    </h2>
                    <Link to={`/appointment/new?patientId=${id}`}>
                      <AppButton
                        text="+ New Appointment"
                        size="sm"
                        className="h-10 !text-sm !font-bold bg-primary text-white hover:bg-primary-hover rounded-xl px-4"
                      />
                    </Link>
                  </div>

                  {isReportsLoading ? (
                    <div className="space-y-3">
                      <AppointmentRowSkeleton />
                      <AppointmentRowSkeleton />
                      <AppointmentRowSkeleton />
                    </div>
                  ) : (
                    <div className="relative">
                      {appointments.map((a, idx) => (
                        <div
                          key={a.id || a.dateRange}
                          className="flex gap-4 pb-10 last:pb-4"
                        >
                          {/* Timeline dot + line */}
                          <div className="relative flex flex-col items-center pt-1">
                            <div
                              className={`h-6 w-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                                a.status?.toLowerCase().includes("confirm") || a.status?.toLowerCase().includes("complete")
                                  ? "bg-emerald-500"
                                  : a.status?.toLowerCase().includes("pending")
                                    ? "bg-amber-400"
                                    : a.status?.toLowerCase().includes("cancel")
                                      ? "bg-rose-400"
                                      : "bg-slate-400"
                              }`}
                            >
                              {(a.status?.toLowerCase().includes("confirm") || a.status?.toLowerCase().includes("complete")) && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            {idx < appointments.length - 1 && (
                              <div className="absolute left-1/2 top-7 bottom-0 w-px -translate-x-1/2 bg-gray-200" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex flex-1 items-center justify-between min-w-0">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {a.dateRange}
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold text-slate-900">
                                  {a.doctorName}
                                </span>
                                {a.doctorSpeciality && a.doctorSpeciality !== "—" && (
                                  <span className="ml-1 text-xs text-[#677294]">
                                    ({a.doctorSpeciality})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <StatusBadge status={a.status} />
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    generatePath(APPT_VIEW_ROUTE, { id: a.id }),
                                  )
                                }
                                className="rounded-lg border border-black/10 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-gray-50 transition"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {appointments.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
                            <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-slate-700">No appointments found</p>
                          <p className="mt-1 text-xs text-[#677294]">Schedule a new appointment to get started</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Prescriptions */}
              {tab === "prescriptions" && (
                <PrescriptionsHistory
                  items={prescriptions}
                  loading={isReportsLoading}
                  patient={patientSummary}
                  doctor={doctorSummary}
                  clinic={DEFAULT_CLINIC}
                />
              )}

              {/* Medical Records - Coming Soon */}
              {tab === "medical-records" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 mb-3">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Medical Records</p>
                  <p className="mt-1 text-xs text-[#677294]">Coming soon — stay tuned</p>
                </div>
              )}

              {/* Billing - Coming Soon */}
              {tab === "billing" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 mb-3">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Billing</p>
                  <p className="mt-1 text-xs text-[#677294]">Coming soon — stay tuned</p>
                </div>
              )}

              {/* Add Notes - Coming Soon */}
              {tab === "add-notes" && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-slate-50/50 py-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 mb-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">Add Notes</p>
                  <p className="mt-1 text-xs text-[#677294]">Coming soon — stay tuned</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

          {/* Patient Summary + Quick Actions Sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-[310px] shrink-0">
            {/* Patient Summary */}
            <Card
              shadow="none"
              radius="lg"
              className="border border-gray-200 bg-white"
            >
              <CardBody className="p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-5">
                  Patient Summary
                </h3>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Age</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {patient.age !== "—" ? `${patient.age} Years` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Gender</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {patient.gender}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Blood Group</span>
                    <span className="text-sm font-semibold text-slate-900">{patient.bloodGroup}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Height / Weight</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {patient.height !== "—" || patient.weight !== "—"
                        ? `${patient.height !== "—" ? `${patient.height} cm` : "—"} / ${patient.weight !== "—" ? `${patient.weight} kg` : "—"}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Allergies</span>
                    <span className="text-sm font-semibold text-slate-900">{patient.allergies}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#677294]">Chronic Conditions</span>
                    <span className="text-sm font-semibold text-slate-900">{patient.chronicConditions}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card
              shadow="none"
              radius="lg"
              className="border border-gray-200 bg-white"
            >
              <CardBody className="p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={`/appointment/new?patientId=${id}`}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-5 px-3 hover:border-primary/30 hover:bg-primary/5 transition"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-slate-700 text-center">
                      New Appointment
                    </span>
                  </Link>
                  <Link
                    to="/patient/new"
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 py-5 px-3 hover:border-primary/30 hover:bg-primary/5 transition"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-slate-700 text-center">
                      Add Another Patient
                    </span>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientDetails;
