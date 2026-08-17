
// src/components/shared/RightSidebar.tsx
import React, { useMemo } from "react";
import { Avatar, Card, CardBody } from "@heroui/react";
import { FiChevronRight, FiCalendar } from "react-icons/fi";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

import { useGetDashboardQuery } from "../../redux/api/dashboardApi";
import { useGetUserQuery } from "../../redux/api/authApi";
import { useGetClinicAppointmentsQuery } from "../../redux/api/appointmentApi";
import { formatDate, formatTime } from "../../utils";

ChartJS.register(ArcElement, Tooltip, Legend);

type RightSidebarProps = {
  variant?: "desktop" | "drawer";
  className?: string;
};

type ApiAppointment = {
  id?: string | number | null;
  appointmentStatus?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentType?: string | null;
};

type ApiPatient = {
  id?: string | number | null;
  name?: string | null;
  profileImage?: string | null;
  appointment?: ApiAppointment | null;
};

type Row = {
  id: string;
  name: string;
  avatar: string | null;
  type: string;
  status: string;
  date: string;
  time: string;
  dtMs: number | null;
};

const mapFromAPI = (p: ApiPatient): Row => {
  const appt = p?.appointment ?? {};
  const rawId = String(appt?.id ?? p?.id ?? "").trim();
  const dtMs = appt?.appointmentDate ? Date.parse(appt.appointmentDate) : null;

  return {
    id: rawId || "—",
    name: p?.name ?? "Unknown",
    avatar: p?.profileImage ?? null,
    type: appt?.appointmentType ?? "—",
    status: String(appt?.appointmentStatus ?? "—").trim(),
    date: formatDate(appt?.appointmentDate ?? ""),
    time: formatTime(appt?.appointmentTime ?? ""),
    dtMs: Number.isNaN(dtMs ?? NaN) ? null : dtMs,
  };
};

const RightSidebar: React.FC<RightSidebarProps> = ({
  variant = "desktop",
  className = "",
}) => {
  const Tag: "aside" | "div" = variant === "desktop" ? "aside" : "div";

  const wrapperClasses =
    variant === "desktop"
      ? "hidden lg:block w-80 shrink-0 sticky top-0 h-screen overflow-y-auto border border-border-color bg-white"
      : "h-full w-full overflow-y-auto bg-white";

  const { data: user } = useGetUserQuery();
  const { data: dashboard } = useGetDashboardQuery();

  // ✅ FIX: GetAppointmentsArgs me "page" nahi hai, usually "currentPage" hota hai
  const { data: apptData, isFetching: apptLoading } =
    useGetClinicAppointmentsQuery({
      currentPage: 1,
      pageSize: 20,
    });

  const rows: Row[] = useMemo(() => {
    // API shape tolerant (patients list expected here)
    const patients: ApiPatient[] = (apptData as any)?.result?.patients ?? [];
    return patients.map(mapFromAPI);
  }, [apptData]);

  const upcoming = useMemo(
    () =>
      rows
        .filter((r) => r.status.trim().toLowerCase() === "upcoming")
        .sort((a, b) => {
          const aT = a.dtMs ?? Number.POSITIVE_INFINITY;
          const bT = b.dtMs ?? Number.POSITIVE_INFINITY;
          return aT - bT;
        })
        .slice(0, 5),
    [rows]
  );

  const dateHeader = useMemo(() => {
    if (upcoming.length > 0) return upcoming[0].date;
    return "";
  }, [upcoming]);

  const dashboardResult = (dashboard as any)?.result;

  // Doughnut chart
  const doughnutData = useMemo(
    () => ({
      labels: ["Excellent", "Good", "Poor"],
      datasets: [
        {
          data: [60, 25, 15],
          backgroundColor: ["#0f766e", "#3b82f6", "#f59e0b"],
          borderWidth: 6,
          borderRadius: 8,
        },
      ],
    }),
    []
  );

  const doughnutOptions = useMemo(
    () => ({
      cutout: "75%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      responsive: true,
      maintainAspectRatio: false,
    }),
    []
  );

  return (
    <Tag className={`${wrapperClasses} ${className}`}>
      <div className="py-6 px-1 space-y-6">
        <Card shadow="none" radius="none" className="border-b border-border-color">
          <CardBody className="py-6 px-1">
            <div className="grid place-items-center">
              <Avatar
                src={
                  (user as any)?.profileImage ??
                  "https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/1FA7A.svg"
                }
                className="h-20 w-20"
                radius="full"
              />
              <h3 className="mt-4 text-center font-semibold text-lg">
                {(user as any)?.name}
              </h3>
            </div>

            <div className="mt-6 flex divide-x divide-gray-300">
              <div className="flex-1 text-center">
                <div className="text-sm text-secondary">Appointment</div>
                <div className="mt-1 text-xl font-semibold">
                  {dashboardResult?.totalAppointmentsCount ?? "—"}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-sm text-secondary">Total Patients</div>
                <div className="mt-1 text-xl font-semibold">
                  {dashboardResult?.totalPatientsCount ?? "—"}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="text-sm text-secondary">Rate</div>
                <div className="mt-1 text-xl font-semibold">4.8</div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card shadow="none" radius="none" className="border-b border-border-color">
          <CardBody className="p-6">
            <h4 className="font-semibold">Upcoming Appointments</h4>

            {apptLoading ? (
              <div className="mt-4 text-sm text-secondary">Loading appointments…</div>
            ) : upcoming.length > 0 ? (
              <>
                {dateHeader && (
                  <div className="mt-4 flex items-center gap-3 text-primary">
                    {dateHeader}
                    <div className="h-px flex-1 bg-primary" />
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  {upcoming.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 border-b border-border-color pb-4 last:border-b-0"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-secondary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs text-secondary">
                          <span>{a.time || "—"}</span>
                          <FiChevronRight className="text-secondary" />
                        </div>
                        <div className="mt-2 font-medium">{a.name}</div>
                        <div className="text-xs text-secondary">
                          {a.type} • {a.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gradient-to-br from-white to-slate-50 p-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                  <FiCalendar className="h-6 w-6 text-slate-500" />
                </div>
                <div className="mt-3 text-base font-semibold text-slate-800">
                  No upcoming appointments
                </div>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-slate-500">
                  You’re all caught up. New appointments marked as{" "}
                  <span className="font-medium">“Upcoming”</span> will appear here.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card shadow="none" radius="none" className="border-b border-border-color">
          <CardBody className="p-6">
            <h4 className="mb-4 font-semibold">Patient Satisfaction</h4>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <div className="text-xs text-secondary">Total</div>
                    <div className="text-2xl font-bold text-primary">45,251</div>
                  </div>
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-emerald-700" />
                  Excellent
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-blue-500" />
                  Good
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-amber-500" />
                  Poor
                </li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </Tag>
  );
};

export default RightSidebar;
