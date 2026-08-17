import { useState } from "react";
import { Link } from "react-router";
import { FiMail, FiPhone } from "react-icons/fi";

const BRAND_LOGO = `${import.meta.env.BASE_URL}assets/images/logoLight.svg`;
const SITE = "https://infinitymedisetu.com";

/**
 * Patient-facing footer. The clinic-sales columns from the marketing site
 * (Product / Solutions / office address / demo CTA) are deliberately omitted —
 * a patient reading a doctor profile has no use for them.
 */
const PATIENT_LINKS = [
  { label: "Find a doctor", href: "/" },
  { label: "Book an appointment", href: "/login" },
  { label: "Patient guidelines", href: "/guidelines" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: `${SITE}/about/`, external: true },
  { label: "FAQs", href: `${SITE}/faq/`, external: true },
  { label: "Contact Us", href: `${SITE}/contact/`, external: true },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: `${SITE}/privacy-policy/` },
  { label: "Terms of Service", href: `${SITE}/terms-of-service/` },
];

const externalProps = (external?: boolean) =>
  external ? { target: "_blank" as const, rel: "noreferrer" } : {};

const PublicPageFooter: React.FC = () => {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          <div>
            {logoFailed ? (
              <span className="text-lg font-semibold text-primary">Infinity MediSetu</span>
            ) : (
              <img
                src={BRAND_LOGO}
                alt="Infinity MediSetu"
                className="h-9 w-auto object-contain"
                onError={() => setLogoFailed(true)}
              />
            )}
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">
              Find verified doctors, view their clinics and consultation fees, and
              book appointments online.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">For patients</h3>
            <nav className="mt-3 flex flex-col gap-2.5 text-sm text-text-muted">
              {PATIENT_LINKS.map((link) => (
                <Link key={link.label} to={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">Company</h3>
            <nav className="mt-3 flex flex-col gap-2.5 text-sm text-text-muted">
              {COMPANY_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-primary"
                  {...externalProps(link.external)}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">Need help?</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-text-muted">
              <li className="flex items-center gap-2.5">
                <FiMail className="h-4 w-4 shrink-0 text-primary" />
                <a href="mailto:admin@infinitymedisetu.com" className="hover:text-primary">
                  admin@infinitymedisetu.com
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <FiPhone className="h-4 w-4 shrink-0 text-primary" />
                <a href="tel:+918770553894" className="hover:text-primary">
                  +91 8770553894
                </a>
              </li>
            </ul>

          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-5 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Infinity MediSetu. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default PublicPageFooter;
