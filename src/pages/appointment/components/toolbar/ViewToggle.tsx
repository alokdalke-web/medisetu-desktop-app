import React from "react";
import { FiCalendar, FiGrid, FiList } from "react-icons/fi";
import type { ViewToggleProps } from "../../../../types/appointment";
import IconBtn from "./IconBtn";

const ViewToggle: React.FC<ViewToggleProps> = ({
  view,
  onSelectList,
  onSelectCard,
  onSelectCalendar,
}) => (
  <div className="flex items-center gap-2">
    <IconBtn active={view === "list"} label="List view" onClick={onSelectList}>
      <FiList />
    </IconBtn>
    <IconBtn active={view === "card"} label="Grid view" onClick={onSelectCard}>
      <FiGrid />
    </IconBtn>
    <IconBtn active={view === "calendar"} label="Calendar view" onClick={onSelectCalendar}>
      <FiCalendar />
    </IconBtn>
  </div>
);

export default ViewToggle;
