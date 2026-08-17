// src/pages/pharmacy/PharmacySales.tsx
import React from "react";
import { FiMoreVertical , FiSearch } from "react-icons/fi";

type PayStatus = "Paid" | "Part Paid" | "Pending";

type SaleRow = {
  id: number;
  invoiceNo: string;
  customerName: string;
  date: string;
  totalItems: number;
  totalAmount: number;
  payStatus: PayStatus;
};

const formatINR = (n: number) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n}`;
  }
};

const salesRows: SaleRow[] = Array.from({ length: 10 }).map((_, i) => ({
  id: i + 1,
  invoiceNo: "INV-10223",
  customerName: "Ajay Sharma",
  date: "28-Feb-2026",
  totalItems: 5,
  totalAmount: 325,
  // just to mix statuses a bit
  payStatus: i % 3 === 0 ? "Paid" : i % 3 === 1 ? "Part Paid" : "Pending",
}));

const getPayStatusClasses = (status: PayStatus) => {
  switch (status) {
    case "Paid":
      return {
        pill: "bg-emerald-50 border-emerald-100 text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "Part Paid":
      return {
        pill: "bg-amber-50 border-amber-100 text-amber-700",
        dot: "bg-amber-500",
      };
    case "Pending":
      return {
        pill: "bg-rose-50 border-rose-100 text-rose-700",
        dot: "bg-rose-500",
      };
    default:
      return {
        pill: "bg-slate-50 border-slate-200 text-slate-600",
        dot: "bg-slate-400",
      };
  }
};

const PharmacySales: React.FC = () => {
  return (
    <div className="w-full h-full px-6 py-4 space-y-4">
      {/* Header */}

      <div className="rounded-3xl border border-border-color bg-white p-4 sm:p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800 mb-6">Sales</h1>
        {/* Search + Create button */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search pill */}
          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <FiSearch className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search here"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Create New Sale button */}
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
          >
            <span className="text-base leading-none">+</span>
            <span>Create New Sale</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Invoice No
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Customer Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Total Items
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Total Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Pay Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {salesRows.map((row, idx) => {
                const { pill, dot } = getPayStatusClasses(row.payStatus);
                return (
                  <tr
                    key={row.id}
                    className={
                      idx === 0
                        ? "border-t border-slate-100"
                        : "border-t border-slate-100"
                    }
                  >
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {row.invoiceNo}
                    </td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                      {row.customerName}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {row.date}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {String(row.totalItems).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {formatINR(row.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${pill}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${dot}`}
                        ></span>
                        <span>{row.payStatus}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        aria-label="More actions"
                      >
                        <FiMoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer + pagination */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium">01-08</span> of{" "}
            <span className="font-medium">24</span> entries
          </p>

          <div className="inline-flex items-center gap-1">
            {["«", "‹", "1", "2", "3", "…", "10", "›", "»"].map((label, i) => {
              const isActive = label === "1";
              return (
                <button
                  key={`${label}-${i}`}
                  type="button"
                  className={[
                    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2 text-xs font-medium",
                    isActive
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacySales;
