import React from "react";
import type { StepKey } from "./types";

export type OnboardingSkeletonVariant = StepKey | "verification";

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={["skeleton", className].join(" ")} />
);

const SkeletonField: React.FC<{ wide?: boolean }> = ({ wide = false }) => (
  <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
    <Skel className="mb-2 h-4 w-28 rounded-lg" />
    <div className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
      <Skel className="h-5 w-5 rounded-md" />
      <Skel className="h-4 w-2/3 rounded-lg" />
    </div>
  </div>
);

const SkeletonFooter: React.FC<{
  showBack?: boolean;
  primaryWidth?: string;
}> = ({ showBack = true, primaryWidth = "w-40" }) => (
  <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-2.5 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900 sm:px-6 sm:py-3">
    <div className="hidden items-center gap-3 sm:flex">
      <Skel className="h-10 w-10 rounded-full" />
      <Skel className="h-4 w-56 rounded-lg" />
    </div>
    <div className="ml-auto flex items-center gap-3">
      {showBack && <Skel className="h-11 w-24 rounded-xl" />}
      <Skel className={["h-11 rounded-xl", primaryWidth].join(" ")} />
    </div>
  </div>
);

const ClinicSkeleton = () => (
  <div className="flex flex-col gap-5 sm:gap-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonField key={index} />
      ))}
    </div>

    <div className="space-y-2">
      <Skel className="h-4 w-40 rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,520px)_minmax(240px,280px)] lg:items-end lg:gap-8">
        <div className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-5">
            <Skel className="h-11 w-11 rounded-full" />
            <div>
              <Skel className="h-4 w-28 rounded-lg" />
              <Skel className="mt-3 h-3 w-44 rounded-lg" />
              <Skel className="mt-2 h-3 w-32 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="flex min-h-[92px] items-center rounded-xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-900 dark:bg-teal-950/30">
          <Skel className="h-7 w-7 rounded-full" />
          <div className="ml-3 flex-1">
            <Skel className="h-3 w-12 rounded-lg" />
            <Skel className="mt-2 h-3 w-full rounded-lg" />
            <Skel className="mt-2 h-3 w-2/3 rounded-lg" />
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <Skel className="h-4 w-20 rounded-lg" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-10">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="h-[224px] bg-slate-50 dark:bg-slate-800">
            <Skel className="h-full w-full rounded-none" />
          </div>
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <Skel className="h-3 w-4/5 rounded-lg" />
          </div>
        </div>

        <div className="space-y-8 lg:pt-3">
          <SkeletonField wide />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonField />
            <SkeletonField />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ProfileSkeleton = () => (
  <div className="flex flex-col gap-5 sm:gap-6">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonField key={index} />
      ))}
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SkeletonField />
      <SkeletonField />
      <div>
        <Skel className="mb-2 h-4 w-24 rounded-lg" />
        <div className="flex gap-3">
          <Skel className="h-11 flex-1 rounded-lg" />
          <Skel className="h-11 w-20 rounded-lg" />
        </div>
        <Skel className="mt-2 h-3 w-44 rounded-lg" />
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-[#D4EAEA] bg-[#F0FAF9] px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800/50">
      <Skel className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1">
        <Skel className="h-4 w-56 rounded-lg" />
        <Skel className="mt-2 h-3 w-full rounded-lg" />
        <Skel className="mt-2 h-3 w-3/4 rounded-lg" />
      </div>
    </div>
  </div>
);

const ServicesSkeleton = () => (
  <div className="flex flex-col gap-5 sm:gap-6">
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          <SkeletonField />
          <div className="flex items-center gap-3 pl-1 py-1">
            <Skel className="h-5 w-5 rounded-md" />
            <Skel className="h-4 w-44 rounded-lg" />
          </div>
        </div>
        <SkeletonField />
        <SkeletonField />
      </div>
      <div>
        <Skel className="mb-2 h-4 w-32 rounded-lg" />
        <Skel className="h-28 w-full rounded-xl" />
      </div>
    </section>
  </div>
);

const AvailabilitySkeleton = () => (
  <div className="flex flex-col gap-5 sm:gap-6">
    <section className="flex flex-col gap-3">
      <Skel className="h-4 w-36 rounded-lg" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 lg:gap-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skel key={index} className="h-10 rounded-lg" />
        ))}
      </div>
      <Skel className="h-3 w-36 rounded-lg" />
    </section>

    <div className="h-px bg-slate-100 dark:bg-slate-800" />

    <section className="flex flex-col gap-3">
      <Skel className="h-4 w-40 rounded-lg" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex min-h-[86px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <Skel className="h-4 w-4 rounded-full" />
            <Skel className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skel className="h-4 w-32 rounded-lg" />
              <Skel className="mt-2 h-3 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </section>

    <div className="h-px bg-slate-100 dark:bg-slate-800" />

    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skel className="h-4 w-36 rounded-lg" />
          <Skel className="mt-2 h-3 w-72 rounded-lg" />
        </div>
        <Skel className="h-4 w-24 rounded-lg" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[44px_minmax(0,1fr)_24px_minmax(0,1fr)_36px] sm:px-4">
            <Skel className="h-8 w-8 rounded-lg" />
            <div className="flex gap-2">
              <Skel className="h-9 w-[82px] rounded-lg" />
              <Skel className="h-9 w-[82px] rounded-lg" />
              <Skel className="h-9 w-[88px] rounded-lg" />
            </div>
            <Skel className="hidden h-4 w-4 rounded-md sm:block" />
            <div className="flex gap-2">
              <Skel className="h-9 w-[82px] rounded-lg" />
              <Skel className="h-9 w-[82px] rounded-lg" />
              <Skel className="h-9 w-[88px] rounded-lg" />
            </div>
            <Skel className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Skel className="h-4 w-28 rounded-lg" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skel key={index} className="h-9 w-[92px] rounded-lg" />
        ))}
      </div>
    </section>
  </div>
);

const ReviewSkeleton = () => (
  <div className="mt-4 flex flex-col gap-5 sm:gap-6">
    <div className="flex items-start gap-4 rounded-2xl border border-[#CFE9E8] bg-[#F0FAF9] p-4 dark:border-primary/20 dark:bg-primary/10">
      <Skel className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="flex-1">
        <Skel className="h-5 w-36 rounded-lg" />
        <Skel className="mt-2 h-4 w-3/4 rounded-lg" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, cardIndex) => (
        <div key={cardIndex} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skel className="h-11 w-11 rounded-xl" />
              <Skel className="h-5 w-36 rounded-lg" />
            </div>
            <Skel className="h-8 w-16 rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: cardIndex < 2 ? 5 : 4 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-[42%_1fr] gap-4">
                <Skel className="h-3 w-24 rounded-lg" />
                <Skel className="h-4 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const VerificationSkeleton = () => (
  <main className="flex min-h-0 w-full flex-1 justify-center">
    <section className="relative mx-auto flex min-h-0 w-full max-w-[1180px] flex-1 flex-col items-center overflow-hidden rounded-[22px] border border-slate-100 bg-white px-5 py-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-700 dark:bg-slate-800 lg:rounded-[28px]">
      <div className="flex w-full max-w-[920px] flex-col items-center text-center">
        <Skel className="h-[117px] w-[180px] rounded-2xl" />
        <Skel className="mt-5 h-8 w-64 rounded-xl" />
        <Skel className="mt-4 h-4 w-full max-w-[560px] rounded-lg" />
        <Skel className="mt-2 h-4 w-full max-w-[480px] rounded-lg" />

        <div className="mt-8 grid w-full gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 text-left dark:border-slate-700 dark:bg-slate-800">
              <Skel className="h-12 w-12 rounded-full" />
              <div className="flex-1">
                <Skel className="h-4 w-32 rounded-lg" />
                <Skel className="mt-2 h-3 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex w-full flex-col items-stretch gap-4 rounded-2xl border border-[#D9EEEC] bg-[#F2FBFA] p-5 text-left dark:border-primary/20 dark:bg-primary/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skel className="h-12 w-12 rounded-full" />
            <div>
              <Skel className="h-5 w-36 rounded-lg" />
              <Skel className="mt-2 h-3 w-72 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skel className="h-12 w-[170px] rounded-xl" />
            <Skel className="h-12 w-[170px] rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  </main>
);

const getPrimaryWidth = (variant: OnboardingSkeletonVariant) => {
  if (variant === "subscription") return "w-[210px]";
  if (variant === "profile" || variant === "services" || variant === "availability") {
    return "w-44";
  }
  return "w-36";
};

export const OnboardingStepSkeleton: React.FC<{
  variant?: OnboardingSkeletonVariant;
  showFooter?: boolean;
  className?: string;
}> = ({ variant = "clinic", showFooter = true, className = "" }) => {
  if (variant === "verification") return <VerificationSkeleton />;

  return (
    <div
      className={["h-full w-full font-outfit", className].join(" ")}
      aria-busy="true"
      aria-label="Loading onboarding step"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4 hide-scrollbar sm:px-6 sm:pb-7 sm:pt-5">
          {variant === "clinic" && <ClinicSkeleton />}
          {variant === "profile" && <ProfileSkeleton />}
          {variant === "services" && <ServicesSkeleton />}
          {variant === "availability" && <AvailabilitySkeleton />}
          {variant === "subscription" && <ReviewSkeleton />}
        </div>

        {showFooter && (
          <SkeletonFooter
            showBack={variant !== "clinic"}
            primaryWidth={getPrimaryWidth(variant)}
          />
        )}
      </div>
    </div>
  );
};

const OnboardingStepperSkeleton: React.FC<{ stepCount: number }> = ({
  stepCount,
}) => (
  <div className="w-full" aria-hidden="true">
    <div className="mx-auto flex max-w-[1040px] items-center px-2 sm:px-4">
      {Array.from({ length: stepCount }).map((_, index) => {
        const isLast = index === stepCount - 1;

        return (
          <React.Fragment key={index}>
            <div className="flex shrink-0 flex-col items-center">
              <Skel className="h-10 w-10 rounded-full" />
              <Skel className="mt-2.5 h-3 w-20 rounded-lg" />
            </div>
            {!isLast && (
              <div
                className="relative mx-3 h-[2px] min-w-10 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:mx-6"
                style={{ maxWidth: 138 }}
              >
                <Skel className="h-full w-full rounded-full" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

export const OnboardingPageSkeleton: React.FC<{
  variant?: OnboardingSkeletonVariant;
  stepCount?: number;
}> = ({ variant = "clinic", stepCount = 6 }) => (
  <div
    className="flex h-full min-h-0 w-full font-outfit"
    aria-busy="true"
    aria-label="Loading onboarding"
  >
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden sm:gap-5 lg:gap-6">
      <div className="shrink-0 overflow-x-auto hide-scrollbar">
        <OnboardingStepperSkeleton stepCount={stepCount} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {variant === "verification" ? (
          <OnboardingStepSkeleton variant="verification" showFooter={false} />
        ) : (
          <main className="flex min-h-0 w-full flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-900">
              <div className="flex shrink-0 items-center gap-3 px-5 pt-4 sm:gap-4 sm:px-6 sm:pt-5">
                <Skel className="h-8 w-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skel className="h-5 w-40 rounded-lg" />
                  <Skel className="mt-2 h-3 w-72 max-w-full rounded-lg" />
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                <OnboardingStepSkeleton variant={variant} />
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  </div>
);
