import React from "react";
import type { NavigateFunction } from "react-router";

type UseNewAppointmentShortcutsArgs = {
  navigate: NavigateFunction;
  isAddPatientOpen: boolean;
  isConfirmModalOpen: boolean;
};

const useNewAppointmentShortcuts = ({
  navigate,
  isAddPatientOpen,
  isConfirmModalOpen,
}: UseNewAppointmentShortcutsArgs) => {
  React.useEffect(() => {
    const isTypingElement = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;

      const tag = el.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable ||
        !!el.closest('input, textarea, select, [contenteditable="true"]')
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = String(e.key).toLowerCase();

      // Alt + N should work everywhere
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && key === "n") {
        e.preventDefault();
        e.stopPropagation();
        navigate("/patient/new");
        return;
      }

      if (e.defaultPrevented) return;
      if (e.repeat) return;

      if (isTypingElement(e.target)) return;
      if (isAddPatientOpen || isConfirmModalOpen) return;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isAddPatientOpen, isConfirmModalOpen]);
};

export default useNewAppointmentShortcuts;
