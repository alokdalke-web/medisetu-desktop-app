// src/pages/profile/SecurityAccess.tsx
import { Button, Input, Select, SelectItem, addToast } from "@heroui/react";
import React from "react";
import { FiEye, FiEyeOff, FiKey, FiCheckCircle, FiChevronDown } from "react-icons/fi";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import { useChangePasswordMutation } from "../../redux/api/securityApi";
import { useLoginMutation, useGetUserQuery, useUpdatePaymentHistoryVisibilityMutation } from "../../redux/api/authApi";
import { useAuth } from "../../hooks/useAuth";
import MfaSettings from "./MfaSettings";
import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
} from "../../redux/api/clinicApi";

// ✅ Unsaved changes
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

/* ─── Password Strength Panel ─── */
function PasswordStrengthPanel({ password }: { password: string }) {
  const checks = [
    { label: "Minimum 8 characters", pass: password.length >= 8 },
    { label: "Uppercase & lowercase letters", pass: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", pass: /\d/.test(password) },
    { label: "At least one special character", pass: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.pass).length;
  const total = checks.length;

  const getStrengthLabel = () => {
    if (!password) return { text: "—", color: "text-[#9CA3AF]" };
    if (passedCount <= 1) return { text: "Weak", color: "text-rose-500" };
    if (passedCount <= 2) return { text: "Fair", color: "text-amber-500" };
    if (passedCount <= 3) return { text: "Good", color: "text-blue-500" };
    return { text: "Strong", color: "text-primary" };
  };

  const strength = getStrengthLabel();

  const getBarColor = (index: number) => {
    if (!password) return "bg-[#E2E8F0] dark:bg-[#273244]";
    if (index < passedCount) {
      if (passedCount <= 1) return "bg-rose-500";
      if (passedCount <= 2) return "bg-amber-500";
      if (passedCount <= 3) return "bg-blue-500";
      return "bg-primary";
    }
    return "bg-[#E2E8F0] dark:bg-[#273244]";
  };

  return (
    <div className="rounded-xl border border-[#E8EEEE] dark:border-[#273244] p-5 dark:bg-[#172033]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
          <FiCheckCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-[#1A1A2E] dark:text-white">Password Strength</p>
          <p className={`text-[14px] font-bold ${strength.color}`}>{strength.text}</p>
        </div>
      </div>

      {/* Strength bars */}
      <div className="flex gap-1.5 mb-5">
        {Array.from({ length: total + 1 }).map((_, i) => (
          <div
            key={i}
            className={`h-[5px] flex-1 rounded-full transition-colors ${getBarColor(i)}`}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5">
            <div
              className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${check.pass ? "bg-primary text-white" : "bg-[#E2E8F0] dark:bg-[#273244] text-transparent"
                }`}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className={`text-[13px] ${check.pass ? "text-[#1A1A2E] dark:text-white font-medium" : "text-[#6B7280] dark:text-white/60"}`}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SecurityAccess() {
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showOld, setShowOld] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [newPasswordError, setNewPasswordError] = React.useState("");
  const [confirmPasswordError, setConfirmPasswordError] = React.useState("");

  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [login] = useLoginMutation();
  const { user } = useAuth();

  // ✅ global dirty setter
  const { setDirty } = useUnsavedChanges();

  // Password validation function
  const validatePasswordStrength = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return { minLength, hasUpper, hasLower, hasNumber, hasSpecial };
  };

  // Validate new password
  React.useEffect(() => {
    if (newPassword) {
      const { minLength, hasUpper, hasLower, hasNumber, hasSpecial } = validatePasswordStrength(newPassword);
      const errors = [];
      if (!minLength) errors.push("at least 8 characters");
      if (!hasUpper) errors.push("one uppercase letter");
      if (!hasLower) errors.push("one lowercase letter");
      if (!hasNumber) errors.push("one number");
      if (!hasSpecial) errors.push("one special character");
      setNewPasswordError(errors.length > 0 ? `Password must contain ${errors.join(", ")}.` : "");
    } else {
      setNewPasswordError("");
    }
  }, [newPassword]);

  // Validate confirm password
  React.useEffect(() => {
    if (confirmPassword) {
      if (newPassword && confirmPassword !== newPassword) {
        setConfirmPasswordError("Passwords do not match.");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [confirmPassword, newPassword]);

  // ✅ mark dirty when any field has content
  React.useEffect(() => {
    const dirty =
      oldPassword.trim().length > 0 ||
      newPassword.trim().length > 0 ||
      confirmPassword.trim().length > 0;

    setDirty(dirty);
  }, [oldPassword, newPassword, confirmPassword, setDirty]);

  // ✅ cleanup on unmount
  React.useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  const handleCancel = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);

    // ✅ user intentionally discards
    setDirty(false);
  };

  const getErrorMessage = (e: any) => {
    return (
      e?.data?.message ||
      e?.data?.error ||
      e?.error ||
      "Something went wrong"
    );
  };

  const handleSave = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      addToast({
        title: "Missing fields",
        description: "Old, New and Confirm Password are required.",
        color: "warning",
      });
      return;
    }

    if (newPasswordError || confirmPasswordError) {
      addToast({
        title: "Invalid password",
        description: "Please fix the password validation errors.",
        color: "warning",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast({
        title: "Password mismatch",
        description: "New Password and Confirm Password must be same",
        color: "warning",
      });
      return;
    }

    try {
      await changePassword({
        password: oldPassword,
        newPassword,
      }).unwrap();

      // Re-login with new password to get new token
      if (user?.email) {
        const rememberMe = !!localStorage.getItem("authToken");
        await login({
          email: user.email,
          password: newPassword,
          rememberMe,
        }).unwrap();
      }

      addToast({
        title: "Password updated",
        description: "Your Password has been updated.",
        color: "success",
      });

      handleCancel(); // this also clears dirty
    } catch (e) {
      addToast({
        title: "Change password failed",
        description: getErrorMessage(e),
        color: "danger",
      });
    }
  };

  const inputClassNames = {
    label: "text-[12px] font-medium text-default-700",
    inputWrapper:
      "h-11 rounded-lg bg-white dark:bg-[#172033] border-default-200 dark:border-[#273244] shadow-none data-[hover=true]:border-default-300 ",
    input: "text-sm dark:text-white",
  };

  const EyeBtn = ({
    shown,
    onClick,
  }: {
    shown: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="grid place-items-center text-default-500 hover:text-default-700"
      aria-label={shown ? "Hide password" : "Show password"}
    >
      {shown ? <FiEyeOff /> : <FiEye />}
    </button>
  );

  const actionsDisabled =
    isLoading || !oldPassword || !newPassword || !confirmPassword || !!newPasswordError || !!confirmPasswordError;

  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);
  const [loginAlertsOpen, setLoginAlertsOpen] = React.useState(false);
  const [paymentVisibilityOpen, setPaymentVisibilityOpen] = React.useState(false);

  // ─── Login Alerts & Auto Logout (from clinic settings API) ───
  const { data: clinicSettingsData } = useGetClinicSettingsQuery();
  const [upsertSettings, { isLoading: isUpdatingSettings }] = useUpsertClinicSettingsMutation();

  const clinicSettings = clinicSettingsData?.result?.settings;
  const loginAlertEnabled = clinicSettings?.loginAlertsEnabled ?? false;
  const autoLogoutMinutes = clinicSettings?.autoLogoutMinutes ?? null;

  // ─── Payment History Visibility ───
  const { data: userData } = useGetUserQuery();
  const paymentUser = (userData as any)?.user ?? userData;
  const paymentVisible = Boolean(paymentUser?.paymentVisible);
  const [togglePaymentVisibility, { isLoading: isTogglingPayment }] = useUpdatePaymentHistoryVisibilityMutation();

  const handleTogglePaymentVisibility = async () => {
    try {
      const res = await togglePaymentVisibility().unwrap();
      addToast({
        title: "Updated",
        description: res?.message || "Payment visibility setting changed.",
        color: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Failed to update",
        description: err?.data?.message || err?.message || "Something went wrong.",
        color: "danger",
      });
    }
  };

  const handleToggleLoginAlerts = async () => {
    try {
      await upsertSettings({
        settings: { loginAlertsEnabled: !loginAlertEnabled },
      }).unwrap();
      addToast({
        title: !loginAlertEnabled ? "Login Alerts Enabled" : "Login Alerts Disabled",
        description: !loginAlertEnabled
          ? "You'll be notified when someone logs in from a new device."
          : "Login alerts have been turned off.",
        color: "success",
      });
    } catch {
      addToast({ title: "Error", description: "Failed to update setting.", color: "danger" });
    }
  };

  const handleAutoLogoutChange = async (value: string) => {
    const minutes = value === "none" ? null : parseInt(value);
    try {
      await upsertSettings({
        settings: { autoLogoutMinutes: minutes },
      }).unwrap();
      addToast({
        title: "Auto Logout Updated",
        description: minutes ? `Auto logout set to ${minutes} minutes.` : "Auto logout disabled.",
        color: "success",
      });
    } catch {
      addToast({ title: "Error", description: "Failed to update setting.", color: "danger" });
    }
  };

  return (
    <>
      <ProfilePageHeader
        icon={<FiKey className="h-4 w-4" />}
        title="Security & Access"
        description="Manage your account security, passwords, and login preferences"
      />
      <div className="flex flex-col gap-3 p-4 sm:p-5">

        {/* ─── Change Password Section ─── */}
        <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244]">
          <button
            type="button"
            onClick={() => setPasswordOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-[#FAFCFC] dark:hover:bg-[#172033] transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                <FiKey className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[18px] font-bold text-[#1A1A2E] dark:text-white">Change Password</h2>
                <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 hidden sm:block">Update your password to keep your account secure</p>
              </div>
            </div>
            <FiChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#6B7280] dark:text-white/60 shrink-0 transition-transform duration-200 ${passwordOpen ? "rotate-180" : ""}`} />
          </button>

          {passwordOpen && (
            <div className="p-4 sm:p-6 border-t border-[#E8EEEE] dark:border-[#273244] flex flex-col">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    labelPlacement="outside"
                    placeholder=" "
                    type={showOld ? "text" : "password"}
                    value={oldPassword}
                    onValueChange={setOldPassword}
                    variant="bordered"
                    classNames={inputClassNames}
                    endContent={<EyeBtn shown={showOld} onClick={() => setShowOld((v) => !v)} />}
                  />
                  <Input
                    label="New Password"
                    labelPlacement="outside"
                    placeholder=" "
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onValueChange={setNewPassword}
                    variant="bordered"
                    classNames={inputClassNames}
                    isInvalid={!!newPasswordError}
                    errorMessage={newPasswordError}
                    endContent={<EyeBtn shown={showNew} onClick={() => setShowNew((v) => !v)} />}
                  />
                  <Input
                    label="Confirm New Password"
                    labelPlacement="outside"
                    placeholder=" "
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onValueChange={setConfirmPassword}
                    variant="bordered"
                    classNames={inputClassNames}
                    isInvalid={!!confirmPasswordError}
                    errorMessage={confirmPasswordError}
                    endContent={<EyeBtn shown={showConfirm} onClick={() => setShowConfirm((v) => !v)} />}
                  />
                </div>
                <div>
                  <PasswordStrengthPanel password={newPassword} />
                </div>
              </div>

              {/* Security Tip */}
              <div className="mt-4 sm:mt-5 flex items-center gap-3 rounded-lg bg-[#F8FAFA] dark:bg-[#172033] border border-[#E8EEEE] dark:border-[#273244] px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="h-7 w-7 rounded-md bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                  <FiKey className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[12px] sm:text-[13px] font-semibold text-[#1A1A2E] dark:text-white">Security Tip</p>
                  <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60">Use a strong password that you don't use elsewhere.</p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-5 sm:pt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="bordered"
                  className="rounded-lg border-primary text-primary px-5 sm:px-6 font-semibold text-[12px] sm:text-[13px]"
                  onPress={handleCancel}
                  isDisabled={isLoading}
                >
                  Cancel Changes
                </Button>
                <Button
                  className="rounded-lg bg-primary text-white px-5 sm:px-6 font-semibold text-[12px] sm:text-[13px] hover:opacity-90"
                  onPress={handleSave}
                  isLoading={isLoading}
                  isDisabled={actionsDisabled}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ─── MFA Section ─── */}
        <MfaSettings />

        {/* ─── Login Alerts & Auto Logout ─── */}
        <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244]">
          <button
            type="button"
            onClick={() => setLoginAlertsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-[#FAFCFC] dark:hover:bg-[#172033] transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <path d="M8 1.333A5.333 5.333 0 002.667 6.667v2.666l-1 2h12.666l-1-2V6.667A5.333 5.333 0 008 1.333z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 11.333a2 2 0 004 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[18px] font-bold text-[#1A1A2E] dark:text-white">Login Alerts</h2>
                <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 hidden sm:block">Get notified about new logins and manage auto logout</p>
              </div>
            </div>
            <FiChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#6B7280] dark:text-white/60 shrink-0 transition-transform duration-200 ${loginAlertsOpen ? "rotate-180" : ""}`} />
          </button>

          {loginAlertsOpen && (
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-[#E8EEEE] dark:border-[#273244]">
              <div className="space-y-4 sm:space-y-5">
                {/* Login Alerts Toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-[14px] font-semibold text-[#1A1A2E] dark:text-white">Login Alerts</p>
                    <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 mt-0.5">
                      Get notified when someone logs in from a new device
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleLoginAlerts}
                    disabled={isUpdatingSettings}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${loginAlertEnabled ? "bg-primary" : "bg-[#E2E8F0] dark:bg-[#273244]"
                      }`}
                    role="switch"
                    aria-checked={loginAlertEnabled}
                    aria-label="Toggle login alerts"
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${loginAlertEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                <div className="border-t border-[#E8EEEE] dark:border-[#273244]" />

                {/* Auto Logout Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-[14px] font-semibold text-[#1A1A2E] dark:text-white">Auto Logout</p>
                    <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 mt-0.5">
                      Automatically log out after a period of inactivity
                    </p>
                  </div>
                  <Select
                    size="sm"
                    variant="bordered"
                    radius="sm"
                    className="w-full sm:w-[240px] shrink-0"
                    isDisabled={isUpdatingSettings}
                    selectedKeys={autoLogoutMinutes === null ? ["none"] : [String(autoLogoutMinutes)]}
                    onSelectionChange={(keys) => {
                      const key = Array.from(keys)[0] as string;
                      handleAutoLogoutChange(key);
                    }}
                    classNames={{
                      trigger: "h-9 border-[#E2E8F0] bg-white dark:bg-[#172033] dark:border-[#273244] data-[hover=true]:border-primary",
                      value: "text-[12px] text-[#1A1A2E] dark:text-white",
                      popoverContent: "dark:bg-[#111726]",
                    }}
                    renderValue={(items) =>
                      items.map((item) =>
                        item.key === "none" ? (
                          <span key="none">Don't auto logout</span>
                        ) : (
                          <span key={item.key}>After {item.key} minutes of inactivity</span>
                        )
                      )
                    }
                  >
                    <SelectItem key="15">15 minutes</SelectItem>
                    <SelectItem key="30">30 minutes</SelectItem>
                    <SelectItem key="45">45 minutes</SelectItem>
                    <SelectItem key="60">60 minutes</SelectItem>
                    <SelectItem key="none">Don't auto logout</SelectItem>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Payment History Visibility ─── */}
        <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244]">
          <button
            type="button"
            onClick={() => setPaymentVisibilityOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-[#FAFCFC] dark:hover:bg-[#172033] transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                {paymentVisible ? <FiEye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> : <FiEyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[18px] font-bold text-[#1A1A2E] dark:text-white">Payment History Visibility</h2>
                <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 hidden sm:block">Control whether payment history is visible in the app</p>
              </div>
            </div>
            <FiChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#6B7280] dark:text-white/60 shrink-0 transition-transform duration-200 ${paymentVisibilityOpen ? "rotate-180" : ""}`} />
          </button>

          {paymentVisibilityOpen && (
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-[#E8EEEE] dark:border-[#273244]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-[14px] font-semibold text-[#1A1A2E] dark:text-white">Payment History</p>
                  <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 mt-0.5">
                    {paymentVisible
                      ? "Visible to users. Users can view all payment records."
                      : "Hidden from users. Users will see a warning instead of payment data."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePaymentVisibility}
                  disabled={isTogglingPayment}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${paymentVisible ? "bg-primary" : "bg-[#E2E8F0] dark:bg-[#273244]"
                    }`}
                  role="switch"
                  aria-checked={paymentVisible}
                  aria-label="Toggle payment history visibility"
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${paymentVisible ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Active Sessions Section — Coming Soon ─── */}
        <div className="rounded-2xl bg-white dark:bg-[#111726] border border-[#E8EEEE] dark:border-[#273244] relative overflow-hidden">
          <button
            type="button"
            onClick={() => setSessionsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 text-left hover:bg-[#FAFCFC] dark:hover:bg-[#172033] transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <rect x="2" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M5 14h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M8 11v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] sm:text-[18px] font-bold text-[#1A1A2E] dark:text-white">Active Sessions</h2>
                <p className="text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60 hidden sm:block">Manage and sign out from your active sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                Coming Soon
              </span>
              <FiChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-[#6B7280] dark:text-white/60 transition-transform duration-200 ${sessionsOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {sessionsOpen && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#E8EEEE] dark:border-[#273244] opacity-60">
              <div className="flex items-center justify-end mb-3">
                <Button
                  variant="bordered"
                  className="rounded-lg border-rose-300 text-rose-500 px-3 sm:px-4 text-[11px] sm:text-[12px] font-semibold"
                  size="sm"
                  isDisabled
                  startContent={
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5.25 12.25H3.5a1.167 1.167 0 01-1.167-1.167V2.917A1.167 1.167 0 013.5 1.75h1.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9.333 10.083L11.667 7.75 9.333 5.417" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11.667 7.75H5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  Sign out from all devices
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#6B7280] shrink-0">
                    <rect x="2" y="3" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 15h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <path d="M9 12v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span className="text-[12px] sm:text-[13px] font-medium text-[#1A1A2E] dark:text-white">Chrome on Windows</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-primary">
                    Current Device
                  </span>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-[11px] sm:text-[12px] text-[#6B7280] dark:text-white/60">
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#9CA3AF]">
                      <path d="M7 7.583a1.75 1.75 0 100-3.5 1.75 1.75 0 000 3.5z" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M7 12.833S2.333 9.333 2.333 6.417a4.667 4.667 0 019.334 0C11.667 9.333 7 12.833 7 12.833z" stroke="currentColor" strokeWidth="1.1" />
                    </svg>
                    <span>Indore, MP, India</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-[#9CA3AF]">
                      <rect x="1.75" y="2.333" width="10.5" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                      <path d="M9.333 1.167v2.333M4.667 1.167v2.333M1.75 5.833h10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                    <span>
                      {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })},{" "}
                      {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}