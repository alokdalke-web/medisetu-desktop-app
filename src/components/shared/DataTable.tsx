import {
  getKeyValue,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  type TableProps,
} from "@heroui/react";

interface Column<T> {
  key: keyof T | string;
  label: string;
}

interface DataTableProps<T extends { id?: string | number }>
  extends Omit<TableProps, "children"> {
  columns: Column<T>[];
  rows: T[];
  renderCell?: (row: T, columnKey: React.Key) => React.ReactNode;
  isLoading?: boolean;
}

const DataTable = <T extends { id?: string | number }>({
  columns,
  rows,
  renderCell,
  isLoading,
  ...props
}: DataTableProps<T>) => {
  return (
    <Table
      aria-label="data-table"
      shadow="none"
      classNames={{
        wrapper: "border-1 border-border-color rounded-lg",
        th: "bg-transparent text-secondary text-base font-normal",
        tr: "border-b last:border-0 border-black/10",
        td: "py-3 text-base font-normal",
      }}
      {...props}
    >
      <TableHeader>
        {columns.map((column) => (
          <TableColumn key={String(column.key)}>{column.label}</TableColumn>
        ))}
      </TableHeader>
      <TableBody emptyContent={"No data found"}>
        {rows.map((row, index) => (
          <TableRow
            key={row.id ?? index}
            className={props.onRowAction ? "cursor-pointer hover:bg-default-100" : ""}
          >
            {(columnKey) => (
              <TableCell>
                {renderCell
                  ? renderCell(row, columnKey)
                  : getKeyValue(row, columnKey)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DataTable;
