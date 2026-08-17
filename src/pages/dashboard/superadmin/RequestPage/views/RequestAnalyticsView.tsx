import React, { useMemo } from "react";
import { Card, CardBody, Progress } from "@heroui/react";
import {
  FiTrendingUp,
  FiCheck,
  FiClock,
  FiUser,
} from "react-icons/fi";
import type { RequestCard } from "../types";
import { STATUS_META } from "../constants";
import { LuStethoscope } from "react-icons/lu";

interface RequestAnalyticsViewProps {
  cards: RequestCard[];
  isLoading: boolean;
}

interface AnalyticsStats {
  total: number;
  pending: number;
  approved: number;
  reviewing: number;
  rejected: number;
  avgTime: number;
  doctorsCount: number;
  clinicsCount: number;
  specialties: Record<string, number>;
  locations: Record<string, number>;
}

/**
 * Analytics view with custom design showing statistics and insights
 */
export const RequestAnalyticsView: React.FC<RequestAnalyticsViewProps> = ({
  cards,
}) => {
  const stats = useMemo<AnalyticsStats>(() => {
    const specialties: Record<string, number> = {};
    const locations: Record<string, number> = {};
    let doctorsCount = 0;
    let clinicsCount = 0;

    const counts = {
      total: cards.length,
      pending: 0,
      approved: 0,
      reviewing: 0,
      rejected: 0,
    };

    cards.forEach((card) => {
      // Count statuses
      switch (card.status) {
        case "Pending":
          counts.pending += 1;
          break;
        case "Approved":
          counts.approved += 1;
          break;
        case "Reviewing":
          counts.reviewing += 1;
          break;
        case "Rejected":
          counts.rejected += 1;
          break;
      }

      // Count specialties
      if (card.doctor.speciality) {
        specialties[card.doctor.speciality] =
          (specialties[card.doctor.speciality] || 0) + 1;
      }

      // Count types
      if (card.clinic.name) {
        clinicsCount += 1;
      } else {
        doctorsCount += 1;
      }
    });

    const avgTime = 5; // TODO: Calculate from actual data

    return {
      ...counts,
      avgTime,
      doctorsCount,
      clinicsCount,
      specialties,
      locations,
    };
  }, [cards]);

  const getPercentage = (value: number) => {
    if (stats.total === 0) return 0;
    return Math.round((value / stats.total) * 100);
  };

  const topSpecialties = Object.entries(stats.specialties)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  type StatusLabel = "Pending" | "Reviewing" | "Approved" | "Rejected";
  
  const statusesData: Array<{
    label: StatusLabel;
    value: number;
    icon: typeof FiClock;
  }> = [
    {
      label: "Pending",
      value: stats.pending,
      icon: FiClock,
    },
    {
      label: "Reviewing",
      value: stats.reviewing,
      icon: FiTrendingUp,
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: FiCheck,
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: FiUser,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Requests */}
        <Card className="shadow-sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Requests
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <FiTrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Doctors */}
        <Card className="shadow-sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Doctors</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.doctorsCount}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <FiUser className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Clinics */}
        <Card className="shadow-sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Clinics</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.clinicsCount}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-3">
                <LuStethoscope className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Avg Processing Time */}
        <Card className="shadow-sm">
          <CardBody className="gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Avg. Time
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {stats.avgTime} days
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <FiClock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status Breakdown */}
        <Card className="shadow-sm">
          <CardBody className="gap-6 p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Status Breakdown
            </h3>

            <div className="space-y-4">
              {statusesData.map((status) => {
                const Icon = status.icon;
                const percentage = getPercentage(status.value);
                const statusMeta = STATUS_META[status.label];

                return (
                  <div key={status.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">
                          {status.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {status.value} ({percentage}%)
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      color={statusMeta.color as any}
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Top Specialties */}
        <Card className="shadow-sm">
          <CardBody className="gap-6 p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Top Specialties
            </h3>

            <div className="space-y-3">
              {topSpecialties.length > 0 ? (
                topSpecialties.map(([specialty, count], index) => (
                  <div key={specialty} className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg font-semibold text-white"
                      style={{
                        backgroundColor:
                          [
                            "#3B82F6",
                            "#10B981",
                            "#F59E0B",
                            "#EF4444",
                            "#8B5CF6",
                          ][index] || "#6B7280",
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {specialty}
                      </p>
                      <p className="text-xs text-slate-500">
                        {count} request{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {getPercentage(count)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500">
                  No specialty data available
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Request Type Distribution */}
      <Card className="shadow-sm">
        <CardBody className="gap-6 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Request Type Distribution
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Doctors vs Clinics */}
            <div>
              <p className="mb-4 text-sm font-medium text-slate-700">
                Request Source
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-3">
                    <FiUser className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">Doctor</p>
                      <p className="text-xs text-slate-500">
                        Direct application
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats.doctorsCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <LuStethoscope className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">Clinic</p>
                      <p className="text-xs text-slate-500">
                        Clinic-submitted
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats.clinicsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversion Rate */}
            <div>
              <p className="mb-4 text-sm font-medium text-slate-700">
                Conversion Rate
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                  <p className="font-medium text-slate-900">
                    Approval Rate
                  </p>
                  <span className="font-bold text-green-600">
                    {stats.total > 0
                      ? getPercentage(stats.approved)
                      : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-4">
                  <p className="font-medium text-slate-900">Pending Rate</p>
                  <span className="font-bold text-yellow-600">
                    {stats.total > 0
                      ? getPercentage(stats.pending)
                      : 0}%
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-red-50 p-4">
                  <p className="font-medium text-slate-900">Rejection Rate</p>
                  <span className="font-bold text-red-600">
                    {stats.total > 0
                      ? getPercentage(stats.rejected)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default RequestAnalyticsView;