import { Chip, Avatar } from "@heroui/react";
import { FiMail, FiPhone, FiCalendar } from "react-icons/fi";
import { formatDate } from "../utils";

interface RendererProps {
  columnKey: string;
  rowData: any;
  displayValue: (value?: string | number | null) => string;
  getStatusColor: (status?: string | null) => any;
  getStatusLabel: (status?: string | null) => string;
}

export const renderProfileRequestCell = ({
  columnKey,
  rowData,
  displayValue,
  getStatusColor,
  getStatusLabel,
}: RendererProps) => {
  const profile = rowData.requestedData?.doctorProfile;
  const status = rowData.status ?? "pending";
  const displayName = displayValue(profile?.name ?? rowData.doctorName);
  const requestedDate = rowData.createdAt ?? rowData.requestedAt;

  switch (columnKey) {
    case "doctor":
      return (
        <div className="flex items-center gap-3">
          <Avatar
            name={displayName}
            className="flex-shrink-0 bg-primary/10 font-semibold text-primary"
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <FiMail size={14} />
              {displayValue(rowData.doctorEmail)}
            </p>
          </div>
        </div>
      );

    case "specialty":
      return (
        <div>
          <p className="font-medium text-slate-900">
            {displayValue(profile?.speciality ?? "—")}
          </p>
        </div>
      );

    case "clinic":
      return (
        <div>
          <p className="font-medium text-slate-900">
            {displayValue(rowData.clinicName)}
          </p>
          <p className="text-xs text-slate-500">
            {rowData.clinicCity || rowData.clinicState ? (
              <>
                {rowData.clinicCity && <span>{rowData.clinicCity}</span>}
                {rowData.clinicCity && rowData.clinicState && <span>, </span>}
                {rowData.clinicState && <span>{rowData.clinicState}</span>}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      );

    case "requestedOn":
      return (
        <div className="flex items-center gap-2">
          <FiCalendar className="text-slate-400" size={16} />
          <div>
            <p className="font-medium text-slate-900">
              {requestedDate ? formatDate(requestedDate) : "—"}
            </p>
            <p className="text-xs text-slate-500">
              {requestedDate
                ? new Date(requestedDate).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </div>
        </div>
      );

    case "status":
      return (
        <Chip
          size="sm"
          variant="flat"
          color={getStatusColor(status)}
          className="font-semibold capitalize"
        >
          {getStatusLabel(status)}
        </Chip>
      );

    case "contact":
      return (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <FiPhone size={14} className="text-slate-400" />
            {displayValue(profile?.mobile ?? rowData.doctorMobile)}
          </p>
        </div>
      );

    default:
      return displayValue(rowData[columnKey]);
  }
};
