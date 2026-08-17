import React, { useEffect, useMemo, useState } from "react";
import {
  Checkbox,
  Input,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";
import { FiPlay, FiSearch, FiAlertCircle } from "react-icons/fi";
import ReportsLayout from "../../components/reports/ReportsLayout";
import DashboardDateRangePicker from "../dashboard/DashboardDateRangePicker";
import AppButton from "../../components/shared/AppButton";
import {
  useGetCustomReportSchemaQuery,
  useRunCustomReportMutation,
  type CustomCatalogDataSource,
  type CustomReportResult,
  type CustomReportRunArgs,
  type CustomValueType,
} from "../../redux/api/reportsOverviewApi";
import { useGetAllUsersQuery } from "../../redux/api/usersApi";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatValue(value: string | number, type: CustomValueType): string {
  if (type === "text") return String(value ?? "—");
  const n = Number(value ?? 0);
  if (type === "currency")
    return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`;
  if (type === "percentage") return `${n}%`;
  return new Intl.NumberFormat("en-IN").format(n);
}

/** Header shown before the first run, so the empty table isn't a bare box. */
const placeholderColumns = [
  { key: "g0", label: "Group", type: "text" as CustomValueType, align: "left" as const },
  { key: "m_placeholder", label: "Metrics", type: "number" as CustomValueType, align: "right" as const },
];

// Token-backed shells — no hardcoded hex, so light/dark follow index.css.
const PANEL =
  "rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5 dark:shadow-none";

const SELECT_CLASSNAMES = {
  trigger:
    "h-10 min-h-10 border border-line bg-surface shadow-none data-[hover=true]:border-primary/40 data-[open=true]:border-primary",
  value: "text-[13px] text-text",
  popoverContent: "border border-line bg-surface text-text",
} as const;

const INPUT_CLASSNAMES = {
  inputWrapper:
    "h-10 min-h-10 border border-line bg-surface shadow-none data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
  input: "text-[13px] text-text",
} as const;

const FieldLabel: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({
  htmlFor,
  children,
}) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 block text-[12px] font-medium text-text-muted"
  >
    {children}
  </label>
);

const StepHeading: React.FC<{
  step?: number;
  title: string;
  children?: React.ReactNode;
}> = ({ step, title, children }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
    <div className="flex min-w-0 items-center gap-2">
      {step !== undefined && (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
          {step}
        </span>
      )}
      <h3 className="truncate text-[15px] font-semibold text-text sm:text-[16px]">
        {title}
      </h3>
    </div>
    {children}
  </div>
);

const CustomReports: React.FC = () => {
  // ─── Catalogue (the builder renders itself from this) ──────────────────────
  const { data: schemaRes, isLoading: schemaLoading } =
    useGetCustomReportSchemaQuery();
  const dataSources: CustomCatalogDataSource[] = useMemo(
    () => schemaRes?.data.dataSources ?? [],
    [schemaRes],
  );

  const [dataSourceId, setDataSourceId] = useState<string>("");
  const source = useMemo(
    () => dataSources.find((s) => s.id === dataSourceId) ?? dataSources[0],
    [dataSources, dataSourceId],
  );

  // ─── Definition state ──────────────────────────────────────────────────────
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 29);

  const [startDate, setStartDate] = useState(toYMD(defaultStart));
  const [endDate, setEndDate] = useState(toYMD(defaultEnd));
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string>("");
  const [thenBy, setThenBy] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [metricSearch, setMetricSearch] = useState("");
  const [includeZeroValues, setIncludeZeroValues] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const [doctorId, setDoctorId] = useState("");
  const [service, setService] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [paymentStatus, setPaymentStatus] = useState("");

  const [result, setResult] = useState<CustomReportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runCustomReport, { isLoading: isRunning }] =
    useRunCustomReportMutation();

  // Filter lookups reuse the same sources as the other report screens.
  const { data: doctorsData } = useGetAllUsersQuery({
    page: 1,
    pageSize: 100,
    userType: "Doctor",
  });
  const { data: doctorProfileData } = useGetDoctorQuery();

  const doctorOptions = useMemo(
    () =>
      (doctorsData?.users ?? []).map((d: any) => ({
        label: d.name ?? "Unknown",
        value: d.id ?? d._id ?? "",
      })),
    [doctorsData],
  );

  const serviceOptions = useMemo(() => {
    const services = (doctorProfileData as any)?.result?.services ?? [];
    const unique = new Set<string>();
    for (const s of services) if (s.serviceName) unique.add(s.serviceName);
    return Array.from(unique).map((name) => ({ label: name, value: name }));
  }, [doctorProfileData]);

  // Seed the definition from the catalogue, and re-seed when the data source
  // changes — its metrics and dimensions differ.
  useEffect(() => {
    if (!source) return;
    setDataSourceId(source.id);
    setSelectedMetrics(source.metrics.slice(0, 4).map((m) => m.id));
    setGroupBy(source.dimensions[0]?.id ?? "");
    setThenBy("");
    setSortBy(source.metrics[0]?.id ?? "");
    setResult(null);
  }, [source?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusFilter = source?.filters.find((f) => f.id === "appointmentStatus");
  const paymentStatusFilter = source?.filters.find(
    (f) => f.id === "paymentStatus",
  );

  const visibleMetricGroups = useMemo(() => {
    if (!source) return [];
    const term = metricSearch.trim().toLowerCase();
    const byCategory = new Map<string, typeof source.metrics>();
    for (const metric of source.metrics) {
      if (term && !metric.label.toLowerCase().includes(term)) continue;
      const list = byCategory.get(metric.category) ?? [];
      list.push(metric);
      byCategory.set(metric.category, list);
    }
    return Array.from(byCategory.entries());
  }, [source, metricSearch]);

  const toggleMetric = (id: string) =>
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );

  const buildArgs = (
    nextPage: number,
    nextPageSize: number,
  ): CustomReportRunArgs => ({
    dataSource: source?.id ?? "",
    metrics: selectedMetrics,
    groupBy,
    thenBy: thenBy || undefined,
    filters: {
      startDate,
      endDate,
      doctorId: doctorId || undefined,
      service: service || undefined,
      appointmentStatus: statuses.length ? statuses : undefined,
      paymentStatus: (paymentStatus ||
        undefined) as CustomReportRunArgs["filters"]["paymentStatus"],
    },
    sortBy: sortBy || undefined,
    sortDirection,
    page: nextPage,
    pageSize: nextPageSize,
    includeZeroValues,
  });

  const runReport = async (nextPage = 1, nextPageSize = pageSize) => {
    if (!source || selectedMetrics.length === 0 || !groupBy) return;
    setRunError(null);
    try {
      const response = await runCustomReport(
        buildArgs(nextPage, nextPageSize),
      ).unwrap();
      setResult(response.data);
    } catch (err: any) {
      setResult(null);
      setRunError(
        err?.data?.message ??
          "Could not generate the report. Check the definition and try again.",
      );
    }
  };

  const resetDefinition = () => {
    if (!source) return;
    setSelectedMetrics(source.metrics.slice(0, 4).map((m) => m.id));
    setGroupBy(source.dimensions[0]?.id ?? "");
    setThenBy("");
    setSortBy(source.metrics[0]?.id ?? "");
    setSortDirection("desc");
    setDoctorId("");
    setService("");
    setStatuses([]);
    setPaymentStatus("");
    setIncludeZeroValues(false);
    setResult(null);
    setRunError(null);
  };

  const exportCsv = () => {
    if (!result) return;
    const header = result.columns.map((c) => c.label).join(",");
    const rows = result.rows.map((row) =>
      result.columns
        .map((c) => {
          const text = String(row[c.key] ?? (c.type === "text" ? "" : 0));
          return text.includes(",") ? `"${text}"` : text;
        })
        .join(","),
    );
    const totals = result.columns
      .map((c, i) => (i === 0 ? "Total" : String(result.totals[c.key] ?? "")))
      .join(",");
    const blob = new Blob([[header, ...rows, totals].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `custom-report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const canRun =
    Boolean(source) && selectedMetrics.length > 0 && Boolean(groupBy);

  /**
   * Column widths as percentages: the grouping columns take a third between
   * them and the metrics split the rest evenly. Without this the browser gives
   * all the slack to one column, leaving a dead gap mid-table.
   */
  const activeColumns = result?.columns ?? placeholderColumns;
  const dimensionCount = activeColumns.filter((c) => c.align === "left").length || 1;
  const metricCount = activeColumns.length - dimensionCount || 1;
  const columnWidth = (align: "left" | "right") =>
    align === "left" ? 34 / dimensionCount : 66 / metricCount;

  if (schemaLoading) {
    return (
      <ReportsLayout
        title="Custom Reports"
        subtitle="Build a report from your clinic's data."
      >
        <div className="animate-pulse space-y-4">
          <div className="h-[72px] rounded-2xl bg-surface-muted" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[320px] rounded-2xl bg-surface-muted" />
            ))}
          </div>
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout
      title="Custom Reports"
      subtitle="Build a report from your clinic's data — choose metrics, filters and grouping, then run it."
      onExport={result ? exportCsv : undefined}
    >
      {/* Builder */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        {/* Left: source + metrics */}
        <div className="space-y-4 sm:space-y-5">
          <div className={PANEL}>
            <StepHeading step={1} title="Select Data Source" />
            <Select
              aria-label="Data source"
              variant="bordered"
              radius="lg"
              selectedKeys={source ? new Set([source.id]) : new Set()}
              onSelectionChange={(keys) => {
                const key = Array.from(keys as Set<string>)[0];
                if (key) setDataSourceId(key);
              }}
              classNames={SELECT_CLASSNAMES}
            >
              {dataSources.map((s) => (
                <SelectItem key={s.id} textValue={s.label}>
                  {s.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className={PANEL}>
            <StepHeading step={2} title="Choose Metrics">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {selectedMetrics.length} selected
              </span>
            </StepHeading>
            <Input
              type="text"
              value={metricSearch}
              onValueChange={setMetricSearch}
              placeholder="Search metrics..."
              aria-label="Search metrics"
              variant="bordered"
              radius="lg"
              startContent={<FiSearch className="h-4 w-4 text-text-subtle" />}
              classNames={INPUT_CLASSNAMES}
              className="mb-4"
            />

            {/* overflow-x-hidden: the vertical scrollbar narrows the content box,
                which otherwise pushed the full-width rows into a second axis. */}
            <div className="max-h-[280px] space-y-4 overflow-y-auto overflow-x-hidden sm:max-h-80">
              {visibleMetricGroups.length === 0 ? (
                <p className="text-[12px] text-text-muted">
                  No metrics match “{metricSearch}”.
                </p>
              ) : (
                visibleMetricGroups.map(([category, metrics]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
                      {category}
                    </p>
                    {/* One metric per row — HeroUI's Checkbox is inline-flex, so
                        without a full-width base they run together on one line. */}
                    <div className="flex flex-col">
                      {metrics.map((metric) => (
                        <Checkbox
                          key={metric.id}
                          size="sm"
                          isSelected={selectedMetrics.includes(metric.id)}
                          onValueChange={() => toggleMetric(metric.id)}
                          classNames={{
                            base: "m-0 w-full max-w-full rounded-lg px-2 py-1.5 hover:bg-surface-muted data-[selected=true]:bg-primary/5",
                            label: "text-[13px] text-text",
                          }}
                        >
                          {metric.label}
                        </Checkbox>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedMetrics.length === 0 && (
              <p className="mt-3 text-[11px] text-danger">
                Select at least one metric to run the report.
              </p>
            )}
          </div>
        </div>

        {/* Right: filters, grouping, sorting */}
        <div className="space-y-4 sm:space-y-5 lg:col-span-2">
          <div className={PANEL}>
            {/* Reset and Run sit with the filters they act on — the page header
                already owns Export, so this screen doesn't add a second one. */}
            <StepHeading step={3} title="Apply Filters">
              <div className="flex flex-wrap items-center gap-2">
                <AppButton
                  text="Reset"
                  buttonVariant="outlined"
                  size="sm"
                  onPress={resetDefinition}
                  className="h-9 px-4 text-[13px]"
                />
                <AppButton
                  text="Run Report"
                  size="sm"
                  onPress={() => runReport(1)}
                  isDisabled={!canRun}
                  isLoading={isRunning}
                  startContent={
                    !isRunning ? <FiPlay className="h-3.5 w-3.5" /> : undefined
                  }
                  className="h-9 px-4 text-[13px]"
                />
              </div>
            </StepHeading>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              <div>
                {/* Same range picker the other report screens use. Its trigger is
                    forced to the 40px control height so it sits on the same line
                    as the selects beside it. */}
                <FieldLabel>Date Range</FieldLabel>
                <div className="[&_button]:!h-10 [&_button]:!w-full [&_button]:!justify-between [&_button]:!rounded-xl">
                  <DashboardDateRangePicker
                    startYmd={startDate}
                    endYmd={endDate}
                    isFetching={isRunning}
                    onApply={(nextStart, nextEnd) => {
                      setStartDate(nextStart);
                      setEndDate(nextEnd);
                    }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Doctor</FieldLabel>
                <Select
                  aria-label="Doctor"
                  variant="bordered"
                  radius="lg"
                  placeholder="All Doctors"
                  selectedKeys={doctorId ? new Set([doctorId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0];
                    setDoctorId(key === "__all__" ? "" : (key ?? ""));
                  }}
                  classNames={SELECT_CLASSNAMES}
                >
                  {[
                    <SelectItem key="__all__" textValue="All Doctors">
                      All Doctors
                    </SelectItem>,
                    ...doctorOptions.map((d) => (
                      <SelectItem key={d.value} textValue={d.label}>
                        {d.label}
                      </SelectItem>
                    )),
                  ]}
                </Select>
              </div>
              <div>
                <FieldLabel>Service</FieldLabel>
                <Select
                  aria-label="Service"
                  variant="bordered"
                  radius="lg"
                  placeholder="All Services"
                  selectedKeys={service ? new Set([service]) : new Set()}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0];
                    setService(key === "__all__" ? "" : (key ?? ""));
                  }}
                  classNames={SELECT_CLASSNAMES}
                >
                  {[
                    <SelectItem key="__all__" textValue="All Services">
                      All Services
                    </SelectItem>,
                    ...serviceOptions.map((s) => (
                      <SelectItem key={s.value} textValue={s.label}>
                        {s.label}
                      </SelectItem>
                    )),
                  ]}
                </Select>
              </div>
              {paymentStatusFilter && (
                <div>
                  <FieldLabel>{paymentStatusFilter.label}</FieldLabel>
                  <Select
                    aria-label={paymentStatusFilter.label}
                    variant="bordered"
                    radius="lg"
                    placeholder="All"
                    selectedKeys={
                      paymentStatus ? new Set([paymentStatus]) : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys as Set<string>)[0];
                      setPaymentStatus(key === "__all__" ? "" : (key ?? ""));
                    }}
                    classNames={SELECT_CLASSNAMES}
                  >
                    {[
                      <SelectItem key="__all__" textValue="All">
                        All
                      </SelectItem>,
                      ...(paymentStatusFilter.options ?? []).map((o) => (
                        <SelectItem key={o.value} textValue={o.label}>
                          {o.label}
                        </SelectItem>
                      )),
                    ]}
                  </Select>
                </div>
              )}
            </div>

            {statusFilter && (
              <div className="mt-4">
                <FieldLabel>{statusFilter.label}</FieldLabel>
                <div
                  role="group"
                  aria-label={statusFilter.label}
                  className="flex flex-wrap gap-1.5"
                >
                  {(statusFilter.options ?? []).map((option) => {
                    const active = statuses.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setStatuses((prev) =>
                            prev.includes(option.value)
                              ? prev.filter((s) => s !== option.value)
                              : [...prev, option.value],
                          )
                        }
                        className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          active
                            ? "border-primary bg-primary font-semibold text-white"
                            : "border-line bg-surface text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Its own row under the fields — inside the grid it floated at a
                different height to every labelled control beside it. */}
            <div className="mt-4 border-t border-line pt-3">
              <Checkbox
                size="sm"
                isSelected={includeZeroValues}
                onValueChange={setIncludeZeroValues}
                classNames={{ base: "m-0", label: "text-[13px] text-text" }}
              >
                Include rows with zero values
              </Checkbox>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            <div className={PANEL}>
              <StepHeading step={4} title="Group By" />
              <Select
                aria-label="Group by"
                variant="bordered"
                radius="lg"
                selectedKeys={groupBy ? new Set([groupBy]) : new Set()}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  if (key) setGroupBy(key);
                }}
                classNames={SELECT_CLASSNAMES}
                className="mb-3"
              >
                {(source?.dimensions ?? []).map((d) => (
                  <SelectItem key={d.id} textValue={d.label}>
                    {d.label}
                  </SelectItem>
                ))}
              </Select>

              <FieldLabel>Then By (Optional)</FieldLabel>
              <Select
                aria-label="Then by"
                variant="bordered"
                radius="lg"
                placeholder="None"
                selectedKeys={thenBy ? new Set([thenBy]) : new Set()}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys as Set<string>)[0];
                  setThenBy(key === "__none__" ? "" : (key ?? ""));
                }}
                classNames={SELECT_CLASSNAMES}
              >
                {[
                  <SelectItem key="__none__" textValue="None">
                    None
                  </SelectItem>,
                  ...(source?.dimensions ?? [])
                    .filter((d) => d.id !== groupBy)
                    .map((d) => (
                      <SelectItem key={d.id} textValue={d.label}>
                        {d.label}
                      </SelectItem>
                    )),
                ]}
              </Select>
            </div>

            <div className={PANEL}>
              <StepHeading step={5} title="Sort By" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  aria-label="Sort by"
                  variant="bordered"
                  radius="lg"
                  selectedKeys={sortBy ? new Set([sortBy]) : new Set()}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0];
                    if (key) setSortBy(key);
                  }}
                  classNames={SELECT_CLASSNAMES}
                  className="sm:flex-1"
                >
                  {[
                    ...(source?.metrics ?? [])
                      .filter((m) => selectedMetrics.includes(m.id))
                      .map((m) => (
                        <SelectItem key={m.id} textValue={m.label}>
                          {m.label}
                        </SelectItem>
                      )),
                    ...(groupBy
                      ? [
                          <SelectItem
                            key={groupBy}
                            textValue={`${source?.dimensions.find((d) => d.id === groupBy)?.label} (name)`}
                          >
                            {source?.dimensions.find((d) => d.id === groupBy)?.label}{" "}
                            (name)
                          </SelectItem>,
                        ]
                      : []),
                  ]}
                </Select>

                <Select
                  aria-label="Sort direction"
                  variant="bordered"
                  radius="lg"
                  selectedKeys={new Set([sortDirection])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys as Set<string>)[0];
                    if (key) setSortDirection(key as "asc" | "desc");
                  }}
                  classNames={SELECT_CLASSNAMES}
                  className="sm:w-[150px]"
                >
                  <SelectItem key="desc" textValue="Descending">
                    Descending
                  </SelectItem>
                  <SelectItem key="asc" textValue="Ascending">
                    Ascending
                  </SelectItem>
                </Select>
              </div>
              <p className="mt-3 text-[11px] leading-4 text-text-subtle">
                Rows are grouped and sorted on the server, so paging moves
                through groups rather than raw appointments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className={PANEL}>
        <StepHeading step={6} title="Results">
          {result && (
            <span className="text-[11px] text-text-subtle">
              Generated {new Date(result.meta.generatedAt).toLocaleString()}
            </span>
          )}
        </StepHeading>

        {runError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 p-3">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-[12px] text-danger">{runError}</p>
          </div>
        )}

        {/* Table styled after pages/appointment/components/list/AppointmentTable:
            same shell, surface-muted header, divided rows, thin scrollbar and
            bottom controls bar. */}
        <div
          className={[
            "overflow-visible rounded-lg border border-line bg-surface shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none",
            isRunning
              ? "pointer-events-none opacity-60 transition-opacity duration-200"
              : "transition-opacity duration-200",
          ].join(" ")}
        >
          <div className="overflow-x-auto pb-1 [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
            <table className="w-full min-w-[720px] table-fixed text-left">
              <thead className="bg-surface-muted">
                <tr className="border-b border-line">
                  {(result?.columns ?? placeholderColumns).map((column) => (
                    <th
                      key={column.key}
                      style={{ width: `${columnWidth(column.align)}%` }}
                      className={`px-5 py-4 text-[13px] font-bold text-text-muted ${
                        column.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {!result || result.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(result?.columns ?? placeholderColumns).length}
                      className="px-5 py-12 text-center"
                    >
                      <p className="text-[14px] font-semibold text-text">
                        {result ? "No matching data" : "No report run yet"}
                      </p>
                      <p className="mt-1 text-[13px] text-text-muted">
                        {result
                          ? `Nothing matched this definition between ${startDate} and ${endDate}.`
                          : "Pick your metrics and grouping above, then press Run Report."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.rows.map((row, index) => (
                    <tr
                      key={index}
                      className="transition hover:bg-surface-muted"
                    >
                      {result.columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-5 py-4 text-[13px] ${
                            column.align === "right"
                              ? "text-right tabular-nums text-text"
                              : "truncate font-medium text-text"
                          }`}
                        >
                          {formatValue(row[column.key], column.type)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>

              {result && result.rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-line bg-surface-muted">
                    {result.columns.map((column, i) => (
                      <td
                        key={column.key}
                        className={`px-5 py-3.5 text-[13px] font-bold text-text ${
                          column.align === "right"
                            ? "text-right tabular-nums"
                            : "text-left"
                        }`}
                      >
                        {i === 0
                          ? "Total"
                          : column.type === "text"
                            ? ""
                            : formatValue(
                                result.totals[column.key] ?? 0,
                                column.type,
                              )}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {result && result.rows.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <span className="text-center text-[13px] font-medium text-text-muted sm:text-left">
                  Showing {(result.pagination.page - 1) * result.pagination.pageSize + 1}{" "}
                  to{" "}
                  {Math.min(
                    result.pagination.page * result.pagination.pageSize,
                    result.pagination.totalRows,
                  )}{" "}
                  of {result.pagination.totalRows} groups
                </span>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
                  <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-text-muted sm:justify-start">
                    <span className="whitespace-nowrap">Rows per page:</span>
                    <Select
                      aria-label="Rows per page"
                      variant="bordered"
                      radius="lg"
                      size="sm"
                      selectedKeys={new Set([String(pageSize)])}
                      onSelectionChange={(keys) => {
                        const key = Array.from(keys as Set<string>)[0];
                        if (!key) return;
                        setPageSize(Number(key));
                        runReport(1, Number(key));
                      }}
                      classNames={{
                        ...SELECT_CLASSNAMES,
                        trigger: `${SELECT_CLASSNAMES.trigger} h-9 min-h-9 w-[86px]`,
                      }}
                    >
                      {["10", "25", "50"].map((size) => (
                        <SelectItem key={size} textValue={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <Pagination
                    page={result.pagination.page}
                    total={result.pagination.totalPages}
                    onChange={(nextPage) => runReport(nextPage)}
                    size="sm"
                    radius="lg"
                    showControls
                    classNames={{
                      item: "bg-surface text-text-muted border border-line",
                      cursor: "bg-primary text-white",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ReportsLayout>
  );
};

export default CustomReports;
