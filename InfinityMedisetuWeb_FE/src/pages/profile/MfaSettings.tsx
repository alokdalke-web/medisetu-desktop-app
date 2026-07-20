// src/pages/profile/MfaSettings.tsx
import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  addToast,
} from "@heroui/react";
import {
  FiShield,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiDownload,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
} from "react-icons/fi";

import {
  useGetMfaStatusQuery,
  useEnableMfaMutation,
  useVerifyEnrollmentMutation,
  useDisableMfaMutation,
  useRegenerateRecoveryMutation,
} from "../../redux/api/mfaApi";

type MfaStep =
  | "idle"
  | "qr-scan"
  | "recovery-codes"
  | "disable-confirm"
  | "regenerate-confirm";

export default function MfaSettings() {
  const { data: statusData, isLoading: statusLoading } =
    useGetMfaStatusQuery();

  const [enableMfa, { isLoading: enableLoading }] = useEnableMfaMutation();
  const [verifyEnrollment, { isLoading: verifyLoading }] =
    useVerifyEnrollmentMutation();
  const [disableMfa, { isLoading: disableLoading }] = useDisableMfaMutation();
  const [regenerateRecovery, { isLoading: regenerateLoading }] =
    useRegenerateRecoveryMutation();

  const [step, setStep] = useState<MfaStep>("idle");
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [otpauthUri, setOtpauthUri] = useState("");
  const [base32Secret, setBase32Secret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  const mfaEnabled = statusData?.data?.mfaEnabled ?? false;
  const remainingCodes = statusData?.data?.recoveryCodesRemaining ?? 0;
  const lastModified = statusData?.data?.lastModifiedAt;

  const resetState = () => {
    setStep("idle");
    setOtpauthUri("");
    setBase32Secret("");
    setTotpCode("");
    setPassword("");
    setShowPassword(false);
    setRecoveryCodes([]);
    setError("");
    setCodesAcknowledged(false);
  };

  /* ─── Enable MFA ─── */
  const handleEnableMfa = async () => {
    setError("");
    try {
      const data = await enableMfa().unwrap();
      setOtpauthUri(data.data.otpauthUri);
      setBase32Secret(data.data.base32Secret);
      setStep("qr-scan");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to initiate MFA setup";
      if (err?.status === 409) {
        addToast({ title: "Already Enabled", description: msg, color: "warning" });
      } else {
        addToast({ title: "Error", description: msg, color: "danger" });
      }
    }
  };

  /* ─── Verify Enrollment ─── */
  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(totpCode)) {
      setError("Code must be exactly 6 digits");
      return;
    }
    try {
      const data = await verifyEnrollment({ totpCode }).unwrap();
      setRecoveryCodes(data.data.recoveryCodes);
      setTotpCode("");
      setStep("recovery-codes");
      addToast({
        title: "MFA Enabled",
        description: "Two-factor authentication is now active on your account.",
        color: "success",
      });
    } catch (err: any) {
      setError(err?.data?.message || "Verification failed");
    }
  };

  /* ─── Disable MFA ─── */
  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) { setError("Password is required"); return; }
    try {
      await disableMfa({ password }).unwrap();
      resetState();
      addToast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been removed.",
        color: "success",
      });
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to disable MFA";
      setError(err?.status === 429 ? "Too many attempts. Please try again later." : msg);
    }
  };

  /* ─── Regenerate Recovery Codes ─── */
  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(totpCode)) {
      setError("Code must be exactly 6 digits");
      return;
    }
    try {
      const data = await regenerateRecovery({ totpCode }).unwrap();
      setRecoveryCodes(data.data.recoveryCodes);
      setTotpCode("");
      setStep("recovery-codes");
      addToast({
        title: "Codes Regenerated",
        description: "Your old recovery codes are now invalid.",
        color: "success",
      });
    } catch (err: any) {
      setError(err?.data?.message || "Failed to regenerate codes");
    }
  };

  /* ─── Copy / Download Recovery Codes ─── */
  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    addToast({ title: "Copied", description: "Recovery codes copied to clipboard.", color: "success" });
  };

  const handleDownloadCodes = () => {
    const content = [
      "MediSetu - MFA Recovery Codes",
      `Generated: ${new Date().toISOString()}`,
      "",
      "Keep these codes in a safe place. Each code can only be used once.",
      "",
      ...recoveryCodes.map((code, i) => `${i + 1}. ${code}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "medisetu-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const totpInputClass =
    "h-[46px] w-full rounded-lg border border-[#E2E8F0] dark:border-[#273244] bg-white dark:bg-[#172033] px-4 text-center text-base font-mono tracking-[0.25em] text-[#1A1A2E] dark:text-white outline-none transition-colors focus:border-[#0A6C74] focus:ring-1 focus:ring-[#0A6C74] disabled:opacity-50";

  const passwordInputClass =
    "h-[46px] w-full rounded-lg border border-[#E2E8F0] dark:border-[#273244] bg-white dark:bg-[#172033] px-4 pr-10 text-sm text-[#1A1A2E] dark:text-white outline-none transition-colors focus:border-[#0A6C74] focus:ring-1 focus:ring-[#0A6C74] disabled:opacity-50";

  if (statusLoading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244] p-8">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" color="primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244]">
        {/* Header — clickable to toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-[#FAFCFC] dark:hover:bg-[#172033] transition-colors rounded-2xl"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-[#0A6C74] flex items-center justify-center">
              <FiShield className="h-4 w-4 text-[#0A6C74]" />
            </div>
            <div>
              <h2 className="text-[15px] sm:text-[18px] font-bold text-[#1A1A2E] dark:text-white">
                Two-Factor Authentication (2FA)
              </h2>
              <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 hidden sm:block">Add an extra layer of security with authenticator app</p>
            </div>
          </div>
          <FiChevronDown
            className={`h-4 w-4 sm:h-5 sm:w-5 text-[#6B7280] dark:text-white/60 shrink-0 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"
              }`}
          />
        </button>

        {/* Content — collapsible */}
        {!isCollapsed && (
          <div className="px-6 py-5 border-t border-[#E8EEEE] dark:border-[#273244]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left Column — 2FA Status */}
              <div>
                <h3 className="text-[14px] font-semibold text-[#1A1A2E] dark:text-white mb-3">
                  2FA Status
                </h3>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#E6F7F0] dark:bg-[#0A6C74]/20 flex items-center justify-center shrink-0">
                    <FiCheckCircle className="h-4.5 w-4.5 text-[#0A6C74]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[#0A6C74]">
                      {mfaEnabled ? "Enabled" : "Not Enabled"}
                    </p>
                    <p className="text-[12px] text-[#6B7280] dark:text-white/60 mt-0.5 leading-relaxed">
                      {mfaEnabled
                        ? "Your account is secured with two-factor authentication."
                        : "Add an extra layer of security to your account by enabling two-factor authentication."}
                    </p>
                  </div>
                </div>

                {/* Status details when enabled */}
                {mfaEnabled && (
                  <div className="mt-3 pt-3 border-t border-[#E8EEEE] dark:border-[#273244] space-y-1.5 ml-12">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#6B7280] dark:text-white/60">Recovery codes remaining</span>
                      <span className={`font-semibold ${remainingCodes <= 2 ? "text-amber-600" : "text-[#1A1A2E] dark:text-white"}`}>
                        {remainingCodes}/10
                      </span>
                    </div>
                    {lastModified && (
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#6B7280] dark:text-white/60">Last modified</span>
                        <span className="font-medium text-[#1A1A2E] dark:text-white">
                          {new Date(lastModified).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Warning banners */}
                {mfaEnabled && remainingCodes <= 2 && remainingCodes > 0 && (
                  <div className="mt-3 ml-12 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                    <FiAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Low recovery codes. Consider regenerating.</span>
                  </div>
                )}
                {mfaEnabled && remainingCodes === 0 && (
                  <div className="mt-3 ml-12 flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-400">
                    <FiAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>No recovery codes remaining. Regenerate immediately.</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!mfaEnabled ? (
                    <Button
                      className="rounded-lg bg-[#0A6C74] text-white px-5 text-[13px] font-semibold hover:opacity-90"
                      onPress={handleEnableMfa}
                      isLoading={enableLoading}
                      size="sm"
                    >
                      Enable Two-Factor Authentication
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="bordered"
                        className="rounded-lg border-[#0A6C74] text-[#0A6C74] px-4 text-[12px] font-semibold"
                        onPress={() => { setStep("regenerate-confirm"); setError(""); setTotpCode(""); }}
                        size="sm"
                      >
                        Regenerate Recovery Codes
                      </Button>
                      <Button
                        variant="bordered"
                        className="rounded-lg border-rose-300 text-rose-600 px-4 text-[12px] font-semibold"
                        onPress={() => { setStep("disable-confirm"); setError(""); setPassword(""); }}
                        size="sm"
                      >
                        Disable MFA
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column — How it works */}
              <div>
                <h3 className="text-[14px] font-semibold text-[#1A1A2E] dark:text-white mb-4">
                  How it works?
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      step: "1",
                      title: "Install an authenticator app",
                      desc: "Download Google Authenticator, Authy, or Microsoft Authenticator.",
                    },
                    {
                      step: "2",
                      title: "Scan QR code",
                      desc: "Scan the QR code with your authenticator app.",
                    },
                    {
                      step: "3",
                      title: "Enter the OTP",
                      desc: "Enter the 6-digit code generated by the app.",
                    },
                    {
                      step: "4",
                      title: "You're all set!",
                      desc: "Your account will be secured with two-factor authentication.",
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-md bg-[#E6F7F0] dark:bg-[#0A6C74]/20 flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-bold text-[#0A6C74]">
                          {item.step}
                        </span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1A2E] dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-[12px] text-[#6B7280] dark:text-white/60 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── QR Scan Modal ─── */}
      <Modal
        isOpen={step === "qr-scan"}
        onOpenChange={(open) => { if (!open) resetState(); }}
        placement="center"
        size="md"
        backdrop="blur"
        isDismissable={false}
        classNames={{ base: "mx-3 rounded-2xl dark:bg-[#111726]", closeButton: "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#172033]" }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
            <h3 className="text-[17px] font-bold text-[#1A1A2E] dark:text-white">
              Set Up Authenticator App
            </h3>
            <p className="text-[12px] text-[#6B7280] dark:text-white/60 font-normal">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </ModalHeader>
          <ModalBody className="px-6 py-4">
            {/* QR Code */}
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-xl border border-[#E8EEEE] dark:border-[#273244] bg-white dark:bg-white p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauthUri)}`}
                  alt="QR Code for authenticator app"
                  className="h-[180px] w-[180px]"
                />
              </div>
            </div>
            {/* Manual secret */}
            <div className="rounded-lg bg-[#F8FAFA] dark:bg-[#172033] border border-[#E8EEEE] dark:border-[#273244] p-3">
              <p className="text-[11px] text-[#6B7280] dark:text-white/60 mb-1">Can't scan? Enter this code manually:</p>
              <code className="block text-[13px] font-mono font-semibold text-[#1A1A2E] dark:text-white break-all select-all tracking-wide">
                {base32Secret}
              </code>
            </div>

            {/* TOTP input */}
            <form onSubmit={handleVerifyEnrollment} className="mt-4 space-y-3">
              <div>
                <label htmlFor="enroll-totp" className="mb-1.5 block text-[12px] font-semibold text-[#1A1A2E] dark:text-white">
                  Enter the 6-digit code from your app
                </label>
                <input
                  id="enroll-totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  disabled={verifyLoading}
                  className={totpInputClass}
                  autoFocus
                />
              </div>
              {error && <p className="text-[11px] text-rose-600" role="alert">{error}</p>}
              <div className="flex gap-3 pt-1">
                <Button
                  variant="bordered"
                  className="flex-1 rounded-lg border-[#E2E8F0] dark:border-[#273244] text-[#1A1A2E] dark:text-white font-semibold text-[13px]"
                  onPress={resetState}
                  isDisabled={verifyLoading}
                  size="md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-lg bg-[#0A6C74] text-white font-semibold text-[13px]"
                  isLoading={verifyLoading}
                  isDisabled={totpCode.length !== 6}
                  size="md"
                >
                  Verify & Activate
                </Button>
              </div>
            </form>
            <p className="text-center text-[10px] text-[#9CA3AF] dark:text-white/40 mt-2">This setup expires in 10 minutes</p>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ─── Recovery Codes Modal ─── */}
      <Modal
        isOpen={step === "recovery-codes"}
        onOpenChange={(open) => { if (!open && codesAcknowledged) resetState(); }}
        placement="center"
        size="md"
        backdrop="blur"
        isDismissable={codesAcknowledged}
        hideCloseButton={!codesAcknowledged}
        classNames={{ base: "mx-3 rounded-2xl dark:bg-[#111726]" }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
            <h3 className="text-[17px] font-bold text-[#1A1A2E] dark:text-white">Save Your Recovery Codes</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <FiAlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <p className="text-[12px] text-rose-600 dark:text-rose-400 font-medium">
                Save these codes now. You won't be able to see them again.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="px-6 py-4">
            <div className="rounded-xl bg-[#F8FAFA] dark:bg-[#172033] border border-[#E8EEEE] dark:border-[#273244] p-4">
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-white dark:bg-[#111726] px-3 py-2.5 text-center font-mono text-[13px] text-[#1A1A2E] dark:text-white border border-[#E8EEEE] dark:border-[#273244] select-all"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              <Button
                variant="bordered"
                className="flex-1 rounded-lg border-[#E2E8F0] dark:border-[#273244] text-[#1A1A2E] dark:text-white font-semibold text-[12px]"
                startContent={<FiCopy className="h-3.5 w-3.5" />}
                onPress={handleCopyCodes}
                size="sm"
              >
                Copy All
              </Button>
              <Button
                variant="bordered"
                className="flex-1 rounded-lg border-[#E2E8F0] dark:border-[#273244] text-[#1A1A2E] dark:text-white font-semibold text-[12px]"
                startContent={<FiDownload className="h-3.5 w-3.5" />}
                onPress={handleDownloadCodes}
                size="sm"
              >
                Download
              </Button>
            </div>
            <p className="text-[11px] text-[#9CA3AF] dark:text-white/40 text-center mt-2">
              Each code can only be used once. Store them securely.
            </p>
          </ModalBody>
          <ModalFooter className="px-6 pb-6 pt-1">
            <Button
              className="w-full rounded-lg bg-[#0A6C74] text-white font-semibold text-[13px]"
              onPress={() => { setCodesAcknowledged(true); resetState(); }}
              size="md"
            >
              I've Saved My Codes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* ─── Disable MFA Modal ─── */}
      <Modal
        isOpen={step === "disable-confirm"}
        onOpenChange={(open) => { if (!open) resetState(); }}
        placement="center"
        size="sm"
        backdrop="blur"
        classNames={{ base: "mx-3 rounded-2xl dark:bg-[#111726]", closeButton: "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#172033]" }}
      >
        <ModalContent>
          <form onSubmit={handleDisableMfa}>
            <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
              <h3 className="text-[17px] font-bold text-[#1A1A2E] dark:text-white">Disable Two-Factor Authentication</h3>
              <p className="text-[12px] text-[#6B7280] dark:text-white/60 font-normal">
                This will remove the extra security layer. Enter your password to confirm.
              </p>
            </ModalHeader>
            <ModalBody className="px-6 py-4">
              <div>
                <label htmlFor="disable-password" className="mb-1.5 block text-[12px] font-semibold text-[#1A1A2E] dark:text-white">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="disable-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    disabled={disableLoading}
                    className={passwordInputClass}
                    placeholder="Enter your password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1A2E] dark:hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-[11px] text-rose-600" role="alert">{error}</p>}
            </ModalBody>
            <ModalFooter className="px-6 pb-6 pt-1 flex gap-3">
              <Button
                variant="bordered"
                className="flex-1 rounded-lg border-[#E2E8F0] dark:border-[#273244] text-[#1A1A2E] dark:text-white font-semibold text-[13px]"
                onPress={resetState}
                isDisabled={disableLoading}
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-lg bg-rose-600 text-white font-semibold text-[13px]"
                isLoading={disableLoading}
                isDisabled={!password}
                size="md"
              >
                Disable MFA
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* ─── Regenerate Recovery Codes Modal ─── */}
      <Modal
        isOpen={step === "regenerate-confirm"}
        onOpenChange={(open) => { if (!open) resetState(); }}
        placement="center"
        size="sm"
        backdrop="blur"
        classNames={{ base: "mx-3 rounded-2xl dark:bg-[#111726]", closeButton: "text-slate-500 hover:bg-slate-100 dark:hover:bg-[#172033]" }}
      >
        <ModalContent>
          <form onSubmit={handleRegenerate}>
            <ModalHeader className="flex flex-col gap-1 px-6 pt-6 pb-0">
              <h3 className="text-[17px] font-bold text-[#1A1A2E] dark:text-white">Regenerate Recovery Codes</h3>
              <p className="text-[12px] text-[#6B7280] dark:text-white/60 font-normal">
                Your old recovery codes will be invalidated. Enter your authenticator code to confirm.
              </p>
            </ModalHeader>
            <ModalBody className="px-6 py-4">
              <div>
                <label htmlFor="regen-totp" className="mb-1.5 block text-[12px] font-semibold text-[#1A1A2E] dark:text-white">
                  Authenticator Code
                </label>
                <input
                  id="regen-totp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  disabled={regenerateLoading}
                  className={totpInputClass}
                  autoFocus
                />
              </div>
              {error && <p className="text-[11px] text-rose-600" role="alert">{error}</p>}
            </ModalBody>
            <ModalFooter className="px-6 pb-6 pt-1 flex gap-3">
              <Button
                variant="bordered"
                className="flex-1 rounded-lg border-[#E2E8F0] dark:border-[#273244] text-[#1A1A2E] dark:text-white font-semibold text-[13px]"
                onPress={resetState}
                isDisabled={regenerateLoading}
                size="md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-lg bg-[#0A6C74] text-white font-semibold text-[13px]"
                isLoading={regenerateLoading}
                isDisabled={totpCode.length !== 6}
                size="md"
              >
                Regenerate
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </>
  );
}
