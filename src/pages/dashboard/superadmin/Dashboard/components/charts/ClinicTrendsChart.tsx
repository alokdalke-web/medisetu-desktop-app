import React from "react";

/**
 * Clinic Trends Chart - Multi-line chart showing on-time vs delayed registrations
 */
const ClinicTrendsChart: React.FC = () => {
  const data = [
    { date: "Jun 01", onTime: 8, delay: 3 },
    { date: "Jun 02", onTime: 9, delay: 2 },
    { date: "Jun 03", onTime: 6, delay: 4 },
    { date: "Jun 04", onTime: 8, delay: 3 },
    { date: "Jun 05", onTime: 7, delay: 5 },
    { date: "Jun 06", onTime: 9, delay: 2 },
    { date: "Jun 07", onTime: 8, delay: 3 },
    { date: "Jun 08", onTime: 7, delay: 4 },
  ];

  const maxValue = 10;
  const height = 150;
  const padding = 20;

  const getY = (value: number) => {
    return height - (value / maxValue) * (height - padding);
  };

  return (
    <div className="h-40 w-full">
      <svg
        viewBox={`0 0 800 ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((i) => (
          <line
            key={`grid-${i}`}
            x1="0"
            y1={(height / 5) * i}
            x2="800"
            y2={(height / 5) * i}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* On Time Line (Teal) */}
        <path
          d={`M ${data
            .map(
              (d, i) =>
                `${(i / (data.length - 1)) * 800},${getY(d.onTime)}`
            )
            .join(" L ")}`}
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Delay Line (Red) */}
        <path
          d={`M ${data
            .map(
              (d, i) =>
                `${(i / (data.length - 1)) * 800},${getY(d.delay)}`
            )
            .join(" L ")}`}
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* On Time Dots */}
        {data.map((d, i) => (
          <circle
            key={`on-time-dot-${i}`}
            cx={(i / (data.length - 1)) * 800}
            cy={getY(d.onTime)}
            r="2.5"
            fill="rgb(16, 185, 129)"
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* Delay Dots */}
        {data.map((d, i) => (
          <circle
            key={`delay-dot-${i}`}
            cx={(i / (data.length - 1)) * 800}
            cy={getY(d.delay)}
            r="2.5"
            fill="rgb(239, 68, 68)"
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`label-${i}`}
            x={(i / (data.length - 1)) * 800}
            y={height - 5}
            textAnchor="middle"
            fontSize="11"
            fill="#94a3b8"
          >
            {d.date}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default ClinicTrendsChart;
