
import React from "react";
import {
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import StatusChip from "./StatusChip";
import Icons from "../../constants/icons";

type Status = "Active" | "Inactive" | "New" | "Blocked";

export type PatientRow = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  status: Status;
  profileImage?: string | null;
};

interface Props {
  data: PatientRow[];
  onRowClick?: (row: PatientRow) => void;
  onEdit?: (row: PatientRow) => void;
  onDelete?: (row: PatientRow) => void;
  title?: string;
}

const statusToChip = (s: Status): string =>
  s === "Active"
    ? "success"
    : s === "Blocked"
    ? "danger"
    : s === "New"
    ? "info"
    : "warning";

/**
 * ✅ Build fix (no functionality change):
 * StatusChip ke props type me chipColor missing hai,
 * so hum yahan locally usko proper type assert kar rahe hain.
 */
const StatusChipWithColor = StatusChip as unknown as React.FC<{
  text: Status;
  chipColor?: string;
}>;

const PatientData: React.FC<Props> = ({
  data,
  onRowClick,
  onEdit,
  title = "Patient Data",
}) => {
  return (
    <div className="mt-5 rounded-2xl border border-border-color bg-white p-4">
      <div className="mb-3 font-semibold">{title}</div>

      <div className="overflow-x-auto">
        <Table
          aria-label="Patient data table"
          removeWrapper
          classNames={{
            table: "min-w-full",
            th: "text-left text-gray-500 text-sm",
            td: "text-sm",
            tr: onRowClick ? "h-12 hover:bg-gray-50 cursor-pointer" : "h-12",
          }}
        >
          <TableHeader>
            <TableColumn>Patient Name</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Contact No.</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn align="end">Action</TableColumn>
          </TableHeader>

          <TableBody
            items={data}
            emptyContent={
              <div className="py-8 text-center text-slate-500">
                No patients found.
              </div>
            }
          >
            {(r: PatientRow) => (
              <TableRow key={r.id} onClick={() => onRowClick?.(r)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar src={r.profileImage ?? ""} size="sm" />
                    <span className="font-medium">{r.name}</span>
                  </div>
                </TableCell>

                <TableCell className="text-gray-500">{r.email || "—"}</TableCell>
                <TableCell>{r.mobile || "—"}</TableCell>

                <TableCell>
                  <StatusChipWithColor
                    text={r.status}
                    chipColor={statusToChip(r.status)}
                  />
                </TableCell>

                <TableCell>
                  <div
                    className="flex items-center justify-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      isIconOnly
                      radius="full"
                      variant="light"
                      aria-label="Edit"
                      onPress={() => onEdit?.(r)}
                    >
                      <img
                        src={Icons.editIcon2}
                        alt="edit"
                        className="h-4 w-4"
                      />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PatientData;
