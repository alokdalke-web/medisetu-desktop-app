// pages/appointment/NewAppointment.tsx
import React, { useState } from "react";
import {
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiChevronDown,
} from "react-icons/fi";
import AppButton from "../../components/shared/AppButton";

const PatientNewAppointment: React.FC = () => {

  // demo form state (replace with your form lib or API later)
  const [patientName, setPatientName] = useState("Nimish Tiwari");
  const [patientId, setPatientId] = useState("#Pat12345");
  const [type, setType] = useState("Consultation");
  const [date, setDate] = useState("06/24/2025");
  const [time, setTime] = useState("10 AM - 11 AM");
  const [notes, setNotes] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: call your API here
  };

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <span>Appointment</span>
        <FiChevronRight className="opacity-60" />
        <span className="font-medium text-teal-700">New Appointment</span>
      </nav>

      {/* Outer Card */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-5"
      >
        <h1 className="mb-4 text-2xl font-semibold">New Appointment</h1>

        {/* Patient Details */}
        <section className="mb-5 rounded-xl border border-gray-200">
          <div className="px-5 pt-4">
            <h2 className="text-[15px] font-semibold">Patient Details</h2>
          </div>
          <hr className="mt-3 border-t border-gray-200" />
          <div className="p-5">
            <div className="grid gap-2 md:grid-cols-3">
              {/* Select Patient */}
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs text-slate-500">
                  Select Patient
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Search / Select patient"
                  className="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-600"
                  
                />
              </div>

              {/* Patient ID */}
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs text-slate-500">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full rounded-full border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-teal-600"
                />
              </div>

              {/* Add New Patient */}
              <div className="flex items-end justify-end">
                <AppButton text="+ Add New Patient" buttonVariant="dark" />
              </div>
   
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-xl border border-gray-200">
          <div className="px-5 pt-4">
            <h2 className="text-[15px] font-semibold">Appointment Details</h2>
          </div>
          <hr className="mt-3 border-t border-gray-200" />
          <div className="p-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Appointment Type (select) */}
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Appointment Type
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full appearance-none rounded-full border border-gray-300 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-teal-600"
                  >
                    <option>Consultation</option>
                    <option>Follow-up</option>
                    <option>Lab Test</option>
                    <option>Scan</option>
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Date (text with calendar icon; swap to date picker if you want) */}
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="w-full rounded-full border border-gray-300 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-teal-600"
                  />
                  <FiCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Time (text with clock icon; swap to time picker if you want) */}
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  Time
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="10 AM - 11 AM"
                    className="w-full rounded-full border border-gray-300 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-teal-600"
                  />
                  <FiClock className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="block text-xs text-slate-500">
                  Additional Notes
                </label>
                <span className="text-xs text-slate-400">(optional)</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter notes"
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-teal-600"
              />
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center gap-3 px-1 pb-1">
          <AppButton text="Cancel" buttonVariant="outlined" />

          <AppButton
            text="   Save Appointment"
            className="h-11  bg-primary text-white hover:bg-primary-hover"
          />
        </div>
      </form>
    </div>
  );
};

export default PatientNewAppointment;
