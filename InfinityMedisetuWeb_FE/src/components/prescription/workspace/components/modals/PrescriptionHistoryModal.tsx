import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import React from "react";
import { FiClock } from "react-icons/fi";
import PrescriptionsHistory from "../../../../../pages/patient/PrescriptionsHistory";
import type { PrescriptionWorkspaceProps } from "../../types";

const PrescriptionHistoryModal: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rxHistory: any[];
  isRxHistoryLoading: boolean;
  patient?: PrescriptionWorkspaceProps["patient"];
  doctor?: PrescriptionWorkspaceProps["doctor"];
  clinic?: PrescriptionWorkspaceProps["clinic"];
}> = ({
  isOpen,
  onOpenChange,
  rxHistory,
  isRxHistoryLoading,
  patient,
  doctor,
  clinic,
}) => (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "rounded-2xl border border-transparent bg-white text-slate-900 dark:border-[#273244] dark:bg-[#111726] dark:text-white",
        body: "p-0 bg-white dark:bg-[#111726]",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="border-b border-slate-200 px-5 py-4 dark:border-[#273244]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-[#1a3a35] dark:text-[#9be7dc]">
                  <FiClock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
                    Prescription History
                  </h2>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    {rxHistory.length > 0
                      ? `${rxHistory.length} previous prescription${rxHistory.length > 1 ? "s" : ""} found`
                      : "View all previous prescriptions"}
                  </p>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="bg-white px-5 py-4 dark:bg-[#111726]">
              <PrescriptionsHistory
                items={rxHistory}
                loading={isRxHistoryLoading}
                patient={patient}
                doctor={doctor}
                clinic={clinic}
              />
            </ModalBody>

            <ModalFooter className="border-t border-slate-200 px-5 py-3 dark:border-[#273244]">
              <Button
                size="sm"
                radius="sm"
                variant="bordered"
                className="h-9 rounded-lg border-slate-200 text-slate-700 text-[13px] font-semibold dark:border-[#38445a] dark:text-white"
                onPress={onClose}
              >
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );

export default PrescriptionHistoryModal;
