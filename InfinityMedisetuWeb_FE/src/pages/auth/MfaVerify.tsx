// src/pages/auth/MfaVerify.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { addToast, Button } from "@heroui/react";
import { FiShield, FiKey } from "react-icons/fi";

import type { RootState, AppDispatch } from "../../redux/store";
import { clearMfaPending, setCredentials } from "../../redux/slices/authSlice";
import {
  useVerifyMfaLoginMutation,
  useRecoveryLoginMutation,
} from "../../redux/api/mfaApi";

const BASE = import.meta.env.BASE_URL;
const loginLogo = `${BASE}assets/images/logoLight.svg`;

const MFA_TEMP_TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

type MfaMode = "totp" | "recovery";

const MfaVerify: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { tempToken, mfaPending } = useSelector(
    (state: RootState) => state.auth
  );

  const [mode, setMode] = useState<MfaMode>("totp");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifiedRef = useRef(false);

  const [verifyMfaLogin, { isLoading: isVerifying }] =
    useVerifyMfaLoginMutation();
  const [recoveryLogin, { isLoading: isRecovering }] =
    useRecoveryLoginMutation();

  const isLoading = isVerifying || isRecovering;

  // Redirect if no MFA pending (but skip if verification just succeeded)
  useEffect(() => {
    if (verifiedRef.current) return;
    if (!mfaPending || !tempToken) {
      navigate("/login", { replace: true });
    }
  }, [mfaPending, tempToken, navigate]);

  // Auto-expire temp token after 5 minutes
  useEffect(() => {
    if (!tempToken) return;

    expiryTimerRef.current = setTimeout(() => {
      dispatch(clearMfaPending());
      addToast({
        title: "Session Expired",
        description: "MFA verification session expired. Please log in again.",
        color: "warning",
      });
      navigate("/login", { replace: true });
    }, MFA_TEMP_TOKEN_EXPIRY_MS);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [tempToken, dispatch, navigate]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rateLimitSeconds]);

  const parseRateLimitSeconds = (message: string): number => {
    const match = message.match(/(\d+)\s*seconds?/i);
    return match ? parseInt(match[1], 10) : 900; // default 15 min
  };

  const handleLoginSuccess = async (data: {
    token?: string;
    user?: Record<string, unknown>;
    data?: { token?: string; user?: Record<string, unknown>; warning?: string | null; remainingCodes?: number };
  }) => {
    // Mark as verified so the guard effect doesn't redirect to /login
    verifiedRef.current = true;

    dispatch(clearMfaPending());

    // Token could be at top level or nested in data
    const token = data.token || data.data?.token;
    const user = data.user || data.data?.user;

    if (!token) {
      // Backend didn't return a token — can't proceed
      addToast({
        title: "Verification Succeeded",
        description:
          "MFA verified but no session token received. Please log in again.",
        color: "warning",
      });
      navigate("/login", { replace: true });
      return;
    }

    // Determine storage preference
    const rememberMe = !!localStorage.getItem("authToken");
    const storage = rememberMe ? localStorage : sessionStorage;

    // Store token immediately
    storage.setItem("authToken", token);
    (rememberMe ? sessionStorage : localStorage).removeItem("authToken");

    // Fetch full user profile (same pattern as login mutation)
    try {
      const userResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (userResponse.ok) {
        const fullUserData = await userResponse.json();
        dispatch(
          setCredentials({ token, user: fullUserData, rememberMe })
        );
      } else {
        // Fallback to whatever user data came in the response
        dispatch(
          setCredentials({ token, user: user ?? {}, rememberMe })
        );
      }
    } catch {
      dispatch(
        setCredentials({ token, user: user ?? {}, rememberMe })
      );
    }

    addToast({
      title: "Login Successful",
      description: "Welcome to MediSetu",
      color: "success",
    });

    // Navigate to dashboard
    navigate("/dashboard", { replace: true });
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(totpCode)) {
      setError("Code must be exactly 6 digits");
      return;
    }

    try {
      const data = await verifyMfaLogin({ totpCode }).unwrap();
      handleLoginSuccess(data);
    } catch (err: any) {
      const status = err?.status;
      const message =
        err?.data?.message || err?.error || "Verification failed";

      if (status === 429) {
        const seconds = parseRateLimitSeconds(message);
        setRateLimitSeconds(seconds);
        setError(`Too many attempts. Try again in ${seconds} seconds.`);
      } else if (status === 401) {
        if (message.toLowerCase().includes("expired")) {
          dispatch(clearMfaPending());
          addToast({
            title: "Session Expired",
            description: message,
            color: "warning",
          });
          navigate("/login", { replace: true });
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^[a-zA-Z0-9]{8}$/.test(recoveryCode)) {
      setError("Recovery code must be exactly 8 alphanumeric characters");
      return;
    }

    try {
      const data = await recoveryLogin({ recoveryCode }).unwrap();

      // Show warning about remaining codes
      if (data.data?.warning) {
        addToast({
          title: "Recovery Code Warning",
          description: data.data.warning,
          color: "warning",
          timeout: 8000,
        });
      }

      handleLoginSuccess(data);
    } catch (err: any) {
      const status = err?.status;
      const message =
        err?.data?.message || err?.error || "Recovery failed";

      if (status === 429) {
        const seconds = parseRateLimitSeconds(message);
        setRateLimitSeconds(seconds);
        setError(`Too many attempts. Try again in ${seconds} seconds.`);
      } else if (status === 401) {
        if (message.toLowerCase().includes("expired")) {
          dispatch(clearMfaPending());
          addToast({
            title: "Session Expired",
            description: message,
            color: "warning",
          });
          navigate("/login", { replace: true });
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearMfaPending());
    navigate("/login", { replace: true });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!verifiedRef.current && (!mfaPending || !tempToken)) return null;

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center bg-[#fcfefd] font-outfit">
      <div className="w-full max-w-[420px] px-5 py-8">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img
            src={loginLogo}
            alt="MediSetu"
            className="h-[42px] w-[180px] object-contain"
          />
        </div>

        {/* Card */}
        <div className="rounded-[24px] border border-[#dfe9e8] bg-white/95 px-8 py-8 shadow-[0_18px_50px_rgba(10,108,116,0.14)] backdrop-blur-[4px]">
          {/* Header */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-teal-50">
              {mode === "totp" ? (
                <FiShield className="h-6 w-6 text-primary" />
              ) : (
                <FiKey className="h-6 w-6 text-primary" />
              )}
            </div>
            <h2 className="text-[19px] font-semibold text-[#100E1C]">
              {mode === "totp"
                ? "Two-Factor Authentication"
                : "Use Recovery Code"}
            </h2>
            <p className="mt-1 text-[12px] text-[#677294]">
              {mode === "totp"
                ? "Enter the 6-digit code from your authenticator app"
                : "Enter one of your 8-character recovery codes"}
            </p>
          </div>

          {/* Rate limit banner */}
          {rateLimitSeconds > 0 && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              <FiShield className="h-4 w-4 shrink-0" />
              <span>
                Too many attempts. Try again in{" "}
                <span className="font-semibold">
                  {formatTime(rateLimitSeconds)}
                </span>
              </span>
            </div>
          )}

          {/* TOTP Form */}
          {mode === "totp" && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="totp-code"
                  className="mb-1.5 block text-[12px] font-semibold text-[#100E1C]"
                >
                  Verification Code
                </label>
                <input
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="0  0  0  0  0  0"
                  value={totpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setTotpCode(val);
                    setError("");
                  }}
                  disabled={isLoading || rateLimitSeconds > 0}
                  className="h-[42px] w-full rounded-[10px] border border-[#cfcfcf] bg-white px-4 text-center text-[14px] font-mono tracking-[0.35em] text-[#100E1C] outline-none transition-colors placeholder:text-[#677294] placeholder:font-light focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  aria-describedby={error ? "mfa-error" : undefined}
                  aria-invalid={!!error}
                  autoFocus
                />
              </div>

              {error && (
                <p
                  id="mfa-error"
                  className="text-[11px] text-rose-600"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-[42px] w-full rounded-xl bg-[#0A6C74] text-[14px] font-semibold text-white"
                isLoading={isVerifying}
                isDisabled={
                  isLoading || totpCode.length !== 6 || rateLimitSeconds > 0
                }
              >
                Verify
              </Button>
            </form>
          )}

          {/* Recovery Form */}
          {mode === "recovery" && (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-code"
                  className="mb-1.5 block text-[12px] font-semibold text-[#100E1C]"
                >
                  Recovery Code
                </label>
                <input
                  id="recovery-code"
                  type="text"
                  autoComplete="off"
                  maxLength={8}
                  placeholder="Ab3kM9xZ"
                  value={recoveryCode}
                  onChange={(e) => {
                    const val = e.target.value
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .slice(0, 8);
                    setRecoveryCode(val);
                    setError("");
                  }}
                  disabled={isLoading || rateLimitSeconds > 0}
                  className="h-[42px] w-full rounded-[10px] border border-[#cfcfcf] bg-white px-4 text-center text-[14px] font-mono tracking-[0.2em] text-[#100E1C] outline-none transition-colors placeholder:text-[#677294] placeholder:font-light focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  aria-describedby={error ? "mfa-error" : undefined}
                  aria-invalid={!!error}
                  autoFocus
                />
              </div>

              {error && (
                <p
                  id="mfa-error"
                  className="text-[11px] text-rose-600"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-[42px] w-full rounded-xl bg-[#0A6C74] text-[14px] font-semibold text-white"
                isLoading={isRecovering}
                isDisabled={
                  isLoading ||
                  recoveryCode.length !== 8 ||
                  rateLimitSeconds > 0
                }
              >
                Verify Recovery Code
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D9D9D9]" />
            <span className="text-[11px] text-[#677294]">or</span>
            <div className="h-px flex-1 bg-[#D9D9D9]" />
          </div>

          {/* Toggle mode */}
          <div className="text-center">
            {mode === "totp" ? (
              <button
                type="button"
                onClick={() => {
                  setMode("recovery");
                  setError("");
                  setTotpCode("");
                }}
                className="text-[12px] font-medium text-primary underline hover:opacity-80"
              >
                Use a recovery code instead
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("totp");
                  setError("");
                  setRecoveryCode("");
                }}
                className="text-[12px] font-medium text-primary underline hover:opacity-80"
              >
                Use authenticator app instead
              </button>
            )}
          </div>

          {/* Back to login */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-[12px] font-medium text-[#677294] hover:text-[#100E1C] transition-colors"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MfaVerify;
