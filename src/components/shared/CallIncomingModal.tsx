import React, { useEffect, useRef } from "react";
import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";
import { FiPhone, FiUser } from "react-icons/fi";

interface CallIncomingModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerName: string;
  profileImage?: string;
callType: "RECEPTION" | "NEXT_PATIENT";
  onPickup: () => void;
  onDecline: () => void;
}

const AUTO_DECLINE_TIME = 20_000; // 30 seconds

const CallIncomingModal: React.FC<CallIncomingModalProps> = ({
  isOpen,
  onClose,
  callerName,
  profileImage,
  callType,
  onPickup,
  onDecline,
}) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-decline after 30 seconds
  useEffect(() => {
    if (isOpen) {
      timeoutRef.current = setTimeout(() => {
        onDecline();
      }, AUTO_DECLINE_TIME);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isOpen, onDecline]);

  // Clear timer when pickup happens
  const handlePickup = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onPickup();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      backdrop="transparent"
      hideCloseButton
      isDismissable={false}
      classNames={{
        base: "max-w-[340px] bg-[#0A0E2F] text-white border-none shadow-2xl animate-shake",
        wrapper: "z-[100]",
        backdrop: "hidden",
      }}
    >
      <ModalContent>
        <ModalBody className="py-12 flex flex-col items-center gap-8">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
  <div className="w-28 h-28 rounded-full bg-[#5BC0DE] flex items-center justify-center shadow-lg overflow-hidden border-2 border-white/20">
    {profileImage ? (
      <img
        src={profileImage}
        alt={callerName}
        className="w-full h-full object-cover rounded-full"
      />
    ) : (
      <FiUser className="text-6xl text-white" />
    )}
  </div>

            <h3 className="text-2xl font-bold tracking-tight">
              Dr. {callerName}
            </h3>
<span
  className={`mt-2 inline-flex px-3 py-1 rounded-full text-xl font-bold
    ${
      callType === "NEXT_PATIENT"
        ? "bg-sky-400/20 text-white border border-sky-400/30"
        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
    }
  `}
>
  {callType === "NEXT_PATIENT" ? "👤 Next Patient" : "📞 General Call"}
</span>


          </div>
 

          {/* Action */}
          <div className="flex justify-center w-full mt-4">
            <Button
              onPress={handlePickup}
              className="px-6 h-11 rounded-full bg-white text-[#0A0E2F] hover:bg-white/90 shadow-xl shadow-white/10 min-w-0 flex items-center gap-2"
            >
              <FiPhone className="text-lg" />
              <span className="font-semibold">Confirm</span>
            </Button>
          </div>
        </ModalBody>
      </ModalContent>

      {/* Shake Animation */}
<style>{`
  @keyframes slow-shake {
    0% { transform: translateX(0); }
    2% { transform: translateX(-4px); }
    4% { transform: translateX(4px); }
    6% { transform: translateX(-4px); }
    8% { transform: translateX(4px); }
    10% { transform: translateX(0); }
    100% { transform: translateX(0); }
  }

  .animate-shake {
    animation: slow-shake 2.5s ease-in-out infinite;
  }
`}</style>
    </Modal>
  );
};

export default CallIncomingModal;
