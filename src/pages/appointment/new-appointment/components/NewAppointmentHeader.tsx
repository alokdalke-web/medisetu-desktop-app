import FeatureInfoTip from "../../../../components/shared/FeatureInfoTip";
import PageBackNav from "../../../../components/shared/PageBackNav";
import { newAppointmentTips } from "../../../../constants/featureTips";

const NewAppointmentHeader = () => {
  return (
    <>
      <div className="sm:items-center sm:justify-between px-0 md:px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-[28px] font-semibold text-text">
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
      <PageBackNav
        backTo="/appointment"
        crumbs={[{ label: "Appointment", to: "/appointment" }, { label: "New Appointment" }]}
        className="mb-3 px-0 md:px-4"
      />
    </>
  );
};

export default NewAppointmentHeader;
