import React from "react";

/**
 * Revenue Chart - Line chart showing revenue trends
 */
const RevenueChart: React.FC = () => {
  const data = [
    { date: "Jun 01", revenue: 2.5 },
    { date: "Jun 02", revenue: 1.8 },
    { date: "Jun 03", revenue: 2.2 },
    { date: "Jun 04", revenue: 3.1 },
    { date: "Jun 05", revenue: 2.0 },
    { date: "Jun 06", revenue: 2.5 },
    { date: "Jun 07", revenue: 1.9 },
    { date: "Jun 08", revenue: 2.1 },
  ];

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const minRevenue = Math.min(...data.map((d) => d.revenue));
  const range = maxRevenue - minRevenue || 1;

  return (
    <div className="h-48 w-full">
      <svg
        viewBox="0 0 800 200"
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[1, 2, 3, 4].map((i) => (
          <line
            key={`grid-${i}`}
            x1="0"
            y1={(200 / 4) * i}
            x2="800"
            y2={(200 / 4) * i}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* Area under curve */}
        <defs>
          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Path */}
        <path
          d={`M ${data
            .map(
              (d, i) =>
                `${(i / (data.length - 1)) * 800},${
                  200 -
                  ((d.revenue - minRevenue) / range) * 180 -
                  10
                }`
            )
            .join(" L ")}`}
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Area fill */}
        <path
          d={`M 0,200 ${data
            .map(
              (d, i) =>
                `${(i / (data.length - 1)) * 800},${
                  200 -
                  ((d.revenue - minRevenue) / range) * 180 -
                  10
                }`
            )
            .join(" L ")} L 800,200 Z`}
          fill="url(#revenueGradient)"
        />

        {/* Dots */}
        {data.map((d, i) => (
          <circle
            key={`dot-${i}`}
            cx={(i / (data.length - 1)) * 800}
            cy={
              200 -
              ((d.revenue - minRevenue) / range) * 180 -
              10
            }
            r="3"
            fill="rgb(59, 130, 246)"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`label-${i}`}
            x={(i / (data.length - 1)) * 800}
            y="190"
            textAnchor="middle"
            fontSize="12"
            fill="#94a3b8"
          >
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default RevenueChart;
