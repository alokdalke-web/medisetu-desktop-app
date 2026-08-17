import React from "react";
import { Button, Tabs, Tab } from "@heroui/react";
import { FiArchive, FiList, FiColumns, FiBarChart } from "react-icons/fi";

type ViewType = "list" | "board" | "analytics";

interface RequestHeaderProps {

  archivedCount: number;
  showArchived: boolean;
  onToggleArchived: () => void;
  viewType: ViewType;
  onViewChange: (view: ViewType) => void;
}

/**
 * Header section with search, filters, and view switcher tabs
 */
export const RequestHeader: React.FC<RequestHeaderProps> = ({
  archivedCount,
  showArchived,
  onToggleArchived,
  viewType,
  onViewChange,
}) => {
  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search and Date Filter */}

        {/* View Tabs */}
        <Tabs
          selectedKey={viewType}
          onSelectionChange={(value) => onViewChange(value as ViewType)}
          aria-label="View selector"
          className="w-full"
          classNames={{
            base: "w-full",
            tabList:
              "gap-2 w-fit p-1 bg-slate-100 rounded-xl",
            tab:
              [
                "px-4 py-2",
                "rounded-lg",
                "transition-all duration-200",
                "data-[hover=true]:bg-white",
                "data-[selected=true]:bg-white",
                "data-[selected=true]:shadow-sm",
                "data-[selected=true]:text-primary",
              ].join(" "),
            tabContent:
              "group-data-[selected=true]:font-medium",
            cursor: "hidden",
          }}
        >
          <Tab
            key="list"
            title={
              <div className="flex items-center gap-2">
                <FiList className="h-4 w-4" />
                <span>List View</span>
              </div>
            }
          />

          <Tab
            key="board"
            title={
              <div className="flex items-center gap-2">
                <FiColumns className="h-4 w-4" />
                <span>Board View</span>
              </div>
            }
          />

          <Tab
            key="analytics"
            title={
              <div className="flex items-center gap-2">
                <FiBarChart className="h-4 w-4" />
                <span>Analytics</span>
              </div>
            }
          />
        </Tabs>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            color={showArchived ? "primary" : "default"}
            startContent={<FiArchive />}
            onPress={onToggleArchived}
            className="font-medium"
          >
            {showArchived ? "Show Requests" : `Archive (${archivedCount})`}
          </Button>
        </div>
      </div>

    </div>
  );
};