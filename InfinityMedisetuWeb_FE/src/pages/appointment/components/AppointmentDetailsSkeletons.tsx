import { Card, CardBody } from "@heroui/react";
import React from "react";

const Skel: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />
);

export const AppointmentInfoSkeleton = () => (
  <Card shadow="none" radius="lg" className="bg-white dark:bg-[#111726]">
    <CardBody className="p-0">
      <div className="px-4 sm:px-5">
        <Skel className="h-4 w-48" />
      </div>

      <div className="p-3 sm:p-5">
        <div className="rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6 dark:border-[#273244]">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skel className="h-9 w-9 rounded-full" />
            <div className="space-y-2">
              <Skel className="h-4 w-44" />
              <Skel className="h-3 w-28" />
              <Skel className="h-6 w-24 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full md:w-auto">
            <div className="space-y-2">
              <Skel className="h-4 w-40" />
              <Skel className="h-3 w-20" />
            </div>
            <div className="space-y-2">
              <Skel className="h-4 w-44" />
              <Skel className="h-3 w-16" />
            </div>
            <div className="space-y-2">
              <Skel className="h-4 w-48" />
              <Skel className="h-3 w-24" />
            </div>
            <div className="space-y-2">
              <Skel className="h-4 w-52" />
              <Skel className="h-3 w-20" />
            </div>
          </div>
        </div>
      </div>
    </CardBody>
  </Card>
);

export const BigSectionSkeleton = ({ title }: { title: string }) => (
  <Card shadow="none" radius="lg" className="bg-white overflow-hidden dark:bg-[#111726]">
    <div className="border-b border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726]">
      <div className="px-4 sm:px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] sm:text-sm font-semibold text-slate-800 dark:text-white">
          <span>{title}</span>
        </div>
      </div>
    </div>
    <CardBody className="p-3 sm:p-5">
      <div className="space-y-4">
        <Skel className="h-10 w-56 sm:w-64 rounded-full" />
        <Skel className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skel className="h-20 w-full rounded-2xl" />
          <Skel className="h-20 w-full rounded-2xl" />
        </div>
        <Skel className="h-10 w-40 rounded-full" />
      </div>
    </CardBody>
  </Card>
);
