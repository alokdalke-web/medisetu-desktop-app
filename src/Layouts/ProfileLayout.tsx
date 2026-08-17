// src/Layouts/ProfileLayout.tsx
import React from "react";
import { NavLink, Outlet } from "react-router";
import { FiUser, FiHome, FiHeart, FiClock } from "react-icons/fi";

const item =
  "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition";
const active = "bg-teal-50 text-teal-700 ring-1 ring-teal-100";
const idle = "text-slate-700 hover:bg-slate-50";

const iconBox = "grid h-7 w-7 place-items-center rounded-lg border text-[16px]";
const iconIdle = "border-slate-200 text-slate-600 bg-white";
const iconActive = "border-teal-200 bg-white text-teal-700";

const ProfileLayout: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-semibold">My Profile</h1>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="border-b border-gray-100 p-4 md:border-b-0 md:border-r">
            <nav className="space-y-2">
              <NavLink
                end
                to="/profile"
                className={({ isActive }) =>
                  `${item} ${isActive ? active : idle}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`${iconBox} ${
                        isActive ? iconActive : iconIdle
                      }`}
                    >
                      <FiUser />
                    </span>
                    <span>Profile Ovasderview</span>
                  </>
                )}
              </NavLink>

              {/* 👇 absolute paths */}
              <NavLink
                to="/profile/clinic"
                className={({ isActive }) =>
                  `${item} ${isActive ? active : idle}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`${iconBox} ${
                        isActive ? iconActive : iconIdle
                      }`}
                    >
                      <FiHome />
                    </span>
                    <span>Clinic Details</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/profile/services"
                className={({ isActive }) =>
                  `${item} ${isActive ? active : idle}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`${iconBox} ${
                        isActive ? iconActive : iconIdle
                      }`}
                    >
                      <FiHeart />
                    </span>
                    <span>Services &amp; Price</span>
                  </>
                )}
              </NavLink>

              <NavLink
                to="/profile/availability"
                className={({ isActive }) =>
                  `${item} ${isActive ? active : idle}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`${iconBox} ${
                        isActive ? iconActive : iconIdle
                      }`}
                    >
                      <FiClock />
                    </span>
                    <span>Clinic Availability</span>
                  </>
                )}
              </NavLink>
            </nav>
          </aside>

          <section className="p-4 md:p-6">
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
