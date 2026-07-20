import { Avatar, Card, CardBody, Tab, Tabs, Spinner } from "@heroui/react";
import React, { useMemo, useState } from "react";
import { FiClock, FiFileText, FiMapPin } from "react-icons/fi";
import { Link } from "react-router";
import AppButton from "../../components/shared/AppButton";
import SearchField from "../../components/shared/SearchField";
import StatusChip from "../../components/shared/StatusChip";
import { useGetUserAppointmentsQuery } from "../../redux/api/appointmentApi";
import { usePatientAppointmentRealtime } from "../../hooks/usePatientAppointmentRealtime";
import { formatDurationLabel } from "./new-appointment/helpers/dateTimeHelpers";

type TabKey = "upcoming" | "completed" | "cancelled";
const isTabKey = (k: React.Key): k is TabKey =>
  k === "upcoming" || k === "completed" || k === "cancelled";

/* ─── Helpers ─── */

const formatDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
};

const formatTime = (time: string | null | undefined): string => {
  if (!time) return "—";
  const clean = time.slice(0, 5); // "HH:MM"
  try {
    const [h, m] = clean.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
  } catch {
    return time;
  }
};

const isToday = (isoDate: string | null | undefined): boolean => {
  if (!isoDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return isoDate.slice(0, 10) === today;
};

const statusToTab = (status: string): TabKey => {
  const s = status.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "noshow") return "cancelled";
  return "upcoming";
};

/* ─── Components ─── */

const EstimatedWaitBadge: React.FC<{ minutes: number; appointmentDate?: string }> = ({
  minutes,
  appointmentDate,
}) => {
  if (!isToday(appointmentDate)) return null;
  if (minutes <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 dark:bg-teal-900/20">
      <FiClock className="text-teal-600 dark:text-teal-400" size={14} />
      <span className="text-[12px] font-semibold text-teal-700 dark:text-teal-300">
        Est. wait: ~{formatDurationLabel(minutes)}
      </span>
    </div>
  );
};

const AppointmentCard: React.FC<{
  appointment: any;
  estimatedWait?: number;
}> = ({ appointment, estimatedWait }) => {
  const doctor = appointment.doctor;
  const appt = appointment.appointment;

  const displayTime = appt?.appointmentTime
    ? formatTime(appt.appointmentTime)
    : "—";
  const displayDate = appt?.appointmentDate
    ? formatDate(appt.appointmentDate)
    : "—";

  return (
    <Card shadow="none" className="rounded-2xl border border-black/10 dark:border-[#273244]">
      <CardBody className="p-4 md:p-5">
        <div className="grid items-start gap-4 md:grid-cols-3">
          {/* Doctor & Patient info */}
          <div className="md:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Doctor tile */}
              <div className="rounded-2xl border border-black/10 p-4 dark:border-[#273244]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={doctor?.profileImage || ""}
                    name={doctor?.name || "Doctor"}
                    radius="full"
                    size="sm"
                    className="bg-slate-100 text-slate-700"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {doctor?.name ? `Dr. ${doctor.name}` : "Doctor"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {doctor?.speciality || "General"}
                    </div>
                  </div>
                </div>
                <div className="my-3 h-px bg-gray-200 dark:bg-[#273244]" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-white">
                      {doctor?.mobile || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Phone Number
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-white">
                      {doctor?.alternateMobile || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Alternate Number
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient tile */}
              <div className="rounded-2xl border border-black/10 p-4 dark:border-[#273244]">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={appointment.profileImage || ""}
                    name={appointment.name || "Patient"}
                    radius="full"
                    size="sm"
                    className="bg-emerald-50 text-emerald-700"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {appointment.name || "Patient"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {appointment.id ? `ID: ${appointment.id.slice(0, 8)}` : "—"}
                    </div>
                  </div>
                </div>
                <div className="my-3 h-px bg-gray-200 dark:bg-[#273244]" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-white">
                      {displayDate}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Date
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-white">
                      {displayTime}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Time
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right meta */}
          <div className="flex flex-col justify-between gap-4 md:gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <FiMapPin />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white">
                    {appointment.address || appointment.city || "—"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Clinic Address
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <FiFileText />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-white">
                    {appt?.appointmentType || "Consultation"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Appointment Type
                  </div>
                </div>
              </div>

              <StatusChip status={appt?.appointmentStatus || "Upcoming"} />

              {/* Estimated wait time badge */}
              {typeof estimatedWait === "number" && estimatedWait > 0 && (
                <EstimatedWaitBadge
                  minutes={estimatedWait}
                  appointmentDate={appt?.appointmentDate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {appt?.appointmentNotes && (
          <div className="mt-5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              Additional Notes
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {appt.appointmentNotes}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const Pill = ({ label, count }: { label: string; count: number }) => (
  <span className="inline-flex items-center gap-2 whitespace-nowrap leading-none">
    {label}
    <span className="opacity-80">({String(count).padStart(2, "0")})</span>
  </span>
);

/* ─── Main Component ─── */

const PatientAppointment: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [search, setSearch] = useState("");
  const pageSize = 50;

  // Fetch patient appointments from API
  const { data: appointmentsData, isLoading, isFetching } =
    useGetUserAppointmentsQuery({
      page: 1,
      pageSize,
      search: search || undefined,
    });

  // Real-time updates (wait time, running late, appointment shifted)
  const { updates: realtimeUpdates } = usePatientAppointmentRealtime();

  // Parse the API response
  const allAppointments = useMemo(() => {
    const patients = appointmentsData?.result?.patients ?? [];
    return patients.map((p: any) => {
      const apptId = p.appointment?.id || p.id;
      const realtimeData = realtimeUpdates.get(apptId);

      // Merge realtime updates if available
      const appointment = { ...p };
      if (realtimeData) {
        if (realtimeData.status) {
          appointment.appointment = {
            ...appointment.appointment,
            appointmentStatus: realtimeData.status,
          };
        }
        if (realtimeData.appointmentTime) {
          appointment.appointment = {
            ...appointment.appointment,
            appointmentTime: realtimeData.appointmentTime,
          };
        }
      }

      return {
        ...appointment,
        _estimatedWait: realtimeData?.estimatedWaitMinutes ?? 0,
        _tab: statusToTab(appointment.appointment?.appointmentStatus || "Upcoming"),
      };
    });
  }, [appointmentsData, realtimeUpdates]);

  // Compute tab counts
  const counts = useMemo(() => {
    const c = { upcoming: 0, completed: 0, cancelled: 0 };
    allAppointments.forEach((a: any) => {
      c[a._tab as TabKey]++;
    });
    return c;
  }, [allAppointments]);

  // Filter by tab and search
  const filtered = useMemo(() => {
    let list = allAppointments.filter((a: any) => a._tab === tab);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((a: any) => {
        const hay = [
          a.name,
          a.doctor?.name,
          a.appointment?.appointmentType,
          a.city,
          a.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [allAppointments, tab, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Appointment List
        </h2>

        <Link to="/appointment/new/patient">
          <AppButton
            text="+ New Appointment"
            className="h-11 flex-1 bg-primary text-white hover:bg-primary-hover"
          />
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          aria-label="Appointment tabs"
          selectedKey={tab}
          onSelectionChange={(k) => {
            if (isTabKey(k)) setTab(k);
          }}
          radius="full"
          variant="solid"
          classNames={{
            tabList: "bg-transparent p-0 gap-4",
            cursor: "hidden",
            tab: [
              "h-10 rounded-full px-5",
              "border border-slate-300 bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
              "data-[hover=true]:bg-slate-50 dark:data-[hover=true]:bg-[#151e31]",
              "data-[selected=true]:bg-primary data-[selected=true]:text-white",
              "data-[selected=true]:border-transparent",
            ].join(" "),
            tabContent:
              "text-slate-700 group-data-[selected=true]:!text-white dark:text-white",
          }}
        >
          <Tab
            key="upcoming"
            title={<Pill label="Upcoming" count={counts.upcoming} />}
          />
          <Tab
            key="completed"
            title={<Pill label="Completed" count={counts.completed} />}
          />
          <Tab
            key="cancelled"
            title={<Pill label="Cancelled" count={counts.cancelled} />}
          />
        </Tabs>

        <div className="flex w-full items-center gap-3 md:w-auto">
          <SearchField
            placeholder="Search Doctor or Type"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            onClear={() => setSearch("")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading || isFetching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" color="primary" />
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((appt: any) => (
            <AppointmentCard
              key={appt.appointment?.id || appt.id}
              appointment={appt}
              estimatedWait={appt._estimatedWait}
            />
          ))
        ) : (
          <Card
            shadow="none"
            className="rounded-2xl border border-dashed border-black/10 dark:border-[#273244]"
          >
            <CardBody className="py-10 text-center text-slate-500 dark:text-slate-400">
              No {tab} appointments.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatientAppointment;
