// src/pages/settings/LogoutModal.tsx
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
} from "@heroui/react";
import React from "react";
import { FiLogOut, FiX } from "react-icons/fi";

import { useAppDispatch } from "../../redux/hooks";
import { logout } from "../../redux/slices/authSlice";
import { clearNotifications } from "../../redux/slices/notificationSlice";
import { disconnectSocket } from "../../services/socket";

export interface LogoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm?: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
}) => {
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(clearNotifications());
    dispatch(logout());
    disconnectSocket();
    localStorage.clear();
    sessionStorage.clear();
    onOpenChange(false);
    onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      hideCloseButton
      placement="center"
      backdrop="blur"
      classNames={{
        base: "w-[420px] max-w-[90vw] rounded-3xl p-0 shadow-xl dark:bg-[#111726] dark:border dark:border-[#273244]",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <ModalBody className="px-8 py-8 flex flex-col items-center text-center relative">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors dark:text-slate-500 dark:hover:text-white dark:hover:bg-white/10"
              aria-label="Close"
            >
              <FiX size={18} />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-[#fff0f0] flex items-center justify-center mb-5 dark:bg-[#332022]">
              <div className="w-11 h-11 rounded-full bg-[#ffe4e4] flex items-center justify-center dark:bg-[#4d2528]">
                <FiLogOut className="text-[#e5484d]" size={20} />
              </div>
            </div>

            {/* Heading */}
            <h3 className="text-[20px] font-bold text-slate-900 mb-2 dark:text-white">
              Log Out of IMS?
            </h3>

            {/* Description */}
            <p className="text-[14px] text-slate-500 leading-relaxed mb-7 max-w-[300px] dark:text-slate-400">
              Logging out will end your current session and secure your account. Please confirm to continue.
            </p>

            {/* Actions */}
            <div className="flex gap-3 w-full">
              <Button
                variant="bordered"
                onPress={onClose}
                className="flex-1 h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-[14px] hover:bg-slate-50 dark:border-[#273244] dark:text-white dark:hover:bg-white/5"
              >
                Stay Logged In
              </Button>
              <Button
                onPress={handleLogout}
                className="flex-1 h-11 rounded-xl bg-[#e5484d] text-white font-semibold text-[14px] shadow-md shadow-red-200/40 hover:bg-[#d13438] dark:shadow-red-900/20"
              >
                Yes, Log Out
              </Button>
            </div>
          </ModalBody>
        )}
      </ModalContent>
    </Modal>
  );
};

export default LogoutModal;
