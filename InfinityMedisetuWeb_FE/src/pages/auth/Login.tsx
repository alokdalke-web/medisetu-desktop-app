import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import {
  addToast,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { FiAlertCircle, FiEye, FiEyeOff } from "react-icons/fi";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import InputField from "../../components/shared/InputField";
import CheckBox from "../../components/shared/CheckBox";
import AppButton from "../../components/shared/AppButton";
import AppTurnstile from "../../components/shared/Turnstile";
import GoogleAuthButton from "../../components/shared/GoogleAuthButton";
import BannerDisplay from "../../components/banners/BannerDisplay";

import { loginSchema, type LoginDto } from "../../schemas/auth";
import FullScreenVideoLoader from "../../components/common/FullScreenVideoLoader";
import {
  useLoginMutation,
  useSocialLoginMutation,
} from "../../redux/api/authApi";
import type { CredentialResponse } from "@react-oauth/google";

// Assets
const BASE = import.meta.env.BASE_URL;
const loginBgShape = `${BASE}assets/images/backgrund-girl.png`;
// const loginBgBorder = `${BASE}assets/images/login-bg-border.png`;
const loginLogo = `${BASE}assets/images/logoLight.svg`;
const doctorGirl = `${BASE}assets/images/doc-Girl.png`;
const aiPrescriptionIcon = `${BASE}assets/icons/ai-prescription-icon.svg`;
const shieldCheckmarkIcon = `${BASE}assets/icons/shield-checkmark-icon.svg`;
const micIcon = `${BASE}assets/icons/mic-icon.svg`;
const billingIcon = `${BASE}assets/icons/billing-icon.svg`;

type LoginRedirectUser = {
  userType?: string | null;
  userStatus?: string | null;
};
type LoginRedirectResponse = {
  user?: LoginRedirectUser | null;
  profile?: LoginRedirectUser | null;
};
type TurnstileWidgetSize = "normal" | "compact";

const getTurnstileWidgetSize = (): TurnstileWidgetSize =>
  typeof window !== "undefined" &&
    window.matchMedia("(max-width: 374px)").matches
    ? "compact"
    : "normal";

const normalizeStatus = (s?: string | null) =>
  String(s || "")
    .trim()
    .toLowerCase();
const INVALID_LOGIN_MESSAGES = new Set([
  "invalid credentials",
  "invalid email",
  "invalid email or password",
  "invalid password",
]);
const isInvalidLoginMessage = (m: string) =>
  INVALID_LOGIN_MESSAGES.has(m.trim().toLowerCase());

const getPostLoginPath = (data: LoginRedirectResponse) => {
  const u = data.profile ?? data.user;
  if (u?.userType === "Pharmacist" || u?.userType === "Pharmacy")
    return "/pharmacy/dashboard";
  if (u?.userType === "Admin")
    return normalizeStatus(u?.userStatus) === "pending"
      ? "/clinic-setup"
      : "/dashboard";
  if (u?.userType === "Doctor")
    return normalizeStatus(u?.userStatus) === "pending"
      ? "/clinic-setup"
      : "/dashboard";
  if (u?.userType === "Super_Admin")
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

const LOGIN_DESIGN_WIDTH = 1024;
const LOGIN_DESIGN_HEIGHT = 635;
const LOGIN_COMPACT_DESIGN_WIDTH = 835;

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
  "[&_[data-slot='input-wrapper']]:!h-[40px] [&_[data-slot='input-wrapper']]:!min-h-[40px] sm:[&_[data-slot='input-wrapper']]:!h-[42px] sm:[&_[data-slot='input-wrapper']]:!min-h-[42px] lg:[&_[data-slot='input-wrapper']]:!h-[34px] lg:[&_[data-slot='input-wrapper']]:!min-h-[34px] [&_[data-slot='input-wrapper']]:!rounded-[10px] lg:[&_[data-slot='input-wrapper']]:!rounded-lg [&_[data-slot='input-wrapper']]:!bg-white [&_[data-slot='input-wrapper']]:!border [&_[data-slot='input-wrapper']]:!border-[#cfcfcf] [&_[data-slot='input-wrapper']]:!py-0 [&_[data-slot='input-wrapper']]:!shadow-none [&_[data-slot='label']_label]:!pb-[4px] lg:[&_[data-slot='label']_label]:!pb-[3px] [&_[data-slot='label']_label]:!text-[12px] sm:[&_[data-slot='label']_label]:!text-[13px] lg:[&_[data-slot='label']_label]:!text-[10px] [&_[data-slot='label']_label]:!font-semibold [&_[data-slot='label']_label]:!text-[#100E1C] [&_[data-slot='label']_label]:!tracking-normal [&_[data-slot='helper-wrapper']]:!pt-[3px] lg:[&_[data-slot='helper-wrapper']]:!pt-[2px] [&_[data-slot='error-message']]:!text-[11px] [&_[data-slot='error-message']]:!leading-[13px] sm:[&_[data-slot='error-message']]:!text-[11px] sm:[&_[data-slot='error-message']]:!leading-[13px] lg:[&_[data-slot='error-message']]:!text-[8.5px] lg:[&_[data-slot='error-message']]:!leading-[10px] [&_input]:!py-0 [&_input]:!text-[13px] sm:[&_input]:!text-[14px] lg:[&_input]:!text-[11px] [&_input]:!font-light [&_input]:!text-[#100E1C] [&_input::placeholder]:!text-[#677294] [&_input::placeholder]:!font-light";

const authInputClassNames = {
  input:
    "!py-0 !text-[12px] !leading-[16px] sm:!text-[13px] sm:!leading-[17px] lg:!text-[10px] lg:!leading-[13px] !font-light !text-[#100E1C] placeholder:!text-[#677294] placeholder:!font-light dark:!text-slate-100 dark:placeholder:!text-slate-500",
  helperWrapper: "!pt-[3px] lg:!pt-[2px]",
  errorMessage:
    "!text-[11px] !leading-[13px] sm:!text-[11px] sm:!leading-[13px] lg:!text-[8.5px] lg:!leading-[10px] !font-normal",
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [loginAccessMessage, setLoginAccessMessage] = useState<string | null>(
    null,
  );
  const shownOnceRef = useRef(false);

  useEffect(() => {
    if (shownOnceRef.current) return;
    shownOnceRef.current = true;
    const raw = sessionStorage.getItem("postLoginToast");
    if (!raw) return;
    sessionStorage.removeItem("postLoginToast");
    try {
      const t = JSON.parse(raw);
      addToast({
        title: t.title ?? "Session Expired",
        description: t.description ?? "Please login again.",
        color: t.color ?? "warning",
        timeout: 4000,
      });
    } catch {
      addToast({
        title: "Session Expired",
        description: "Please login again.",
        color: "warning",
        timeout: 4000,
      });
    }
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitted },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const emailValue = useWatch({ control, name: "email" });
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fromState = (location.state as any)?.email;
    const fromQuery = searchParams.get("email");
    const initialEmail = (fromState || fromQuery || "").toString();
    if (!initialEmail) return;
    setValue("email", initialEmail.toLowerCase().replace(/\s+/g, ""), {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [location.state, searchParams, setValue]);

  useEffect(() => {
    if (emailValue == null) return;
    const normalized = emailValue.toLowerCase().replace(/\s+/g, "");
    if (emailValue !== normalized)
      setValue("email", normalized, {
        shouldDirty: true,
        shouldValidate: isSubmitted,
      });
  }, [emailValue, setValue, isSubmitted]);

  const forgotPasswordEmail = String(emailValue || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
  const [showPass, setShowPass] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileWidgetSize, setTurnstileWidgetSize] =
    useState<TurnstileWidgetSize>(getTurnstileWidgetSize);
  type LoginCanvas = {
    scale: number;
    width: number | null;
    height: number | null;
  };
  const [loginCanvas, setLoginCanvas] = useState<LoginCanvas>({
    scale: 1,
    width: null,
    height: null,
  });

  const [showVideoLoader, setShowVideoLoader] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 374px)");
    const h = () => {
      const n = getTurnstileWidgetSize();
      setTurnstileWidgetSize((c) => {
        if (c === n) return c;
        setCaptchaToken(null);
        return n;
      });
    };
    h();
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (window.innerWidth < 1024) {
        setLoginCanvas({ scale: 1, width: null, height: null });
        return;
      }

      const isCompactDesktop = window.innerWidth < 1200;
      const nextScale = Math.min(
        window.innerWidth /
        (isCompactDesktop ? LOGIN_COMPACT_DESIGN_WIDTH : LOGIN_DESIGN_WIDTH),
        window.innerHeight / LOGIN_DESIGN_HEIGHT,
      );

      setLoginCanvas({
        scale: Number(nextScale.toFixed(4)),
        width: Number((window.innerWidth / nextScale).toFixed(2)),
        height: Number(
          Math.max(LOGIN_DESIGN_HEIGHT, window.innerHeight / nextScale).toFixed(
            2,
          ),
        ),
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const [login, { isLoading }] = useLoginMutation();
  const [socialLogin] = useSocialLoginMutation();

  const handleGoogleSuccess = async (cr: CredentialResponse) => {
    if (!cr.credential) {
      addToast({
        title: "Google Login Failed",
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
        title: "Login Successful",
        description: "Welcome to IMS",
        color: "success",
      });
      
      // Show loader for minimum 3 seconds before navigating
      setShowVideoLoader(true);
      
      // Use Promise.all to ensure minimum duration
      const minDuration = new Promise(resolve => setTimeout(resolve, 3000));
      
      await Promise.all([minDuration]);
      
      // Navigate after minimum duration
      navigate(getPostLoginPath(data), { replace: true });
    } catch (err: any) {
      addToast({
        title: "Google Login Failed",
        description: String(
          err?.data?.message ||
          err?.data?.error ||
          err?.error ||
          "Google login failed",
        ),
        color: "danger",
      });
    }
  };

  const onSubmit = async (formData: LoginDto) => {
    if (!captchaToken) {
      addToast({
        title: "Security Check Required",
        description: "Please complete the CAPTCHA.",
        color: "warning",
      });
      return;
    }
    try {
      setLoginAccessMessage(null);
      const payload: LoginDto = {
        ...formData,
        email: formData.email.toLowerCase().replace(/\s+/g, "").trim(),
      };
      const data = await login({ ...payload, captchaToken }).unwrap();

      // ✅ MFA required — redirect to MFA verification page
      if (data.mfaRequired && data.tempToken) {
        navigate("/mfa-verify", { replace: true });
        return;
      }

      addToast({
        title: "Login Successful",
        description: "Welcome to IMS",
        color: "success",
      });
      
      // Show loader for minimum 3 seconds before navigating
      setShowVideoLoader(true);
      
      // Use Promise.all to ensure minimum duration
      const minDuration = new Promise(resolve => setTimeout(resolve, 3000));
      
      await Promise.all([minDuration]);
      
      // Navigate after minimum duration
      navigate(getPostLoginPath(data), { replace: true });
    } catch (err: any) {
      setCaptchaToken(null);
      turnstileRef.current?.reset();
      const msg = String(
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        "Invalid credentials",
      );
      const status = Number(
        err?.status ?? err?.originalStatus ?? err?.data?.status,
      );
      if (status === 401 && !isInvalidLoginMessage(msg)) {
        setLoginAccessMessage(msg);
        return;
      }
      addToast({ title: "Login Failed ❌", description: msg, color: "danger" });
    }
  };

  const isSubmitDisabled = isLoading;

  return (
    <>
      <FullScreenVideoLoader show={showVideoLoader} />
      {/* ── LOGIN_PAGE Banner — top bar banner ── */}
      <div className="w-full bg-gradient-to-r from-teal-600 to-teal-700 z-50">
        <BannerDisplay placement="LOGIN_PAGE" topBar={true} />
      </div>

      <main className="relative flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-[#fcfefd] font-outfit lg:items-start lg:justify-start lg:overflow-hidden">
        <div
          className="relative z-10 min-h-dvh w-full overflow-hidden px-5 py-8 sm:px-8 lg:h-[635px] lg:min-h-0 lg:max-w-none lg:origin-top-left lg:px-0 lg:py-0"
          style={
            loginCanvas.width
              ? {
                width: `${loginCanvas.width}px`,
                height: loginCanvas.height
                  ? `${loginCanvas.height}px`
                  : undefined,
                transform: `scale(${loginCanvas.scale})`,
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
          {/* <img
            src={loginBgBorder}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 hidden h-full w-[47%] select-none object-fill lg:block"
          /> */}

          <img
            src={loginLogo}
            alt="MediSetu"
            className="absolute left-[80px] top-[40px] hidden h-[42px] w-[180px] object-contain lg:block"
          />
          <div className="mb-8 flex justify-center lg:hidden ">
            <img
              src={`${BASE}assets/images/sidebar-fevicon.svg`}
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

            <div className="mt-[13px] grid w-[430px] grid-cols-2 gap-[14px] lg:max-[1199px]:w-[400px] lg:max-[1199px]:gap-[12px] ">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex h-[112px]  flex-col gap-[9px] rounded-lg border border-[rgba(207,207,207,0.45)] bg-white/85 p-[8px] backdrop-blur-[2px]"
                  style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05)" }}
                >
                  <img src={f.icon} alt="" className="h-[16px] w-[16px]" />
                  <div className="flex flex-col gap-[5px] tracking-normal ">
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
              style={{ boxShadow: "1px 1px 10px 0px rgba(0,0,0,0.05) " }}
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
            className="pointer-events-none absolute right-[395px] bottom-[-300px] z-10 hidden h-[1200px] w-[286px] select-none object-contain min-[1471px]:block"
          />

          <div className="relative z-20 mx-auto w-full max-w-[493px] lg:absolute lg:right-[70px] lg:top-[50px] lg:mx-0 lg:w-[340px] lg:max-w-none lg:max-[1199px]:right-[45px] lg:max-[1199px]:top-[42px] lg:max-[1199px]:w-[320px] ">
            <div
              className="
  mx-auto flex h-auto w-full flex-col items-center
  overflow-hidden rounded-[24px]
  border border-[#dfe9e8]
  bg-white/95
  px-8 py-8
  sm:px-[56px] sm:py-10
  lg:h-[486px]
  lg:max-w-none
  lg:rounded-[16px]
  lg:px-[42px]
  lg:py-[28px]
  lg:max-[1199px]:px-[34px]
  shadow-[0_18px_50px_rgba(10,108,116,0.14)]
  backdrop-blur-[4px]
"
            >
              <div className="w-full text-center ">
                <h2 className="text-[26px] font-semibold capitalize leading-[32px] text-primary sm:text-[28px] sm:leading-[35px] lg:text-[19px] lg:leading-[22px]">
                  Welcome Back
                </h2>
                <p className="mt-1 text-[14px] font-normal leading-[18px] text-[#677294] sm:text-[15px] sm:leading-[20px] lg:text-[11px] lg:leading-[14px]">
                  Login To Manage Your Clinic
                </p>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-4 flex w-full max-w-[381px] flex-col gap-[4px] sm:mt-5 sm:gap-[6px] lg:mt-[18px] lg:w-[300px] lg:gap-[8px]"
                noValidate
              >
                <div className="flex flex-col gap-[12px] sm:gap-[14px] lg:gap-[11px]">
                  <div className="flex flex-col gap-[10px] sm:gap-[12px] lg:gap-[8px]">
                    <div className={inputCls}>
                      <InputField
                        control={control}
                        type="email"
                        label="Email Address"
                        name="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        classNames={authInputClassNames}
                      />
                    </div>
                    <div className={inputCls}>
                      <InputField
                        control={control}
                        type={showPass ? "text" : "password"}
                        label="Password"
                        name="password"
                        placeholder="*  *  *  *  *  *  *  *"
                        autoComplete="current-password"
                        classNames={authInputClassNames}
                        endContent={
                          <button
                            type="button"
                            onClick={() => setShowPass((v) => !v)}
                            aria-label={
                              showPass ? "Hide password" : "Show password"
                            }
                            className="grid place-items-center text-[#677294] hover:text-[#100E1C]"
                          >
                            {showPass ? (
                              <FiEyeOff className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                            ) : (
                              <FiEye className="h-5 w-5 lg:h-[13px] lg:w-[13px]" />
                            )}
                          </button>
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="[&_span]:!text-[12px] [&_span]:!font-medium [&_span]:!tracking-normal [&_span]:!text-[#100E1C] lg:[&_span]:!text-[9px]">
                      <CheckBox
                        control={control}
                        name="rememberMe"
                        label="Remember me"
                        color="success"
                        classNames={{
                          wrapper:
                            "before:!border-[#cfcfcf] before:!rounded-[5px] after:!rounded-[5px] after:!bg-[#16a34a] after:!text-white group-data-[selected=true]:before:!border-[#16a34a] !h-[18px] !w-[18px] !rounded-[5px] !text-white lg:!h-[15px] lg:!w-[15px]",
                          icon: "!text-white !text-[11px] lg:!text-[10px]",
                        }}
                      />
                    </div>
                    <Link
                      to="/forgot-password"
                      state={{ email: forgotPasswordEmail }}
                      className="shrink-0 text-[13px] font-medium tracking-normal text-primary underline hover:opacity-90 lg:text-[9px]"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <div className="flex h-[45px] justify-center overflow-visible sm:h-[47px] lg:h-[45px]">
                    <div className="origin-top scale-[0.68] sm:scale-[0.72] lg:scale-[0.68] [&>div]:!my-0">
                      <AppTurnstile
                        key={turnstileWidgetSize}
                        ref={turnstileRef}
                        options={{ size: turnstileWidgetSize }}
                        onSuccess={(t) => setCaptchaToken(t)}
                        onError={() => setCaptchaToken(null)}
                        onExpire={() => setCaptchaToken(null)}
                      />
                    </div>
                  </div>

                  <AppButton
                    text="Login"
                    type="submit"
                    disabled={isSubmitDisabled}
                    isLoading={isLoading}
                    className="h-[40px] w-full !rounded-xl text-[14px] font-semibold sm:h-[42px] sm:text-[15px] lg:h-[34px] lg:!rounded-lg lg:text-[11px]"
                  />
                </div>

                <div className="flex w-full items-center gap-4">
                  <div className="h-[1px] flex-1 bg-[#D9D9D9]" />
                  <span className="whitespace-nowrap text-[13px] font-normal text-[#677294] sm:text-[14px] lg:text-[10px]">
                    or continue with
                  </span>
                  <div className="h-[1px] flex-1 bg-[#D9D9D9]" />
                </div>

                <GoogleAuthButton
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    addToast({
                      title: "Google Login Failed",
                      description: "Something went wrong.",
                      color: "danger",
                    })
                  }
                />

                <p className="text-center text-[13px] font-medium tracking-normal text-[#677294] sm:text-[14px] lg:text-[10px]">
                  Don&apos;t have an account ?{" "}
                  <Link
                    to="/signup-email"
                    className="font-bold text-primary underline hover:opacity-90"
                  >
                    Sign Up
                  </Link>
                </p>

                <p className="text-center text-[11px] font-normal leading-relaxed tracking-normal text-[#677294] sm:text-[12px] lg:text-[9px]">
                  By continuing, you agree to our{" "}
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

                {/* Divider */}
              </form>
            </div>
          </div>

          <div
            className="absolute left-[100px] right-[65px] top-[550px] z-30 hidden h-[59px] items-center justify-between rounded-[14px] border border-[rgba(207,207,207,0.5)] bg-white px-[22px] lg:flex lg:max-[1199px]:left-[70px] lg:max-[1199px]:right-[45px]"
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

      {/* Access Pending Modal */}
      <Modal
        isOpen={!!loginAccessMessage}
        onOpenChange={(open) => {
          if (!open) setLoginAccessMessage(null);
        }}
        placement="center"
        size="sm"
        backdrop="blur"
        classNames={{
          base: "mx-3 rounded-2xl",
          closeButton: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col items-center gap-3 px-6 pt-7 pb-2 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                  <FiAlertCircle className="h-7 w-7" />
                </div>
                <div className="text-xl font-semibold text-slate-950">
                  Access Pending Approval
                </div>
              </ModalHeader>
              <ModalBody className="px-7 pb-2 text-center">
                <p className="text-sm leading-6 text-slate-600">
                  {loginAccessMessage}
                </p>
              </ModalBody>
              <ModalFooter className="px-7 pb-7 pt-4">
                <Button
                  radius="full"
                  className="h-11 w-full bg-[#0A6C74] font-semibold text-white"
                  onPress={onClose}
                >
                  Okay
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default Login;
