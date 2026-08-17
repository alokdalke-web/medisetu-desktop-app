import { Card, CardBody } from "@heroui/react";
import { useMemo } from "react";
import type { ReferralsStats } from "../../../../redux/api/referralApi";

type ReferralInsightsProps = {
  stats: ReferralsStats | null;
  isLoading?: boolean;
};

export const ReferralInsights = ({ 
  stats, 
  isLoading = false 
}: ReferralInsightsProps) => {
  const total = stats?.totalReferrals ?? 0;

  const statsArray = useMemo(() => [
    {
      label: "Pending",
      count: stats?.pendingReferrals ?? 0,
      percentage: total > 0 ? Math.round((stats?.pendingReferrals ?? 0) / total * 100) : 0,
      color: "bg-amber-400",
    },
    {
      label: "Approved",
      count: stats?.approvedReferrals ?? 0,
      percentage: total > 0 ? Math.round((stats?.approvedReferrals ?? 0) / total * 100) : 0,
      color: "bg-emerald-500",
    },
    {
      label: "Rejected",
      count: stats?.rejectedReferrals ?? 0,
      percentage: total > 0 ? Math.round((stats?.rejectedReferrals ?? 0) / total * 100) : 0,
      color: "bg-rose-500",
    },
  ], [stats, total]);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-slate-200 shadow-none">
        <CardBody className="p-6">
          <div className="space-y-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-32 w-32 animate-pulse rounded-full bg-slate-200" />
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
            Referral Insights
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Overview of referral performance
          </p>
        </div>

        {total === 0 ? (
          <div className="mt-8 flex items-center justify-center text-sm text-slate-500">
            No referral data available
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-between gap-8 lg:flex-row">
            <div className="relative flex items-center justify-center">
              <div className="flex h-36 w-36 items-center justify-center rounded-full border-[12px] border-amber-400">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900">{total}</div>

                  <div className="text-sm text-slate-500">
                    Total
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {statsArray.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${item.color}`}
                    />

                    <span className="text-sm font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-900">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};