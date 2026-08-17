import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Tooltip,
} from "@heroui/react";
import React from "react";
import {
  FiChevronDown,
  FiClock,
  FiDownload,
  FiEdit2,
  FiEye,
  FiPrinter,
} from "react-icons/fi";
import type { PrescriptionWorkspaceHeaderProps } from "../../../../types/prescription";
import { clinicTimeOrder, formatClinicTime } from "../helpers/clinicTime";

const PRIMARY_BTN =
  "h-9 rounded-lg bg-primary text-[13px] font-semibold text-white shadow-sm hover:opacity-90";

const PrescriptionWorkspaceHeader: React.FC<PrescriptionWorkspaceHeaderProps> = ({
  hasManualPrescription,
  patientId,
  appointmentId,
  editSaveInProgress,
  onEditPrescription,
  onOpenHistory,
  hasHistory = true,
  onViewDownload,
  isViewDownloadLoading,
  isViewDownloadDisabled,
  onDownload,
  onPrint,
  prescribedByName,
  prescribedAt,
  updatedAt,
}) => {
  /**
   * Prefer the last edit over the original write: the line used to show
   * `createdAt` only, so a prescription edited hours later still advertised the
   * time it was first saved. A minute of slack keeps a freshly created
   * prescription — whose `updatedAt` is set in the same transaction — from
   * reading as "Updated".
   */
  const createdOrder = clinicTimeOrder(prescribedAt);
  const updatedOrder = clinicTimeOrder(updatedAt);
  const wasEdited =
    updatedOrder !== null &&
    (createdOrder === null || updatedOrder - createdOrder > 60_000);

  const prescribedOn = wasEdited
    ? formatClinicTime(updatedAt)
    : formatClinicTime(prescribedAt);
  const timeLabel = wasEdited ? "Updated: " : "";

  // The chevron is only honest when there is more than one thing behind it —
  // with a single handler the button stays a plain button.
  const hasMenu = Boolean(onViewDownload && (onDownload || onPrint));

  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!hasManualPrescription && (
          <Button
            size="sm"
            radius="sm"
            variant="bordered"
            className="h-9 rounded-lg border-line text-[13px] font-semibold text-text"
            startContent={<FiEdit2 className="h-3.5 w-3.5" />}
            onPress={onEditPrescription}
            isDisabled={!patientId || !appointmentId || editSaveInProgress}
          >
            Edit Prescription
          </Button>
        )}

        {onViewDownload &&
          (hasMenu ? (
            <div className="flex">
              <Button
                size="sm"
                radius="sm"
                className={`${PRIMARY_BTN} rounded-r-none pr-3`}
                startContent={
                  !isViewDownloadLoading ? (
                    <FiDownload className="h-3.5 w-3.5" />
                  ) : null
                }
                isLoading={isViewDownloadLoading}
                isDisabled={isViewDownloadDisabled}
                onPress={onViewDownload}
              >
                {isViewDownloadLoading ? "Preparing..." : "View / Download"}
              </Button>

              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button
                    size="sm"
                    radius="sm"
                    isIconOnly
                    className={`${PRIMARY_BTN} w-9 min-w-9 rounded-l-none border-l border-white/25`}
                    isDisabled={isViewDownloadDisabled || isViewDownloadLoading}
                    aria-label="More prescription actions"
                  >
                    <FiChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownTrigger>

                <DropdownMenu aria-label="Prescription actions">
                  <DropdownItem
                    key="view"
                    startContent={<FiEye className="h-3.5 w-3.5" />}
                    onPress={onViewDownload}
                  >
                    View prescription
                  </DropdownItem>

                  {onDownload ? (
                    <DropdownItem
                      key="download"
                      startContent={<FiDownload className="h-3.5 w-3.5" />}
                      onPress={onDownload}
                    >
                      Download PDF
                    </DropdownItem>
                  ) : null}

                  {onPrint ? (
                    <DropdownItem
                      key="print"
                      startContent={<FiPrinter className="h-3.5 w-3.5" />}
                      onPress={onPrint}
                    >
                      Print
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          ) : (
            <Button
              size="sm"
              radius="sm"
              className={PRIMARY_BTN}
              startContent={
                !isViewDownloadLoading ? (
                  <FiDownload className="h-3.5 w-3.5" />
                ) : null
              }
              isLoading={isViewDownloadLoading}
              isDisabled={isViewDownloadDisabled}
              onPress={onViewDownload}
            >
              {isViewDownloadLoading ? "Preparing..." : "View / Download"}
            </Button>
          ))}

        {hasHistory && (
          <Tooltip content="Prescription History" placement="top">
            <Button
              size="sm"
              radius="sm"
              variant="bordered"
              isIconOnly
              className="h-9 w-9 min-w-9 rounded-lg border-primary/30 text-primary hover:bg-primary/5"
              onPress={onOpenHistory}
              aria-label="Prescription History"
            >
              <FiClock className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </div>

      {/* One wrapping line instead of two stacked ones — on a laptop this meta
          costs no extra height beside the buttons, and it still breaks cleanly
          on narrow screens. */}
      {(prescribedByName || prescribedOn) && (
        <div className="flex flex-wrap justify-end gap-x-1.5 text-right text-[11px] leading-4 text-text-muted">
          {prescribedByName && <span>Prescribed by: {prescribedByName}</span>}
          {prescribedByName && prescribedOn && (
            <span aria-hidden="true">·</span>
          )}
          {prescribedOn && (
            <span>
              {timeLabel}
              {prescribedOn}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PrescriptionWorkspaceHeader;
