import { ToastProvider } from "@heroui/react";

/**
 * App-wide toast styling: neutral light/dark card ("Sonner" style) where the
 * severity color flows only into the icon and progress bar. The base slot
 * overrides bg but not text color, so the variant's currentColor still
 * reaches the icon (fill-current).
 */
const AppToastProvider = () => (
  <ToastProvider
    placement="top-center"
    toastOffset={16}
    toastProps={{
      variant: "flat",
      radius: "lg",
      shadow: "none",
      shouldShowTimeoutProgress: true,
      classNames: {
        base: [
          "font-outfit items-start gap-3 px-4 py-3.5 rounded-xl overflow-hidden",
          // responsive width: near full-width on phones, capped card on larger screens
          "w-[calc(100vw-2rem)] max-w-full sm:w-auto sm:min-w-[340px] sm:max-w-[400px]",
          "bg-white dark:bg-zinc-900",
          "border border-zinc-200/80 dark:border-zinc-700/60",
          "shadow-[0_10px_38px_-10px_rgba(0,0,0,0.25)]",
          "dark:shadow-[0_10px_38px_-10px_rgba(0,0,0,0.8)]",
        ].join(" "),
        wrapper: "toast-content-in flex-1 min-w-0",
        title:
          "text-sm font-semibold leading-5 truncate text-zinc-800 dark:text-zinc-100",
        description:
          "text-xs leading-5 break-words text-zinc-500 dark:text-zinc-400",
        icon: "toast-icon-pop w-5 h-5 shrink-0 mt-0.5",
        closeButton:
          "!right-1.5 !top-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors",
        progressTrack: "bg-transparent",
        progressIndicator: "h-[3px] rounded-full",
      },
    }}
  />
);

export default AppToastProvider;
