import React from "react";
import { FiAlertCircle, FiClock, FiList, FiThumbsUp } from "react-icons/fi";

/**
 * Get icon component by name string
 */
export const getKpiIcon = (iconName: string): React.ReactNode => {
  const iconProps = { className: "h-5 w-5" };

  switch (iconName) {
    case "FiList":
      return React.createElement(FiList, {
        ...iconProps,
        className: "h-5 w-5 text-slate-600",
      });
    case "FiClock":
      return React.createElement(FiClock, {
        ...iconProps,
        className: "h-5 w-5 text-amber-600",
      });
    case "FiThumbsUp":
      return React.createElement(FiThumbsUp, {
        ...iconProps,
        className: "h-5 w-5 text-emerald-600",
      });
    case "FiAlertCircle":
      return React.createElement(FiAlertCircle, {
        ...iconProps,
        className: "h-5 w-5 text-rose-600",
      });
    default:
      return null;
  }
};
