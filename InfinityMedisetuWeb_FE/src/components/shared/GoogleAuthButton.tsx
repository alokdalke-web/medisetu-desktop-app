import React, { useEffect, useRef, useState } from "react";
import { GoogleLogin, type CredentialResponse, type GsiButtonConfiguration } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";

type GoogleAuthButtonProps = {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
  buttonText?: GsiButtonConfiguration["text"];
  label?: string;
  className?: string;
};

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  buttonText = "signin_with",
  label = "Google",
  className = "",
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(247);

  useEffect(() => {
    const updateWidth = () => {
      const width = buttonRef.current?.offsetWidth;
      if (!width) return;
      const nextWidth = Math.round(width);
      setButtonWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    if (buttonRef.current) observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={buttonRef} className={`relative mx-auto h-[40px] w-full overflow-hidden rounded-xl sm:h-[42px] lg:h-[34px] lg:rounded-lg ${className}`}>
      <GoogleLogin
        key={buttonWidth}
        onSuccess={onSuccess}
        onError={onError}
        size="large"
        width={String(buttonWidth)}
        text={buttonText}
        shape="rectangular"
        containerProps={{
          className: "absolute inset-0 z-10 h-full w-full overflow-hidden [&>div]:!h-full [&_iframe]:!h-full",
          style: { height: "100%" },
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 flex h-full w-full items-center justify-center gap-[8px] rounded-xl border border-[#cfcfcf] bg-white text-[14px] font-normal text-[#100E1C] shadow-none sm:text-[15px] lg:rounded-lg lg:text-[11px]">
        <FcGoogle className="h-[18px] w-[18px] shrink-0 sm:h-[19px] sm:w-[19px] lg:h-[14px] lg:w-[14px]" />
        <span>{label}</span>
      </div>
    </div>
  );
};

export default GoogleAuthButton;
