import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Pagination,
  Tab,
  Tabs,
} from "@heroui/react";
import React from "react";
import { FiMoreVertical } from "react-icons/fi";
import { useNavigate } from "react-router";
import AppButton from "../../components/shared/AppButton";
import DropdownButton from "../../components/shared/DropdownButton";
import SearchField from "../../components/shared/SearchField";
import StatusChip from "../../components/shared/StatusChip";

/**
 * ✅ Build fix (no functionality change):
 * StatusChip ke props type me chipColor missing hai,
 * so hum yahan locally usko proper type assert kar rahe hain.
 */
type StatusChipCompatProps = React.ComponentProps<typeof StatusChip> & {
  text: string;
  chipColor?: string;
};
const StatusChipCompat = StatusChip as unknown as React.FC<StatusChipCompatProps>;

/* ---------- Types ---------- */
type Status = "Uploaded" | "Pending Review" | "Reviewed" | "Shared";

type Row = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  gender: "Male" | "Female";
  date: string;
  time: string;
  type: string; // Consultation | Lab Report | Scan Report
  status: Status;
};

const rows: Row[] = [
  {
    id: "R#12345",
    name: "Rajeev Kumar",
    avatar: "https://i.pravatar.cc/100?img=5",
    age: 25,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Uploaded",
  },
  {
    id: "R#12346",
    name: "Marvin McKinney",
    avatar: "https://i.pravatar.cc/100?img=12",
    age: 35,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Pending Review",
  },
  {
    id: "R#12347",
    name: "Darrell Steward",
    avatar: "https://i.pravatar.cc/100?img=15",
    age: 40,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Reviewed",
  },
  {
    id: "R#12348",
    name: "Ronald Richards",
    avatar: "https://i.pravatar.cc/100?img=30",
    age: 50,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Shared",
  },
  {
    id: "R#12349",
    name: "Jacob Jones",
    avatar: "https://i.pravatar.cc/100?img=8",
    age: 42,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Uploaded",
  },
  {
    id: "R#12311",
    name: "Cameron Williamson",
    avatar: "https://i.pravatar.cc/100?img=22",
    age: 22,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Shared",
  },
  {
    id: "R#12366",
    name: "Savannah Nguyen",
    avatar: "https://i.pravatar.cc/100?img=32",
    age: 55,
    gender: "Female",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Reviewed",
  },
  {
    id: "R#12346",
    name: "Marvin McKinney",
    avatar: "https://i.pravatar.cc/100?img=12",
    age: 35,
    gender: "Male",
    date: "July 30, 2026",
    time: "08:30 AM to 10:30 AM",
    type: "Consultation",
    status: "Shared",
  },
];

/* ---------- Pill Tabs ---------- */
const Pill = ({ label, count }: { label: string; count: number }) => (
  <span className="inline-flex items-center gap-2 whitespace-nowrap leading-none">
    {label}
    <span className="opacity-80">({count})</span>
  </span>
);

/* ---------- Helpers ---------- */
const toDetailsSlug = (id: string) => {
  const num = id.match(/\d+/)?.[0] ?? id; // "R#12345" -> "12345"
  return `report-details-${num}`;
};

type TabKey = "all" | "uploaded" | "pending" | "reviewed" | "shared";
const isTabKey = (k: unknown): k is TabKey =>
  k === "all" ||
  k === "uploaded" ||
  k === "pending" ||
  k === "reviewed" ||
  k === "shared";

type ReportTypeKey = "All" | "Consultation" | "Lab Report" | "Scan Report";

const Report: React.FC = () => {
  const navigate = useNavigate();

  // UI state
  const [tab, setTab] = React.useState<TabKey>("all");
  const [query] = React.useState("");
  const [reportType, setReportType] = React.useState<ReportTypeKey>("All");
  const [page, setPage] = React.useState(1);
  const rowsPerPage = 8;

  // counts from full dataset
  const total = rows.length;
  const uploaded = rows.filter((r) => r.status === "Uploaded").length;
  const pending = rows.filter((r) => r.status === "Pending Review").length;
  const reviewed = rows.filter((r) => r.status === "Reviewed").length;
  const shared = rows.filter((r) => r.status === "Shared").length;

  // nav + a11y
  const goToDetails = (id: string) => {
    navigate(`/report/${toDetailsSlug(id)}`, { state: { id } });
  };
  const onRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    id: string
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToDetails(id);
    }
  };

  // filter + search + paginate
  const filtered = React.useMemo(() => {
    const byTab =
      tab === "all"
        ? rows
        : rows.filter((r) =>
            tab === "uploaded"
              ? r.status === "Uploaded"
              : tab === "pending"
              ? r.status === "Pending Review"
              : tab === "reviewed"
              ? r.status === "Reviewed"
              : r.status === "Shared"
          );

    const byType =
      reportType === "All" ? byTab : byTab.filter((r) => r.type === reportType);

    const q = query.trim().toLowerCase();
    const byQuery = !q
      ? byType
      : byType.filter((r) => {
          const hay = `${r.id} ${r.name} ${r.type} ${r.status}`.toLowerCase();
          return hay.includes(q);
        });

    return byQuery;
  }, [tab, reportType, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * rowsPerPage;
  const current = filtered.slice(start, start + rowsPerPage);
  const showingFrom = filtered.length === 0 ? 0 : start + 1;
  const showingTo = Math.min(filtered.length, start + current.length);

  React.useEffect(() => {
    setPage(1);
  }, [tab, reportType, query]);

  return (
    <div className="mx-auto w-full bg-white py-4 px-6 border border-gray-200 rounded-2xl">
      {/* Title + button */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[28px] font-semibold tracking-tight">Report</h2>

        <AppButton text="+ Upload New Report" />
      </div>

      {/* Filters + search */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          aria-label="Filters"
          selectedKey={tab}
          onSelectionChange={(k) => isTabKey(k) && setTab(k)}
          classNames={{
            tabList: "bg-transparent gap-3 p-0",
            tab:
              "h-9 rounded-full px-5 text-[14px] font-medium border border-gray-300 whitespace-nowrap bg-white " +
              "data-[hover=true]:bg-teal-50 data-[selected=true]:bg-teal-600 " +
              "data-[selected=true]:text-white data-[selected=true]:shadow-sm",
            tabContent: "text-slate-700 group-data-[selected=true]:!text-white",
            cursor: "hidden",
          }}
        >
          <Tab key="all" title={<Pill label="All" count={total} />} />
          <Tab key="uploaded" title={<Pill label="Uploaded" count={uploaded} />} />
          <Tab
            key="pending"
            title={<Pill label="Pending Review" count={pending} />}
          />
          <Tab key="reviewed" title={<Pill label="Reviewed" count={reviewed} />} />
          <Tab key="shared" title={<Pill label="Shared" count={shared} />} />
        </Tabs>

        <div className="flex items-center gap-3">
          <SearchField placeholder="Search Report" />
          <Dropdown>
            <DropdownTrigger>
              <DropdownButton
                text="Report Type"
                items={[
                  {
                    key: "male",
                    label: "Male",
                    onClick: () => console.log("Male selected"),
                  },
                  {
                    key: "female",
                    label: "Female",
                    onClick: () => console.log("Female selected"),
                  },
                ]}
              />
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Report type filter"
              onAction={(key) => setReportType(key as string as ReportTypeKey)}
              selectedKeys={new Set([reportType === "All" ? "" : reportType])}
            >
              <DropdownItem key="">All</DropdownItem>
              <DropdownItem key="Consultation">Consultation</DropdownItem>
              <DropdownItem key="Lab Report">Lab Report</DropdownItem>
              <DropdownItem key="Scan Report">Scan Report</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[14px]">
            <thead className="border-b border-gray-200">
              <tr className="text-left text-slate-500">
                <th className="px-6 py-4 font-medium">Report ID</th>
                <th className="px-6 py-4 font-medium">Patient Name</th>
                <th className="px-6 py-4 font-medium">Date &amp; Time</th>
                <th className="px-6 py-4 font-medium">Report Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right pr-8">Action</th>
              </tr>
            </thead>

            <tbody>
              {current.map((r, idx) => (
                <tr
                  key={`${r.id}-${start + idx}`} // stable even with duplicate ids
                  role="button"
                  tabIndex={0}
                  onClick={() => goToDetails(r.id)}
                  onKeyDown={(e) => onRowKeyDown(e, r.id)}
                  className={`cursor-pointer hover:bg-gray-50 focus:bg-gray-50 outline-none ${
                    idx !== current.length - 1 ? "border-b border-gray-200" : ""
                  }`}
                >
                  <td className="px-6 py-5">{r.id}</td>

                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <Avatar src={r.avatar} size="sm" radius="full" />
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-slate-500">
                          {r.age} years | {r.gender}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="font-medium">{r.date}</div>
                    <div className="text-xs text-slate-500">{r.time}</div>
                  </td>

                  <td className="px-6 py-5">{r.type}</td>

                  <td className="px-6 py-5">
                    {/* ✅ only type-fix, same output */}
                    <StatusChipCompat text="Confirmed" chipColor="success" />
                  </td>

                  <td className="px-6 py-5 text-right pr-8">
                    {/* stop row click when using menu */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            variant="light"
                            aria-label="Actions"
                            className="text-slate-600"
                          >
                            <FiMoreVertical />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="Row actions"
                          onAction={(key) => {
                            if (key === "view") goToDetails(r.id);
                          }}
                        >
                          <DropdownItem key="view">View</DropdownItem>
                          <DropdownItem key="download">Download</DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                          >
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}

              {current.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No reports found.
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
            {String(showingTo).padStart(2, "0")} of {filtered.length} entries
          </div>
          <Pagination
            isCompact
            showControls
            total={totalPages}
            page={page}
            onChange={setPage}
            classNames={{
              cursor: "bg-teal-600 text-white",
              item: "rounded-md",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Report;
