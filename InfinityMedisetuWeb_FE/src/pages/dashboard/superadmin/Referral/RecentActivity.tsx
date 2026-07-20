import {
  FiArrowRight,
  FiCalendar,
  FiClock,
} from "react-icons/fi";
import { Card, CardBody, Chip } from "@heroui/react";
import { useMemo } from "react";
import type { SuperAdminReferralItem } from "../../../../redux/api/referralApi";

type RecentActivityProps = {
  referrals: SuperAdminReferralItem[];
  isLoading?: boolean;
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return "—";
  }
};

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return "—";
  }
};

const getStatusColor = (status: string) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
};

export const RecentActivity = ({ 
  referrals = [], 
  isLoading = false 
}: RecentActivityProps) => {
  // Get most recent 5 referrals
  const recentActivities = useMemo(() => 
    referrals.slice(0, 5),
    [referrals]
  );

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-slate-200 shadow-none">
        <CardBody className="p-6">
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded bg-slate-200" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 shadow-none">
        <CardBody className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Activity
          </h3>
          <div className="mt-8 flex items-center justify-center text-sm text-slate-500">
            No recent activity
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-200 shadow-none">
      <CardBody className="p-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Recent Activity
          </h3>
        </div>

        <div className="mt-8 space-y-6">
          {recentActivities.map((activity, index) => (
            <div key={activity.id} className="flex gap-5">
              {/* Timeline Icon */}
              <div className="flex flex-col items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-bold text-blue-600">
                    {activity.status === "approved" ? "✓" : activity.status === "rejected" ? "✕" : "●"}
                  </span>
                </div>

                {index !== recentActivities.length - 1 && (
                  <div className="mt-2 h-12 w-px bg-slate-200" />
                )}
              </div>

              {/* Activity Card */}
              <div className="flex-1 rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {activity.referredBy?.name} referred {activity.referredTo?.name}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {activity.comments || "No comments"}
                    </p>
                  </div>

                  <Chip
                    size="sm"
                    radius="full"
                    variant="flat"
                    color={getStatusColor(activity.status)}
                    className="font-medium capitalize"
                  >
                    {activity.status}
                  </Chip>
                </div>

                <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <FiCalendar size={14} />
                    {formatDate(activity.createdAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    <FiClock size={14} />
                    {formatTime(activity.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {referrals.length > 5 && (
          <button className="mt-8 flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800">
            View all activity
            <FiArrowRight />
          </button>
        )}
      </CardBody>
    </Card>
  );
};