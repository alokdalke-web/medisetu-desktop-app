import {
  useState,
  type DragEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@heroui/react";

import {
  DateSeparator,
  DateDisplayFormat,
  HandlebarFieldGroup,
  TimeSeparator,
  TimeDisplayFormat,
  VitalsTableOrientation,
} from "./types";
import {
  CLINIC_LOGO_FIELD_ID,
  HANDLEBAR_FIELDS_BY_ID,
  VITALS_TABLE_ID,
} from "./constants";
import { resolveFieldDisplayValue } from "./utils";
import { TablePreview } from "./TablePreview";

type AutoAlignChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

type KeyToggleButtonProps = {
  isActive: boolean;
  isDisabled?: boolean;
  size?: "sm" | "md";
  onClick: () => void;
};

const KeyToggleButton = ({
  isActive,
  isDisabled = false,
  size = "md",
  onClick,
}: KeyToggleButtonProps) => {
  const sizeClassName =
    size === "sm"
      ? "h-7 rounded-lg px-2 text-[10px]"
      : "h-9 rounded-xl px-2.5 text-[11px]";

  return (
    <button
      aria-label={isActive ? "Hide key name" : "Show key name"}
      aria-pressed={isActive}
      disabled={isDisabled}
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 border font-medium transition-all duration-200 ${sizeClassName}
        
        ${isDisabled
          ? "cursor-not-allowed border-default-200 bg-default-100 text-default-300"
          : isActive
            ? `
              border-[#62878f]
              bg-[#62878f]
              text-white 
              shadow-sm 
              hover:bg-[#62878f] 
              active:scale-95
              focus:ring-2 focus:ring-[#62878f]
            `
            : `
              border-default-300 
              bg-content1 
              text-default-500 
              hover:border-default-400 
              hover:bg-default-100 
              hover:text-foreground
              active:scale-95
              focus:ring-2 focus:ring-default-300
            `
        }
      `}
    >
      <svg
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 transition-transform ${
          isActive ? "rotate-0" : "rotate-180 opacity-70"
        }`}
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <g transform="rotate(-90 8 8)">
          <path d="M0 8a4 4 0 0 1 7.465-2H14a.5.5 0 0 1 .354.146l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0L13 9.207l-.646.647a.5.5 0 0 1-.708 0L11 9.207l-.646.647a.5.5 0 0 1-.708 0L9 9.207l-.646.647A.5.5 0 0 1 8 10h-.535A4 4 0 0 1 0 8m4-3a3 3 0 1 0 2.712 4.285A.5.5 0 0 1 7.163 9h.63l.853-.854a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.793-.793-1-1h-6.63a.5.5 0 0 1-.451-.285A3 3 0 0 0 4 5" />
          <path d="M4 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
        </g>
      </svg>
    </button>
  );
};

export interface FieldsSidebarProps {
  autoAlignChatMessages: AutoAlignChatMessage[];
  canSubmitAutoAlignFeedback: boolean;
  isAutoAlignRunning: boolean;
  isAutoAlignFeedbackRunning: boolean;
  isGeminiAutoAlignEnabled: boolean;
  dateFormat: DateDisplayFormat;
  dateSeparator: DateSeparator;
  draggedField: string | null;
  handleFieldDragEnd: () => void;
  handleFieldDragStart: (
    event: DragEvent<HTMLButtonElement>,
    field: string,
  ) => void;
  hiddenFieldKeys: string[];
  hiddenGroupLabels: string[];
  hiddenItemCount: number;
  hideField: (fieldKey: string) => void;
  hideGroup: (groupLabel: string) => void;
  isFieldKeyNameVisible: (fieldId: string) => boolean;
  isSelectingAutoAlignArea: boolean;
  setShowHiddenList: Dispatch<SetStateAction<boolean>>;
  showHiddenList: boolean;
  timeFormat: TimeDisplayFormat;
  timeSeparator: TimeSeparator;
  toggleFieldKeyNameVisibility: (fieldId: string) => void;
  unhideField: (fieldKey: string) => void;
  unhideGroup: (groupLabel: string) => void;
  visibleFieldGroups: HandlebarFieldGroup[];
  vitalsTableOrientation: VitalsTableOrientation;
  submitAutoAlignFeedback: (feedback: string) => Promise<void>;
}

export const FieldsSidebar = ({
  autoAlignChatMessages,
  canSubmitAutoAlignFeedback,
  isAutoAlignRunning,
  isAutoAlignFeedbackRunning,
  isGeminiAutoAlignEnabled,
  dateFormat,
  dateSeparator,
  draggedField,
  handleFieldDragEnd,
  handleFieldDragStart,
  hiddenFieldKeys,
  hiddenGroupLabels,
  hiddenItemCount,
  hideField,
  hideGroup,
  isFieldKeyNameVisible,
  isSelectingAutoAlignArea,
  setShowHiddenList,
  showHiddenList,
  timeFormat,
  timeSeparator,
  toggleFieldKeyNameVisibility,
  unhideField,
  unhideGroup,
  visibleFieldGroups,
  vitalsTableOrientation,
  submitAutoAlignFeedback,
}: FieldsSidebarProps) => {
  const [autoAlignFeedbackInput, setAutoAlignFeedbackInput] = useState("");

  const handleSubmitAutoAlignFeedback = async () => {
    const trimmedFeedback = autoAlignFeedbackInput.trim();

    if (!trimmedFeedback || isAutoAlignFeedbackRunning) {
      return;
    }

    await submitAutoAlignFeedback(trimmedFeedback);
    setAutoAlignFeedbackInput("");
  };

  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col overflow-hidden border-l border-default-200 bg-content1">
      <div className="border-b border-default-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-500">
          Variables
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
          {canSubmitAutoAlignFeedback && (
            <div className="border-b border-default-100 p-3">
              <p className="text-[10px] text-default-400 mt-1">
                {isGeminiAutoAlignEnabled
                  ? "Gemini agent enabled: image-aware placement is active."
                  : "Gemini agent not configured: using local smart auto align."}
              </p>
              <div className="mt-2 rounded-lg border border-default-200 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-default-400">
                  Refine With Chat
                </p>
                <p className="text-[10px] text-default-400">
                  After first auto-align, describe what is off. The model reuses the
                  previous generation and updates positions.
                </p>
                <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1">
                  {autoAlignChatMessages.length === 0 ? (
                    <p className="rounded-md bg-default-100 px-2 py-1 text-[10px] text-default-400">
                      No feedback yet. Run auto align, then request refinements like
                      move diagnoses lower or reduce right-side stretching.
                    </p>
                  ) : (
                    autoAlignChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-md px-2 py-1 text-[10px] ${
                          message.role === "user"
                            ? "bg-primary/10 text-primary-700"
                            : "bg-default-100 text-default-700"
                        }`}
                      >
                        <p className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
                          {message.role === "user" ? "You" : "Model"}
                        </p>
                        <p className="whitespace-pre-wrap text-[11px] leading-snug">
                          {message.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <textarea
                  className="mt-2 w-full resize-none rounded-md border border-default-200 bg-content1 px-2 py-1.5 text-xs outline-none transition-colors focus:border-primary"
                  disabled={
                    !canSubmitAutoAlignFeedback ||
                    isAutoAlignRunning ||
                    isAutoAlignFeedbackRunning
                  }
                  placeholder={
                    canSubmitAutoAlignFeedback
                      ? "Example: Lower all allergy fields by 2-3% and reduce width of top-right values."
                      : "Run auto align once to enable feedback refinement."
                  }
                  rows={3}
                  value={autoAlignFeedbackInput}
                  onChange={(event) =>
                    setAutoAlignFeedbackInput(event.target.value)
                  }
                />
                <Button
                  className="mt-2 w-full"
                  color="primary"
                  isDisabled={
                    !canSubmitAutoAlignFeedback ||
                    !autoAlignFeedbackInput.trim() ||
                    isAutoAlignRunning ||
                    isAutoAlignFeedbackRunning
                  }
                  size="sm"
                  onClick={() => {
                    void handleSubmitAutoAlignFeedback();
                  }}
                >
                  {isAutoAlignFeedbackRunning
                    ? "Applying Feedback..."
                    : "Regenerate With Feedback"}
                </Button>
              </div>
            </div>
          )}

          <div className="border-b border-default-100 p-3">
            {hiddenItemCount > 0 ? (
              <button
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
                  showHiddenList
                    ? "border-default-300 bg-default-100 text-foreground"
                    : "border-default-200 text-default-500 hover:border-default-300 hover:text-foreground"
                }`}
                type="button"
                onClick={() => setShowHiddenList((v) => !v)}
              >
                <span className="font-medium">Hidden items</span>
                <span className="flex items-center gap-1">
                  <span className="rounded-full bg-default-200 px-1.5 py-0.5 text-[10px] font-semibold">
                    {hiddenItemCount}
                  </span>
                  <svg
                    className={`h-3 w-3 transition-transform ${showHiddenList ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            ) : (
              <p className="text-xs text-default-400">
                Drag variables from the list below and drop them on the canvas.
              </p>
            )}
          </div>

          {/* Hidden items panel */}
          {showHiddenList && hiddenItemCount > 0 && (
            <div className="border-b border-default-100 bg-default-50/50 p-3 space-y-3">
              {hiddenGroupLabels.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-default-400">
                    Hidden Groups
                  </p>
                  <div className="space-y-1">
                    {hiddenGroupLabels.map((groupLabel) => (
                      <div
                        key={groupLabel}
                        className="flex items-center justify-between rounded-lg border border-default-200 bg-content1 px-2.5 py-1.5"
                      >
                        <span className="text-xs capitalize">{groupLabel}</span>
                        <button
                          className="rounded-md border border-default-200 px-2 py-0.5 text-[10px] font-medium text-default-600 hover:border-primary hover:text-primary"
                          type="button"
                          onClick={() => unhideGroup(groupLabel)}
                        >
                          Unhide
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {hiddenFieldKeys.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-default-400">
                    Hidden Fields
                  </p>
                  <div className="space-y-1">
                    {hiddenFieldKeys.map((fieldKey) => {
                      const hiddenFieldMeta =
                        HANDLEBAR_FIELDS_BY_ID.get(fieldKey);
                      const canToggleKeyName =
                        fieldKey !== CLINIC_LOGO_FIELD_ID &&
                        !hiddenFieldMeta?.tablePreview;

                      return (
                        <div
                          key={fieldKey}
                          className="flex items-center gap-2 rounded-lg border border-default-200 bg-content1 px-2.5 py-1.5"
                        >
                          <KeyToggleButton
                            isActive={isFieldKeyNameVisible(fieldKey)}
                            isDisabled={!canToggleKeyName}
                            size="sm"
                            onClick={() => toggleFieldKeyNameVisibility(fieldKey)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {hiddenFieldMeta?.alias ?? fieldKey}
                            </p>
                            <p className="truncate text-[9px] text-default-400">
                              {hiddenFieldMeta?.tablePreview
                                ? hiddenFieldMeta.id === VITALS_TABLE_ID
                                  ? `Table (${vitalsTableOrientation})`
                                  : "Table preview"
                                : resolveFieldDisplayValue(
                                    hiddenFieldMeta?.id ?? fieldKey,
                                    hiddenFieldMeta?.dummyValue ?? "",
                                    dateFormat,
                                    dateSeparator,
                                    timeFormat,
                                    timeSeparator,
                              )}
                            </p>
                          </div>
                          <button
                            className="ml-auto shrink-0 rounded-md border border-default-200 px-2 py-0.5 text-[10px] font-medium text-default-600 hover:border-primary hover:text-primary"
                            type="button"
                            onClick={() => unhideField(fieldKey)}
                          >
                            Unhide
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Field groups list */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {visibleFieldGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="rounded-full border border-dashed border-default-200 p-4">
                  <svg
                    className="h-6 w-6 text-default-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-xs text-default-400">
                  All fields placed or hidden
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleFieldGroups.map((group) => (
                  <div key={group.label}>
                    {/* Group header */}
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-default-400">
                        {group.label}
                      </span>
                      <button
                        className="rounded border border-default-200 px-1.5 py-0.5 text-[9px] text-default-400 transition-colors hover:border-danger/40 hover:text-danger"
                        type="button"
                        onClick={() => hideGroup(group.label)}
                      >
                        Hide all
                      </button>
                    </div>

                    {/* Field chips */}
                    <div className="space-y-1">
                      {group.fields.map((field) => {
                        const isDraggingThisField = draggedField === field.id;
                        const fieldOrientation: VitalsTableOrientation =
                          field.id === VITALS_TABLE_ID
                            ? vitalsTableOrientation
                            : "horizontal";
                        const canToggleKeyName =
                          field.id !== CLINIC_LOGO_FIELD_ID &&
                          !field.tablePreview;

                        return (
                          <div
                            key={field.id}
                            className="group/field flex items-stretch gap-1.5"
                          >
                            <KeyToggleButton
                              isActive={isFieldKeyNameVisible(field.id)}
                              isDisabled={!canToggleKeyName}
                              onClick={() => toggleFieldKeyNameVisibility(field.id)}
                            />
                            <button
                              className={`min-w-0 flex-1 cursor-grab rounded-xl border px-3 py-2 text-left text-xs transition-all active:cursor-grabbing active:scale-[0.98] ${
                                isDraggingThisField
                                  ? "border-primary bg-primary/8 shadow-sm"
                                  : "border-default-200 bg-default-50/50 hover:border-default-300 hover:bg-default-50 hover:shadow-sm"
                              }`}
                              draggable={!isSelectingAutoAlignArea}
                              type="button"
                              onDragEnd={handleFieldDragEnd}
                              onDragStart={(event) =>
                                handleFieldDragStart(event, field.id)
                              }
                            >
                              <span className="flex items-center gap-1.5">
                                <svg
                                  className="h-2.5 w-2.5 shrink-0 text-default-300"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="9" cy="7" r="1.5" />
                                  <circle cx="15" cy="7" r="1.5" />
                                  <circle cx="9" cy="12" r="1.5" />
                                  <circle cx="15" cy="12" r="1.5" />
                                  <circle cx="9" cy="17" r="1.5" />
                                  <circle cx="15" cy="17" r="1.5" />
                                </svg>
                                <span className="truncate font-medium text-foreground">
                                  {field.alias}
                                </span>
                              </span>
                              {field.tablePreview ? (
                                <div className="mt-1.5">
                                  <TablePreview
                                    compact={true}
                                    orientation={fieldOrientation}
                                    tablePreview={field.tablePreview}
                                  />
                                </div>
                              ) : (
                                <span className="mt-0.5 block truncate text-[10px] text-default-400">
                                  {resolveFieldDisplayValue(
                                    field.id,
                                    field.dummyValue,
                                    dateFormat,
                                    dateSeparator,
                                    timeFormat,
                                    timeSeparator,
                                  )}
                                </span>
                              )}
                            </button>
                            <button
                              className="flex w-6 shrink-0 items-center justify-center rounded-lg border border-transparent text-default-300 opacity-0 transition-all hover:border-danger/30 hover:bg-danger/8 hover:text-danger group-hover/field:opacity-100"
                              title={`Hide ${field.alias}`}
                              type="button"
                              onClick={() => hideField(field.id)}
                            >
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </aside>
  );
};
