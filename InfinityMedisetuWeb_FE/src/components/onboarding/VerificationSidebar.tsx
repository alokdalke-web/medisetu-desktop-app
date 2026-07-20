import React from "react";
import { FiShield, FiUsers, FiHeadphones, FiChevronRight } from "react-icons/fi";

const BASE = import.meta.env.BASE_URL;
const onboardingImage = `${BASE}assets/images/Doc_Steps.png`;
const logoLight = `${BASE}assets/images/logoLight.png`;

const VerificationSidebar: React.FC = () => {
  const features = [
    {
      icon: FiShield,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security."
    },
    {
      icon: FiUsers,
      title: "Trusted by Clinics",
      description: "Join 1000+ healthcare providers growing with us."
    },
    {
      icon: FiHeadphones,
      title: "Dedicated Support",
      description: "Our team is here to help you every step of the way."
    }
  ];

  return (
    <aside className="relative hidden h-[100dvh] min-h-0 overflow-hidden border-r border-slate-200/80 bg-[#f7fbfb] shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:flex xl:w-[360px] xl:flex-col 2xl:w-[390px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(350px,60dvh,560px)] overflow-hidden">
        <img
          src={onboardingImage}
          alt="Doctor"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover dark:opacity-75"
          style={{
            objectPosition: "center top",
            transform: "translateY(-32px) scale(1.04)",
            transformOrigin: "center top",
          }}
        />

        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-b from-transparent via-[#f7fbfb]/75 to-[#f7fbfb] dark:via-slate-950/75 dark:to-slate-950" />
        <div
          className="absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-b from-transparent via-[#f7fbfb]/50 to-[#f7fbfb] backdrop-blur-[1px] dark:via-slate-950/50 dark:to-slate-950"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
          }}
        />
      </div>

      <img
        src={logoLight}
        alt="Infinity Medisetu"
        className="pointer-events-none absolute left-7 top-6 z-30 h-9 w-auto select-none object-contain drop-shadow-sm"
      />

      <div className="relative z-20 flex h-full min-h-0 w-full flex-col overflow-hidden px-8 pb-[clamp(14px,2.2dvh,20px)] pt-[clamp(285px,45dvh,430px)]">
        <div className="flex h-full min-h-0 flex-col">
          <h1 className="mb-[clamp(8px,1.4dvh,12px)] max-w-[285px] text-[clamp(24px,3.2dvh,31px)] font-bold leading-[clamp(30px,3.9dvh,38px)] tracking-normal text-slate-950 dark:text-slate-50">
            <span>You're almost </span>
            <span className="text-primary dark:text-primary-hover">there!</span>
          </h1>

          <p className="mb-[clamp(10px,1.6dvh,16px)] max-w-[275px] text-[13px] leading-[20px] text-slate-600 dark:text-slate-400 2xl:text-[14px] 2xl:leading-[22px]">
            We're reviewing your details to ensure everything is perfect. Thank you for choosing Infinity Medisetu.
          </p>

          <div className="space-y-[clamp(7px,1.2dvh,12px)]">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div key={index} className="group flex items-start gap-3.5">
                  <div className="flex h-[clamp(36px,5dvh,42px)] w-[clamp(36px,5dvh,42px)] flex-shrink-0 items-center justify-center rounded-full bg-[#e7f2f1] shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:bg-primary/10 dark:bg-primary-hover/20 dark:group-hover:bg-primary-hover/30">
                    <Icon className="h-[17px] w-[17px] text-primary dark:text-primary-hover" strokeWidth={2.8} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="mb-0.5 text-[13px] font-bold leading-tight text-slate-950 dark:text-slate-100 2xl:text-[14px]">
                      {feature.title}
                    </h3>
                    <p className="text-[11.5px] leading-snug text-slate-600 dark:text-slate-400 2xl:text-[12px]">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-[clamp(9px,1.5dvh,14px)]">
            <div className="cursor-pointer rounded-xl border border-slate-200 bg-white/90 p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] backdrop-blur-md transition-all duration-200 hover:border-primary/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/85 dark:hover:border-primary-hover/50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary/70 bg-primary/10 shadow-sm dark:border-primary-hover/80 dark:bg-primary-hover/20">
                    <FiHeadphones className="h-[18px] w-[18px] text-primary dark:text-primary-hover" strokeWidth={2.8} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-bold leading-tight text-slate-950 dark:text-white">Need help?</h4>
                    <p className="mt-1 truncate text-[11px] leading-tight text-slate-600 dark:text-slate-300">
                      Our support team is available 24/7
                    </p>
                  </div>
                </div>
                <FiChevronRight className="h-[18px] w-[18px] flex-shrink-0 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default VerificationSidebar;
