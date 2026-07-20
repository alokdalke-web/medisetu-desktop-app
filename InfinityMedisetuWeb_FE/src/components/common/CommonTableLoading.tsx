/**
 * CommonTable Loading State Component
 * Displays loading spinner while data is being fetched
 */

import React from "react";
import { Spinner } from "@heroui/react";
import { LOADING_CLASSES } from "./constants";

interface CommonTableLoadingProps {
  /** Loading message text */
  message?: string;
}

const CommonTableLoading: React.FC<CommonTableLoadingProps> = ({
  message = "Loading data...",
}) => {
  return (
    <div className={LOADING_CLASSES.container}>
      <div className="flex flex-col items-center gap-3">
        <Spinner label={message} />
      </div>
    </div>
  );
};

export default CommonTableLoading;
