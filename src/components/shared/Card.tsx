
import React from "react";
import { Card as HUCard, CardBody } from "@heroui/react";
import Icons from "../../constants/icons"; // 👈 your icons file
import { useGetDashboardQuery } from "../../redux/api/dashboardApi";

type Stat = {
  title: string;
  value: string | number;
  delta?: number | string; // 👈 growth value
  icon: string; // 👈 image path (from Icons)
  iconBg?: string;
};

const defaultData: Stat[] = [
  {
    title: "New Patient",
    value: 0,
    icon: Icons.newPatient,
  },
  {
    title: "New Appointment",
    value: 0,
    icon: Icons.newAppointment,
  },
  {
    title: "Pending Appointments",
    value: 0,
    icon: Icons.newAppointment, // use any icon you like
  },
  // {
  //   title: "Upcoming Appointments",
  //   value: 0,


  
  //   icon: Icons.newAppointment,
  // },
  // {
  //   title: "Confirmed Appointments",
  //   value: 0,
  //   icon: Icons.newAppointment,
  // },
];

interface Props {
  data?: Stat[];
}

const StatCards: React.FC<Props> = ({ data = defaultData }) => {
  const { data: dashboard } = useGetDashboardQuery();

  const dashboardResult = dashboard?.result;
  const appointmentStats = dashboardResult?.appointment;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {data.map((c) => {
        const deltaNum =
          typeof c.delta === "string" ? parseFloat(c.delta) : c.delta ?? 0;
        const isPositive = deltaNum >= 0;
        const deltaColor = isPositive ? "text-green-600" : "text-red-600";

        // Decide what value to show for each card based on its title
        const displayValue: string | number =
          c.title === "New Patient"
            ? dashboardResult?.newPatients ?? 0
            : c.title === "New Appointment"
            ? dashboardResult?.totalNewAppointments ?? 0
            : c.title === "Pending Appointments"
            ? appointmentStats?.totalPendingAppointments?.count ?? 0
            : c.title === "Upcoming Appointments"
            ? appointmentStats?.totalUpcomingAppointments?.count ?? 0
            : c.title === "Confirmed Appointments"
            ? appointmentStats?.totalConfirmedAppointments?.count ?? 0
            : c.value;

        return (
          <HUCard
            key={c.title}
            radius="lg"
            shadow="none"
            className="border border-gray-200"
          >
            <CardBody className="p-5 space-y-3">
              {/* Top-left Icon */}
              <div className="h-10 w-10 rounded-lg flex items-center justify-center">
                <img src={c.icon} alt={c.title} className="h-6 w-6" />
              </div>

              {/* Title */}
              <div className="text-sm text-secondary">{c.title}</div>

              {/* Value + Delta */}
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">
                  {displayValue}
                </div>

                {c.delta !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}
                  >
                    <img src={Icons.deltaIcon} alt="trend" />+
                    {Math.abs(Number(c.delta))}
                  </div>
                )}
              </div>
            </CardBody>
          </HUCard>
        );
      })}
    </div>
  );
};

export default StatCards;
