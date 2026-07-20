import { Turnstile, type TurnstileInstance, type TurnstileProps } from "@marsidev/react-turnstile";
import { forwardRef } from "react";

interface AppTurnstileProps extends Omit<TurnstileProps, "siteKey"> {
  onSuccess?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "3x00000000000000000000FF";

const AppTurnstile = forwardRef<TurnstileInstance, AppTurnstileProps>(
  ({ onSuccess, onError, onExpire, options, ...props }, ref) => {
    return (
      <div className="flex justify-center my-4">
        <Turnstile
          ref={ref}
          siteKey={SITE_KEY}
          onSuccess={onSuccess}
          onError={onError}
          onExpire={onExpire}
          options={{
            theme: "light",
            size: "normal",
            execution: "render",
            appearance: "always",
            ...options,
          }}
          {...props}
        />
      </div>
    );
  }
);

AppTurnstile.displayName = "AppTurnstile";

export default AppTurnstile;