import { Pagination } from "@heroui/react";
import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { BottomControlsProps, PageSize } from "../../../../types/appointment";

const BottomControls: React.FC<BottomControlsProps> = ({
  show,
  page,
  setPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  setRowsPerPage,
  variant = "card",
}) => {
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pageSizeOptions: PageSize[] = [6, 10, 15];
  const fromRecord =
    totalRecords > 0 ? Math.min((page - 1) * rowsPerPage + 1, totalRecords) : 0;
  const toRecord = totalRecords > 0 ? Math.min(page * rowsPerPage, totalRecords) : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPageSizeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={
        variant === "plain"
          ? "px-0 py-0"
          : "border-t border-line px-4 py-3"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-center sm:justify-start">
          <span className="text-center text-[13px] font-medium text-text-muted sm:text-left">
            Showing {fromRecord} to {toRecord} of {totalRecords} appointments
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-end">
          <div className="flex items-center justify-center gap-2 text-[13px] font-medium text-text-muted sm:justify-start">
            <span className="whitespace-nowrap">Rows per page:</span>

            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsPageSizeOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isPageSizeOpen}
                aria-label="Rows per page"
                className={[
                  "flex h-10 lg:h-9 w-[72px] items-center justify-between rounded-lg border border-primary/35",
                  "bg-surface px-3 text-[13px] font-semibold text-primary shadow-sm",
                  "outline-none transition",
                  "hover:border-primary/60 hover:bg-primary/5",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20",
                ].join(" ")}
              >
                <span>{rowsPerPage}</span>

                <FiChevronDown
                  className={`text-primary transition-transform duration-200 ${isPageSizeOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {isPageSizeOpen && (
                <div role="listbox" aria-label="Rows per page options" className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[72px] overflow-hidden rounded-lg border border-line bg-surface shadow-lg dark:shadow-none">
                  {pageSizeOptions.map((size) => {
                    const active = rowsPerPage === size;

                    return (
                      <button
                        key={size}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setRowsPerPage(size);
                          setIsPageSizeOpen(false);
                        }}
                        className={[
                          "flex h-10 lg:h-9 w-full items-center px-3 text-left text-[13px] transition",
                          active
                            ? "bg-primary text-white"
                            : "bg-surface text-text hover:bg-primary/5 hover:text-primary",
                        ].join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {show && totalRecords > 0 && totalPages > 1 && (
            <div className="flex justify-center lg:justify-end">
              <Pagination
                isCompact
                showControls
                total={totalPages}
                page={page}
                onChange={setPage}
                radius="lg"
                classNames={{
                  wrapper: "gap-2 flex-wrap justify-center lg:justify-end",
                  item:
                    "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none " +
                    "hover:bg-surface-muted data-[active=true]:bg-primary data-[active=true]:text-white data-[active=true]:border-primary",
                  prev:
                    "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none hover:bg-surface-muted",
                  next:
                    "min-w-9 h-9 rounded-lg border border-line bg-surface text-text-muted shadow-none hover:bg-surface-muted",
                  cursor: "hidden",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomControls;
