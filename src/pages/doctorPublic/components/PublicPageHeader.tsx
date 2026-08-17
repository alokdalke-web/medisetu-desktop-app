import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FiShare2 } from "react-icons/fi";

import type { PublicDoctorProfile } from "../../../types/doctor";
import { getDoctorDisplayName } from "../helpers/doctorPublicContent";

// Asset paths must go through BASE_URL — a hardcoded "/assets/…" 404s under a
// non-root base path, which is what broke the logo here originally.
const BRAND_LOGO = `${import.meta.env.BASE_URL}assets/images/logoLight.svg`;
const SITE = "https://infinitymedisetu.com";

// This page is patient-facing, so the nav stays patient-oriented — the clinic
// sales links (Pricing, Blogs) belong on the marketing site, not here.
const NAV_LINKS = [
  { label: "Find a doctor", href: "/" },
  { label: "Patient guidelines", href: "/guidelines" },
  { label: "For clinics", href: `${SITE}/`, external: true },
];

/** Past the hero, the nav gives way to the doctor's identity + booking CTA. */
const REVEAL_AFTER_PX = 220;

interface PublicPageHeaderProps {
  onShare: () => void;
  onBook?: () => void;
  canBook?: boolean;
  doctor?: PublicDoctorProfile["doctor"];
  isAuthenticated?: boolean;
}

const PublicPageHeader: React.FC<PublicPageHeaderProps> = ({
  onShare,
  onBook,
  canBook = false,
  doctor,
  isAuthenticated = false,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  // Scroll state lives here so ticking it never re-renders the page body.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    const onScroll = () => setIsScrolled(window.scrollY > REVEAL_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [doctor]);

  const showDoctor = !!doctor && isScrolled;
  const displayName = doctor ? getDoctorDisplayName(doctor.name) : "";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          aria-label="Infinity MediSetu home"
        >
          {logoFailed ? (
            <span className="text-lg font-semibold text-primary">Infinity MediSetu</span>
          ) : (
            <img
              src={BRAND_LOGO}
              alt="Infinity MediSetu"
              className="h-8 w-auto object-contain"
              onError={() => setLogoFailed(true)}
            />
          )}
        </Link>

        {showDoctor ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {doctor.profileImage && !avatarFailed ? (
              <img
                src={doctor.profileImage}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold text-text-muted">
                {(doctor.name ?? "D").trim().charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-text">
                {displayName}
              </p>
              {doctor.speciality && (
                <p className="truncate text-xs leading-tight text-text-muted">
                  {doctor.speciality}
                </p>
              )}
            </div>
          </div>
        ) : (
          <nav className="hidden flex-1 items-center justify-center gap-6 text-sm text-text-muted lg:flex">
            {NAV_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} to={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              ),
            )}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            aria-label="Share this profile"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-text transition-colors hover:bg-surface-muted lg:h-9"
          >
            <FiShare2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <Link
            to={isAuthenticated ? "/patient-appointment" : "/login"}
            className="hidden h-10 items-center rounded-lg border border-line px-3 text-sm font-medium text-text transition-colors hover:bg-surface-muted sm:inline-flex lg:h-9"
          >
            {isAuthenticated ? "My appointments" : "Login"}
          </Link>

          {canBook && onBook && (
            <button
              type="button"
              onClick={onBook}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover lg:h-9"
            >
              Book appointment
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PublicPageHeader;
