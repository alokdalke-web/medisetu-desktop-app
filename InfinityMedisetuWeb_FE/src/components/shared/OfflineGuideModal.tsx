import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { FiWifiOff, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { useConnectivityState } from '../../hooks/useConnectivityState';
import { motion } from 'framer-motion';

export const OfflineGuideModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const state = useConnectivityState();
  const isOffline = state !== 'online';

  if (!isOffline) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          boxShadow: ['0px 0px 0px rgba(239, 68, 68, 0)', '0px 0px 15px rgba(239, 68, 68, 0.4)', '0px 0px 0px rgba(239, 68, 68, 0)']
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 transition-colors mr-2 cursor-pointer"
        aria-label="Offline Warning"
      >
        <FiAlertTriangle className="text-red-500 dark:text-red-400 text-lg" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </motion.button>

      <Modal isOpen={isOpen} onOpenChange={setIsOpen} size="md">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-red-600">
                <div className="flex items-center gap-2">
                  <FiWifiOff size={24} />
                  <span>Offline Mode Guide</span>
                </div>
              </ModalHeader>
              <ModalBody className="pb-6">
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    You are currently operating in <strong>{state === 'lan_sync' ? 'LAN Sync' : 'Island Mode'}</strong>.
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                      <FiCheckCircle className="text-green-500" /> What you CAN do:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Register new patients</li>
                      <li>Book and manage appointments</li>
                      <li>Create prescriptions</li>
                      <li>Add new medicines</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1">
                      <FiAlertTriangle className="text-red-500" /> What is DISABLED:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Billing and payments history</li>
                      <li>Generating cloud reports</li>
                      <li>Modifying clinic configurations</li>
                    </ul>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Your work is automatically saved locally. Once the internet connection is restored, the app will automatically push all your pending changes to the cloud.
                  </p>
                </div>
                <div className="flex justify-end mt-4">
                  <Button color="primary" variant="light" onPress={onClose}>
                    Close
                  </Button>
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
