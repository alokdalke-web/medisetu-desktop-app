import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import PatientSidebar from "../components/shared/PatientSidebar";
import Header from "../components/shared/Header";
import PatientRightSidebar from "../components/shared/PatientRightSidebar";
import { FiX } from "react-icons/fi";
import { useTheme } from "../hooks/useTheme";

const PatientLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const showRight = pathname === "/patient-dashboard";

  // mobile drawers
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  // close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileLeftOpen(false);
        setMobileRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // lock body scroll when any drawer is open
  useEffect(() => {
    const locked = mobileLeftOpen || mobileRightOpen;
    const prev = document.body.style.overflow;
    document.body.style.overflow = locked ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileLeftOpen, mobileRightOpen]);

  return (
    <div
      className={[
        isDark ? "dark" : "",
        "h-screen overflow-hidden",
        "grid grid-rows-[84px_1fr] grid-cols-1 bg-gray-50",
        showRight
          ? "xl:grid-cols-[16rem_minmax(0,1fr)_20rem]"
          : "xl:grid-cols-[16rem_minmax(0,1fr)]",
      ].join(" ")}
    >
      {/* Left sidebar (desktop) */}
      <div className="hidden xl:block xl:row-span-2 xl:col-start-1">
        <PatientSidebar />
      </div>

      {/* Header */}
      <div className="xl:col-start-2 xl:row-start-1">
        <Header
          onOpenLeft={() => setMobileLeftOpen(true)}
          onOpenRight={showRight ? () => setMobileRightOpen(true) : undefined}
        />
      </div>

      {/* Right sidebar (desktop) */}
      {showRight && (
        <div className="hidden xl:block xl:row-span-2 xl:col-start-3">
          <PatientRightSidebar variant="desktop" />
        </div>
      )}

      {/* Main content */}
      <main className="p-6 xl:col-start-2 xl:row-start-2 min-h-0 min-w-0 overflow-y-auto">
        <Outlet />
      </main>

      {/* ===== Mobile Left Drawer ===== */}
      <div
        className={`xl:hidden fixed inset-0 z-50 ${
          mobileLeftOpen ? "" : "pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-mobile-left-title"
      >
        {/* overlay */}
        <div
          onClick={() => setMobileLeftOpen(false)}
          aria-hidden="true"
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            mobileLeftOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* panel */}
        <div
          className={`absolute left-0 top-0 h-full w-72 max-w-[85%] bg-white shadow-xl ring-1 ring-black/10 transition-transform ${
            mobileLeftOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <h2
              id="patient-mobile-left-title"
              className="text-sm font-semibold"
            >
              Menu
            </h2>
            <button
              aria-label="Close menu"
              onClick={() => setMobileLeftOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
              type="button"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <div className="h-[calc(100%-56px)] overflow-y-auto">
            <PatientSidebar />
          </div>
        </div>
      </div>

      {/* ===== Mobile Right Drawer (only /patient-dashboard) ===== */}
      {showRight && (
        <div
          className={`xl:hidden fixed inset-0 z-50 ${
            mobileRightOpen ? "" : "pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-mobile-right-title"
        >
          {/* overlay */}
          <div
            onClick={() => setMobileRightOpen(false)}
            aria-hidden="true"
            className={`absolute inset-0 bg-black/40 transition-opacity ${
              mobileRightOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* panel */}
          <div
            className={`absolute right-0 top-0 h-full w-80 max-w-[90%] bg-white shadow-xl ring-1 ring-black/10 transition-transform ${
              mobileRightOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b">
              <h2
                id="patient-mobile-right-title"
                className="text-sm font-semibold"
              >
                Panel
              </h2>
              <button
                aria-label="Close panel"
                onClick={() => setMobileRightOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                type="button"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto">
              <PatientRightSidebar variant="drawer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientLayout;
