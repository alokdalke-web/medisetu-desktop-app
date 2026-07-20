import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import React from "react";
import { FiCheck } from "react-icons/fi";
import type { SwitchableRole } from "../../redux/slices/roleSlice";

interface RoleOption {
  role: SwitchableRole;
  label: string;
  description: string;
  available: boolean;
}

interface SwitchRoleModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeRole: string | null;
  hasAdminDoctorAccess: boolean;
  hasLabExist: boolean;
  hasPharmacyExist: boolean;
  onRoleSwitch: (role: SwitchableRole) => void;
  isMobile: boolean;
}

const SwitchRoleModal: React.FC<SwitchRoleModalProps> = ({
  isOpen,
  onOpenChange,
  activeRole,
  hasAdminDoctorAccess,
  hasLabExist,
  hasPharmacyExist,
  onRoleSwitch,
  isMobile,
}) => {
  const roleOptions: RoleOption[] = [
    {
      role: "Admin",
      label: "Admin",
      description: "Manage full system access",
      available: true,
    },
    {
      role: "Doctor",
      label: "Doctor",
      description: "View doctor dashboard & appointments",
      available: hasAdminDoctorAccess,
    },
    {
      role: "Lab_Assistant",
      label: "Lab",
      description: "Manage lab tests & sample tracking",
      available: hasLabExist,
    },
    {
      role: "Pharmacist",
      label: "Pharmacy",
      description: "Manage prescriptions, stock & sales",
      available: hasPharmacyExist,
    },
    {
      role: "Receptionist",
      label: "Reception",
      description: "Manage appointments & patient check-in",
      available: true,
    },
  ];

  // Only show roles that are available
  const availableRoles = roleOptions.filter((r) => r.available);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement={isMobile ? "bottom-center" : "center"}
      size="sm"
      backdrop="blur"
      classNames={{
        base: "rounded-2xl",
        header: "pb-0",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="text-lg font-bold text-gray-900">
                Switch Role
              </span>
              <span className="text-xs font-normal text-gray-500">
                Choose which panel you want to use
              </span>
            </ModalHeader>

            <ModalBody className="pt-4">
              <div className="space-y-2">
                {availableRoles.map((option) => (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => onRoleSwitch(option.role)}
                    className={`w-full rounded-xl border px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition ${
                      activeRole === option.role
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </div>
                    {activeRole === option.role && (
                      <FiCheck className="text-emerald-600" size={18} />
                    )}
                  </button>
                ))}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button variant="light" onPress={onClose} className="font-medium">
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default SwitchRoleModal;
