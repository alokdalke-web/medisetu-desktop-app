import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  FiBell,
  FiBookOpen,
  FiChevronRight,
  FiClock,
  FiHeadphones,
  FiHelpCircle,
  FiLogOut,
  FiMoon,
  FiShield,
  FiSun,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { useDispatch } from "react-redux";

import { useTheme } from "../hooks/useTheme";
import { useGetUserQuery } from "../redux/api/authApi";
import { logout } from "../redux/slices/authSlice";
import {
  OnboardingProvider,
  useOnboardingStep,
} from "../context/OnboardingContext";
import VerificationSidebar from "../components/onboarding/VerificationSidebar";

const BASE = import.meta.env.BASE_URL;

const onboardingImage = `${BASE}assets/images/Doc_Steps.png`;
const logoLight = `${BASE}assets/images/logoLight.png`;

const clinicSetupSidebarContent = {
  heading: "Let's set up your clinic",
  description:
    "Add basic details about your clinic so patients can find and trust you.",
  features: [
    {
      icon: FiZap,
      title: "Quick & Easy",
      description: "Complete setup in a few minutes",
    },
    {
      icon: FiShield,
      title: "100% Secure",
      description: "Your data is safe with us",
    },
    {
      icon: FiUsers,
      title: "Trusted by Clinics",
      description: "Built for clinics like yours",
    },
  ],
};

const servicesSidebarContent = {
  heading: "Let's grow your practice",
  description:
    "Add services and consultation fees to help patients understand your offerings with clarity.",
  features: [
    {
      icon: FiClock,
      title: "Quick & Easy",
      description: "Complete setup in a few minutes",
    },
    {
      icon: FiShield,
      title: "100% Secure",
      description: "Your data is safe with us",
    },
    {
      icon: FiUsers,
      title: "Trusted by Clinics",
      description: "Join 1000+ healthcare providers",
    },
  ],
};

const availabilitySidebarContent = {
  heading: "Let's build your Dream Clinic",
  description:
    "Complete your profile to connect with patients and manage your practice efficiently.",
  features: [
    {
      icon: FiZap,
      title: "Quick & Easy",
      description: "Complete setup in a few minutes",
    },
    {
      icon: FiShield,
      title: "100% Secure",
      description: "Your data is safe with us",
    },
    {
      icon: FiUsers,
      title: "Verified & Trusted",
      description: "Trusted by 1000+ healthcare providers",
    },
  ],
};

const reviewSidebarContent = {
  heading: "We're building better healthcare, together.",
  description:
    "You're just a few steps away from activating your clinic on Infinity Medisetu.",
  features: [
    {
      icon: FiZap,
      title: "Quick & Easy",
      description: "Complete setup in a few minutes",
    },
    {
      icon: FiShield,
      title: "100% Secure",
      description: "Your data is safe with us",
    },
    {
      icon: FiUsers,
      title: "Verified & Trusted",
      description: "Trusted by 1000+ healthcare providers",
    },
  ],
};

const sidebarContent: Record<
  string,
  {
    heading: string;
    description: string;
    features: Array<{
      icon: React.ElementType;
      title: string;
      description: string;
    }>;
  }
> = {
  clinic: clinicSetupSidebarContent,
  profile: clinicSetupSidebarContent,
  services: servicesSidebarContent,
  availability: availabilitySidebarContent,
  review: reviewSidebarContent,

  verification: {
    heading: "You're almost there!",
    description:
      "We're reviewing your details to ensure everything is perfect. Thank you for choosing Infinity Medisetu.",
    features: [
      {
        icon: FiShield,
        title: "Secure & Reliable",
        description: "Your data is protected with enterprise-grade security",
      },
      {
        icon: FiUsers,
        title: "Trusted by Clinics",
        description: "Join 1000+ healthcare providers growing with us",
      },
      {
        icon: FiHeadphones,
        title: "Dedicated Support",
        description: "Our team is here to help you every step of the way",
      },
    ],
  },

  default: clinicSetupSidebarContent,
};

const OnboardingLayoutContent: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { data: user } = useGetUserQuery();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { activeStep } = useOnboardingStep();

  const getCurrentStep = (): string => {
    if (activeStep && activeStep in sidebarContent) {
      return activeStep;
    }

    if (activeStep === "subscription") {
      return "review";
    }

    const path = location.pathname.toLowerCase();

    if (
      path.includes("verification") ||
      path.includes("approval") ||
      path.includes("waiting")
    ) {
      return "verification";
    }

    if (
      path.includes("subscription") ||
      path.includes("review") ||
      path.includes("submit")
    ) {
      return "review";
    }

    if (
      path.includes("availability") ||
      path.includes("schedule") ||
      path.includes("basic-setup")
    ) {
      return "availability";
    }

    if (path.includes("service") || path.includes("pricing")) {
      return "services";
    }

    if (path.includes("profile") || path.includes("overview")) {
      return "profile";
    }

    if (path.includes("clinic")) {
      return "clinic";
    }

    return "default";
  };

  const currentStep = getCurrentStep();

  const content =
    sidebarContent[currentStep] ||
    sidebarContent.default ||
    sidebarContent.clinic;

  const isVerificationStep = currentStep === "verification";
  const isServicesStep = currentStep === "services";
  const isAvailabilityStep = currentStep === "availability";
  const isReviewStep = currentStep === "review" || currentStep === "subscription";


  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const handleOpenGuide = () => {
    const currentPath = location.pathname;

    navigate(
      `/guidelines?from=${encodeURIComponent(currentPath)}&section=onboarding`,
    );
  };

  return (
    <div
      className={[
        isDark ? "dark" : "",
        "flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white font-outfit dark:bg-[#111726] xl:flex-row",
      ].join(" ")}
    >
      {isVerificationStep ? (
        <VerificationSidebar />
      ) : (
        <aside
          className="
            relative hidden h-[100dvh] min-h-0 overflow-hidden
            border-r border-slate-200/80
            bg-[#f7fbfb] shadow-sm
            dark:border-slate-800 dark:bg-slate-950
            xl:flex xl:w-[360px] xl:flex-col
            2xl:w-[390px]
          "
        >
          {/* Image background */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(350px,60dvh,560px)] overflow-hidden">
            {" "}
            <img
              src={onboardingImage}
              alt="Doctor"
              className="
    pointer-events-none absolute inset-0
    h-full w-full
    select-none object-cover
    dark:opacity-75
  "
              style={{
                objectPosition: "center top",
                transform: "translateY(-32px) scale(1.04)",
                transformOrigin: "center top",
              }}
            />
            {/* Light fade over image bottom */}
            <div
              className="
                absolute inset-x-0 bottom-0
                h-[52%]
                bg-gradient-to-b
                from-transparent
                via-[#f7fbfb]/75
                to-[#f7fbfb]
                dark:via-slate-950/75
                dark:to-slate-950
              "
            />
            {/* Additional smooth fade */}
            <div
              className="
                absolute inset-x-0 bottom-0
                h-[34%]
                bg-gradient-to-b
                from-transparent
                via-[#f7fbfb]/50
                to-[#f7fbfb]
                backdrop-blur-[1px]
                dark:via-slate-950/50
                dark:to-slate-950
              "
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
              }}
            />
          </div>

          {/* Logo */}
          <img
            src={logoLight}
            alt="Infinity Medisetu"
            className="
              pointer-events-none absolute
              left-7 top-6 z-30
              h-9 w-auto
              select-none object-contain
              drop-shadow-sm
            "
          />

          {/* Main sidebar content */}
          <div
            className="
              relative z-20
              no-scrollbar flex h-full min-h-0 w-full flex-col overflow-y-auto
              px-8 pb-[clamp(14px,2.2dvh,20px)]
              pt-[clamp(270px,41dvh,410px)]
            "
          >
            <div className="flex min-h-full flex-col">
              <div>
                <h1
                  className="
                    mb-[clamp(10px,1.8dvh,16px)] max-w-[285px]
                    text-[clamp(25px,3.4dvh,31px)] font-bold
                    leading-[clamp(31px,4.1dvh,39px)] tracking-normal
                    text-slate-950
                    dark:text-slate-50
                  "
                >
                  {isServicesStep ? (
                    <>
                      Let&apos;s grow
                      <br />
                      your{" "}
                      <span className="text-primary dark:text-primary-hover">
                        practice
                      </span>
                    </>
                  ) : isAvailabilityStep ? (
                    <>
                      Let&apos;s build your
                      <br />
                      <span className="text-primary dark:text-primary-hover">
                        Dream Clinic
                      </span>
                    </>
                  ) : isReviewStep ? (
                    <>
                      We&apos;re building
                      <br />
                      <span className="text-primary dark:text-primary-hover">
                        better healthcare,
                      </span>
                      <br />
                      together.
                    </>
                  ) : (
                    <>
                      Let&apos;s set up
                      <br />
                      your{" "}
                      <span className="text-primary dark:text-primary-hover">
                        clinic
                      </span>
                    </>
                  )}
                </h1>

                <p
                  className="
                    mb-[clamp(12px,2dvh,20px)] max-w-[275px]
                    text-[13px] leading-[20px] 2xl:text-[14px] 2xl:leading-[22px]
                    text-slate-600
                    dark:text-slate-400
                  "
                >
                  {content.description}
                </p>

                <div className="space-y-[clamp(10px,1.8dvh,16px)]">
                {content.features.map((feature, index) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={`${feature.title}-${index}`}
                      className="group flex items-start gap-3.5"
                    >
                      <div
                        className="
                          flex h-[clamp(38px,5.3dvh,44px)] w-[clamp(38px,5.3dvh,44px)] flex-shrink-0
                          items-center justify-center
                          rounded-full
                          bg-[#e7f2f1]
                          shadow-sm
                          transition-all duration-200
                          group-hover:scale-105
                          group-hover:bg-primary/10
                          dark:bg-primary-hover/20
                          dark:group-hover:bg-primary-hover/30
                        "
                      >
                        <Icon
                          className="
                            h-[18px] w-[18px]
                            text-primary
                            dark:text-primary-hover
                          "
                          strokeWidth={2.8}
                        />
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <h3
                          className="
                            mb-1 text-[14px]
                            font-bold leading-tight
                            text-slate-950
                            dark:text-slate-100
                          "
                        >
                          {feature.title}
                        </h3>

                        <p
                          className="
                            text-[12px] leading-snug 2xl:text-[13px]
                            text-slate-600
                            dark:text-slate-400
                          "
                        >
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

            {/* Help card */}
            <div className="mt-auto pt-[clamp(10px,1.7dvh,16px)]">
              <div
                className="
                  cursor-pointer rounded-xl
                  border border-slate-200
                  bg-white/90 p-3
                  shadow-[0_10px_30px_rgba(15,23,42,0.07)]
                  backdrop-blur-md
                  transition-all duration-200
                  hover:border-primary/50
                  hover:shadow-md
                  dark:border-slate-700
                  dark:bg-slate-800/85
                  dark:hover:border-primary-hover/50
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        flex h-9 w-9 flex-shrink-0
                        items-center justify-center
                        rounded-full
                        border-2 border-primary/70
                        bg-primary/10
                        shadow-sm
                        dark:border-primary-hover/80
                        dark:bg-primary-hover/20
                      "
                    >
                      <FiHeadphones
                        className="
                          h-[15px] w-[15px]
                          text-primary
                          dark:text-primary-hover
                        "
                        strokeWidth={2.8}
                      />
                    </div>

                    <div className="min-w-0">
                      <h4
                        className="
                          text-[14px] font-bold
                          leading-tight text-slate-950
                          dark:text-white
                        "
                      >
                        Need help?
                      </h4>

                      <p
                        className="
                          mt-1 truncate text-[12px]
                          leading-tight text-slate-600
                          dark:text-slate-300
                        "
                      >
                        Our support team is available 24/7
                      </p>
                    </div>
                  </div>

                  <FiChevronRight
                    className="
                      h-[18px] w-[18px]
                      flex-shrink-0
                      text-slate-400
                      dark:text-slate-500
                    "
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        </aside>
      )}

      {/* Right side */}
      <div className="flex h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden">
        <header
          className="
            z-50 border-b
            border-slate-200/60
            bg-white/95 backdrop-blur-md
            dark:border-[#273244]/60
            dark:bg-[#111726]/95
          "
        >
          <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between sm:h-16">
              {/* Mobile logo */}
              <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
                <div
                  className="
                    flex h-8 w-8 items-center justify-center
                    rounded-lg
                    bg-gradient-to-br
                    from-primary to-primary-hover
                    shadow-md
                    sm:h-9 sm:w-9 sm:rounded-xl
                  "
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-white sm:h-[18px] sm:w-[18px]"
                  >
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />

                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex flex-col">
                  <span
                    className="
                      text-[13px] font-bold
                      leading-none tracking-tight
                      text-slate-900 dark:text-white
                      sm:text-[15px]
                    "
                  >
                    Infinity Medisetu
                  </span>

                  <span
                    className="
                      mt-0.5 text-[10px]
                      leading-none text-slate-500
                      dark:text-slate-400
                      sm:text-[11px]
                    "
                  >
                    Healthcare Management
                  </span>
                </div>
              </div>

              <div className="hidden min-w-0 items-baseline gap-4 lg:flex">
                <h1 className="text-[18px] font-bold leading-none text-slate-950 dark:text-white">
                  Onboarding
                </h1>

             
              </div>

              {/* Header actions */}
              <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={handleOpenGuide}
                  className="
                    cursor-pointer rounded-lg p-2
                    transition-all duration-200
                    hover:bg-slate-100
                    dark:hover:bg-slate-800/70
                    sm:p-2.5
                  "
                  aria-label="View guidelines"
                  title="View Setup Guide"
                >
                  <FiBookOpen className="h-4 w-4 text-primary dark:text-primary-hover sm:h-[18px] sm:w-[18px]" />
                </button>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="
                    cursor-pointer rounded-lg p-2
                    transition-all duration-200
                    hover:bg-slate-100
                    dark:hover:bg-slate-800/70
                    sm:p-2.5
                  "
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <FiSun className="h-4 w-4 text-slate-600 dark:text-slate-300 sm:h-[18px] sm:w-[18px]" />
                  ) : (
                    <FiMoon className="h-4 w-4 text-slate-600 sm:h-[18px] sm:w-[18px]" />
                  )}
                </button>

                <button
                  type="button"
                  className="
                    hidden rounded-lg p-2
                    transition-all duration-200
                    hover:bg-slate-100
                    dark:hover:bg-slate-800/70
                    xs:block sm:p-2.5
                  "
                  aria-label="Help"
                >
                  <FiHelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-300 sm:h-[18px] sm:w-[18px]" />
                </button>

                <button
                  type="button"
                  className="
                    relative hidden rounded-lg p-2
                    transition-all duration-200
                    hover:bg-slate-100
                    dark:hover:bg-slate-800/70
                    xs:block sm:p-2.5
                  "
                  aria-label="Notifications"
                >
                  <FiBell className="h-4 w-4 text-slate-600 dark:text-slate-300 sm:h-[18px] sm:w-[18px]" />

                  <span
                    className="
                      absolute right-1.5 top-1.5
                      h-2 w-2 rounded-full
                      bg-danger ring-2 ring-white
                      dark:ring-[#111726]
                      sm:right-2 sm:top-2
                    "
                  />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    cursor-pointer rounded-lg p-2
                    transition-all duration-200
                    hover:bg-red-50
                    dark:hover:bg-red-900/20
                    sm:p-2.5
                  "
                  aria-label="Logout"
                  title="Logout"
                >
                  <FiLogOut className="h-4 w-4 text-danger sm:h-[18px] sm:w-[18px]" />
                </button>

                <div className="mx-0.5 h-6 w-px bg-slate-200 dark:bg-slate-700 sm:mx-1 sm:h-8" />

                {user && (
                  <div className="flex min-w-0 items-center gap-1.5 rounded-full py-1.5 pl-1 pr-1.5 sm:gap-2.5 sm:pr-2">
                    <div
                      className="
                        flex h-7 w-7 items-center
                        justify-center rounded-full
                        bg-gradient-to-br
                        from-primary to-primary-hover
                        text-[12px] font-semibold
                        text-white shadow-md
                        ring-2 ring-white
                        dark:ring-slate-800
                        sm:h-8 sm:w-8 sm:text-[13px]
                      "
                    >
                      {(user.name || "N").charAt(0).toUpperCase()}
                    </div>

                    <div className="hidden min-w-0 flex-col items-start md:flex">
                      <span className="max-w-[140px] truncate text-[12px] font-semibold leading-none text-slate-900 dark:text-white sm:text-[13px]">
                        {user.name || "New Clinic"}
                      </span>

                      <span className="mt-1 text-[10px] leading-none text-slate-500 dark:text-slate-400 sm:text-[11px]">
                        Setup in Progress
                      </span>
                    </div>

                    <FiChevronRight className="hidden h-4 w-4 rotate-90 text-slate-400 dark:text-slate-500 lg:block" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-hidden bg-white dark:bg-[#111726]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 w-full flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>

            <footer className="hidden w-full border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                        <FiZap
                          className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                          strokeWidth={2.5}
                        />
                      </div>

                      <span className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                        Quick & Easy
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                        <FiShield
                          className="h-4 w-4 text-blue-600 dark:text-blue-400"
                          strokeWidth={2.5}
                        />
                      </div>

                      <span className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                        100% Secure
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/20">
                        <FiUsers
                          className="h-4 w-4 text-purple-600 dark:text-purple-400"
                          strokeWidth={2.5}
                        />
                      </div>

                      <span className="whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300 sm:text-sm">
                        Verified & Trusted
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-slate-600 dark:text-white sm:text-sm">
                      Need assistance?
                      <span className="block text-[10px] text-slate-500 dark:text-slate-200 sm:ml-1 sm:inline sm:text-xs">
                        Access our 24/7 support resources
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenGuide}
                      className="
                        flex cursor-pointer items-center
                        gap-2 whitespace-nowrap
                        rounded-lg border
                        border-slate-200
                        bg-white px-3 py-2
                        text-xs font-medium
                        text-slate-700
                        transition-all duration-200
                        hover:border-primary
                        hover:bg-slate-50
                        dark:border-slate-600
                        dark:bg-slate-700
                        dark:text-slate-100
                        dark:hover:border-primary
                        dark:hover:bg-slate-600
                        sm:px-4 sm:text-sm
                      "
                    >
                      <FiBookOpen className="h-4 w-4" />
                      <span>Setup Guide</span>
                    </button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

const OnboardingLayout: React.FC = () => {
  return (
    <OnboardingProvider>
      <OnboardingLayoutContent />
    </OnboardingProvider>
  );
};

export default OnboardingLayout;
