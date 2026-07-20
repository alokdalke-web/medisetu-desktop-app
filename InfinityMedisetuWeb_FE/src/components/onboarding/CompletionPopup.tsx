import React from "react";
import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";

interface CompletionPopupProps {
  isOpen: boolean;
  completedCount?: number;
  total?: number;
  onClose: () => void;
  onViewDashboard: () => void;
  onViewProfile?: () => void;
}

const CompletionPopup: React.FC<CompletionPopupProps> = ({
  isOpen,
  completedCount = 3,
  total = 3,
  onClose,
  onViewDashboard,
  onViewProfile,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideCloseButton={true}
      size="lg"
      placement="center"
      classNames={{
        base: "bg-white rounded-[24px]",
      }}
    >
      <ModalContent>
        <ModalBody className="p-12 flex flex-col items-center gap-9">
          {/* Progress Circle */}
          <div className="relative w-[106px] h-[106px] flex items-center justify-center">
            {/* Background Circle */}
            <div className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20" />
            
            {/* Progress Stroke - Full Circle */}
            <svg
              className="absolute w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#0A6C74"
                strokeWidth="8"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>

            {/* Text Content */}
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-2xl font-bold text-primary dark:text-primary-hover">100%</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {completedCount}/{total}
              </span>
            </div>
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-center gap-2 text-center max-w-[402px]">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Clinic setup completed successfully!
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400">
              You can now start managing appointments and prescriptions.
            </p>
          </div>

          {/* Actions */}
          <div className="flex w-full max-w-[402px] gap-4">
            <Button
              className="flex-1 h-[55px] bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-hover border border-primary dark:border-primary-hover font-semibold text-base rounded-full hover:bg-primary/20 dark:hover:bg-primary/30"
              onPress={onViewProfile}
            >
              View Profile
            </Button>
            <Button
              className="flex-1 h-[55px] bg-primary dark:bg-primary-hover text-white font-semibold text-base rounded-full hover:bg-primary-hover dark:hover:bg-primary shadow-lg shadow-primary/30"
              onPress={onViewDashboard}
            >
              View Dashboard
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CompletionPopup;
