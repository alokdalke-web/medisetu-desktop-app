import { useEffect } from "react";

type UseAppointmentKeyboardShortcutsArgs = {
  isCancelConfirmOpen: boolean;
  actionLoading: "cancel" | "confirm" | null;
  closeCancelModal: () => void;
  handleCancel: () => void | Promise<void>;
  canShowConfirm: boolean;
  actionsDisabled: boolean;
  handleConfirm: () => void | Promise<void>;
  canCancel: boolean;
  setIsCancelConfirmOpen: (open: boolean) => void;
};

const useAppointmentKeyboardShortcuts = ({
  isCancelConfirmOpen,
  actionLoading,
  closeCancelModal,
  handleCancel,
  canShowConfirm,
  actionsDisabled,
  handleConfirm,
  canCancel,
  setIsCancelConfirmOpen,
}: UseAppointmentKeyboardShortcutsArgs) => {
  useEffect(() => {
    if (!isCancelConfirmOpen) return;

    const handleCancelModalShortcut = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        !!target?.isContentEditable;

      if (isTyping) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Esc -> close modal only
      if (event.key === "Escape") {
        event.preventDefault();
        closeCancelModal();
        return;
      }

      // Enter -> confirm cancel
      if (event.key === "Enter") {
        event.preventDefault();

        if (actionLoading === "cancel") return;

        await handleCancel();
        closeCancelModal();
      }
    };

    window.addEventListener("keydown", handleCancelModalShortcut);

    return () => {
      window.removeEventListener("keydown", handleCancelModalShortcut);
    };
  }, [isCancelConfirmOpen, actionLoading]);

  // 2) keep your existing confirm shortcut useEffect
  useEffect(() => {
    const handleConfirmShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        !!target?.isContentEditable;

      if (isTyping) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.toLowerCase() !== "c") return;

      if (!canShowConfirm || actionsDisabled || actionLoading === "confirm") {
        return;
      }

      event.preventDefault();
      handleConfirm();
    };

    window.addEventListener("keydown", handleConfirmShortcut);
    return () => {
      window.removeEventListener("keydown", handleConfirmShortcut);
    };
  }, [canShowConfirm, actionsDisabled, actionLoading]);

  // 3) add NEW Esc shortcut for cancel
  useEffect(() => {
    const handleCancelShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        !!target?.isContentEditable;

      // don't fire while typing
      if (isTyping) return;

      // ignore modifier shortcuts
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // only Esc should work
      if (event.key !== "Escape") return;

      // open same cancel flow as button
      if (
        !canCancel ||
        actionsDisabled ||
        actionLoading === "cancel" ||
        isCancelConfirmOpen
      ) {
        return;
      }

      event.preventDefault();
      setIsCancelConfirmOpen(true);
    };

    window.addEventListener("keydown", handleCancelShortcut);
    return () => {
      window.removeEventListener("keydown", handleCancelShortcut);
    };
  }, [canCancel, actionsDisabled, actionLoading, isCancelConfirmOpen]);
};

export default useAppointmentKeyboardShortcuts;
