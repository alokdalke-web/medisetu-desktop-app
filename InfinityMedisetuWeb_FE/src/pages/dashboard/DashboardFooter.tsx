// src/pages/dashboard/DashboardFooter.tsx
import {
  FaApple,
  FaAndroid,
  FaGooglePlay,
  FaLinkedinIn,
  FaYoutube,
  FaInstagram,
  FaWhatsapp,
} from "react-icons/fa6";
import { SiGooglecalendar } from "react-icons/si";

/* ---------------- Section heading ---------------- */

const SectionHeading = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div className="flex flex-col gap-1">
    <h4 className="text-[15px] font-semibold leading-tight text-[#100e1c] dark:text-white">
      {title}
    </h4>
    <p className="text-[12px] leading-tight text-[#677294] dark:text-white/60">
      {subtitle}
    </p>
  </div>
);

/* ---------------- App / integration tile ---------------- */

const AppTile = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-[#eef0f3] bg-white py-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-[#dfe3e8] hover:shadow-[0_2px_8px_rgba(16,24,40,0.08)] dark:border-[#273244] dark:bg-[#0f1728] dark:shadow-none">
    <span className="flex h-6 items-center justify-center">{icon}</span>
    <span className="text-center text-[11px] font-medium leading-none text-[#677294] dark:text-white/70">
      {label}
    </span>
  </div>
);

/* ---------------- Store badge ---------------- */

const StoreBadge = ({
  icon,
  top,
  bottom,
  href,
}: {
  icon: React.ReactNode;
  top: string;
  bottom: string;
  href: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#100e1c] px-3 py-2 text-white transition hover:opacity-90 dark:bg-[#0a0a0a]"
  >
    <span className="shrink-0">{icon}</span>
    <span className="flex flex-col leading-tight">
      <span className="text-[8px] uppercase tracking-wide opacity-80">
        {top}
      </span>
      <span className="text-[13px] font-semibold leading-tight">{bottom}</span>
    </span>
  </a>
);

const CheckIcon = () => (
  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#e6f7ef] dark:bg-[#16352f]">
    <svg className="h-[11px] w-[11px] text-[#27b77a]" viewBox="0 0 20 20" fill="none">
      <path
        d="M16.5 5.5L8 14L3.5 9.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

/* ---------------- Socials data ---------------- */

const SOCIALS = [
  {
    icon: <FaLinkedinIn className="h-4 w-4 text-[#0a66c2]" />,
    name: "LinkedIn",
    meta: "Healthcare innovation updates",
    cta: "Follow",
    href: "https://www.linkedin.com/company/infinity-medisetu/",
  },
  {
    icon: <FaYoutube className="h-4 w-4 text-[#ff0000]" />,
    name: "YouTube",
    meta: "Tutorials & product walkthroughs",
    cta: "Subscribe",
    href: "https://www.youtube.com/@InfinityMedisetu",
  },
  {
    icon: <FaInstagram className="h-4 w-4 text-[#e1306c]" />,
    name: "Instagram",
    meta: "Behind the scenes & tips",
    cta: "Follow",
    href: "https://www.instagram.com/infinitymedisetu/",
  },
];

const FEATURES = [
  "Smart Appointment Management",
  "Secure Patient Records",
  "Easy Payments & Billing",
  "Powerful Reports & Analytics",
];

const WebIcon = () => (
  <svg
    className="h-5 w-5 text-[#2898ff]"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
  </svg>
);

/* ---------------- Dashboard Footer ---------------- */

const DashboardFooter = () => (
  <footer className="rounded-[16px] border border-[rgba(229,231,234,0.7)] bg-white px-5 py-6 sm:px-7 sm:py-7 dark:border-[#273244] dark:bg-[#111726]">
    <div className="grid grid-cols-1 gap-x-7 gap-y-8 sm:grid-cols-2 xl:grid-cols-[1.05fr_auto_0.8fr_auto_1.1fr_auto_1.1fr] xl:gap-x-0">
      {/* ── Access Infinity Medisetu ── */}
      <div className="flex flex-col gap-4 pr-2 2xl:pr-7">
        <SectionHeading
          title="Access Infinity Medisetu"
          subtitle="Manage your clinic on the go."
        />
        <div className="flex gap-2.5">
          <AppTile icon={<WebIcon />} label="Web" />
          <AppTile
            icon={<FaAndroid className="h-5 w-5 text-[#3ddc84]" />}
            label="Android"
          />
          <AppTile
            icon={<FaApple className="h-5 w-5 text-[#100e1c] dark:text-white" />}
            label="iOS"
          />
        </div>
        <div className="flex gap-2.5">
          <StoreBadge
            icon={<FaGooglePlay className="h-[18px] w-[18px]" />}
            top="Get it on"
            bottom="Google Play"
            href="https://play.google.com/store/apps/details?id=com.infinity.medisetu"
          />
          <StoreBadge
            icon={<FaApple className="h-[22px] w-[22px]" />}
            top="Download on the"
            bottom="App Store"
            href="https://www.apple.com/app-store/"
          />
        </div>
      </div>

      {/* divider */}
      <div className="hidden xl:block w-px self-stretch bg-[#edeff2] dark:bg-[#273244]" />

      {/* ── Integrations ── */}
      <div className="flex flex-col gap-4 px-2 2xl:px-7">
        <SectionHeading
          title="Integrations"
          subtitle="Connect with your favorite tools."
        />
        <div className="flex gap-2 2xl:gap-2.5">
          <AppTile
            icon={<SiGooglecalendar className="h-5 w-5" />}
            label="Google Calendar"
          />
          <AppTile
            icon={<FaWhatsapp className="h-5 w-5 text-[#25d366]" />}
            label="WhatsApp"
          />
        </div>
      </div>

      {/* divider */}
      <div className="hidden xl:block w-px self-stretch bg-[#edeff2] dark:bg-[#273244]" />

      {/* ── Follow Us on Socials ── */}
      <div className="flex flex-col gap-4 px-2 2xl:px-7">
        <SectionHeading
          title="Follow Us on Socials"
          subtitle="Stay connected with us"
        />
        <div className="flex flex-col gap-2.5">
          {SOCIALS.map((s) => (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f6f8] dark:bg-[#0f1728]">
                {s.icon}
              </span>
              <div className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="text-[13px] font-semibold text-[#100e1c] dark:text-white">
                  {s.name}
                </span>
                <span className="truncate text-[11px] text-[#677294] dark:text-white/60">
                  {s.meta}
                </span>
              </div>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-[#cfc6f3] px-3 py-1 text-[11px] font-semibold text-[#6b46d1] transition hover:bg-[#f4f1ff] dark:border-[#8172d8] dark:text-[#c8b6ff] dark:hover:bg-[#26213f]"
              >
                {s.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* divider */}
      <div className="hidden xl:block w-px self-stretch bg-[#edeff2] dark:bg-[#273244]" />

      {/* ── About Infinity Medisetu ── */}
      <div className="flex flex-col gap-4 px-2 2xl:px-7">
        <SectionHeading
          title="About Infinity Medisetu"
          subtitle="Your all-in-one clinic management solution."
        />
        <ul className="flex flex-col gap-2.5">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 text-[12px] font-medium text-[#445176] dark:text-white/80"
            >
              <CheckIcon />
              {feature}
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-[#677294] dark:text-white/60">
          Made with <span className="text-[#27b77a]">💚</span> for healthcare
          professionals.
        </p>
      </div>
    </div>
  </footer>
);

export default DashboardFooter;
