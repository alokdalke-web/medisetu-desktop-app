import React from "react";
import { getBookingSourceMeta } from "../../helpers/appointmentListFormatters";

const BookingSourceCell: React.FC<{ source: string | null | undefined }> = ({ source }) => {
  if (!source) {
    return <span className="text-text-subtle">—</span>;
  }
  const meta = getBookingSourceMeta(source);
  return (
    <span className={["inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold", meta.className].join(" ")}>
      {meta.label}
    </span>
  );
};

export default BookingSourceCell;
