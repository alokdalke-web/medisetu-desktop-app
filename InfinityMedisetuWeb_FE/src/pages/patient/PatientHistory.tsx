import React from "react";
import { useNavigate, useParams } from "react-router";
import { Button, Pagination, Spinner, Tab, Tabs } from "@heroui/react";
import SearchField from "../../components/shared/SearchField";
import StatusChip from "../../components/shared/StatusChip";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useGetReportCardsByPatientIdQuery } from "../../redux/api/patientApi";

type Status = "Scheduled" | "Completed" | "Cancelled" | "NoShow" | string;
type SortKey = "date" | "type" | "status";

type AppointmentRow = {
  id: string;
  appointmentDate: string; // "YYYY-MM-DD"
  appointmentTime: string; // "HH:mm"
  appointmentType: string;
  appointmentStatus: Status;
  appointmentNotes?: string | null;
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "noshow", label: "No Show" },
] as const;

type StatusTabKey = (typeof STATUS_TABS)[number]["key"];
const isStatusTabKey = (k: unknown): k is StatusTabKey =>
  STATUS_TABS.some((t) => t.key === k);

export default function PatientHistory() {
  const navigate = useNavigate();
  const { id: patientId } = useParams();

  // --- UI state ---
  const [query, setQuery] = React.useState("");
  const [statusTab, setStatusTab] = React.useState<StatusTabKey>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // --- Data fetching ---
  const { data: reportCardsRes, isFetching } =
    useGetReportCardsByPatientIdQuery(
      {
        patientId: patientId || "",
        pageNumber: page,
        pageSize,
        typeOfPaginations: "Appointments",
        searchBy: query,
      },
      { skip: !patientId },
    );

  const appointments: AppointmentRow[] = React.useMemo(() => {
    if (!reportCardsRes?.appointments) return [];
    return reportCardsRes.appointments.map((a: any) => ({
      id: String(a.id || a._id || ""),
      appointmentDate: a.appointmentDate || a.date || "",
      appointmentTime: a.appointmentTime || a.time || "",
      appointmentType: a.appointmentType || "Consultation",
      appointmentStatus: a.appointmentStatus || a.status || "—",
      appointmentNotes: a.appointmentNotes || a.notes || null,
    }));
  }, [reportCardsRes]);

  // --- Filter ---
  const filtered = React.useMemo(() => {
    const norm = (s: string) => (s || "").toLowerCase();
    let list = appointments;

    if (statusTab !== "all") {
      const want = statusTab.toLowerCase();
      list = list.filter((a) => {
        const s = norm(a.appointmentStatus);
        if (want === "noshow")
          return s.includes("noshow") || s.includes("no show");
        return s === want;
      });
    }

    return list;
  }, [appointments, statusTab]);

  // --- Sort ---
  const sorted = React.useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let A = "";
      let B = "";
      if (sortKey === "date") {
        A = `${a.appointmentDate} ${a.appointmentTime}`;
        B = `${b.appointmentDate} ${b.appointmentTime}`;
      } else if (sortKey === "type") {
        A = a.appointmentType ?? "";
        B = b.appointmentType ?? "";
      } else {
        A = a.appointmentStatus ?? "";
        B = b.appointmentStatus ?? "";
      }
      const cmp = A.localeCompare(B, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  // --- Pagination ---
  const totalFiltered =
    reportCardsRes?.pagination?.totalRecords ?? sorted.length;
  const totalPages = reportCardsRes?.pagination?.totalPages ?? 1;
  const showingFrom = (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalFiltered);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? (
      <FiChevronUp className="inline-block ml-1 align-middle opacity-60" />
    ) : sortDir === "asc" ? (
      <FiChevronUp className="inline-block ml-1 align-middle" />
    ) : (
      <FiChevronDown className="inline-block ml-1 align-middle" />
    );

  return (
    <div className="mx-auto w-full bg-white py-4 px-6 border border-gray-200 rounded-2xl">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[28px] font-semibold tracking-tight">
          Patient History
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="bordered"
            onPress={() => navigate(`/patient/${patientId}`)}
          >
            View Profile
          </Button>
          <Button onPress={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          aria-label="Status"
          selectedKey={statusTab}
          onSelectionChange={(k: React.Key) => {
            if (isStatusTabKey(k)) {
              setStatusTab(k);
              setPage(1);
            }
          }}
          classNames={{
            tabList: "bg-transparent gap-3 p-0",
            tab:
              "h-9 rounded-full px-5 text-[14px] font-medium border border-gray-300 whitespace-nowrap bg-white " +
              "data-[hover=true]:bg-transparent data-[selected=true]:bg-primary " +
              "data-[selected=true]:text-white data-[selected=true]:shadow-sm",
            tabContent: "text-slate-700 group-data-[selected=true]:!text-white",
            cursor: "hidden",
          }}
        >
          {STATUS_TABS.map((t) => (
            <Tab key={t.key} title={t.label} />
          ))}
        </Tabs>

        <div className="flex items-center gap-3">
          <SearchField
            placeholder="Search history (type, status, notes, date)"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isFetching ? (
          <div className="flex items-center justify-center py-16">
            <Spinner label="Loading history..." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead className="border-b border-gray-200">
                  <tr className="text-left text-slate-500 select-none">
                    <th
                      className="px-6 py-4 font-medium cursor-pointer"
                      onClick={() => toggleSort("date")}
                    >
                      Date & Time <SortIcon col="date" />
                    </th>
                    <th
                      className="px-6 py-4 font-medium cursor-pointer"
                      onClick={() => toggleSort("type")}
                    >
                      Type <SortIcon col="type" />
                    </th>
                    <th
                      className="px-6 py-4 font-medium cursor-pointer"
                      onClick={() => toggleSort("status")}
                    >
                      Status <SortIcon col="status" />
                    </th>
                    <th className="px-6 py-4 font-medium">Notes</th>
                    <th className="px-6 py-4 font-medium text-right pr-8">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.length > 0 ? (
                    sorted.map((a) => {
                      const dateTime = `${a.appointmentDate} ${a.appointmentTime}`;
                      return (
                        <tr
                          key={a.id}
                          className="hover:bg-gray-50 border-b border-gray-100"
                        >
                          <td className="px-6 py-5">{dateTime}</td>
                          <td className="px-6 py-5">{a.appointmentType}</td>
                          <td className="px-6 py-5">
                            <StatusChip text={a.appointmentStatus} />
                          </td>
                          <td className="px-6 py-5 max-w-[480px] truncate">
                            {a.appointmentNotes ?? "—"}
                          </td>
                          <td className="px-6 py-5 text-right pr-8">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="flat"
                                onPress={() => navigate(`/appointment/${a.id}`)}
                              >
                                View Appointment
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-slate-500"
                      >
                        No history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 items-center justify-between px-6 py-4 text-sm text-slate-500 md:flex-row">
              <div className="w-full md:w-auto text-center md:text-left">
                Showing {String(showingFrom).padStart(2, "0")}–
                {String(showingTo).padStart(2, "0")} of {totalFiltered} entries
              </div>
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
                onChange={setPage}
                classNames={{
                  cursor: "bg-primary text-white",
                  item: "rounded-md",
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
