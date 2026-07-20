import { FiChevronRight } from "react-icons/fi";
import { Link } from "react-router";
import FeatureInfoTip from "../../../../components/shared/FeatureInfoTip";
import { newAppointmentTips } from "../../../../constants/featureTips";

const NewAppointmentHeader = () => {
  return (
    <>
      <div className="sm:items-center sm:justify-between px-0 md:px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-[28px] font-semibold text-slate-900 dark:text-white">
            New Appointment
          </h1>
          <FeatureInfoTip
            title="Booking Tips"
            tips={newAppointmentTips}
            guideSection="appointments-guide"
            linkLabel="Read booking guide"
          />
        </div>
      </div>
      <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 px-0 md:px-4 dark:text-slate-400">
        <Link
          to="/appointment"
          className="min-w-0 truncate hover:text-slate-900 hover:underline underline-offset-4 dark:hover:text-white"
        >
          Appointment
        </Link>

        <FiChevronRight className="opacity-60" />

        <span className="min-w-0 truncate font-semibold text-teal-700 dark:text-[#46beae]">
          New Appointment
        </span>
      </nav>
    </>
  );
};

export default NewAppointmentHeader;
