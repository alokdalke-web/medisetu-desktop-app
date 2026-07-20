import React from "react";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  onViewAll?: () => void;
  viewAllText?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  onViewAll,
  viewAllText = "View All",
}) => {
  return (
    <div className="bg-white rounded-[16px] border border-[rgba(229,231,234,0.6)] p-3 sm:p-5 dark:bg-[#111726] dark:border-[#273244]">
      <h3 className="text-[14px] sm:text-[16px] font-semibold text-[#100e1c] mb-3 sm:mb-4 dark:text-white">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e7ea] dark:border-[#273244]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`pb-2.5 text-[11px] font-medium text-[#677294] dark:text-white/70 ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                      ? "text-center"
                      : "text-left"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[#f1f5f9] last:border-0 dark:border-[#273244]/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-2.5 text-[#100e1c] dark:text-white ${
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                        ? "text-center"
                        : "text-left"
                    }`}
                  >
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-4 text-[#0a6c74] text-[13px] font-medium flex items-center gap-1 hover:opacity-80 dark:text-[#9be7dc]"
        >
          {viewAllText} →
        </button>
      )}
    </div>
  );
};

export default DataTable;
