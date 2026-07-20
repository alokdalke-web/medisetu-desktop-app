// src/pages/auth/NewPass.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { addToast } from "@heroui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { FiEye, FiEyeOff } from "react-icons/fi";

import InputField from "../../components/shared/InputField";
import AppButton from "../../components/shared/AppButton";
import AppTurnstile from "../../components/shared/Turnstile";

import { resetPasswordSchema, type ResetPasswordDto } from "../../schemas/auth";
import { useResetPasswordMutation } from "../../redux/api/authApi";

// Assets
const BASE = import.meta.env.BASE_URL;
const loginBgShape = `${BASE}assets/images/backgrund-girl.png`;
const loginLogo = `${BASE}assets/images/logoLight.svg`;
const loginMark = `${BASE}assets/images/sidebar-fevicon.svg`;
const doctorGirl = `${BASE}assets/images/doc-Girl.png`;
const shieldCheckmarkIcon = `${BASE}assets/icons/shield-checkmark-icon.svg`;

const RESET_DESIGN_WIDTH = 1024;
const RESET_DESIGN_HEIGHT = 635;

const stats = [
  { icon: `${BASE}assets/icons/security-shield-icon.svg`, value: "250-bit", label: "Security" },
  { icon: `${BASE}assets/icons/ai-prescription-icon.svg`, value: "AI-Powered", label: "Smart Workflows" },
  { icon: `${BASE}assets/icons/growth-icon.svg`, value: "99.9%", label: "Up-time" },
  { icon: `${BASE}assets/icons/star-icon.svg`, value: "4.5", label: "Rating" },
];

const inputCls = "[&_[data-slot='input-wrapper']]:!h-[40px] [&_[data-slot='input-wrapper']]:!min-h-[40px] sm:[&_[data-slot='input-wrapper']]:!h-[42px] sm:[&_[data-slot='input-wrapper']]:!min-h-[42px] lg:[&_[data-slot='input-wrapper']]:!h-[34px] lg:[&_[data-slot='input-wrapper']]:!min-h-[34px] [&_[data-slot='input-wrapper']]:!rounded-[10px] lg:[&_[data-slot='input-wrapper']]:!rounded-lg [&_[data-slot='input-wrapper']]:!bg-white [&_[data-slot='input-wrapper']]:!border [&_[data-slot='input-wrapper']]:!border-[#cfcfcf] [&_[data-slot='input-wrapper']]:!py-0 [&_[data-slot='input-wrapper']]:!shadow-none [&_[data-slot='label']_label]:!pb-[4px] lg:[&_[data-slot='label']_label]:!pb-[3px] [&_[data-slot='label']_label]:!text-[12px] sm:[&_[data-slot='label']_label]:!text-[13px] lg:[&_[data-slot='label']_label]:!text-[10px] [&_[data-slot='label']_label]:!font-semibold [&_[data-slot='label']_label]:!text-[#100E1C] [&_[data-slot='label']_label]:!tracking-normal [&_input]:!py-0 [&_input]:!text-[13px] sm:[&_input]:!text-[14px] lg:[&_input]:!text-[11px] [&_input]:!font-light [&_input]:!text-[#100E1C] [&_input::placeholder]:!text-[#677294] [&_input::placeholder]:!font-light";

const authInputClassNames = {
  input:
    "!py-0 !text-[12px] !leading-[16px] sm:!text-[13px] sm:!leading-[17px] lg:!text-[10px] lg:!leading-[13px] !font-light !text-[#100E1C] placeholder:!text-[#677294] placeholder:!font-light dark:!text-slate-100 dark:placeholder:!text-slate-500",
  helperWrapper: "!pt-[3px] lg:!pt-[2px]",
  errorMessage:
    "!text-[11px] !leading-[13px] sm:!text-[11px] sm:!leading-[13px] lg:!text-[8.5px] lg:!leading-[10px] !font-normal",
};

const NewPass: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token") || "";
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [resetCanvas, setResetCanvas] = useState<{ scale: number; width: number | null }>({ 
    scale: 1, 
    width: null 
  });

  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const { control, handleSubmit } = useForm<ResetPasswordDto>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: resetToken,
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth < 1024) {
        setResetCanvas({ scale: 1, width: null });
        return;
      }

      const nextScale = Math.min(
        window.innerWidth / RESET_DESIGN_WIDTH,
        window.innerHeight / RESET_DESIGN_HEIGHT,
      );

      setResetCanvas({
        scale: Number(nextScale.toFixed(4)),
        width: Number((window.innerWidth / nextScale).toFixed(2)),
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const onSubmit = async (formData: ResetPasswordDto) => {
    if (!captchaToken) {
      addToast({
        title: "Security Check Required",
        description: "Please complete the CAPTCHA.",
        color: "warning",
      });
      return;
    }

    try {
      const resp: any = await resetPassword({
        ...formData,
        captchaToken,
      }).unwrap();

      addToast({
        title: "Password reset successfully ✅",
        description: "Please login with your new password",
        color: "success",
      });

      setTimeout(() => {
        const email =
          resp?.email ?? resp?.data?.email ?? resp?.result?.email ?? null;
        navigate("/login", {
          replace: true,
          state: email ? { email } : undefined,
        });
      }, 1500);
    } catch (err: any) {
      setCaptchaToken(null);
      turnstileRef.current?.reset?.();

      addToast({
        title: "Request Failed ❌",
        description: err?.data?.message || "Something went wrong",
        color: "danger",
      });
    }
  };

  const isSubmitDisabled = isLoading || !captchaToken;

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-[#fcfefd] font-outfit lg:items-start lg:justify-start lg:overflow-hidden">
      <div
        className="relative z-10 min-h-dvh w-full overflow-hidden px-5 py-8 sm:px-8 lg:h-[635px] lg:min-h-0 lg:max-w-none lg:origin-top-left lg:px-0 lg:py-0"
        style={
          resetCanvas.width
            ? { width: `${resetCanvas.width}px`, transform: `scale(${resetCanvas.scale})` }
            : undefined
        }
      >
        <img
          src={loginBgShape}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-[600px] select-none object-fill lg:block"
        />

        <img
          src={loginLogo}
          alt="MediSetu"
          className="absolute left-[80px] top-[40px] hidden h-[42px] w-[180px] object-contain lg:block"
        />
        <div className="mb-8 flex justify-center lg:hidden">
          <img src={loginMark} alt="MediSetu" className="h-[58px] w-[58px] object-contain" />
        </div>

        <section className="absolute left-[100px] top-[99px] z-10 hidden w-[430px] lg:block">
          <div className="tracking-normal">
            <h1 className="text-[23px] font-semibold capitalize leading-[29px] text-[#100E1C]">
              <span className="text-primary">Reset Your Password </span>
              <span>Securely & Quickly</span>
            </h1>
            <p className="mt-[8px] text-[10.5px] font-normal capitalize leading-[19px] text-[#677294]">
              Create a strong new password to regain access to your account and continue managing your clinic efficiently.
            </p>
          </div>

          <div
            className="mt-[13px] flex h-[112px] w-[430px] flex-col justify-center gap-[9px] rounded-lg border border-[rgba(207,207,207,0.45)] bg-white/85 p-[14px] backdrop-blur-[2px]"
            style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05)" }}
          >
            <img src={shieldCheckmarkIcon} alt="" className="h-[20px] w-[20px]" />
            <div className="flex flex-col gap-[6px] tracking-normal">
              <span className="text-[13px] font-semibold capitalize leading-[17px] text-[#100E1C]">
                Your account security is our priority
              </span>
              <span className="text-[10.5px] font-normal leading-[15px] text-[#677294]">
                Choose a strong password with a mix of letters, numbers, and symbols to keep your clinic data safe and secure.
              </span>
            </div>
          </div>

          <div
            className="mt-[14px] flex h-[55px] w-[430px] items-center justify-between rounded-lg border border-[rgba(207,207,207,0.45)] bg-white/85 px-[16px] backdrop-blur-[2px]"
            style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05)" }}
          >
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className="h-[27px] w-px bg-border-color" />}
                <div className="flex items-start gap-[8px]">
                  <img src={s.icon} alt="" className="h-[14px] w-[14px] shrink-0" />
                  <div className="flex flex-col gap-[1px] tracking-normal">
                    <span className="text-[11px] font-semibold capitalize leading-[13px] text-[#100E1C]">{s.value}</span>
                    <span className="text-[9px] font-normal leading-[12px] text-[#677294]">{s.label}</span>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        <img
          src={doctorGirl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[420px] bottom-[-300px] z-10 hidden h-[1200px] w-[286px] select-none object-contain lg:block"
        />

        <div className="relative z-20 mx-auto w-full max-w-[493px] lg:absolute lg:right-[110px] lg:top-[50px] lg:mx-0 lg:w-[319px] lg:max-w-none">
          <div className="mx-auto flex h-auto w-full flex-col items-center overflow-hidden rounded-[24px] bg-white/90 px-6 py-7 backdrop-blur-[4px] sm:px-[52px] sm:py-8 lg:h-[486px] lg:max-w-none lg:rounded-[16px] lg:px-[36px] lg:py-[22px]">
            <div className="w-full text-center">
              <h2 className="text-[26px] font-semibold capitalize leading-[32px] text-primary sm:text-[28px] sm:leading-[35px] lg:text-[19px] lg:leading-[22px]">
                Reset Password
              </h2>
              <p className="mt-1 text-[14px] font-normal leading-[18px] text-[#677294] sm:text-[15px] sm:leading-[20px] lg:text-[11px] lg:leading-[14px]">
                Enter Your New Password Below
              </p>
            </div>

            <form 
              onSubmit={handleSubmit(onSubmit)} 
              className="mt-4 flex w-full max-w-[381px] flex-col gap-[12px] sm:mt-5 sm:gap-[14px] lg:mt-[18px] lg:w-[247px] lg:gap-[9px]" 
              noValidate
            >
              <div className={inputCls}>
                <InputField
                  control={control}
                  type={showNewPassword ? "text" : "password"}
                  label="New Password"
                  name="newPassword"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  classNames={authInputClassNames}
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                      className="grid place-items-center text-[#677294] hover:text-[#100E1C]"
                    >
                      {showNewPassword ? (
                        <FiEyeOff className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                      ) : (
                        <FiEye className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                      )}
                    </button>
                  }
                />
              </div>

              <div className={inputCls}>
                <InputField
                  control={control}
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  classNames={authInputClassNames}
                  endContent={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="grid place-items-center text-[#677294] hover:text-[#100E1C]"
                    >
                      {showConfirmPassword ? (
                        <FiEyeOff className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                      ) : (
                        <FiEye className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                      )}
                    </button>
                  }
                />
              </div>

              <div className="flex h-[45px] justify-center overflow-visible sm:h-[47px] lg:h-[45px]">
                <div className="origin-top scale-[0.68] sm:scale-[0.72] lg:scale-[0.68] [&>div]:!my-0">
                  <AppTurnstile
                    ref={turnstileRef}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              </div>

              <AppButton
                text="Reset Password"
                type="submit"
                className="h-[40px] w-full !rounded-xl text-[14px] font-semibold sm:h-[42px] sm:text-[15px] lg:h-[34px] lg:!rounded-lg lg:text-[11px]"
                isDisabled={isSubmitDisabled}
                isLoading={isLoading}
              />

              <p className="text-center text-[13px] font-medium tracking-normal text-[#677294] sm:text-[14px] lg:text-[10px]">
                Remember your password?{" "}
                <Link to="/login" className="font-bold text-primary underline hover:opacity-90">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>

        <div
          className="absolute left-[49px] right-[97px] top-[550px] z-30 hidden h-[59px] items-center justify-between rounded-[14px] border border-[rgba(207,207,207,0.5)] bg-white px-[22px] lg:flex"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center gap-[46px]">
            <div className="flex items-start gap-[8px]">
              <img src={`${BASE}assets/icons/support-icon.svg`} alt="" className="h-[25px] w-[25px] shrink-0" />
              <div className="flex w-[137px] flex-col gap-[1px] tracking-normal">
                <span className="text-[11px] font-semibold text-primary">Need Help ?</span>
                <span className="text-[9px] font-medium text-[#677294]">We&apos;re here for you 24/7</span>
              </div>
            </div>
            <div className="flex flex-col gap-[1px] tracking-normal">
              <span className="text-[12px] font-semibold text-[#100E1C]">+91 8770553894</span>
              <span className="text-[9px] font-medium text-[#677294]">support@infinitymedisetu.com</span>
            </div>
          </div>
          <a
            href="https://infinitymedisetu.com/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[34px] items-center gap-[10px] rounded-[10px] border border-secondary px-[16px] text-[10px] font-semibold tracking-normal text-[#100E1C] transition-colors hover:bg-secondary/5"
          >
            Request a Demo
            <svg width="15" height="15" viewBox="0 0 22 22" fill="none" className="rotate-90">
              <path d="M11 4.5V17.5M11 4.5L6 9.5M11 4.5L16 9.5" stroke="#100E1C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </main>
  );
};

export default NewPass;
