import { Avatar, Button, Card, CardBody } from "@heroui/react";
import React from "react";
import { FiCalendar, FiFileText, FiImage } from "react-icons/fi";
import StatusChip from "../../components/shared/StatusChip";
import Images from "../../constants/images";

const PatientDashboard: React.FC = () => {
  // const navigate = useNavigate();

  const doctor = {
    name: "Ananya Sharma",
    role: "Cardiologist",
    phone: "+91 98765 43210",
    alt: "+91 98765 43210",
    avatar: "https://i.pravatar.cc/100?img=12",
  };

  const patient = {
    name: "Aashutosh Sharma",
    id: "Pat#12345",
    date: "19 Aug 2026",
    time: "10:00 AM",
    avatar: "https://i.pravatar.cc/100?img=36",
  };

  return (
    <div className="space-y-6">
      <div className="relative isolate overflow-hidden rounded-2xl p-6 md:p-8 text-white min-h-[200px]">
        <img
          src={Images.Frame}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 h-full w-full object-cover pointer-events-none select-none"
        />

        <img
          src={Images.wellcomeDoctors}
          alt=""
          aria-hidden="true"
          className="hidden md:block absolute bottom-0 right-2 z-10 w-auto
             h-full object-contain pointer-events-none select-none"
        />

        <div className="relative z-20 max-w-lg pr-28 sm:pr-40 md:pr-56 ">
          <h2 className="text-2xl font-semibold md:text-[28px]">
            Hello, {patient.name.split(" ")[0]} 👋
          </h2>
          <p className="mt-2 text-white/90">
            Here’s your health overview today.
          </p>
          <Button
            radius="full"
            className="mt-5 bg-white px-5 text-emerald-700 hover:bg-white/90"
          >
            View Appointment
          </Button>
        </div>
      </div>

      {/* Upcoming Appointment */}
      <Card radius="lg" className="border border-black/10">
        <CardBody className="p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Appointment</h3>
           
            <StatusChip text="Confirmed" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Doctor card */}
            <Card radius="lg" className="border border-black/10">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={doctor.avatar} name={doctor.name} size="sm" />
                  <div>
                    <div className="font-semibold">{doctor.name}</div>
                    <div className="text-xs text-slate-500">{doctor.role}</div>
                  </div>
                </div>

                <div className="my-3 h-px w-full bg-gray-200" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">{doctor.phone}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Phone Number
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{doctor.alt}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Alternate Number
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Patient card */}
            <Card radius="lg" className="border border-black/10">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={patient.avatar} name={patient.name} size="sm" />
                  <div>
                    <div className="font-semibold">{patient.name}</div>
                    <div className="text-xs text-slate-500">{patient.id}</div>
                  </div>
                </div>

                <div className="my-3 h-px w-full bg-gray-200" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">{patient.date}</div>
                    <div className="mt-1 text-xs text-slate-500">Date</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{patient.time}</div>
                    <div className="mt-1 text-xs text-slate-500">Time</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card radius="lg" className="border border-black/10">
          <CardBody className="p-5">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                <FiImage />
              </span>
              <span className="text-sm text-slate-600">Reports Uploaded</span>
            </div>
            <div className="text-2xl font-semibold">12</div>
          </CardBody>
        </Card>

        <Card radius="lg" className="border border-black/10">
          <CardBody className="p-5">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-100 text-yellow-700">
                <FiFileText />
              </span>
              <span className="text-sm text-slate-600">Reports Reviewed</span>
            </div>
            <div className="text-2xl font-semibold">09</div>
          </CardBody>
        </Card>

        <Card radius="lg" className="border border-black/10">
          <CardBody className="p-5">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <FiCalendar />
              </span>
              <span className="text-sm text-slate-600">
                Appointments Completed
              </span>
            </div>
            <div className="text-2xl font-semibold">15</div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default PatientDashboard;
