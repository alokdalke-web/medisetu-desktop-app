import React from "react";
import { FiArrowLeft, FiLock, FiBarChart2, FiSettings, FiClock, FiMail } from "react-icons/fi";
import { MdOutlineCookie } from "react-icons/md";
import { useNavigate } from "react-router";
import { resetConsent, getStoredConsent } from "../../utils/cookieConsent";

const CookiePolicy: React.FC = () => {
  const navigate = useNavigate();
  const consent = getStoredConsent();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0b0f1a] dark:to-[#0b0f1a]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <FiArrowLeft className="text-[13px]" />
          Back
        </button>

        {/* Hero Header */}
        <div className="mb-10 rounded-2xl border border-slate-200/60 bg-white p-6 sm:p-8 dark:border-[#273244] dark:bg-[#111726]">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e6fbf7] to-[#d4f5ed] dark:from-[#16352f] dark:to-[#0f2a24]">
              <MdOutlineCookie className="h-7 w-7 text-[#0a6c74] dark:text-[#9be7dc]" />
            </div>
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 dark:text-white">
                Cookie Policy
              </h1>
              <p className="mt-1.5 text-[14px] text-slate-500 dark:text-slate-400">
                How Infinity Medisetu uses cookies and similar technologies to provide,
                protect, and improve your experience.
              </p>
              <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">
                Last updated: July 2026
              </p>
            </div>
          </div>

          {/* Current consent status */}
          {consent && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-[#0b1120]">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Your current preferences:
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e6fbf7] px-2 py-0.5 text-[11px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
                <FiLock className="h-2.5 w-2.5" /> Essential
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                consent.analytics
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-slate-100 text-slate-400 line-through dark:bg-[#1a2234] dark:text-slate-500"
              }`}>
                <FiBarChart2 className="h-2.5 w-2.5" /> Analytics
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                consent.functional
                  ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                  : "bg-slate-100 text-slate-400 line-through dark:bg-[#1a2234] dark:text-slate-500"
              }`}>
                <FiSettings className="h-2.5 w-2.5" /> Functional
              </span>
            </div>
          )}
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* What are cookies */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-3 dark:text-white">
              What are cookies?
            </h2>
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              Cookies are small data files stored on your device when you visit a website or use
              an application. They help us remember your login status, understand how you use the
              platform, and personalize your experience. We also use localStorage for similar
              purposes where traditional cookies are not suitable.
            </p>
          </section>

          {/* Cookie Categories */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-5 dark:text-white">
              Cookies we use
            </h2>

            <div className="space-y-4">
              {/* Essential */}
              <div className="rounded-xl border border-slate-100 p-4 dark:border-[#1e293b]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6fbf7] dark:bg-[#16352f]">
                    <FiLock className="h-4 w-4 text-[#0a6c74] dark:text-[#9be7dc]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
                        Essential Cookies
                      </h3>
                      <span className="rounded-full bg-[#e6fbf7] px-2 py-0.5 text-[10px] font-semibold text-[#0a6c74] dark:bg-[#16352f] dark:text-[#9be7dc]">
                        Always Active
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500">Cannot be disabled</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed mb-3 dark:text-slate-400">
                  These are strictly necessary for the application to function. They enable
                  authentication, session management, security protection, and core features.
                  Without these, you cannot log in or use IMS.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#273244]">
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Name</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Purpose</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 dark:text-slate-400">
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">auth_token</td>
                        <td className="py-2">User authentication</td>
                        <td className="py-2">Session / 7 days</td>
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">refresh_token</td>
                        <td className="py-2">Token renewal</td>
                        <td className="py-2">30 days</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-[11px]">session_id</td>
                        <td className="py-2">Session tracking</td>
                        <td className="py-2">Session</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Analytics */}
              <div className="rounded-xl border border-slate-100 p-4 dark:border-[#1e293b]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <FiBarChart2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
                        Analytics Cookies
                      </h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Optional
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500">Can be disabled</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed mb-3 dark:text-slate-400">
                  We use Google Analytics to understand how users interact with IMS. This helps
                  us identify popular features, detect issues, and improve performance. Data is
                  anonymized and aggregated — we cannot identify individual users from this data.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#273244]">
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Name</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Purpose</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 dark:text-slate-400">
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">_ga</td>
                        <td className="py-2">Distinguish users</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">_ga_*</td>
                        <td className="py-2">Session state</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-[11px]">_gid</td>
                        <td className="py-2">Session distinction</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Functional */}
              <div className="rounded-xl border border-slate-100 p-4 dark:border-[#1e293b]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20">
                    <FiSettings className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
                        Functional Cookies
                      </h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Optional
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500">Can be disabled</p>
                  </div>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed mb-3 dark:text-slate-400">
                  These remember your preferences like dark mode, sidebar state, completed tours,
                  and other personalization choices. Disabling them means you'll need to set your
                  preferences every time.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#273244]">
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Name</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Purpose</th>
                        <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 dark:text-slate-400">
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">medisetu_theme</td>
                        <td className="py-2">Dark/light mode preference</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-[#1e293b]">
                        <td className="py-2 font-mono text-[11px]">medisetu_tour_*</td>
                        <td className="py-2">Feature tour completion</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono text-[11px]">medisetu_cookie_consent</td>
                        <td className="py-2">Your cookie choices</td>
                        <td className="py-2">Persistent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Third-party */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-3 dark:text-white">
              Third-party services
            </h2>
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              We use <strong className="font-medium text-slate-800 dark:text-white">Google Analytics</strong> (provided
              by Google LLC) for usage analytics. Google may collect data through cookies on your
              device. For details on how Google handles data, refer to{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0a6c74] font-medium hover:underline dark:text-[#9be7dc]"
              >
                Google's Privacy Policy
              </a>
              . You can opt out of Google Analytics using{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0a6c74] font-medium hover:underline dark:text-[#9be7dc]"
              >
                Google's opt-out browser add-on
              </a>
              .
            </p>
          </section>

          {/* Data retention */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <div className="flex items-center gap-2.5 mb-3">
              <FiClock className="h-4 w-4 text-slate-400" />
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
                Data retention
              </h2>
            </div>
            <ul className="space-y-2 text-[13.5px] text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0a6c74] dark:bg-[#9be7dc]" />
                <span><strong className="font-medium text-slate-800 dark:text-white">Essential</strong> — session-based, expire on logout or after session timeout</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                <span><strong className="font-medium text-slate-800 dark:text-white">Analytics</strong> — retained for up to 26 months by Google Analytics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                <span><strong className="font-medium text-slate-800 dark:text-white">Functional</strong> — persist until you clear browser data or reset preferences</span>
              </li>
            </ul>
          </section>

          {/* Managing preferences */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-3 dark:text-white">
              Managing your preferences
            </h2>
            <p className="text-[13.5px] leading-relaxed text-slate-600 mb-4 dark:text-slate-400">
              You can change your cookie preferences at any time. Click the button below to reset
              your choices — the cookie banner will appear again so you can make a new selection.
              You can also manage cookies through your browser settings.
            </p>
            <button
              type="button"
              onClick={() => {
                resetConsent();
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#0a6c74] px-5 py-2.5 text-[13px] font-semibold text-[#0a6c74] transition-colors hover:bg-[#e6fbf7] dark:border-[#9be7dc] dark:text-[#9be7dc] dark:hover:bg-[#16352f]"
            >
              <FiSettings className="h-3.5 w-3.5" />
              Reset Cookie Preferences
            </button>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-slate-200/60 bg-white p-5 sm:p-6 dark:border-[#273244] dark:bg-[#111726]">
            <div className="flex items-center gap-2.5 mb-3">
              <FiMail className="h-4 w-4 text-slate-400" />
              <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">
                Contact us
              </h2>
            </div>
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              If you have questions about our use of cookies or this policy, please reach out to us at{" "}
              <a
                href="mailto:support@medisetu.com"
                className="text-[#0a6c74] font-medium hover:underline dark:text-[#9be7dc]"
              >
                support@medisetu.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
