import { useLocation, useNavigate } from "react-router";
import { FiShieldOff, FiArrowLeft, FiHome, FiMail } from "react-icons/fi";
import AppButton from "../components/shared/AppButton";

type AccessDeniedState = {
  message?: string;
  reasonCode?: string;
};

const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as AccessDeniedState;

  const description =
    state.message ||
    "You don't have permission to view this page. It may belong to another clinic, or your account may not have access to this resource.";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Ambient background accents — theme-aware via design tokens, not hardcoded hex */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-8 w-72 h-72 rounded-full blur-3xl bg-danger/10 animate-pulse" />
        <div className="absolute bottom-16 right-8 w-96 h-96 rounded-full blur-3xl bg-warning/10 animate-pulse-delayed" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        <div className="rounded-3xl border border-line bg-surface shadow-lg dark:shadow-none px-6 py-10 sm:px-10 sm:py-12 text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
            <FiShieldOff className="h-10 w-10 text-danger" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
            Access Restricted
          </h1>

          <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-md mx-auto">
            {description}
          </p>

          {state.reasonCode && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-[11px] font-medium text-text-subtle">
              Reference: {state.reasonCode}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AppButton
              text="Go to Dashboard"
              buttonVariant="primary"
              startContent={<FiHome className="h-4 w-4" />}
              onClick={() => navigate("/app/dashboard")}
              className="w-full sm:w-auto px-6"
            />
            <AppButton
              text="Go Back"
              buttonVariant="outlined"
              startContent={<FiArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6"
            />
          </div>

          <div className="mt-8 pt-6 border-t border-line flex items-center justify-center gap-2 text-xs text-text-subtle">
            <FiMail className="h-3.5 w-3.5" />
            <span>
              Think this is a mistake? Contact your clinic admin or support.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-delayed {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-pulse-delayed {
          animation: pulse-delayed 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          animation-delay: 500ms;
        }
      `}</style>
    </div>
  );
};

export default AccessDenied;
