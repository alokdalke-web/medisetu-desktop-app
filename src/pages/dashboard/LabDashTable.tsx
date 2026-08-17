import { Spinner } from "@heroui/react";

type Row = any;
type Status = "Initiated" | "Pending" | "Completed" | "Rejected" | "InProgress";
type PaymentStatus = "paid" | "pending" | string;

const StatusPill = ({ s }: { s: Status }) => {
  const cls =
    s === "Completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "Rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : s === "Pending"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : s === "InProgress"
            ? "bg-blue-50 text-blue-700 border-blue-200"
            : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs",
        cls,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {s}
    </span>
  );
};

const PaymentPill = ({ paymentStatus }: { paymentStatus: PaymentStatus }) => {
  const paid = String(paymentStatus).toLowerCase() === "paid";
  const cls = paid
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs",
        cls,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {paid ? "Paid" : "Pending"}
    </span>
  );
};

function hasPdf(reportPdf: any) {
  if (reportPdf == null) return false;

  if (typeof reportPdf === "string") {
    const s = reportPdf.trim().toLowerCase();
    if (!s) return false;
    if (s === "null" || s === "undefined" || s === "-") return false;
    return true;
  }

  return Boolean(reportPdf);
}

const LabDashTable = ({
  tab,
  isLoading,
  cols,
  pageRows,
  isUploading,
  onClickStatus,
  onClickPayment,
  onUploadClick,
}: {
  tab: "new" | "processed";
  isLoading: boolean;
  cols: number;
  pageRows: Row[];
  isUploading: boolean;
  onClickStatus: (r: Row) => void;
  onClickPayment: (r: Row) => void;
  onUploadClick: (r: Row) => void;
}) => {
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-[1300px] w-full text-sm">
          <thead className="bg-white">
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="px-6 py-4 font-medium">Patient</th>
              <th className="px-6 py-4 font-medium">Doctor</th>
              <th className="px-6 py-4 font-medium">Test Name</th>

              {/* ✅ NEW headings */}
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium text-right">Price</th>

              <th className="px-6 py-4 font-medium">Date &amp; Time</th>
              <th className="px-6 py-4 font-medium">Status</th>

              {tab === "processed" && (
                <th className="px-6 py-4 font-medium">Payment</th>
              )}

              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={cols} className="px-6 py-10 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <Spinner size="sm" /> Loading dashboard…
                  </div>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={cols}
                  className="px-6 py-10 text-center text-sm text-gray-500"
                >
                  No records found
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const isPaid = String(r.paymentStatus).toLowerCase() === "paid";

                const canAccept =
                  tab === "new" && String(r.status) === "Initiated";
                const canPay =
                  tab === "processed" &&
                  String(r.status) === "InProgress" &&
                  !isPaid;
                const canUpload =
                  tab === "processed" && isPaid && !hasPdf(r.reportPdf);

                return (
                  <tr
                    key={String(r.rawId || r.id)}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="leading-tight">
                        <div className="font-semibold text-gray-900">
                          {r.patientName}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="leading-tight">
                        <div className="font-semibold text-gray-900">
                          {r.doctorName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.doctorMeta}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {r.testName}
                      </div>
                    </td>

                    {/* ✅ NEW cells */}
                    <td className="px-6 py-4 text-gray-700">
                      {r.testCategory || "—"}
                    </td>

                    <td className="px-6 py-4 text-right text-gray-900 font-medium">
                      {r.testPrice != null
                        ? `₹${Number(r.testPrice).toLocaleString("en-IN")}`
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.date}</div>
                      <div className="text-xs text-gray-500">{r.time}</div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusPill s={r.status} />
                    </td>

                    {tab === "processed" && (
                      <td className="px-6 py-4">
                        <PaymentPill paymentStatus={r.paymentStatus} />
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      {canAccept ? (
                        <button
                          type="button"
                          onClick={() => onClickStatus(r)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 shadow-sm"
                        >
                          Accept Report
                        </button>
                      ) : canPay ? (
                        <button
                          type="button"
                          onClick={() => onClickPayment(r)}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 shadow-sm"
                        >
                          Mark Paid
                        </button>
                      ) : canUpload ? (
                        <button
                          type="button"
                          onClick={() => onUploadClick(r)}
                          disabled={isUploading}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 shadow-sm disabled:opacity-60"
                        >
                          Upload PDF
                        </button>
                      ) : hasPdf(r.reportPdf) ? (
                        <a
                          href={String(r.reportPdf)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50 shadow-sm"
                        >
                          View PDF
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LabDashTable;
