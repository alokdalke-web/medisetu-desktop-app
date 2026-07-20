// src/pages/auth/SignupOtp.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { addToast } from "@heroui/react";

import arrow_back from "../../../public/assets/icons/arrow_back.svg";
import Images from "../../constants/images";
import AppButton from "../../components/shared/AppButton";

import {
  useRequestRegistrationMutation,
  useVerifyOtpMutation,
} from "../../redux/api/authApi";

import LoginImg from "../../../public/assets/images/LOGIN_IMG.png";

type LocationState = { email?: string };

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const safe =
    name.length <= 2
      ? `${name[0] || ""}*`
      : `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}`;
  return `${safe}@${domain}`;
}

const OTP_LEN = 6;

const SignupOtp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const email = (state.email || "").trim();

  // ✅ resend otp api
  const [requestOtp, { isLoading: isResending }] =
    useRequestRegistrationMutation();

  // ✅ verify otp api
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();

  // OTP digits
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // animation ticks (for per-box digit animation)
  const [animTick, setAnimTick] = useState<number[]>(Array(OTP_LEN).fill(0));

  // error shake
  const [shakeOn, setShakeOn] = useState(false);
  const [errorPulse, setErrorPulse] = useState(0);

  // ✅ NEW: one-time intro jiggle when OTP is blank
  const [introJiggleOn, setIntroJiggleOn] = useState(false);
  const introJiggleDoneRef = useRef(false);

  // timer
  const [secondsLeft, setSecondsLeft] = useState(30);

  // prevent repeated auto-verify on same OTP
  const lastAutoVerifyRef = useRef<string>("");

  const focusIndex = (i: number) => {
    inputsRef.current[i]?.focus();
    inputsRef.current[i]?.select();
  };

  const bumpAnim = (idxs: number[]) => {
    setAnimTick((prev) => {
      const next = [...prev];
      idxs.forEach((i) => {
        if (i >= 0 && i < OTP_LEN) next[i] = (next[i] || 0) + 1;
      });
      return next;
    });
  };

  const triggerShake = () => {
    // retrigger animation reliably
    setShakeOn(false);
    setErrorPulse((p) => p + 1);
    requestAnimationFrame(() => setShakeOn(true));
    setTimeout(() => setShakeOn(false), 420);
  };

  useEffect(() => {
    if (!email) {
      addToast({
        title: "Email missing",
        description: "Please go back and enter email again.",
        color: "warning",
      });
      navigate("/signup-email", { replace: true });
      return;
    }
  }, [email, navigate]);

  useEffect(() => {
    // focus first box on mount
    if (email) setTimeout(() => focusIndex(0), 0);

  }, [email]);

  // ✅ NEW: one-time jiggle when OTP is blank on first entry
  useEffect(() => {
    if (!email) return;
    if (introJiggleDoneRef.current) return;

    const isBlank = otp.every((x) => !x);
    if (!isBlank) return;

    introJiggleDoneRef.current = true;
    setIntroJiggleOn(false);
    requestAnimationFrame(() => setIntroJiggleOn(true));
    setTimeout(() => setIntroJiggleOn(false), 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]); // only once when screen opens with email

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const canResend = secondsLeft === 0;

  const mmss = useMemo(() => {
    const s = secondsLeft;
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  const otpValue = otp.join("");
  const isOtpComplete = otpValue.length === OTP_LEN && !otp.includes("");

  const setDigitsFrom = (startIndex: number, digits: string[]) => {
    const clean = digits
      .join("")
      .replace(/\D/g, "")
      .slice(0, OTP_LEN - startIndex)
      .split("");

    if (clean.length === 0) return;

    setOtp((prev) => {
      const next = [...prev];
      for (let k = 0; k < clean.length; k++) {
        const idx = startIndex + k;
        if (idx >= 0 && idx < OTP_LEN) {
          next[idx] = clean[k] ?? "";
        }
      }
      return next;
    });

    bumpAnim(
      Array.from(
        { length: Math.min(clean.length, OTP_LEN - startIndex) },
        (_, k) => startIndex + k
      )
    );

    const nextFocus = startIndex + clean.length;
    setTimeout(() => {
      if (nextFocus < OTP_LEN) focusIndex(nextFocus);
      else focusIndex(OTP_LEN - 1);
    }, 0);
  };

  const onChangeDigit = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) {
      setOtp((prev) => {
        const next = [...prev];
        next[i] = "";
        return next;
      });
      bumpAnim([i]);
      return;
    }

    if (digits.length > 1) {
      setDigitsFrom(i, digits.split(""));
      return;
    }

    const digit = digits.slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    bumpAnim([i]);

    if (digit && i < OTP_LEN - 1) focusIndex(i + 1);
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isOtpComplete && !isVerifying) {
        void handleVerify("manual");
      }
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();

      if (otp[i]) {
        setOtp((prev) => {
          const next = [...prev];
          next[i] = "";
          return next;
        });
        bumpAnim([i]);
        return;
      }

      if (i > 0) {
        focusIndex(i - 1);
        setOtp((prev) => {
          const next = [...prev];
          next[i - 1] = "";
          return next;
        });
        bumpAnim([i - 1]);
      }
      return;
    }

    if (e.key === "ArrowLeft" && i > 0) focusIndex(i - 1);
    if (e.key === "ArrowRight" && i < OTP_LEN - 1) focusIndex(i + 1);
  };

  const onPasteAt = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LEN - i);

    if (!text) return;

    e.preventDefault();
    setDigitsFrom(i, text.split(""));
  };

  const handleVerify = useCallback(
    async (source: "auto" | "manual") => {
      if (!email) {
        addToast({
          title: "Email missing",
          description: "Please go back and enter email again.",
          color: "warning",
        });
        return;
      }

      if (!isOtpComplete) {
        if (source === "manual") {
          addToast({
            title: "Invalid OTP",
            description: "OTP must be 6 digits.",
            color: "warning",
          });
          triggerShake();
          focusIndex(0);
        }
        return;
      }

      try {
        const res: any = await verifyOtp({ email, otp: otpValue }).unwrap();

        addToast({
          title: "OTP Verified ✅",
          description: "Email verified successfully.",
          color: "success",
        });

        navigate("/signup", { state: { email, token: res?.token } });
      } catch (err: any) {
        addToast({
          title: "Verification Failed ❌",
          description: err?.data?.message || "Invalid or expired OTP",
          color: "danger",
        });

        lastAutoVerifyRef.current = "";
        setOtp(Array(OTP_LEN).fill(""));
        bumpAnim([...Array(OTP_LEN)].map((_, idx) => idx));
        triggerShake();
        setTimeout(() => focusIndex(0), 0);
      }
    },

    [email, isOtpComplete, otpValue, verifyOtp, navigate]
  );

  // ✅ Auto verify when OTP becomes complete
  useEffect(() => {
    if (!isOtpComplete) {
      lastAutoVerifyRef.current = "";
      return;
    }
    if (isVerifying) return;

    if (lastAutoVerifyRef.current === otpValue) return;
    lastAutoVerifyRef.current = otpValue;

    void handleVerify("auto");
  }, [isOtpComplete, otpValue, isVerifying, handleVerify]);

  // ✅ Resend OTP after 30 sec
  const handleResend = async () => {
    if (!email) {
      addToast({
        title: "Email missing",
        description: "Please go back and enter email again.",
        color: "warning",
      });
      return;
    }
    if (!canResend || isResending) return;

    try {
      await requestOtp({ email }).unwrap();

      addToast({
        title: "OTP Sent ✅",
        description: "We’ve sent a new OTP to your email.",
        color: "success",
      });

      lastAutoVerifyRef.current = "";
      setOtp(Array(OTP_LEN).fill(""));
      bumpAnim([...Array(OTP_LEN)].map((_, idx) => idx));
      setSecondsLeft(30);
      setTimeout(() => focusIndex(0), 0);
    } catch (err: any) {
      addToast({
        title: "Failed ❌",
        description: err?.data?.message || "Unable to resend OTP",
        color: "danger",
      });
    }
  };

  return (
    <main className="relative h-dvh w-full flex items-center justify-center bg-[#E8F6F4] overflow-hidden p-0 md:p-10">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(50% 50% at 50% 50%, #ffffff 0%, #ffffff 55.46%, rgba(255, 255, 255, 0) 100%), url(${Images.welcomeMask})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      />

      {/* local css for otp animations */}
      <style>{`
        @keyframes otpDigitIn {
          0%   { transform: translateY(10px); opacity: 0; }
          55%  { transform: translateY(-7px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 1; }
        }
        @keyframes otpShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-7px); }
          40%  { transform: translateX(7px); }
          60%  { transform: translateX(-6px); }
          80%  { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
        @keyframes otpJiggle {
          0%   { transform: translateY(0) scale(1); }
          20%  { transform: translateY(-4px) scale(1.02); }
          40%  { transform: translateY(0) scale(1); }
          60%  { transform: translateY(-3px) scale(1.01); }
          80%  { transform: translateY(0) scale(1); }
          100% { transform: translateY(0) scale(1); }
        }

        .otp-digit-anim { animation: otpDigitIn 220ms ease; }
        .otp-row-shake { animation: otpShake 380ms ease; }
        .otp-row-jiggle { animation: otpJiggle 450ms ease; }
      `}</style>

      {/* Card */}
      <div className="relative z-10 w-full h-full md:max-w-[1200px] md:max-h-[720px] grid grid-cols-1 md:grid-cols-2 overflow-hidden md:rounded-3xl border-0 md:border border-slate-100 bg-white md:shadow-sm">
        {/* Left: OTP Form */}
        <section className="relative h-full flex flex-col">
          {/* Mobile: back button + logo row */}
          <div className="md:hidden flex items-center gap-3 px-6 pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 hover:bg-slate-50"
              aria-label="Back"
            >
              <img src={arrow_back} alt="" className="w-5" />
            </button>
            <img
              src={Images.mediSetuLogo}
              alt="MediSetu"
              className="h-9 w-auto object-contain"
            />
          </div>

          {/* Content centered */}
          <div className="flex-1 flex items-center justify-center px-6 sm:px-10 md:px-12">
            <div className="w-full max-w-[520px]">
              {/* Desktop: back + logo row */}
              <div className="hidden md:flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="mt-1 p-3 rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 hover:bg-slate-50"
                  aria-label="Back"
                >
                  <img src={arrow_back} alt="" className="w-5" />
                </button>

                <div className="flex-1 flex justify-center mt-5">
                  <img
                    src={Images.mediSetuLogo}
                    alt="MediSetu"
                    className="w-[219px] h-[86px] object-contain"
                  />
                </div>

                <div className="w-9" />
              </div>

              {/* text */}
              <div className="mt-8 md:mt-14 text-center">
                <p className="text-slate-500">
                  We&apos;ve sent a one-time password (OTP) to
                </p>
                <p className="font-semibold text-slate-700 mt-1">
                  {email ? maskEmail(email) : "your email"}
                </p>
              </div>

              <div className="mt-6 md:mt-8 text-center">
                <p className="font-semibold text-slate-700">
                  One Time Password
                </p>

                {/* OTP boxes */}
                <div
                  className={[
                    "mt-4 flex items-center justify-center gap-2 sm:gap-3",
                    introJiggleOn ? "otp-row-jiggle" : "",
                    shakeOn ? "otp-row-shake" : "",
                  ].join(" ")}
                  data-error-pulse={errorPulse}
                >
                  {otp.map((d, i) => (
                    <div key={i} className="relative h-11 w-11 sm:h-12 sm:w-12">
                      <input
                        ref={(el) => {
                          inputsRef.current[i] = el;
                        }}
                        value={d}
                        onChange={(e) => onChangeDigit(i, e.target.value)}
                        onKeyDown={(e) => onKeyDown(i, e)}
                        onPaste={(e) => onPasteAt(i, e)}
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        className={[
                          "h-full w-full rounded-xl border bg-white",
                          "text-center text-[16px] font-semibold",
                          "outline-none",
                          "focus:border-teal-500 focus:ring-2 focus:ring-teal-100",
                          "text-transparent caret-transparent",
                          shakeOn
                            ? "border-rose-400 ring-2 ring-rose-100"
                            : "border-slate-200",
                        ].join(" ")}
                      />

                      {/* animated digit overlay */}
                      <span
                        key={`${i}-${d}-${animTick[i]}`}
                        className={[
                          "pointer-events-none absolute inset-0 grid place-items-center",
                          "text-[16px] font-semibold",
                          d ? "otp-digit-anim text-slate-800" : "text-slate-800",
                        ].join(" ")}
                      >
                        {d}
                      </span>
                    </div>
                  ))}
                </div>

                {/* resend area */}
                <div className="mt-5 text-[12px] text-slate-500">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="font-semibold text-primary hover:opacity-90 disabled:opacity-60"
                    >
                      {isResending ? "Resending..." : "Resend OTP"}
                    </button>
                  ) : (
                    <>
                      Resend OTP in{" "}
                      <span className="font-semibold text-slate-700">
                        {mmss}
                      </span>
                    </>
                  )}
                </div>

                {/* verify button */}
                <div className="mt-6 md:mt-8">
                  <AppButton
                    text={isVerifying ? "Verifying..." : "Verify OTP"}
                    className="h-11 w-full rounded-full"
                    disabled={!isOtpComplete || isVerifying}
                    onClick={() => void handleVerify("manual")}
                  />
                </div>

                <p className="pt-5 text-center text-slate-500">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:opacity-90"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Illustration */}
        <aside className="hidden md:flex w-full h-full bg-[#E8F6F4]">
          <div className="w-full h-full flex flex-col items-center text-center px-10 pt-14 pb-12">
            <h2 className="text-primary text-[36px] font-semibold leading-tight">
              Create Your Account
            </h2>
            <p className="text-slate-700 text-[20px] font-medium mt-1">
              Signup To Manage Your Clinic Online
            </p>

            <div className="flex-1 w-full flex items-center justify-center mt-6">
              <img
                src={LoginImg}
                alt="Signup"
                className="w-full max-w-[460px] max-h-[420px] object-contain"
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default SignupOtp;
