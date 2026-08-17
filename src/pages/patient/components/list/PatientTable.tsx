import { Avatar } from "@heroui/react";
import React from "react";
import { FiChevronDown, FiChevronUp, FiEdit2 } from "react-icons/fi";
import StatusChip from "../../../../components/shared/StatusChip";
import type { PatientTableProps } from "../../../../types/patient";
import { formatDateLong, getGender, pickDateTime } from "../../helpers/patientFormatters";
import BottomControls from "./BottomControls";
import SkeletonBlock from "./SkeletonBlock";
import { SyncStatusBadge } from "../../../../components/SyncStatusBadge";

const PatientTable: React.FC<PatientTableProps> = ({
  rows,
  showSkeleton,
  sortDir,
  onToggleSort,
  goToDetails,
  goToEdit,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
}) => (
  <div className="overflow-visible rounded-lg border border-line bg-surface shadow-lg dark:shadow-none">
    <div className="overflow-x-auto pb-1">
      <table className="w-full min-w-[1050px] table-fixed text-left">
        <thead className="bg-surface-muted">
          <tr className="border-b border-line">
            <th
              className="w-[240px] px-5 py-4 text-[13px] font-bold text-text-muted"
              aria-sort={sortDir === "asc" ? "ascending" : "descending"}
            >
              <button
                type="button"
                onClick={onToggleSort}
                aria-label={`Sort by patient name, currently ${sortDir === "asc" ? "ascending" : "descending"}`}
                className="-m-1 flex items-center gap-1 rounded p-1 hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Patient
                <div className="flex flex-col -space-y-1">
                  <FiChevronUp className={`text-[10px] ${sortDir === "asc" ? "text-primary" : "text-text-subtle"}`} />
                  <FiChevronDown className={`text-[10px] ${sortDir === "desc" ? "text-primary" : "text-text-subtle"}`} />
                </div>
              </button>
            </th>
            <th className="w-[150px] px-5 py-4 text-[13px] font-bold text-text-muted">Contact</th>
            <th className="w-[200px] px-5 py-4 text-[13px] font-bold text-text-muted">Address</th>
            <th className="w-[100px] px-5 py-4 text-[13px] font-bold text-text-muted">Visits</th>
            <th className="w-[140px] px-5 py-4 text-[13px] font-bold text-text-muted">Status</th>
            <th className="w-[140px] px-5 py-4 text-[13px] font-bold text-text-muted">Registered</th>
            <th className="w-[80px] px-5 py-4 text-right text-[13px] font-bold text-text-muted">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-line">
          {showSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={7} className="px-5 py-5">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <SkeletonBlock className="h-4 w-44" />
                      <SkeletonBlock className="mt-2 h-3 w-64 max-w-[70%]" />
                    </div>
                  </div>
                </td>
              </tr>
            ))
          ) : rows.length > 0 ? (
            rows.map((p) => {
              const dt = pickDateTime(p);
              const dateText = dt ? formatDateLong(dt) : "—";
              const gender = getGender(p);
              const ageText = p.age != null ? `${p.age} Y` : null;
              const addressParts = [p.address, p.city, p.state].filter(Boolean);
              const addressText = addressParts.length > 0 ? addressParts.join(", ") : "—";

              return (
                <tr
                  key={p.id}
                  className="cursor-pointer transition hover:bg-surface-muted"
                  onClick={() => goToDetails(p.id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          src={p.profileImage ?? ""}
                          name={p.name ?? " "}
                          size="sm"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        />
                        <div className="absolute -bottom-1 -right-1">
                          <SyncStatusBadge entityId={p.id} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-bold text-text">
                            {p.name ?? "—"}
                          </p>
                          {Array.isArray(p.familyMembers) && p.familyMembers.length > 0 && p.familyMembers[0]?.relationship && (
                            <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-800">
                              {p.familyMembers[0].relationship === "parent"
                                ? `Family of ${p.familyMembers[0].name ?? ""}`
                                : p.familyMembers[0].relationship}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[12px] font-medium text-text-muted">
                          {[ageText, gender !== "" ? gender : null]
                            .filter(Boolean)
                            .join("  •  ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-text">
                        {p.mobile || p.linkedNumber || "—"}
                      </p>
                      {!p.mobile && p.linkedNumber && (
                        <p className="truncate text-[11px] font-medium text-text-subtle">
                          Linked
                        </p>
                      )}
                      {p.alternateMobile && (
                        <p className="truncate text-[12px] font-medium text-text-muted">
                          Alt: {p.alternateMobile}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Address */}
                  <td className="px-5 py-4">
                    <p className="truncate text-[14px] font-medium text-text" title={addressText}>
                      {addressText}
                    </p>
                  </td>

                  {/* Visits */}
                  <td className="px-5 py-4">
                    <span className="text-[14px] font-semibold text-text">
                      {p.visitCount ?? 0}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusChip status={p.status || "New"} />
                  </td>

                  {/* Registered */}
                  <td className="px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-text">
                        {dateText}
                      </p>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="grid h-10 w-10 lg:h-9 lg:w-9 place-items-center rounded-lg border border-line bg-surface text-text-muted shadow-sm transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                        onClick={() => goToEdit(p.id)}
                        title="Edit patient"
                        aria-label="Edit patient"
                      >
                        <FiEdit2 className="text-[15px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="h-[320px] text-center text-text-subtle">
                No patients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <BottomControls
      show={!showSkeleton}
      page={page}
      setPage={setPage}
      totalPages={totalPages}
      totalRecords={totalRecords}
      rowsPerPage={rowsPerPage}
      setRowsPerPage={setRowsPerPage}
    />
  </div>
);

export default PatientTable;
