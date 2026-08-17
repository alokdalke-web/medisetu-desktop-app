import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import { FiAlertTriangle, FiClock, FiHash } from "react-icons/fi";

import { pad2 } from "../helpers/dateTimeHelpers";
import type { CustomSlotModalProps } from "../../../../types/appointment";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_STEP_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Payload keeps the 24hr `HH:mm` format regardless of the 12hr picker shown to the user.
const to24Hour = (hour12: number, meridiem: "AM" | "PM"): number => {
  if (meridiem === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
};

/**
 * The picker opens on "now", rounded up to the next 5-minute mark so it lands on a value the
 * Minute dropdown actually offers (and never on a minute that has already passed).
 */
const nowRoundedTo5 = (): { hour: number; minute: number; meridiem: "AM" | "PM" } => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + ((5 - (d.getMinutes() % 5)) % 5), 0, 0);
  const h24 = d.getHours();
  return {
    hour: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: d.getMinutes(),
    meridiem: h24 >= 12 ? "PM" : "AM",
  };
};

const toMinutes = (time24: string): number => {
  const [h, m] = time24.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? -1 : h * 60 + m;
};

const toLabel12 = (time24: string): string => {
  const [h, m] = time24.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad2(m)} ${h >= 12 ? "PM" : "AM"}`;
};

/**
 * HeroUI's Select opens its listbox scrolled to the top, so with a long option list (Hour, Minute)
 * the currently selected value can sit off-screen. Centre it in the scrollport once the popover
 * has mounted.
 */
const scrollSelectedIntoView = (listboxId: string, selectedKey: string) => {
  requestAnimationFrame(() => {
    const option = document.querySelector<HTMLElement>(
      `#${listboxId} [data-key="${selectedKey}"]`,
    );
    option?.scrollIntoView({ block: "center" });
  });
};

const CustomSlotModal: React.FC<CustomSlotModalProps> = ({
  isOpen,
  onOpenChange,
  isTokenMode,
  onConfirmTime,
  onConfirmToken,
  workingWindows,
}) => {
  const [hour, setHour] = React.useState(() => nowRoundedTo5().hour);
  const [minute, setMinute] = React.useState(() => nowRoundedTo5().minute);
  const [meridiem, setMeridiem] = React.useState<"AM" | "PM">(() => nowRoundedTo5().meridiem);
  const [tokenInput, setTokenInput] = React.useState("");
  const [tokenError, setTokenError] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;
    const { hour: nowHour, minute: nowMinute, meridiem: nowMeridiem } = nowRoundedTo5();
    setHour(nowHour);
    setMinute(nowMinute);
    setMeridiem(nowMeridiem);
    setTokenInput("");
    setTokenError("");
  }, [isOpen]);

  const selectedTime24 = `${pad2(to24Hour(hour, meridiem))}:${pad2(minute)}`;

  // Warning only — reception can still confirm an out-of-hours time deliberately.
  const isOutsideWorkingHours = React.useMemo(() => {
    if (isTokenMode || !workingWindows?.length) return false;
    const picked = toMinutes(selectedTime24);
    return !workingWindows.some(
      (w) => picked >= toMinutes(w.start) && picked < toMinutes(w.end),
    );
  }, [isTokenMode, workingWindows, selectedTime24]);

  const handleConfirm = () => {
    if (isTokenMode) {
      const trimmed = tokenInput.trim();
      if (!/^\d+$/.test(trimmed) || Number(trimmed) <= 0) {
        setTokenError("Enter a valid token number.");
        return;
      }
      onConfirmToken(Number(trimmed));
    } else {
      onConfirmTime(selectedTime24);
    }
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="sm"
      classNames={{ base: "rounded-2xl bg-surface" }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-[15px] font-bold text-text">
              {isTokenMode ? (
                <FiHash className="h-4 w-4 text-primary" />
              ) : (
                <FiClock className="h-4 w-4 text-primary" />
              )}
              {isTokenMode ? "Custom Token" : "Custom Slot"}
            </ModalHeader>

            <ModalBody>
              {isTokenMode ? (
                <Input
                  type="number"
                  label="Token Number"
                  placeholder="e.g. 24"
                  variant="bordered"
                  radius="lg"
                  min={1}
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    if (tokenError) setTokenError("");
                  }}
                  isInvalid={!!tokenError}
                  errorMessage={tokenError}
                  classNames={{ inputWrapper: "min-h-11 rounded-xl border-line" }}
                />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    aria-label="Hour"
                    label="Hour"
                    variant="bordered"
                    radius="lg"
                    selectedKeys={new Set([String(hour)])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val !== undefined) setHour(Number(val));
                    }}
                    disallowEmptySelection
                    listboxProps={{ id: "custom-slot-hours" }}
                    onOpenChange={(open) => {
                      if (open) scrollSelectedIntoView("custom-slot-hours", String(hour));
                    }}
                    classNames={{ trigger: "border-line", listboxWrapper: "max-h-56" }}
                  >
                    {HOURS_12.map((h) => (
                      <SelectItem key={String(h)} textValue={String(h)}>
                        {h}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    aria-label="Minute"
                    label="Minute"
                    variant="bordered"
                    radius="lg"
                    selectedKeys={new Set([String(minute)])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val !== undefined) setMinute(Number(val));
                    }}
                    disallowEmptySelection
                    listboxProps={{ id: "custom-slot-minutes" }}
                    onOpenChange={(open) => {
                      if (open) scrollSelectedIntoView("custom-slot-minutes", String(minute));
                    }}
                    classNames={{ trigger: "border-line", listboxWrapper: "max-h-56" }}
                  >
                    {MINUTES_STEP_5.map((m) => (
                      <SelectItem key={String(m)} textValue={pad2(m)}>
                        {pad2(m)}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    aria-label="AM or PM"
                    label="Period"
                    variant="bordered"
                    radius="lg"
                    selectedKeys={new Set([meridiem])}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) setMeridiem(val as "AM" | "PM");
                    }}
                    disallowEmptySelection
                    classNames={{ trigger: "border-line", listboxWrapper: "max-h-56" }}
                  >
                    <SelectItem key="AM" textValue="AM">AM</SelectItem>
                    <SelectItem key="PM" textValue="PM">PM</SelectItem>
                  </Select>
                </div>
              )}

              {isOutsideWorkingHours && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-[12px] font-medium text-warning"
                >
                  <FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {toLabel12(selectedTime24)} is outside the doctor&apos;s working hours
                    {workingWindows?.length
                      ? ` (${workingWindows.map((w) => `${toLabel12(w.start)} – ${toLabel12(w.end)}`).join(", ")})`
                      : ""}
                    . You can still book it.
                  </span>
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              <Button
                variant="flat"
                className="flex-1 rounded-xl font-semibold text-text-muted"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-primary font-semibold text-white"
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default CustomSlotModal;
