// src/pages/doctor/Doctor.tsx
import React, { useMemo, useState } from "react";
import { Avatar, Button, Pagination, Spinner } from "@heroui/react";
import { FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";

/* ----------------------------- UI Shell ----------------------------- */
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white ${className ?? ""}`}
  >
    {children}
  </div>
);

/* ----------------------------- Types ----------------------------- */
type Row = {
  rawId: string;
  id: string; // display id
  name: string;
  avatar: string | null;
  speciality: string | null;
  email: string | null;
  phone: string | null;
  status: string; // Active/New/Inactive etc.
};

/* ----------------------------- Helpers ----------------------------- */
const displayId = (raw: string) =>
  `DOC#${String(raw).slice(0, 8).toUpperCase()}`;

const normalizeFromAPI = (u: any): Row => {
  const rawId = String(u?.id ?? "").trim();

  return {
    rawId,
    id: rawId ? displayId(rawId) : "—",
    name: u?.name ?? "Unknown",
    avatar: u?.profileImage ?? null,
    speciality: u?.speciality ?? null, // backend may or may not send
    email: u?.email ?? null,
    phone: u?.mobile ?? null,
    status: String(u?.status ?? "Active"),
  };
};

/* ============================= Component ============================= */
export default function Doctor() {
  const navigate = useNavigate();

  // Server-side pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 🔥 Fetch only Doctors from server
  const { data, isFetching, isError, error, refetch } = useGetAllUsersQuery({
    page,
    pageSize,
    userType: "Doctor",
  });

  const raw = data?.users ?? [];
  const rows = useMemo(() => raw.map(normalizeFromAPI), [raw]);

  const totalPages = Math.max(1, data?.pagination?.totalPages ?? 1);
  const totalRecords = data?.pagination?.totalRecords ?? rows.length;
  const showingFrom =
    rows.length === 0
      ? 0
      : (page - 1) * (data?.pagination?.pageSize ?? pageSize) + 1;
  const showingTo =
    (page - 1) * (data?.pagination?.pageSize ?? pageSize) + rows.length;

  const goToDetails = (rawId: string) => {
    if (!rawId) return;
    navigate(`/user/${encodeURIComponent(rawId)}`);
  };

  return (
    <div>
      {/* Page title */}
      <h1 className="mb-4 text-2xl font-semibold">Doctor</h1>

      {/* Main card like Users */}
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Doctor List</div>

          {/* (Optional) Add Doctor CTA */}
          {/* <Button
            onPress={() => navigate("/user/new?role=Doctor")}
            radius="lg"
            className="h-10 bg-primary text-white hover:opacity-90"
          >
            + Add Doctor
          </Button> */}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-sm font-medium text-slate-600">
              <tr>
                {/* <th className="px-4 py-3">Doctor ID</th> */}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Speciality</th>
                <th className="px-4 py-3">Email / Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-sm">
              {isFetching && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Spinner size="sm" />
                      Loading doctors…
                    </div>
                  </td>
                </tr>
              )}

              {!isFetching &&
                rows.map((r, idx) => (
                  <tr
                    key={`${r.rawId || r.id}-${idx}`}
                    onClick={() => goToDetails(r.rawId)}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      idx !== rows.length - 1 ? "border-b border-gray-200" : ""
                    }`}
                  >
                    {/* <td className="px-4 py-3">{r.id}</td> */}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={r.avatar || undefined}
                          size="sm"
                          radius="full"
                        />
                        <div className="font-medium">{r.name}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3">{r.speciality ?? "—"}</td>

                    <td className="px-4 py-3">
                      <div className="text-gray-800">{r.email ?? "-"}</div>
                      <div className="text-xs text-slate-500">
                        {r.phone ?? "-"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border",
                          r.status?.toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.status?.toLowerCase() === "new"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-100 text-gray-600 border-gray-200",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            r.status?.toLowerCase() === "active"
                              ? "bg-emerald-500"
                              : r.status?.toLowerCase() === "new"
                              ? "bg-blue-500"
                              : "bg-gray-400",
                          ].join(" ")}
                        />
                        {r.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        isIconOnly
                        variant="light"
                        aria-label="Actions"
                        className="text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FiMoreVertical />
                      </Button>
                    </td>
                  </tr>
                ))}

              {!isFetching && rows.length === 0 && !isError && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No doctors found.
                  </td>
                </tr>
              )}

              {!isFetching && isError && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-red-600"
                  >
                    {(error as any)?.data?.message ||
                      (error as any)?.error ||
                      "Failed to load doctors."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-col gap-3 items-center justify-between px-1 md:px-0 py-4 text-sm text-slate-500 md:flex-row">
          <div className="w-full md:w-auto text-center md:text-left">
            Showing {String(showingFrom).padStart(2, "0")}–
            {String(showingTo).padStart(2, "0")} of {totalRecords} entries
          </div>
          <Pagination
            isCompact
            showControls
            total={totalPages}
            page={page}
            onChange={(p) => {
              setPage(p);
              refetch();
            }}
            classNames={{ cursor: "bg-primary text-white", item: "rounded-md" }}
          />
        </div>
      </Card>
    </div>
  );
}
