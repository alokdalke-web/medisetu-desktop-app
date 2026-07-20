import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { addToast } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CredentialResponse } from "@react-oauth/google";

import InputField from "../../components/shared/InputField";
import AppButton from "../../components/shared/AppButton";
import GoogleAuthButton from "../../components/shared/GoogleAuthButton";

import {
  useRequestRegistrationMutation,
  useSocialLoginMutation,
} from "../../redux/api/authApi";

// Assets
const BASE = import.meta.env.BASE_URL;
const loginBgShape = `${BASE}assets/images/backgrund-girl.png`;
const loginLogo = `${BASE}assets/images/logoLight.svg`;
const loginMark = `${BASE}assets/images/sidebar-fevicon.svg`;
const doctorGirl = `${BASE}assets/images/doc-Girl.png`;
const aiPrescriptionIcon = `${BASE}assets/icons/ai-prescription-icon.svg`;
const shieldCheckmarkIcon = `${BASE}assets/icons/shield-checkmark-icon.svg`;
const micIcon = `${BASE}assets/icons/mic-icon.svg`;
const billingIcon = `${BASE}assets/icons/billing-icon.svg`;

/* ---------------- schema ---------------- */
const signupEmailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
});

type SignupEmailDto = z.infer<typeof signupEmailSchema>;
type SignupRedirectUser = {
  userType?: string | null;
  userStatus?: string | null;
};
type SignupRedirectResponse = {
  user?: SignupRedirectUser | null;
  profile?: SignupRedirectUser | null;
};

const normalizeStatus = (s?: string | null) =>
  String(s || "")
    .trim()
    .toLowerCase();

const getPostSignupPath = (data: SignupRedirectResponse) => {
  const u = data.profile ?? data.user;
  if (u?.userType === "Pharmacist" || u?.userType === "Pharmacy")
    return "/pharmacy/dashboard";
  if (u?.userType === "Admin")
    return normalizeStatus(u?.userStatus) === "pending"
      ? "/clinic-setup"
      : "/dashboard";
  if (u?.userType === "Doctor" || u?.userType === "Super_Admin")
    return "/dashboard";
  if (u?.userType === "Lab_Assistant") return "/lab/dashboard";
  return "/appointment";
};

const features = [
  {
    icon: aiPrescriptionIcon,
    title: "AI-powered prescription assistant",
    desc: "Generate accurate prescriptions instantly.",
  },
  {
    icon: shieldCheckmarkIcon,
    title: "Smart appointment & patient management",
    desc: "Schedule, track and manage patients with ease.",
  },
  {
    icon: micIcon,
    title: "Voice-to-text medical documentation",
    desc: "Convert conversations to clinical notes instantly.",
  },
  {
    icon: billingIcon,
    title: "Automated billing & patient engagement",
    desc: "Convert conversations to clinical notes instantly.",
  },
];

const SIGNUP_EMAIL_DESIGN_WIDTH = 1024;
const SIGNUP_EMAIL_DESIGN_HEIGHT = 635;
const SIGNUP_EMAIL_COMPACT_DESIGN_WIDTH = 835;

const stats = [
  {
    icon: `${BASE}assets/icons/security-shield-icon.svg`,
    value: "250-bit",
    label: "Security",
  },
  {
    icon: `${BASE}assets/icons/ai-prescription-icon.svg`,
    value: "AI-Powered",
    label: "Smart Workflows",
  },
  {
    icon: `${BASE}assets/icons/growth-icon.svg`,
    value: "99.9%",
    label: "Up-time",
  },
  { icon: `${BASE}assets/icons/star-icon.svg`, value: "4.5", label: "Rating" },
];

const inputCls =
  "[&_[data-slot='input-wrapper']]:!h-[40px] [&_[data-slot='input-wrapper']]:!min-h-[40px] sm:[&_[data-slot='input-wrapper']]:!h-[42px] sm:[&_[data-slot='input-wrapper']]:!min-h-[42px] lg:[&_[data-slot='input-wrapper']]:!h-[34px] lg:[&_[data-slot='input-wrapper']]:!min-h-[34px] [&_[data-slot='input-wrapper']]:!rounded-[10px] lg:[&_[data-slot='input-wrapper']]:!rounded-lg [&_[data-slot='input-wrapper']]:!bg-white [&_[data-slot='input-wrapper']]:!border [&_[data-slot='input-wrapper']]:!border-[#cfcfcf] [&_[data-slot='input-wrapper']]:!py-0 [&_[data-slot='input-wrapper']]:!shadow-none [&_[data-slot='label']_label]:!pb-[4px] lg:[&_[data-slot='label']_label]:!pb-[3px] [&_[data-slot='label']_label]:!text-[12px] sm:[&_[data-slot='label']_label]:!text-[13px] lg:[&_[data-slot='label']_label]:!text-[10px] [&_[data-slot='label']_label]:!font-semibold [&_[data-slot='label']_label]:!text-[#100E1C] [&_[data-slot='label']_label]:!tracking-normal [&_input]:!py-0 [&_input]:!text-[13px] sm:[&_input]:!text-[14px] lg:[&_input]:!text-[11px] [&_input]:!font-light [&_input]:!text-[#100E1C] [&_input]:lowercase [&_input::placeholder]:!text-[#677294] [&_input::placeholder]:!font-light";

const authInputClassNames = {
  input:
    "!py-0 !text-[12px] !leading-[16px] sm:!text-[13px] sm:!leading-[17px] lg:!text-[10px] lg:!leading-[13px] !font-light !text-[#100E1C] placeholder:!text-[#677294] placeholder:!font-light dark:!text-slate-100 dark:placeholder:!text-slate-500",
  helperWrapper: "!pt-[3px] lg:!pt-[2px]",
  errorMessage:
    "!text-[11px] !leading-[13px] sm:!text-[11px] sm:!leading-[13px] lg:!text-[8.5px] lg:!leading-[10px] !font-normal",
};

const SignupEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isResendReady, setIsResendReady] = useState(false);
  const [signupCanvas, setSignupCanvas] = useState<{
    scale: number;
    width: number | null;
    height: number | null;
  }>({ scale: 1, width: null, height: null });

  useEffect(() => {
    const referralCode = searchParams.get("rfc");
    if (referralCode) {
      localStorage.setItem("rfc", referralCode);
    }
  }, [searchParams]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) {
      if (submittedEmail && countdown === 0 && submittedEmail.length > 0) {
        setIsResendReady(true);
      }
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, submittedEmail]);

  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth < 1024) {
        setSignupCanvas({ scale: 1, width: null, height: null });
        return;
      }

      const isCompactDesktop = window.innerWidth < 1200;
      const nextScale = Math.min(
        window.innerWidth /
          (isCompactDesktop
            ? SIGNUP_EMAIL_COMPACT_DESIGN_WIDTH
            : SIGNUP_EMAIL_DESIGN_WIDTH),
        window.innerHeight / SIGNUP_EMAIL_DESIGN_HEIGHT,
      );

      setSignupCanvas({
        scale: Number(nextScale.toFixed(4)),
        width: Number((window.innerWidth / nextScale).toFixed(2)),
        height: Number(
          Math.max(
            SIGNUP_EMAIL_DESIGN_HEIGHT,
            window.innerHeight / nextScale,
          ).toFixed(2),
        ),
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const { control, handleSubmit } = useForm<SignupEmailDto>({
    resolver: zodResolver(signupEmailSchema),
    defaultValues: { email: "" },
  });

  const [requestOtp, { isLoading }] = useRequestRegistrationMutation();
  const [socialLogin] = useSocialLoginMutation();

  const handleGoogleSuccess = async (cr: CredentialResponse) => {
    if (!cr.credential) {
      addToast({
        title: "Google Signup Failed",
        description: "No credential received.",
        color: "danger",
      });
      return;
    }

    try {
      const data = await socialLogin({
        provider: "google",
        idToken: cr.credential,
      }).unwrap();
      addToast({
        title: "Signup Successful",
        description: "Welcome to IMS",
        color: "success",
      });
      navigate(getPostSignupPath(data), { replace: true });
    } catch (err: any) {
      addToast({
        title: "Google Signup Failed",
        description: String(
          err?.data?.message ||
            err?.data?.error ||
            err?.error ||
            "Google signup failed",
        ),
        color: "danger",
      });
    }
  };

  const onSubmit = async (values: SignupEmailDto) => {
    const normalizedEmail = values.email.trim().toLowerCase();

    try {
      await requestOtp({ email: normalizedEmail }).unwrap();

      setSubmittedEmail(normalizedEmail);
      setCountdown(30);
      setIsResendReady(false);

      addToast({
        title: "Registration Link Sent ✅",
        description: "Please check your email for the registration link.",
        color: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Failed ❌",
        description: err?.data?.message || "Unable to send registration link",
        color: "danger",
      });
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-[#fcfefd] font-outfit lg:items-start lg:justify-start lg:overflow-hidden">
      <div
        className="relative z-10 min-h-dvh w-full overflow-hidden px-5 py-8 sm:px-8 lg:h-[635px] lg:min-h-0 lg:max-w-none lg:origin-top-left lg:px-0 lg:py-0"
        style={
          signupCanvas.width
            ? {
                width: `${signupCanvas.width}px`,
                height: signupCanvas.height
                  ? `${signupCanvas.height}px`
                  : undefined,
                transform: `scale(${signupCanvas.scale})`,
              }
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
          <img
            src={loginMark}
            alt="MediSetu"
            className="h-[58px] w-[58px] object-contain"
          />
        </div>

        <section className="absolute left-[100px] top-[99px] z-10 hidden w-[430px] lg:block lg:max-[1199px]:left-[70px] lg:max-[1199px]:w-[400px]">
          <div className="tracking-normal">
            <h1 className="text-[23px] font-semibold capitalize leading-[29px] text-[#100E1C]">
              <span className="text-primary">Smarter Clinic Management </span>
              <span>For Modern Healthcare</span>
            </h1>
            <p className="mt-[8px] text-[10.5px] font-normal capitalize leading-[19px] text-[#677294]">
              Trusted by clinics and healthcare professionals to manage
              appointments, patients, billing, and AI-powered workflows
              efficiently.
            </p>
          </div>

          <div className="mt-[13px] grid w-[430px] grid-cols-2 gap-[14px] lg:max-[1199px]:w-[400px] lg:max-[1199px]:gap-[12px]">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex h-[112px] flex-col gap-[9px] rounded-lg border border-[rgba(207,207,207,0.45)] bg-white/85 p-[8px] backdrop-blur-[2px]"
                style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05)" }}
              >
                <img src={f.icon} alt="" className="h-[16px] w-[16px]" />
                <div className="flex flex-col gap-[5px] tracking-normal">
                  <span className="text-[12px] font-semibold capitalize leading-[17px] text-[#100E1C]">
                    {f.title}
                  </span>
                  <span className="text-[10.5px] font-normal leading-[14px] text-[#677294]">
                    {f.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-[14px] flex h-[55px] w-[430px] items-center justify-between rounded-lg border border-[rgba(207,207,207,0.45)] bg-white/85 px-[16px] backdrop-blur-[2px] lg:max-[1199px]:w-[400px] lg:max-[1199px]:px-[14px]"
            style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05)" }}
          >
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className="h-[27px] w-px bg-border-color" />}
                <div className="flex items-start gap-[8px]">
                  <img
                    src={s.icon}
                    alt=""
                    className="h-[14px] w-[14px] shrink-0"
                  />
                  <div className="flex flex-col gap-[1px] tracking-normal">
                    <span className="text-[11px] font-semibold capitalize leading-[13px] text-[#100E1C]">
                      {s.value}
                    </span>
                    <span className="text-[9px] font-normal leading-[12px] text-[#677294]">
                      {s.label}
                    </span>
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
          className="pointer-events-none absolute right-[420px] bottom-[-300px] z-10 hidden h-[1200px] w-[286px] select-none object-contain min-[1471px]:block"
        />

        <div className="relative z-20 mx-auto w-full max-w-[493px] lg:absolute lg:right-[110px] lg:top-[50px] lg:mx-0 lg:w-[319px] lg:max-w-none lg:max-[1199px]:right-[45px] lg:max-[1199px]:top-[42px] lg:max-[1199px]:w-[320px]">
          <div className="mx-auto flex h-auto w-full flex-col items-center overflow-hidden rounded-[24px] bg-white/90 px-6 py-7 backdrop-blur-[4px] sm:px-[52px] sm:py-8 lg:h-[486px] lg:max-w-none lg:rounded-[16px] lg:px-[36px] lg:py-[22px] lg:max-[1199px]:px-[34px]">
            <div className="w-full text-center">
              <h2 className="text-[26px] font-semibold capitalize leading-[32px] text-primary sm:text-[28px] sm:leading-[35px] lg:text-[19px] lg:leading-[22px]">
                Create Your Account
              </h2>
              <p className="mt-1 text-[14px] font-normal leading-[18px] text-[#677294] sm:text-[15px] sm:leading-[20px] lg:text-[11px] lg:leading-[14px]">
                Signup To Manage Your Clinic Online
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 flex w-full max-w-[381px] flex-col gap-[18px] sm:mt-7 sm:gap-[20px] lg:mt-[42px] lg:w-[247px] lg:gap-[14px]"
              noValidate
            >
              <div className={inputCls}>
                <InputField
                  control={control}
                  type="email"
                  label="Email Address"
                  name="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  classNames={authInputClassNames}
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    e.currentTarget.value = e.currentTarget.value.toLowerCase();
                  }}
                />
              </div>

              <AppButton
                text={
                  countdown > 0
                    ? `Resend in ${countdown}s`
                    : isResendReady
                      ? "Resend OTP"
                      : "Send OTP"
                }
                type="submit"
                isLoading={isLoading}
                isDisabled={countdown > 0 || isLoading}
                className="mt-4 h-[40px] w-full !rounded-xl text-[14px] font-semibold sm:h-[42px] sm:text-[15px] lg:mt-[10px] lg:h-[34px] lg:!rounded-lg lg:text-[11px]"
              />

              <div className="flex w-full items-center gap-4">
                <div className="h-[1px] flex-1 bg-[#D9D9D9]" />

                <span
                  className="
      whitespace-nowrap
      text-[13px]
      font-normal
      text-[#677294]
      sm:text-[14px]
      lg:text-[10px]
    "
                >
                  or continue with
                </span>

                <div className="h-[1px] flex-1 bg-[#D9D9D9]" />
              </div>
              <GoogleAuthButton
                buttonText="signup_with"
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  addToast({
                    title: "Google Signup Failed",
                    description: "Something went wrong.",
                    color: "danger",
                  })
                }
              />

              <p className="text-center text-[13px] font-medium tracking-normal text-[#677294] sm:text-[14px] lg:mt-2 lg:text-[10px]">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold text-primary underline hover:opacity-90"
                >
                  Login
                </Link>
              </p>

              <p className="text-center text-[11px] font-normal leading-relaxed tracking-normal text-[#677294] sm:text-[12px] lg:text-[9px]">
                By signing up, you agree to our{" "}
                <a
                  href="https://infinitymedisetu.com/terms-of-service/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:opacity-90"
                >
                  Terms of Service
                </a>
                {" "}and{" "}
                <a
                  href="https://infinitymedisetu.com/privacy-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline hover:opacity-90"
                >
                  Privacy Policy
                </a>
              </p>
            </form>
          </div>
        </div>

        <div
          className="absolute left-[49px] right-[97px] top-[550px] z-30 hidden h-[59px] items-center justify-between rounded-[14px] border border-[rgba(207,207,207,0.5)] bg-white px-[22px] lg:flex lg:max-[1199px]:left-[70px] lg:max-[1199px]:right-[45px]"
          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center gap-[46px]">
            <div className="flex items-start gap-[8px]">
              <img
                src={`${BASE}assets/icons/support-icon.svg`}
                alt=""
                className="h-[25px] w-[25px] shrink-0"
              />
              <div className="flex w-[137px] flex-col gap-[1px] tracking-normal">
                <span className="text-[11px] font-semibold text-primary">
                  Need Help ?
                </span>
                <span className="text-[9px] font-medium text-[#677294]">
                  We&apos;re here for you 24/7
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-[1px] tracking-normal">
              <span className="text-[12px] font-semibold text-[#100E1C]">
                +91 8770553894
              </span>
              <span className="text-[9px] font-medium text-[#677294]">
                support@infinitymedisetu.com
              </span>
            </div>
          </div>
          <a
            href="https://infinitymedisetu.com/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[34px] items-center gap-[10px] rounded-[10px] border border-secondary px-[16px] text-[10px] font-semibold tracking-normal text-[#100E1C] transition-colors hover:bg-secondary/5"
          >
            Request a Demo
            <svg
              width="15"
              height="15"
              viewBox="0 0 22 22"
              fill="none"
              className="rotate-90"
            >
              <path
                d="M11 4.5V17.5M11 4.5L6 9.5M11 4.5L16 9.5"
                stroke="#100E1C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>
    </main>
  );
};

export default SignupEmail;
