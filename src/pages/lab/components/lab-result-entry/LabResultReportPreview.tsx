import { type LabResultReport } from "../../../../redux/api/labAssistantApi";

function formatReportDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LabResultReportPreview({ report }: { report: LabResultReport }) {
  const summary = [
    ["Patient", report.patient],
    ["Doctor", report.doctor],
    ["Clinic", report.clinic],
    ["Test", report.testName],
    ["Template", report.templateName],
    ["Status", report.status ?? "-"],
    ["Verified By", report.verifiedBy ?? "-"],
    ["Verified At", formatReportDate(report.verifiedAt)],
    ["Generated At", formatReportDate(report.generatedAt)],
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-slate-950">Report Preview</h3>
        <p className="text-xs text-slate-500">
          Review the generated structured result details.
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {summary.map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-100 bg-white px-3 py-2"
          >
            <p className="text-[11px] font-semibold uppercase text-slate-400">
              {label}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {value || "-"}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">Parameter</th>
              <th className="px-4 py-3 font-bold">Value</th>
              <th className="px-4 py-3 font-bold">Unit</th>
              <th className="px-4 py-3 font-bold">Reference Range</th>
              <th className="px-4 py-3 font-bold">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.values.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No result values returned.
                </td>
              </tr>
            ) : (
              report.values.map((value, index) => (
                <tr key={`${value.parameterId ?? value.displayName}-${index}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <div className="flex flex-col gap-1">
                      <span>{value.displayName || value.parameterName}</span>
                      {value.originalParameterName &&
                        value.originalParameterName !==
                          (value.displayName || value.parameterName) && (
                          <span className="text-xs font-medium text-slate-400">
                            Original: {value.originalParameterName}
                          </span>
                        )}
                      <span className="text-xs font-medium text-slate-500">
                        {value.sectionName ?? "-"}
                      </span>
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500">
                        {value.isCustom
                          ? "CUSTOM"
                          : (value.sourceType ?? "DEFAULT")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{value.value}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {value.unit ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {value.referenceRange ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {value.flag ?? "-"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
