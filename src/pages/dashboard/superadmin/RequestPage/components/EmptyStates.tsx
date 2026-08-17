import React from "react";
import { Spinner, Card } from "@heroui/react";
import { FiInbox, FiAlertCircle } from "react-icons/fi";

interface LoadingStateProps {
  message?: string;
}

/**
 * Loading state component
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Fetching requests...",
}) => (
  <Card className="border border-slate-200 bg-white shadow-sm">
    <div className="flex justify-center rounded-xl py-16">
      <Spinner label={message} />
    </div>
  </Card>
);

interface ErrorStateProps {
  message: string;
}

/**
 * Error state component
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ message }) => (
  <Card className="border border-red-200 bg-red-50 shadow-sm">
    <div className="flex items-start gap-4 rounded-xl px-6 py-10">
      <FiAlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
      <div>
        <p className="font-medium text-red-900">Error loading requests</p>
        <p className="mt-1 text-sm text-red-700">{message}</p>
      </div>
    </div>
  </Card>
);

interface EmptyStateProps {
  title?: string;
  message?: string;
}

/**
 * Empty state component for no requests found
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No requests found",
  message = "No requests match your current filters.",
}) => (
  <Card className="border border-dashed border-slate-300 bg-slate-50 shadow-sm">
    <div className="flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
      <div className="rounded-full bg-slate-200 p-3 mb-4">
        <FiInbox className="h-6 w-6 text-slate-600" />
      </div>
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>
    </div>
  </Card>
);
