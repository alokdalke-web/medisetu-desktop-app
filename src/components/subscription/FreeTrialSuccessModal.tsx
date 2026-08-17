import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiActivity,
  FiAward,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiCreditCard,
  FiHeadphones,
  FiShield,
  FiStar,
  FiX,
} from "react-icons/fi";
import { Modal, ModalContent, ModalBody, Button } from "@heroui/react";

interface FreeTrialSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiryDate?: string;
  /** Plan name for a paid purchase, e.g. "Pro". Omit for the free-trial copy. */
  planName?: string;
  /** false when this celebrates a paid plan purchase rather than the free trial. */
  isFreeTrial?: boolean;
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
  planName,
  isFreeTrial = true,
}) => {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isOpen) {
      const colors = ["#0A6C74", "#46BEAE", "#2FAE8E", "#3371EB", "#8A38F5", "#128635", "#FFBD11"];
      const pieces: ConfettiPiece[] = Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 12 + 7,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.75,
        duration: Math.random() * 2.4 + 2.6,
      }));

      setConfettiPieces(pieces);

      const timer = setTimeout(() => {
        setConfettiPieces([]);
      }, 6000);

      return () => clearTimeout(timer);
    }

    setConfettiPieces([]);
  }, [isOpen]);

  const features = [
    {
      icon: FiCalendar,
      title: "Unlimited Appointments",
      description: "Manage all appointments with ease.",
      iconClassName: "bg-primary/10 text-primary dark:bg-primary-hover/15 dark:text-primary-hover",
      checkClassName: "bg-primary/10 text-primary dark:bg-primary-hover/15 dark:text-primary-hover",
    },
    {
      icon: FiAward,
      title: "Premium Features Unlocked",
      description: "Access advanced tools for better outcomes.",
      iconClassName: "bg-info-secondary/10 text-info-secondary dark:bg-info-secondary/20 dark:text-purple-200",
      checkClassName: "bg-info-secondary/10 text-info-secondary dark:bg-info-secondary/20 dark:text-purple-200",
    },
    {
      icon: FiCreditCard,
      title: "Online Payments",
      description: "Secure, fast and hassle-free transactions.",
      iconClassName: "bg-info/10 text-info dark:bg-info/20 dark:text-blue-200",
      checkClassName: "bg-info/10 text-info dark:bg-info/20 dark:text-blue-200",
    },
    {
      icon: FiHeadphones,
      title: "Priority Support",
      description: "Faster resolutions, always here for you.",
      iconClassName: "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-emerald-200",
      checkClassName: "bg-secondary/10 text-secondary dark:bg-secondary/20 dark:text-emerald-200",
    },
  ];

  const trustNotes = isFreeTrial
    ? [
      { icon: FiShield, text: "No credit card required" },
      { icon: FiActivity, text: "Cancel anytime" },
      { icon: FiStar, text: "Full access to all features" },
    ]
    : [
      { icon: FiShield, text: "Secure subscription" },
      { icon: FiActivity, text: "Manage anytime" },
      { icon: FiStar, text: "Premium access enabled" },
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

  const successTitle = isFreeTrial
    ? "Welcome to Infinity Medisetu Premium!"
    : `${planName ?? "Plan"} Activated!`;

  return (
    <AnimatePresence>
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="3xl"
          placement="center"
          backdrop="blur"
          hideCloseButton
          classNames={{
            backdrop: "bg-slate-900/55 backdrop-blur-md",
            wrapper: "items-center overflow-hidden p-2 sm:p-4",
            base: "m-0 w-[calc(100vw-16px)] max-w-[640px] bg-transparent shadow-none sm:w-[calc(100vw-32px)] [@media(max-height:760px)]:max-w-[600px] [@media(max-height:700px)]:max-w-[560px]",
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
                scale: 0.96,
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
            <ModalBody className="p-0">
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
                        rotate: piece.rotation + 1080,
                        opacity: [1, 1, 0.8, 0],
                        scale: [1, 1.08, 1, 0.85],
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
                initial={{ scale: 0.92, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="relative max-h-[calc(100dvh-24px)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500 rounded-[22px] bg-white shadow-2xl ring-1 ring-white/60 dark:bg-[#111726] dark:ring-[#273244] sm:max-h-[calc(100dvh-48px)] sm:rounded-[26px] [@media(max-height:700px)]:rounded-[18px]"
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-[#1f293d] dark:hover:text-slate-300 sm:right-4 sm:top-4"
                  aria-label="Close"
                >
                  <FiX className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </button>

                <div className="flex items-center justify-center">
                  <section className="relative flex w-full flex-col justify-center px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 [@media(max-height:760px)]:py-5 [@media(max-height:700px)]:py-4">
                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.36 }}
                      className="mx-auto w-full max-w-[640px] text-center"
                    >
                      <div className="mb-4 hidden items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary ring-1 ring-primary/10 dark:bg-primary-hover/15 dark:text-primary-hover dark:ring-primary-hover/15 sm:inline-flex [@media(max-height:760px)]:hidden">
                        <FiCheck className="h-4 w-4" />
                        Welcome
                      </div>

                      <h2 className="premium-trial-modal-title mx-auto max-w-[620px] font-bold text-slate-900 dark:text-white">
                        {successTitle}
                      </h2>

                      <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary-hover to-info sm:w-20 [@media(max-height:700px)]:mt-2" />

                      <p className="mx-auto mt-3 max-w-[480px] text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:mt-4 sm:text-sm [@media(max-height:760px)]:mt-2.5 [@media(max-height:760px)]:text-xs [@media(max-height:760px)]:leading-normal">
                        {isFreeTrial ? (
                          <>
                            Your <span className="font-extrabold text-primary dark:text-primary-hover">FREE 1-Month Premium Trial</span> has been
                            activated successfully.
                          </>
                        ) : (
                          <>
                            You're now subscribed to the <span className="font-extrabold text-primary dark:text-primary-hover">{planName ?? "new"} plan</span>.
                          </>
                        )}
                        <br className="hidden sm:block" />
                        Enjoy all premium features and grow your clinic with confidence.
                      </p>
                    </motion.div>

                    {expiryDate && (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.34, duration: 0.3 }}
                        className="mt-5 flex justify-center [@media(max-height:760px)]:mt-4 [@media(max-height:700px)]:mt-3"
                      >
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary ring-1 ring-primary/15 dark:bg-primary-hover/15 dark:text-primary-hover dark:ring-primary-hover/20 [@media(max-height:700px)]:px-3 [@media(max-height:700px)]:py-1.5 [@media(max-height:700px)]:text-xs">
                          <FiCalendar className="h-4 w-4 shrink-0 sm:h-5 sm:w-5 [@media(max-height:700px)]:h-4 [@media(max-height:700px)]:w-4" />
                          <span>
                            {isFreeTrial ? "Valid until" : "Renews on"} {formatExpiryDate(expiryDate)}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 [@media(max-height:760px)]:mt-5 [@media(max-height:700px)]:mt-4 [@media(max-height:700px)]:gap-2">
                      {features.map((feature, index) => {
                        const FeatureIcon = feature.icon;

                        return (
                          <motion.div
                            key={feature.title}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.45 + index * 0.08, duration: 0.32 }}
                            className="group flex min-h-[74px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 dark:border-[#273244] dark:bg-[#151c2d] sm:min-h-[82px] sm:p-3 [@media(max-height:700px)]:min-h-[58px] [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:p-2 max-[420px]:min-h-[58px] max-[420px]:gap-2 max-[420px]:p-2"
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 [@media(max-height:700px)]:h-8 [@media(max-height:700px)]:w-8 max-[420px]:h-8 max-[420px]:w-8 ${feature.iconClassName}`}>
                              <FeatureIcon className="h-4 w-4 sm:h-5 sm:w-5 [@media(max-height:700px)]:h-4 [@media(max-height:700px)]:w-4 max-[420px]:h-4 max-[420px]:w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-extrabold leading-snug text-slate-900 dark:text-white sm:text-sm [@media(max-height:700px)]:text-[13px] max-[420px]:text-[13px]">
                                {feature.title}
                              </span>
                              <span className="mt-0.5 block text-xs font-medium leading-4 text-slate-500 dark:text-slate-300 [@media(max-height:700px)]:hidden max-[420px]:hidden">
                                {feature.description}
                              </span>
                            </span>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 [@media(max-height:700px)]:h-6 [@media(max-height:700px)]:w-6 max-[420px]:h-6 max-[420px]:w-6 ${feature.checkClassName}`}>
                              <FiCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 [@media(max-height:700px)]:h-3.5 [@media(max-height:700px)]:w-3.5 max-[420px]:h-3.5 max-[420px]:w-3.5" strokeWidth={2.5} />
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>

                    <motion.div
                      initial={{ y: 18, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.82, duration: 0.3 }}
                      className="mt-5 flex justify-center [@media(max-height:760px)]:mt-4"
                    >
                      <Button
                        onPress={onClose}
                        className="h-10 w-full max-w-[440px] rounded-xl bg-gradient-to-r from-primary via-secondary to-primary-hover text-sm font-extrabold text-white shadow-xl shadow-primary/25 transition-transform hover:scale-[1.01] dark:text-[#04231f] sm:h-11 sm:max-w-[500px] sm:text-base [@media(max-height:700px)]:h-10 [@media(max-height:700px)]:text-sm"
                        startContent={<FiActivity className="h-4 w-4" />}
                        endContent={<FiChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />}
                      >
                        Start Exploring
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1, duration: 0.3 }}
                      className="mt-4 hidden flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-slate-500 dark:text-slate-300 sm:flex [@media(max-height:760px)]:hidden"
                    >
                      {trustNotes.map((note) => {
                        const NoteIcon = note.icon;

                        return (
                          <span key={note.text} className="inline-flex items-center gap-2">
                            <NoteIcon className="h-4 w-4 text-primary dark:text-primary-hover" />
                            {note.text}
                          </span>
                        );
                      })}
                    </motion.div>
                  </section>
                </div>
              </motion.div>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
    </AnimatePresence>
  );
};

export default FreeTrialSuccessModal;
