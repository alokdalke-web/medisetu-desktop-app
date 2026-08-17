import ReactGA from "react-ga4";

export const initGA = () => {
  ReactGA.initialize("G-3JTZ08285J");
};

export const trackPageView = (path: string) => {
  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
};