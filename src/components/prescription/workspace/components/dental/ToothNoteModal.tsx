import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { FiActivity } from "react-icons/fi";
import type { ToothNoteModalProps } from "../../../../../types/prescription";
import { isValidToothNote } from "../../helpers/dentalChart";

const MAX_NOTE_LENGTH = 200;

const ToothNoteModal: React.FC<ToothNoteModalProps> = ({
  isOpen,
  toothKey,
  initialNote,
  disabled = false,
  onSave,
  onRemove,
  onClose,
}) => {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (isOpen) setNote(initialNote);
  }, [isOpen, initialNote]);

  const toothLabel = toothKey ? toothKey.replace("-", " ") : "";
  const canSave = !disabled && isValidToothNote(note);
  const hasExistingNote = initialNote.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="center"
      classNames={{
        // Sits above ClinicalDrawer (overlay z-100 / panel z-101), matching
        // the escalating z-index convention used by other prescription modals.
        wrapper: "z-[200]",
        backdrop: "z-[199]",
      }}
    >
      <ModalContent className="overflow-hidden rounded-[28px]">
        {() => (
          <>
            <ModalHeader className="border-b border-line px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary dark:text-primary-hover">
                  <FiActivity size={18} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-6 text-text">
                    {toothLabel}
                  </h3>
                  <p className="text-[12px] font-medium leading-4 text-text-muted">
                    {disabled ? "Recorded note" : "Add a clinical note for this tooth"}
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="px-5 py-4">
              {disabled ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-text">
                  {initialNote || "No note recorded."}
                </p>
              ) : (
                <>
                  <Textarea
                    value={note}
                    onValueChange={(val) => setNote(val.slice(0, MAX_NOTE_LENGTH))}
                    placeholder="e.g. Needs RCT, Caries, Sensitive to cold..."
                    minRows={3}
                    maxRows={6}
                    autoFocus
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-text-subtle">
                    <span>Minimum 3 characters</span>
                    <span>
                      {note.trim().length}/{MAX_NOTE_LENGTH}
                    </span>
                  </div>
                </>
              )}
            </ModalBody>

            <ModalFooter className="border-t border-line px-5 py-4">
              {!disabled && hasExistingNote && (
                <Button
                  variant="light"
                  color="danger"
                  radius="full"
                  className="mr-auto font-semibold"
                  onPress={() => {
                    if (!toothKey) return;
                    onRemove(toothKey);
                    onClose();
                  }}
                >
                  Remove
                </Button>
              )}

              <Button
                variant="bordered"
                radius="full"
                onPress={onClose}
                className="border-line px-5 font-semibold text-text"
              >
                {disabled ? "Close" : "Cancel"}
              </Button>

              {!disabled && (
                <Button
                  radius="full"
                  className="bg-primary px-6 font-bold text-white shadow-sm hover:opacity-90"
                  isDisabled={!canSave}
                  onPress={() => {
                    if (!toothKey) return;
                    onSave(toothKey, note.trim());
                    onClose();
                  }}
                >
                  Save
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ToothNoteModal;
