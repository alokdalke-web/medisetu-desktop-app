import React from "react";
import { NavLink } from "react-router";
import {
  FiGrid,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import Images from "../../constants/images";
import LogoutModal from "../../pages/settings/LogoutModal";
import { useDisclosure } from "@heroui/react";
import { useGetUserQuery } from "../../redux/api/authApi";

const baseItem =
  "group flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors";
const activeItem = "bg-primary text-white shadow-sm hover:text-white";
const idleItem = "text-slate-600 hover:bg-primary-hover hover:text-white";

const iconBox =
  "grid h-8 w-8 place-items-center rounded-lg border transition-all";
const iconBoxIdle = "border-slate-200 text-slate-600 bg-white";
const iconBoxActive = "border-transparent bg-white/20 text-white";

const Sidebar: React.FC = () => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const { data: user } = useGetUserQuery();

  return (
    <aside className="sticky top-0 h-screen w-64 flex flex-col bg-white xl:border-r border-gray-300">
      <header className="px-12 py-6">
        <img src={Images.mediSetuLogo} alt="MediSetu" className="h-8" />
      </header>

      <nav className="flex-1 space-y-2 px-4 py-5 overflow-y-auto">
        <NavLink
          to="/patient-dashboard"
          end
          className={({ isActive }) =>
            `${baseItem} ${isActive ? activeItem : idleItem}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`${iconBox} ${
                  isActive ? iconBoxActive : iconBoxIdle
                }`}
              >
                <FiGrid className="text-[18px]"/>
              </span>
              <span>Dashboard</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/patient-appointment"
          className={({ isActive }) =>
            `${baseItem} ${isActive ? activeItem : idleItem}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`${iconBox} ${
                  isActive ? iconBoxActive : iconBoxIdle
                }`}
              >
                <FiCalendar className="text-[18px]" />
              </span>
              <span>Appointment</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/patient-report"
          className={({ isActive }) =>
            `${baseItem} ${isActive ? activeItem : idleItem}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`${iconBox} ${
                  isActive ? iconBoxActive : iconBoxIdle
                }`}
              >
                <FiBarChart2 className="text-[18px]" />
              </span>
              <span>Report</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/patient-setting"
          className={({ isActive }) =>
            `${baseItem} ${isActive ? activeItem : idleItem}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`${iconBox} ${
                  isActive ? iconBoxActive : iconBoxIdle
                }`}
              >
                <FiSettings className="text-[18px]" />
              </span>
              <span>Setting</span>
            </>
          )}
        </NavLink>

        <button
          className={`${baseItem} ${idleItem} w-full cursor-pointer`}
          onClick={onOpen}
        >
          <span className={`${iconBox} ${iconBoxIdle}`}>
            <FiLogOut className="text-[18px]" />
          </span>
          <span>Logout</span>
        </button>

        <LogoutModal isOpen={isOpen} onOpenChange={onOpenChange} />
      </nav>

      <div className="rounded-3xl p-3">
        <NavLink
          to="/profile"
          className="group flex items-center gap-3 rounded-3xl  p-3 shadow-sm
                     hover:bg-primary-hover "
        >
          <img
            src={user?.profileImage ?? "https://i.pravatar.cc/100?img=12"}
            alt="avatar"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="text-sm">
            <div className="font-semibold group-hover:text-teal-700">
              {user?.name}
            </div>
            <div className="text-secondary">{user?.userType}</div>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
