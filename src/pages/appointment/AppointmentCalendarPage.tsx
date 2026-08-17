import { addToast } from "@heroui/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { useGetClinicAppointmentsQuery } from "../../redux/api/appointmentApi";
import AppointmentCalendarView, { type CalEvent } from "./AppointmentCalendarView";
/* ---------------- Types (minimal from your backend) ---------------- */

type ApiPatient = {
  id: string;
  name: string;
  mobile: string | null;
  profileImage: string | null;
  appointment: {
    id: string;
    appointmentDate: string; // ISO
    appointmentTime: string; // "HH:mm"
    appointmentType: string;
    appointmentStatus: string; // "Confirmed" | "Pending" ...
  };
  doctor: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    profileImage: string | null;
  };
};

/* ---------------- date helpers ---------------- */

const toYmd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Monday start (Mon-Sun like your screenshot)
const startOfWeekMonday = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun, 1 Mon...
  const diff = day === 0 ? -6 : 1 - day; // if Sunday, go back 6 days
  x.setDate(x.getDate() + diff);
  return x;
};

const buildWeekDays = (weekStart: Date) =>
  Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

/* ---------------- backend -> CalEvent mapping ----------------
   IMPORTANT: use date part from appointmentDate + appointmentTime
   so timezone shift doesn't move day wrongly.
-------------------------------------------------------------- */

const patientsToEventsByDay = (
  patients: ApiPatient[],
  weekDays: Date[],
  selectedDoctorId?: string | null
): { date: string; items: CalEvent[] }[] => {
  const map = new Map<string, CalEvent[]>();

  for (const p of patients || []) {
    if (selectedDoctorId && p?.doctor?.id !== selectedDoctorId) continue;

    const ap = p?.appointment;
    if (!ap?.id || !ap?.appointmentDate) continue;

    const datePart = ap.appointmentDate.slice(0, 10); // "YYYY-MM-DD"
    const timePart = ap.appointmentTime || "00:00"; // "HH:mm"
    const start = new Date(`${datePart}T${timePart}:00`); // local time
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins default

    const key = toYmd(start);

    const ev: CalEvent = {
      id: ap.id,
      title: p?.name || "Patient",
      start,
      end,
      status: (ap.appointmentStatus || "").toLowerCase(), // confirmed/pending
      doctorName: p?.doctor?.name || "",
      doctorId: p?.doctor?.id,
      avatarUrl: p?.profileImage ?? null,
      patientMobile: p?.mobile ?? null,
      appointmentNotes: ap?.appointmentType ?? null,
    };

    map.set(key, [...(map.get(key) || []), ev]);
  }

  return weekDays.map((d) => {
    const key = toYmd(d);
    const items = (map.get(key) || []).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
    return { date: key, items };
  });
};

/* ---------------- Page ---------------- */

export default function AppointmentCalendarPage() {
  const navigate = useNavigate();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeekMonday(new Date())
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  const weekDays = useMemo(() => buildWeekDays(currentWeekStart), [currentWeekStart]);

  // calendar range
  const startDate = useMemo(() => toYmd(weekDays[0]), [weekDays]);
  const endDate = useMemo(() => toYmd(weekDays[6]), [weekDays]);

  // grid setup (change if you want)
  const minHour = 10;          // starts 10:00 AM
  const totalHours = 9;        // 10 AM to 7 PM
  const hours = useMemo(
    () => Array.from({ length: totalHours }).map((_, i) => minHour + i),
    []
  );
  const slotHeight = 68;

  // ✅ RTK call (your endpoint supports startDate/endDate/doctorId)
  const { data, isLoading } = useGetClinicAppointmentsQuery({
    pageNumber: 1,
    pageSize: 500,
    startDate,
    endDate,
    ...(selectedDoctorId ? { doctorId: selectedDoctorId } : {}),
  });

  const patients = (data?.result?.patients || []) as unknown as ApiPatient[];

  // Doctors list (created from same response)
  const doctors = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string | null }>();
    for (const p of patients) {
      const d = p?.doctor;
      if (!d?.id) continue;
      if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.name, email: d.email });
    }
    return Array.from(map.values());
  }, [patients]);

  // ✅ eventsByDay (THIS is where your mapping code is used)
  const eventsByDay = useMemo(
    () => patientsToEventsByDay(patients, weekDays, selectedDoctorId),
    [patients, weekDays, selectedDoctorId]
  );

  // current red timeline
  const currentTimeLine = useMemo(() => {
    const now = new Date();
    const todayKey = toYmd(now);
    const dayIdx = weekDays.findIndex((d) => toYmd(d) === todayKey);
    if (dayIdx === -1) return null;

    const minsFromStart = (now.getHours() - minHour) * 60 + now.getMinutes();
    if (minsFromStart < 0) return null;

    const top = (minsFromStart / 30) * slotHeight;
    const maxTop = hours.length * 2 * slotHeight;
    if (top > maxTop) return null;

    return { top, dayIdx };
  }, [weekDays, minHour, slotHeight, hours.length]);

  /* ---------------- handlers ---------------- */

  const goPrevWeek = () => {
    setCurrentWeekStart((s) => addDays(s, -7));
  };

  const goNextWeek = () => {
    setCurrentWeekStart((s) => addDays(s, 7));
  };

  const onTodayDay = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentWeekStart(startOfWeekMonday(today));
  };

  const onJumpToDate = (d: Date) => {
    setSelectedDate(d);
    setCurrentWeekStart(startOfWeekMonday(d));
  };

  const onDoctorClick = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
  };

  const handleSlotClick = (date: string, hour: number, minute: number) => {
    // you can change route according to your project
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    addToast({
      title: "Slot selected",
      description: `${date} ${hh}:${mm}`,
      color: "primary",
    });
    // example navigation:
    // navigate(`/appointments/new?date=${date}&time=${hh}:${mm}`);
  };

  const handleDoctorSlotClick = (
    date: string,
    hour: number,
    minute: number,
    doctorId: string
  ) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    addToast({
      title: "Doctor slot selected",
      description: `${date} ${hh}:${mm} (doctor: ${doctorId})`,
      color: "primary",
    });
    // example navigation:
    // navigate(`/appointments/new?date=${date}&time=${hh}:${mm}&doctorId=${doctorId}`);
  };

  const goToDetails = (id: string) => {
    // change route if needed
    navigate(`/appointments/${id}`);
  };

  return (
    <div className="p-3">
      {isLoading ? (
        <div className="text-sm text-slate-500">Loading calendar...</div>
      ) : (
        <AppointmentCalendarView
          goPrevWeek={goPrevWeek}
          goNextWeek={goNextWeek}
          currentWeekStart={currentWeekStart}
          weekDays={weekDays}
          hours={hours}
          minHour={minHour}
          slotHeight={slotHeight}
          eventsByDay={eventsByDay}
          currentTimeLine={currentTimeLine}
          handleSlotClick={handleSlotClick}
          handleDoctorSlotClick={handleDoctorSlotClick}
          goToDetails={goToDetails}
          doctorAvailability={[]}
          isAdminOrReception={true} // if you want role-based, replace this later
          doctors={doctors}
          selectedDoctorId={selectedDoctorId}
          onDoctorClick={onDoctorClick}
          selectedDate={selectedDate}
          onJumpToDate={onJumpToDate}
          onTodayDay={onTodayDay}
        />
      )}
    </div>
  );
}
