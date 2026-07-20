/**
 * CommonTable Error State Component
 * Displays when there's an error loading table data
 */

import React from "react";
import { FiAlertCircle } from "react-icons/fi";
import { ERROR_STATE_CLASSES } from "./constants";

interface CommonTableErrorProps {
  /** Title text to display */
  title?: string;
  /** Error message to display */
  message?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Retry button callback */
  onRetry?: () => void;
  /** Custom render function */
  render?: () => React.ReactNode;
}

const CommonTableError: React.FC<CommonTableErrorProps> = ({
  title = "Error loading data",
  message = "An error occurred while loading the data. Please try again.",
  icon,
  onRetry,
  render,
}) => {
  if (render) {
    return <div className={ERROR_STATE_CLASSES.container}>{render()}</div>;
  }

  return (
    <div className={ERROR_STATE_CLASSES.container}>
      <div className={ERROR_STATE_CLASSES.icon}>
        {icon || <FiAlertCircle />}
      </div>
      <h3 className={ERROR_STATE_CLASSES.title}>{title}</h3>
      <p className={ERROR_STATE_CLASSES.description}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default CommonTableError;
