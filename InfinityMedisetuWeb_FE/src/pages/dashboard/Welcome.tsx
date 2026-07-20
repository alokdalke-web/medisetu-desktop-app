import React from "react";
import Icons from "../../constants/icons";
import Images from "../../constants/images";
import AppButton from "../../components/shared/AppButton";
import { Link } from "react-router";
// import { useNavigate } from "react-router";

type BadgeProps = {
  icon: string;
  text: string;
  className?: string;
};

const Badge: React.FC<BadgeProps> = ({ icon, text, className }) => (
  <div
    className={[
      "absolute z-10 flex items-center gap-2 md:gap-3 font-normal",
      "px-4 py-3 rounded-2xl bg-white",
      "shadow-[0_10px_30px_rgba(16,24,40,0.08)]",
      "border border-black/5",
      className || "",
    ].join(" ")}
  >
    <img src={icon} alt="" className="h-6 w-6" />
    <p className="text-sm max-[720px]:text-xs max-[720px]:leading-tight font-normal text-gray-800 leading-snug">
      {text}
    </p>
  </div>
);

const Welcome: React.FC = () => {
  // const navigate = useNavigate();
  return (
    <main
      style={{
        backgroundImage: `radial-gradient(50% 50% at 50% 50%, #ffffff 0%, #ffffff 55.46%, rgba(255, 255, 255, 0) 100%), url(${Images.welcomeMask})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
      className="bg-background-secondary relative min-h-screen w-full
      px-6 md:px-10 lg:px-16 xl:px-24
      py-8 lg:py-0
      flex items-center justify-center"
    >
      <div
        className="mx-auto max-w-[1200px]
        min-h-[680px] lg:min-h-[550px]
        grid grid-cols-1 lg:grid-cols-12
        gap-10 lg:gap-14
        content-center items-stretch"
      >
        {/* Left Side Image & Badges */}
        <div className="lg:col-span-6">
          <div className="relative w-full max-w-[550px] h-[420px] md:h-[500px]">
            <div className="absolute inset-0 overflow-hidden rounded-r-[24px] rounded-tr-[80px]">
              <img
                src={Images.homeDoctor}
                alt="Doctors"
                className="h-full w-full object-cover"
              />
            </div>

            <Badge
              icon={Icons.secureDigital}
              text="Secure Digital Patient Records"
              className="left-12 w-[150px] md:w-[220px] py-1 md:py-4 top-[75%]"
            />
            <Badge
              icon={Icons.smartAvailability}
              text="Easy Patient Communication"
              className="right-[-40px] w-[150px] md:w-[220px] py-1 md:py-4 top-[70%]"
            />
            <Badge
              icon={Icons.smartAvailability}
              text="Effortless Appointment Scheduling"
              className="left-4 w-[150px] md:w-[220px] py-1 md:py-4 top-[93%]"
            />
            <Badge
              icon={Icons.smartAvailability}
              text="Smart Availability & Breaks"
              className="right-[-10px] w-[150px] md:w-[220px] py-1 md:py-4 top-[90%]"
            />
          </div>
        </div>

        {/* Right Side Content */}
        <div className="lg:col-span-6 space-y-8 py-6">
          <img
            src={Images.mediSetuLogo}
            alt="MediSetu" 
            className="h-16 w-auto mb-6 "
          />

          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-medium leading-tight">
            Welcome to <span className="text-primary">MediSetu</span>
            <br /> Your Smart Bridge to Better
            <br /> Healthcare
          </h1>

          <p className="mt-4 text-gray-400 max-w-[560px] leading-relaxed">
            Digitize your clinic operations, simplify appointment bookings, and
            manage patient records with ease — all in one place.
          </p>

          <p className="mt-5 font-medium text-primary">
            15-Day Free Trial –{" "}
            <span className="text-gray-900">No Credit Card Required</span>
          </p>

          {/* Buttons */}
          <div className="mt-7 flex  items-center gap-4 font-medium">
            <Link to="/signup">
              <AppButton
                text="Sign up"
                className="h-14 w-36"
                buttonVariant="dark"
              />
            </Link>
            <Link to="/login" className="w-full">
              <AppButton
                href="/login"
                text="Start Free Trial"
                className="w-full h-14 pl-6"
                endContent={
                  <div className="w-9 h-9 rounded-full bg-white ml-auto grid place-items-center">
                    <img src={Icons.rightArrow} alt="" />
                  </div>
                }
              />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Welcome;
