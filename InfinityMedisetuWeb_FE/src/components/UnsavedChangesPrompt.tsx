// src/components/UnsavedChangesPrompt.tsx
import React from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
} from "@heroui/react";
import { UNSAFE_NavigationContext } from "react-router";
import { useUnsavedChanges } from "../context/UnsavedChangesContext";

type AnyTx = { retry: () => void } & Record<string, any>;

function useBrowserRouterBlocker(
  when: boolean,
  onBlock: (tx: AnyTx) => void,
) {
  const { navigator } = React.useContext(UNSAFE_NavigationContext) as any;

  React.useEffect(() => {
    if (!when) return;
    if (!navigator?.block) return;

    const unblock = navigator.block((tx: AnyTx) => {
      const autoUnblockingTx: AnyTx = {
        ...tx,
        retry() {
          unblock();
          tx.retry();
        },
      };

      onBlock(autoUnblockingTx);
    });

    return unblock;
  }, [navigator, when, onBlock]);
}

const UnsavedChangesPrompt: React.FC = () => {
  const { isDirty, setDirty } = useUnsavedChanges();

  const [open, setOpen] = React.useState(false);
  const [pendingTx, setPendingTx] = React.useState<AnyTx | null>(null);
  const [shouldProceed, setShouldProceed] = React.useState(false);

  useBrowserRouterBlocker(isDirty, (tx) => {
    setPendingTx(tx);
    setOpen(true);
  });

  // browser refresh / tab close warning
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // proceed only after dirty state becomes false
  React.useEffect(() => {
    if (!shouldProceed) return;
    if (isDirty) return;
    if (!pendingTx) return;

    const tx = pendingTx;

    setShouldProceed(false);
    setPendingTx(null);
    tx.retry();
  }, [shouldProceed, isDirty, pendingTx]);

  const stayHere = () => {
    setOpen(false);
    setPendingTx(null);
    setShouldProceed(false);
  };

  const leaveWithoutSaving = () => {
    setOpen(false);
    setShouldProceed(true);
    setDirty(false);
  };

  return (
    <Modal
      isOpen={open}
      onClose={stayHere}
      isDismissable={false}
      hideCloseButton
      placement="center"
    >
      <ModalContent>
        <ModalHeader className="text-slate-900">
          Unsaved changes
        </ModalHeader>

        <ModalBody>
          <p className="text-sm text-slate-600">
            You changed some details but haven’t saved.
            <br />
            Do you want to leave without saving?
          </p>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={stayHere}>
            Stay
          </Button>

          <Button color="danger" onPress={leaveWithoutSaving}>
            Leave
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UnsavedChangesPrompt;