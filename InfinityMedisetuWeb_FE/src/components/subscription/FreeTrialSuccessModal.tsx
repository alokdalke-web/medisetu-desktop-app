import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiCalendar, FiCreditCard, FiHeadphones, FiX } from "react-icons/fi";
import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";

interface FreeTrialSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiryDate?: string;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
}

const FreeTrialSuccessModal: React.FC<FreeTrialSuccessModalProps> = ({
  isOpen,
  onClose,
  expiryDate,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate confetti pieces with bigger size and more vibrant colors
      const colors = ["#0A6C74", "#46BEAE", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#3B82F6", "#EF4444"];
      const pieces: ConfettiPiece[] = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 15 + 8, // Increased size: 8-23px
        rotation: Math.random() * 360,
        delay: Math.random() * 0.8,
        duration: Math.random() * 2.5 + 2.5, // Slower fall: 2.5-5s
      }));
      
      setConfettiPieces(pieces);

      // Clear confetti after animation
      const timer = setTimeout(() => {
        setConfettiPieces([]);
      }, 6000); // Longer duration

      return () => clearTimeout(timer);
    } else {
      setConfettiPieces([]);
    }
  }, [isOpen]);

  const features = [
    {
      icon: FiCalendar,
      text: "Unlimited Appointments",
      color: "#0A6C74",
      bg: "#E8F6F4",
    },
    {
      icon: FiCheck,
      text: "Premium Features Unlocked",
      color: "#128635",
      bg: "#ECFDF5",
    },
    {
      icon: FiCreditCard,
      text: "Online Payments",
      color: "#3371EB",
      bg: "#EFF6FF",
    },
    {
      icon: FiHeadphones,
      text: "Priority Support",
      color: "#8A38F5",
      bg: "#F3E8FF",
    },
  ];

  const formatExpiryDate = (date?: string) => {
    if (!date) return "Next 30 days";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            classNames={{
              backdrop: "bg-slate-900/50 backdrop-blur-sm",
              base: "bg-transparent shadow-none",
            }}
            motionProps={{
              variants: {
                enter: {
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.3,
                    ease: "easeOut",
                  },
                },
                exit: {
                  scale: 0.95,
                  opacity: 0,
                  transition: {
                    duration: 0.2,
                    ease: "easeIn",
                  },
                },
              },
            }}
          >
            <ModalContent>
              <ModalBody className="p-0 relative">
                {/* Confetti Animation Layer */}
                {confettiPieces.length > 0 && (
                  <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
                    {confettiPieces.map((piece) => (
                      <motion.div
                        key={piece.id}
                        className="absolute"
                        initial={{
                          x: `${piece.x}vw`,
                          y: "-30px",
                          rotate: piece.rotation,
                          opacity: 1,
                          scale: 1,
                        }}
                        animate={{
                          y: "110vh",
                          rotate: piece.rotation + 1080, // More rotation
                          opacity: [1, 1, 0.8, 0],
                          scale: [1, 1.1, 1, 0.8],
                        }}
                        transition={{
                          duration: piece.duration,
                          delay: piece.delay,
                          ease: "linear",
                        }}
                      >
                        <div
                          className="rounded-full shadow-lg"
                          style={{
                            width: `${piece.size}px`,
                            height: `${piece.size}px`,
                            backgroundColor: piece.color,
                            boxShadow: `0 0 ${piece.size / 2}px ${piece.color}40`,
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
                >
                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Close"
                  >
                    <FiX className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </button>

                  {/* Gradient Background Header */}
                  <div className="relative bg-gradient-to-br from-primary via-primary-hover to-secondary h-32 flex items-center justify-center overflow-hidden">
                    {/* Animated circles in background */}
                    <motion.div
                      className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                      animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 20, 0],
                        y: [0, -20, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl"
                      animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -20, 0],
                        y: [0, 20, 0],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Success Icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: 0.2,
                        duration: 0.5,
                        type: "spring",
                        stiffness: 200,
                      }}
                      className="relative z-10"
                    >
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, duration: 0.3 }}
                        >
                          <FiCheck className="w-10 h-10 text-primary" strokeWidth={3} />
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="p-8 sm:p-10">
                    {/* Title */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                      className="text-center mb-6"
                    >
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-center gap-2">
                        <span>🎉</span>
                        <span>Welcome to Infinity Medisetu Premium!</span>
                      </h2>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                        Your <span className="font-bold text-primary">FREE 1-Month Premium Trial</span> has been activated successfully.
                        <br />
                        Enjoy all premium features and grow your clinic with confidence.
                      </p>
                    </motion.div>

                    {/* Expiry Badge */}
                    {expiryDate && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.3 }}
                        className="flex justify-center mb-6"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700">
                          <FiCalendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            Valid until {formatExpiryDate(expiryDate)}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                      {features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: feature.bg }}
                          >
                            <feature.icon
                              className="w-5 h-5"
                              style={{ color: feature.color }}
                              strokeWidth={2.5}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {feature.text}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.9, duration: 0.3 }}
                    >
                      <Button
                        onPress={onClose}
                        className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all text-base"
                      >
                        Start Exploring
                      </Button>
                    </motion.div>

                    {/* Footer Note */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.1, duration: 0.3 }}
                      className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4"
                    >
                      No credit card required • Cancel anytime • Full access to all features
                    </motion.p>
                  </div>
                </motion.div>
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};

export default FreeTrialSuccessModal;
