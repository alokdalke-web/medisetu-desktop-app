/**
 * CommonTable Empty State Component
 * Displays when table has no data
 */

import React from "react";
import { FiInbox } from "react-icons/fi";
import { EMPTY_STATE_CLASSES } from "./constants";

interface CommonTableEmptyProps {
  /** Title text to display */
  title?: string;
  /** Description text to display */
  description?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Custom render function for the entire empty state */
  render?: () => React.ReactNode;
}

const CommonTableEmpty: React.FC<CommonTableEmptyProps> = ({
  title = "No data available",
  description = "There are no records to display at the moment.",
  icon,
  render,
}) => {
  if (render) {
    return <div className={EMPTY_STATE_CLASSES.container}>{render()}</div>;
  }

  return (
    <div className={EMPTY_STATE_CLASSES.container}>
      <div className={EMPTY_STATE_CLASSES.icon}>
        {icon || <FiInbox />}
      </div>
      <h3 className={EMPTY_STATE_CLASSES.title}>{title}</h3>
      <p className={EMPTY_STATE_CLASSES.description}>{description}</p>
    </div>
  );
};

export default CommonTableEmpty;
