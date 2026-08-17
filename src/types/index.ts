import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type {
  Clinic,
  ClinicFormValues,
  OnboardingClinicDetailsProps,
  OnboardingClinicFormChangeValues,
  OnboardingClinicFormValues,
  UpdateDetailsProps,
} from "./clinicDetails";

export type {
  InteractiveMapAddressDetails,
  InteractiveMapLocation,
  InteractiveMapProps,
  NominatimAddress,
  NominatimReverseResponse,
} from "./interactiveMap";
