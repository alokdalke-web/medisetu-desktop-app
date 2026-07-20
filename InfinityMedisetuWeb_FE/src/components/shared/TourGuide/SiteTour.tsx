import React from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useLocation, useNavigate } from "react-router";

interface SiteTourProps {
  run: boolean;
  onFinish: () => void;
  userType?: string;
}

type TourStep = {
  target: string;
  title: string;
  content: string;
  placement?: string;
};

const mapPlacement = (placement?: string) => {
  if (!placement || placement === "auto") {
    return { side: undefined, align: undefined };
  }

  const [sideRaw, alignRaw] = placement.split("-");
  const side = ["top", "bottom", "left", "right", "over"].includes(sideRaw)
    ? (sideRaw as "top" | "bottom" | "left" | "right" | "over")
    : undefined;
  const align = ["start", "center", "end"].includes(alignRaw)
    ? (alignRaw as "start" | "center" | "end")
    : undefined;

  return { side, align };
};

const clearTextSelection = () => {
  const selection = window.getSelection();

  if (selection?.rangeCount) {
    selection.removeAllRanges();
  }
};

const TOUR_STAGE_PADDING = 8;
const TOUR_STAGE_RADIUS = 16;
const TOUR_FOCUS_BLUR_LAYER_ID = "tour-focus-blur-layer";
const TOUR_FOCUS_BLUR_PANELS = ["top", "right", "bottom", "left"] as const;
const TOUR_TARGET_WAIT_MS = 5000;

const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

const ensureTourFocusBlurLayer = () => {
  let layer = document.getElementById(
    TOUR_FOCUS_BLUR_LAYER_ID,
  ) as HTMLDivElement | null;

  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = TOUR_FOCUS_BLUR_LAYER_ID;
  layer.className = "tour-focus-blur-layer";
  layer.setAttribute("aria-hidden", "true");

  TOUR_FOCUS_BLUR_PANELS.forEach((panel) => {
    const panelElement = document.createElement("div");
    panelElement.className = `tour-focus-blur-panel tour-focus-blur-panel-${panel}`;
    layer.appendChild(panelElement);
  });

  document.body.appendChild(layer);
  return layer;
};

const hideTourFocusBlurLayer = () => {
  const layer = document.getElementById(TOUR_FOCUS_BLUR_LAYER_ID);
  if (layer) layer.hidden = true;
};

const removeTourFocusBlurLayer = () => {
  document.getElementById(TOUR_FOCUS_BLUR_LAYER_ID)?.remove();
};

const syncTourFocusBlurLayer = (element?: Element) => {
  if (!element) {
    hideTourFocusBlurLayer();
    return;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    hideTourFocusBlurLayer();
    return;
  }

  const left = Math.max(0, rect.left - TOUR_STAGE_PADDING);
  const top = Math.max(0, rect.top - TOUR_STAGE_PADDING);
  const right = Math.min(window.innerWidth, rect.right + TOUR_STAGE_PADDING);
  const bottom = Math.min(window.innerHeight, rect.bottom + TOUR_STAGE_PADDING);
  const layer = ensureTourFocusBlurLayer();

  layer.hidden = false;
  layer.style.setProperty("--tour-focus-left", `${Math.round(left)}px`);
  layer.style.setProperty("--tour-focus-top", `${Math.round(top)}px`);
  layer.style.setProperty("--tour-focus-right", `${Math.round(right)}px`);
  layer.style.setProperty("--tour-focus-bottom", `${Math.round(bottom)}px`);
};

const DASHBOARD_TARGETS = new Set([
  "#tour-dashboard",
  "#tour-dashboard-stats",
  "#tour-admin-controls",
  "#tour-admin-summary",
  "#tour-admin-charts",
  "#tour-admin-todays-appointments",
  "#tour-admin-reports-overview",
  "#tour-admin-side-panel",
  "#tour-doctor-dashboard-stats",
  "#tour-doctor-consultation-board",
  "#tour-doctor-quick-actions",
  "#tour-doctor-insights",
]);

const APPOINTMENT_TARGETS = new Set([
  "#tour-appointments",
  "#tour-add-appointment-btn",
  "#tour-admin-appointments-page",
  "#tour-reception-appointments-overview",
]);

const PATIENT_TARGETS = new Set([
  "#tour-patients",
  "#tour-add-patient-btn",
  "#tour-admin-patients-page",
]);

const SUBSCRIPTION_TARGETS = new Set(["#tour-admin-subscription-page"]);

const RECEPTION_DASHBOARD_TARGETS = new Set([
  "#tour-reception-dashboard-overview",
]);

const NEW_APPOINTMENT_TARGETS = new Set([
  "#tour-reception-new-appointment-form",
]);

const PHARMACY_DASHBOARD_TARGETS = new Set([
  "#tour-pharmacy-dashboard-overview",
]);

const PHARMACY_PRESCRIPTION_TARGETS = new Set([
  "#tour-pharmacy-prescriptions-page",
]);

const PHARMACY_MEDICINE_TARGETS = new Set([
  "#tour-pharmacy-medicines-page",
]);

const PHARMACY_STOCK_TARGETS = new Set([
  "#tour-pharmacy-stock-page",
]);

const PHARMACY_SALES_TARGETS = new Set([
  "#tour-pharmacy-sales-page",
]);

const PHARMACY_SUPPLIER_TARGETS = new Set([
  "#tour-pharmacy-suppliers-page",
]);

const PHARMACY_SUBSCRIPTION_TARGETS = new Set([
  "#tour-pharmacy-subscriptions-page",
]);

const LAB_DASHBOARD_TARGETS = new Set([
  "#tour-lab-dashboard",
  "#tour-lab-dashboard-stats",
  "#tour-lab-summary",
  "#tour-lab-trends",
  "#tour-lab-work-queues",
  "#tour-lab-side-panel",
]);

const LAB_REQUEST_TARGETS = new Set([
  "#tour-lab-requests-page",
  "#tour-lab-requests-kpis",
  "#tour-lab-requests-filters",
]);

const LAB_ACTIVE_TARGETS = new Set([
  "#tour-lab-active-page",
  "#tour-lab-active-kpis",
  "#tour-lab-active-filters",
]);

const LAB_WALKIN_TARGETS = new Set([
  "#tour-lab-walkin-page",
  "#tour-lab-walkin-patient",
  "#tour-lab-walkin-tests",
  "#tour-lab-walkin-summary",
]);

const LAB_CATALOG_TARGETS = new Set([
  "#tour-lab-catalog-page",
  "#tour-lab-catalog-kpis",
  "#tour-lab-catalog-filters",
  "#tour-lab-catalog-add-test",
  "#tour-lab-catalog-table",
]);

const resolveRouteForTarget = (target?: string) => {
  if (!target) return null;

  if (RECEPTION_DASHBOARD_TARGETS.has(target)) {
    return "/dashboard";
  }

  if (NEW_APPOINTMENT_TARGETS.has(target)) {
    return "/appointment/new";
  }

  if (PHARMACY_DASHBOARD_TARGETS.has(target)) {
    return "/pharmacy/dashboard";
  }

  if (PHARMACY_PRESCRIPTION_TARGETS.has(target)) {
    return "/pharmacy/prescriptions";
  }

  if (PHARMACY_MEDICINE_TARGETS.has(target)) {
    return "/pharmacy/medicines";
  }

  if (PHARMACY_STOCK_TARGETS.has(target)) {
    return "/pharmacy/stock";
  }

  if (PHARMACY_SALES_TARGETS.has(target)) {
    return "/pharmacy/sales";
  }

  if (PHARMACY_SUPPLIER_TARGETS.has(target)) {
    return "/pharmacy/suppliers";
  }

  if (PHARMACY_SUBSCRIPTION_TARGETS.has(target)) {
    return "/pharmacy/patient-subscription";
  }

  if (LAB_DASHBOARD_TARGETS.has(target)) {
    return "/lab/dashboard";
  }

  if (LAB_REQUEST_TARGETS.has(target)) {
    return "/lab/all-tests";
  }

  if (LAB_ACTIVE_TARGETS.has(target)) {
    return "/lab/assigned";
  }

  if (LAB_WALKIN_TARGETS.has(target)) {
    return "/lab/walk-in-test";
  }

  if (LAB_CATALOG_TARGETS.has(target)) {
    return "/lab/queue";
  }

  if (DASHBOARD_TARGETS.has(target)) {
    return "/dashboard";
  }

  if (APPOINTMENT_TARGETS.has(target)) {
    return "/appointment";
  }

  if (PATIENT_TARGETS.has(target)) {
    return "/patients";
  }

  if (SUBSCRIPTION_TARGETS.has(target)) {
    return "/subscription";
  }

  if (["#tour-add-test-btn", "#tour-testCatalog"].includes(target)) {
    return "/test-catalog";
  }

  if (
    [
      "#tour-users",
      "#tour-users-tabs",
      "#tour-tab-doctor",
      "#tour-tab-reception",
      "#tour-tab-lab",
      "#tour-tab-pharmacy",
      "#tour-add-user-btn",
      "#tour-add-lab-btn",
      "#tour-add-pharmacy-btn",
    ].includes(target)
  ) {
    return "/users";
  }

  return null;
};

export const SiteTour: React.FC<SiteTourProps> = ({
  run,
  onFinish,
  userType,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = React.useRef<ReturnType<typeof driver> | null>(null);
  const navigationButtonsRef = React.useRef<{
    nextButton?: HTMLButtonElement;
    previousButton?: HTMLButtonElement;
  }>({});
  const isMovingRef = React.useRef(false);
  const completionHandledRef = React.useRef(false);
  const isStartingRef = React.useRef(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const steps: TourStep[] = React.useMemo(() => {
    const adminSteps: TourStep[] = [
      {
        target: "#tour-dashboard-stats",
        title: "Dashboard KPI Cards",
        content:
          "Start with the clinic totals: appointments, patients, revenue, no-shows, and pending payments for the selected date range.",
        placement: "bottom",
      },
      {
        target: "#tour-admin-charts",
        title: "Revenue and Appointment Status",
        content:
          "Review the revenue trend and appointment status side by side to understand how the selected period is performing.",
        placement: "bottom",
      },
      {
        target: "#tour-admin-todays-appointments",
        title: "Today's Appointment Queue",
        content:
          "This table shows today's patients, consultation type, status, and quick actions for opening or rescheduling an appointment.",
        placement: "top",
      },
      {
        target: "#tour-admin-reports-overview",
        title: "Reports Snapshot",
        content:
          "Review the top symptoms and patient mix at a glance, then jump into the full reports when you need deeper analysis.",
        placement: "top",
      },
      {
        target: "#tour-admin-appointments-page",
        title: "All Appointments",
        content:
          "Use this workspace to search appointments, filter by date or status, switch views, and create a new appointment.",
        placement: "top",
      },
      {
        target: "#tour-admin-patients-page",
        title: "All Patients",
        content:
          "Use this directory workspace to find patients, filter by gender, status, age, or registration date, and open patient details.",
        placement: "top",
      },
      {
        target: "#tour-admin-subscription-page",
        title: "Subscription and Billing",
        content:
          "Compare the available plans here, then use the billing panel to select add-ons, apply coupons, and proceed to checkout.",
        placement: "top",
      },
    ];

    const baseSteps: TourStep[] = [
      {
        target: "#tour-dashboard",
        title: "Dashboard Overview",
        content:
          "Welcome to your dashboard! Here you can see a quick summary of your clinic's performance.",
        placement: "right-start",
      },
      {
        target: "#tour-dashboard-stats",
        title: "Dashboard Stats",
        content:
          "This section shows your key numbers: total appointments, active patients, total revenue, and pending tasks.",
        placement: "auto",
      },
      {
        target: "#tour-appointments",
        title: "Appointment Management",
        content:
          "View and manage all your patient appointments from this section.",
        placement: "right",
      },
      {
        target: "#tour-add-appointment-btn",
        title: "Create Appointment",
        content: "Click here to schedule a new appointment for a patient.",
        placement: "bottom",
      },
      {
        target: "#tour-add-patient-btn",
        title: "Register Patient",
        content: "Use this button to register a new patient into your system.",
        placement: "bottom",
      },
      {
        target: "#tour-users",
        title: "User Management",
        content:
          "Manage all your staff members including doctors, receptionists, lab assistants, and pharmacists.",
        placement: "right",
      },
      {
        target: "#tour-users-tabs",
        title: "Staff Categories",
        content:
          "Switch between different staff categories like Doctors, Receptionists, Lab Assistants, and Pharmacists to manage their specific profiles.",
        placement: "bottom",
      },
    ];

    const doctorSteps: TourStep[] = [
      {
        target: "#tour-doctor-consultation-board",
        title: "Consultation Workspace",
        content:
          "Start the day here: open the first consultation, review today's appointments, add a walk-in patient, or jump to the calendar.",
        placement: "top",
      },
      {
        target: "#tour-doctor-insights",
        title: "Patient Alerts and Updates",
        content:
          "Use this area to review patient alerts, recent patients, and important clinic notifications before your next consultation.",
        placement: "top",
      },
      {
        target: "#tour-admin-appointments-page",
        title: "Appointments Workspace",
        content:
          "Search, filter, and review all appointments here. You can switch views, track status, and open appointment details from this page.",
        placement: "top",
      },
      {
        target: "#tour-add-appointment-btn",
        title: "Create Appointment",
        content:
          "Use this button to schedule a new appointment or add a walk-in patient to today's clinic flow.",
        placement: "bottom",
      },
      {
        target: "#tour-admin-patients-page",
        title: "Patient Directory",
        content:
          "Manage registered patients here. Search by name or mobile number, filter the list, and open patient records when needed.",
        placement: "top",
      },
      {
        target: "#tour-add-patient-btn",
        title: "Register Patient",
        content:
          "Use this button to add a new patient profile before booking or starting a consultation.",
        placement: "bottom",
      },
      {
        target: "#tour-doctor-call-reception",
        title: "Call Reception",
        content:
          "Call reception when you need front-desk help or want the next patient sent in.",
        placement: "right",
      },
    ];

    const receptionistSteps: TourStep[] = [
      {
        target: "#tour-reception-dashboard-overview",
        title: "Reception Dashboard",
        content:
          "Start here to review today's appointment KPIs, current reception queue, and quick actions.",
        placement: "bottom",
      },
      {
        target: "#tour-reception-appointments-overview",
        title: "All Appointments",
        content:
          "Use this overview to track appointment totals, status summary, date range, and the schedule list.",
        placement: "top",
      },
      {
        target: "#tour-add-appointment-btn",
        title: "New Appointment",
        content: "Use this button to schedule a new appointment for a patient.",
        placement: "bottom",
      },
      {
        target: "#tour-reception-new-appointment-form",
        title: "New Appointment Form",
        content:
          "Select the patient, doctor, service, date, time slot, and payment details, then confirm from the summary.",
        placement: "top",
      },
      {
        target: "#tour-add-patient-btn",
        title: "New Patient",
        content: "Use this button to register a new patient from the patients page.",
        placement: "bottom",
      },
    ];

    const labAssistantSteps: TourStep[] = [
      {
        target: "#tour-lab-dashboard-stats",
        title: "Dashboard KPI Cards",
        content:
          "This KPI row gives the lab snapshot: total tests, new requests, in-progress work, completed tests, pending reports, and revenue.",
        placement: "bottom",
      },
      {
        target: "#tour-lab-requests-page",
        title: "Patient Test Requests",
        content:
          "This page shows patient tests requested by doctors, including tests assigned to the lab and tests rejected by the doctor or lab workflow.",
        placement: "top",
      },
      {
        target: "#tour-lab-active-page",
        title: "Active Tests",
        content:
          "Active Tests is for work already in the lab flow, especially tests that are in progress or completed.",
        placement: "top",
      },
      {
        target: "#tour-lab-walkin-patient",
        title: "Add Walk-in Test",
        content:
          "Use this page to add an independent walk-in patient, select their lab tests, review the summary, and create the lab test request.",
        placement: "bottom",
      },
      {
        target: "#tour-lab-catalog-page",
        title: "Lab Test Catalog",
        content:
          "This catalog shows which tests your lab performs, with department, sample type, price, status, and source.",
        placement: "top",
      },
      {
        target: "#tour-lab-catalog-add-test",
        title: "Add Tests to Your Lab",
        content:
          "Use Add Test to add a new lab test or configure pricing and result fields for tests your lab can perform.",
        placement: "bottom",
      },
      {
        target: "#tour-lab-barcode-lookup",
        title: "Barcode Lookup",
        content:
          "Enter or scan a barcode here, then open the lookup to view the matching lab test and sample details.",
        placement: "right",
      },
    ];

    const pharmacistSteps: TourStep[] = [
      {
        target: "#tour-pharmacy-dashboard-overview",
        title: "Pharmacy Dashboard",
        content:
          "Start here to review pharmacy profit, low-stock medicines, supplier payments, sales, inventory health, alerts, and insights.",
        placement: "bottom",
      },
      {
        target: "#tour-pharmacy-prescriptions-page",
        title: "Prescriptions",
        content:
          "This queue shows prescriptions assigned by doctors to patients. From here, pharmacy staff can view, process, hold, or reject prescription work.",
        placement: "top",
      },
      {
        target: "#tour-pharmacy-medicines-page",
        title: "Medicines",
        content:
          "Use Medicines to see every medicine available in the pharmacy, including category, brand, form, HSN, available quantity, and stock status.",
        placement: "top",
      },
      {
        target: "#tour-pharmacy-stock-page",
        title: "Stock Management",
        content:
          "Track medicine purchase stock here, including supplier, payment status, purchase totals, expiry tabs, and stock actions.",
        placement: "top",
      },
      {
        target: "#tour-pharmacy-sales-page",
        title: "Sales",
        content:
          "Sales keeps the customer sale records: invoice, customer, medicines sold, payment method, GST, discount, and final total.",
        placement: "top",
      },
      {
        target: "#tour-pharmacy-suppliers-page",
        title: "Suppliers",
        content:
          "Manage the suppliers you purchase medicines from, including contact details, GST/PAN details, status, and supplier records.",
        placement: "top",
      },
      {
        target: "#tour-pharmacy-subscriptions-page",
        title: "Patient Subscription",
        content:
          "Use patient subscriptions for repeat medicines on a fixed schedule, with delivery frequency, next delivery, and generated sales history.",
        placement: "top",
      },
    ];

    const selectedSteps =
      userType === "Admin"
        ? adminSteps
        : userType === "Doctor"
          ? doctorSteps
          : userType === "Receptionist"
            ? receptionistSteps
            : userType === "Lab_Assistant"
              ? labAssistantSteps
              : userType === "Pharmacist"
                ? pharmacistSteps
            : baseSteps;

    if (selectedSteps.length === 0) return selectedSteps;

    return selectedSteps;
  }, [userType]);

  const driverSteps = React.useMemo<DriveStep[]>(() => {
    return steps.map((step) => {
      const { side, align } = mapPlacement(step.placement);
      return {
        element: step.target,
        popover: {
          title: step.title,
          description: step.content,
          ...(side ? { side } : {}),
          ...(align ? { align } : {}),
        },
      };
    });
  }, [steps]);

  const setNavigationBusy = React.useCallback((isBusy: boolean) => {
    const { nextButton, previousButton } = navigationButtonsRef.current;

    if (nextButton) {
      if (isBusy) {
        nextButton.dataset.defaultText =
          nextButton.dataset.defaultText || nextButton.textContent || "Next";
        nextButton.textContent = "Loading...";
        nextButton.setAttribute("aria-busy", "true");
        nextButton.setAttribute("disabled", "true");
      } else {
        if (nextButton.dataset.defaultText) {
          nextButton.textContent = nextButton.dataset.defaultText;
          delete nextButton.dataset.defaultText;
        }
        nextButton.removeAttribute("aria-busy");
        nextButton.removeAttribute("disabled");
      }
    }

    if (previousButton) {
      if (isBusy) {
        previousButton.setAttribute("disabled", "true");
      } else {
        previousButton.removeAttribute("disabled");
      }
    }
  }, []);

  const waitForElement = React.useCallback(
    (selector: string, timeout = TOUR_TARGET_WAIT_MS) => {
      return new Promise<boolean>((resolve) => {
        if (document.querySelector(selector)) {
          resolve(true);
          return;
        }

        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, timeout);
      });
    },
    [],
  );

  const navigateToStep = React.useCallback(
    async (target: string) => {
      const route = resolveRouteForTarget(target);

      if (route && location.pathname !== route) {
        navigate(route);
      }

      const elementExists = await waitForElement(target);
      if (elementExists) await waitForNextPaint();
      return elementExists;
    },
    [location.pathname, navigate, waitForElement],
  );

  const completeTour = React.useCallback(() => {
    if (completionHandledRef.current) return;

    completionHandledRef.current = true;
    removeTourFocusBlurLayer();
    driverRef.current = null;
    isMovingRef.current = false;
    setIsInitialized(false);
    onFinish();
  }, [onFinish]);

  const driveToAvailableStep = React.useCallback(
    async (
      driverObj: ReturnType<typeof driver>,
      startIndex: number,
      direction: 1 | -1,
    ) => {
      let nextIndex = startIndex;

      while (nextIndex >= 0 && nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        const elementExists = await navigateToStep(nextStep.target);

        if (elementExists) {
          driverObj.drive(nextIndex);
          return;
        }

        nextIndex += direction;
      }

      if (direction > 0) {
        driverObj.destroy();
      }
    },
    [navigateToStep, steps],
  );

  const startTour = React.useCallback(async () => {
    if (isStartingRef.current || isInitialized) return;
    isStartingRef.current = true;

    try {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }

      if (steps.length === 0) {
        onFinish();
        return;
      }

      completionHandledRef.current = false;
      isMovingRef.current = false;

      let firstStepIndex = -1;
      for (let i = 0; i < steps.length; i += 1) {
        const firstStepExists = await navigateToStep(steps[i].target);
        if (firstStepExists) {
          firstStepIndex = i;
          break;
        }
      }

      if (firstStepIndex < 0) {
        console.warn("No tour elements were found for this role.");
        onFinish();
        return;
      }

      const driverObj = driver({
        steps: driverSteps,
        animate: true,
        showProgress: true,
        overlayOpacity: 0.42,
        overlayColor: "#061316",
        popoverOffset: 12,
        stagePadding: TOUR_STAGE_PADDING,
        stageRadius: TOUR_STAGE_RADIUS,
        allowClose: true,
        overlayClickBehavior: () => {
          clearTextSelection();
        },
        allowKeyboardControl: true,
        showButtons: ["next", "previous", "close"],
        smoothScroll: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Finish",
        progressText: "Step {{current}} of {{total}}",
        popoverClass: "driverjs-theme",
        onPopoverRender: (popover) => {
          navigationButtonsRef.current = {
            nextButton: popover.nextButton,
            previousButton: popover.previousButton,
          };
          popover.wrapper.setAttribute("role", "dialog");
          popover.wrapper.setAttribute("aria-live", "polite");
          popover.previousButton.setAttribute("aria-label", "Previous tour step");
          popover.nextButton.setAttribute("aria-label", "Next tour step");
          popover.closeButton.setAttribute("aria-label", "Close tour");
        },
        onHighlightStarted: (element) => {
          clearTextSelection();
          syncTourFocusBlurLayer(element);
        },
        onHighlighted: (element) => {
          clearTextSelection();
          syncTourFocusBlurLayer(element);
        },
        onNextClick: async () => {
          if (isMovingRef.current) return;
          isMovingRef.current = true;
          setNavigationBusy(true);

          const currentIndex = driverObj.getActiveIndex() ?? 0;
          const nextIndex = currentIndex + 1;

          try {
            if (nextIndex >= steps.length) {
              driverObj.destroy();
              return;
            }

            await driveToAvailableStep(driverObj, nextIndex, 1);
          } finally {
            setNavigationBusy(false);
            isMovingRef.current = false;
          }
        },
        onPrevClick: async () => {
          if (isMovingRef.current) return;
          isMovingRef.current = true;
          setNavigationBusy(true);

          const currentIndex = driverObj.getActiveIndex() ?? 0;
          const prevIndex = currentIndex - 1;

          try {
            if (prevIndex < 0) return;

            await driveToAvailableStep(driverObj, prevIndex, -1);
          } finally {
            setNavigationBusy(false);
            isMovingRef.current = false;
          }
        },
        onCloseClick: () => {
          driverObj.destroy();
        },
        onDestroyed: () => {
          removeTourFocusBlurLayer();
          completeTour();
        },
      });

      driverRef.current = driverObj;
      driverObj.drive(firstStepIndex);
      setIsInitialized(true);
    } finally {
      isStartingRef.current = false;
    }
  }, [
    steps,
    driverSteps,
    navigateToStep,
    onFinish,
    driveToAvailableStep,
    completeTour,
    setNavigationBusy,
    isInitialized,
  ]);

  const stopTour = React.useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    setIsInitialized(false);
  }, []);

  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .driverjs-theme {
        --tour-surface: #043737;
        --tour-surface-strong: #052f32;
        --tour-border: rgba(151, 236, 226, 0.24);
        --tour-text: #f8fffd;
        --tour-muted: rgba(228, 255, 251, 0.78);
        --tour-accent: #35d7c3;
        --tour-accent-strong: #16a394;
      }

      .tour-focus-blur-layer {
        --tour-focus-left: 0px;
        --tour-focus-top: 0px;
        --tour-focus-right: 100vw;
        --tour-focus-bottom: 100vh;
        position: fixed;
        inset: 0;
        z-index: 9999;
        pointer-events: none;
        overflow: hidden;
      }

      .tour-focus-blur-layer[hidden] {
        display: none;
      }

      .tour-focus-blur-panel {
        position: absolute;
        background: rgba(6, 19, 22, 0.08);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        transform: translateZ(0);
      }

      .tour-focus-blur-panel-top {
        top: 0;
        right: 0;
        left: 0;
        height: var(--tour-focus-top);
      }

      .tour-focus-blur-panel-right {
        top: var(--tour-focus-top);
        right: 0;
        left: var(--tour-focus-right);
        height: calc(var(--tour-focus-bottom) - var(--tour-focus-top));
      }

      .tour-focus-blur-panel-bottom {
        right: 0;
        bottom: 0;
        left: 0;
        top: var(--tour-focus-bottom);
      }

      .tour-focus-blur-panel-left {
        top: var(--tour-focus-top);
        left: 0;
        width: var(--tour-focus-left);
        height: calc(var(--tour-focus-bottom) - var(--tour-focus-top));
      }

      .driver-active :not(input):not(textarea):not([contenteditable="true"]) {
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      .driver-active input,
      .driver-active textarea,
      .driver-active [contenteditable="true"] {
        user-select: text !important;
        -webkit-user-select: text !important;
      }

      .driver-active .driver-active-element {
        border-radius: 16px !important;
        outline: 2px solid rgba(255, 255, 255, 0.98) !important;
        outline-offset: 4px !important;
        box-shadow:
          0 0 0 7px rgba(47, 174, 142, 0.34),
          0 24px 72px rgba(2, 24, 26, 0.46),
          0 0 48px rgba(53, 215, 195, 0.32) !important;
        transition: box-shadow 0.2s ease, outline-color 0.2s ease;
      }

      .driver-popover.driverjs-theme {
        width: min(360px, calc(100vw - 32px));
        border: 1px solid var(--tour-border);
        border-radius: 14px;
        background: linear-gradient(180deg, var(--tour-surface), var(--tour-surface-strong));
        color: var(--tour-text);
        padding: 16px;
        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.34);
        overflow: hidden;
      }

      .driver-popover.driverjs-theme .driver-popover-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        color: var(--tour-muted);
        font-size: 22px;
        line-height: 26px;
        text-align: center;
        transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
        cursor: pointer;
      }

      .driver-popover.driverjs-theme .driver-popover-close-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--tour-text);
        transform: scale(1.04);
      }

      .driver-popover.driverjs-theme .driver-popover-title {
        margin: 0 34px 8px 0;
        color: var(--tour-text);
        font-size: 16px;
        font-weight: 750;
        line-height: 1.35;
      }

      .driver-popover.driverjs-theme .driver-popover-title::before {
        content: "Guided tour";
        display: block;
        width: max-content;
        margin-bottom: 8px;
        border-radius: 999px;
        background: rgba(53, 215, 195, 0.14);
        color: #9ff4ea;
        padding: 3px 8px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      .driver-popover.driverjs-theme .driver-popover-description {
        margin: 0;
        color: var(--tour-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.6;
      }

      .driver-popover.driverjs-theme .driver-popover-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .driver-popover.driverjs-theme .driver-popover-navigation-btns {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
      }

      .driver-popover.driverjs-theme .driver-popover-progress-text {
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: #cffdf7;
        padding: 7px 10px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      }

      .driver-popover.driverjs-theme .driver-popover-footer button {
        min-width: 76px;
        min-height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--tour-text);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        text-shadow: none;
        transition: transform 0.16s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      }

      .driver-popover.driverjs-theme .driver-popover-footer button:hover {
        border-color: rgba(55, 214, 195, 0.38);
        background: rgba(255, 255, 255, 0.13);
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
      }

      .driver-popover.driverjs-theme .driver-popover-footer button:active {
        transform: translateY(0px);
        box-shadow: none;
      }

      .driver-popover.driverjs-theme .driver-popover-footer button[aria-busy="true"] {
        cursor: wait;
        opacity: 0.78;
      }

      .driver-popover.driverjs-theme .driver-popover-next-btn {
        border-color: rgba(53, 215, 195, 0.56);
        background: linear-gradient(180deg, var(--tour-accent), var(--tour-accent-strong));
        color: #042f2e;
        box-shadow: 0 8px 18px rgba(20, 184, 166, 0.22);
      }

      .driver-popover.driverjs-theme .driver-popover-prev-btn {
        color: var(--tour-muted);
      }

      .driver-popover.driverjs-theme .driver-popover-done-btn {
        border-color: rgba(53, 215, 195, 0.56);
        background: linear-gradient(180deg, var(--tour-accent), var(--tour-accent-strong));
        color: #042f2e;
      }

      .driver-popover.driverjs-theme .driver-popover-btn-disabled,
      .driver-popover.driverjs-theme .driver-popover-btn-disabled:hover {
        opacity: 0.42;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .driver-popover.driverjs-theme .driver-popover-arrow {
        border-width: 8px;
        border-color: var(--tour-surface);
      }

      .driver-popover.driverjs-theme .driver-popover-arrow-side-left {
        border-right-color: transparent;
        border-bottom-color: transparent;
        border-top-color: transparent;
      }

      .driver-popover.driverjs-theme .driver-popover-arrow-side-right {
        border-left-color: transparent;
        border-bottom-color: transparent;
        border-top-color: transparent;
      }

      .driver-popover.driverjs-theme .driver-popover-arrow-side-top {
        border-right-color: transparent;
        border-bottom-color: transparent;
        border-left-color: transparent;
      }

      .driver-popover.driverjs-theme .driver-popover-arrow-side-bottom {
        border-left-color: transparent;
        border-top-color: transparent;
        border-right-color: transparent;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  React.useEffect(() => {
    if (!isInitialized) {
      removeTourFocusBlurLayer();
      return;
    }

    let animationFrame = 0;

    const updateFocusBlur = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        syncTourFocusBlurLayer(driverRef.current?.getActiveElement());
      });
    };

    updateFocusBlur();
    window.addEventListener("resize", updateFocusBlur);
    window.addEventListener("scroll", updateFocusBlur, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updateFocusBlur);
      window.removeEventListener("scroll", updateFocusBlur, true);
      removeTourFocusBlurLayer();
    };
  }, [isInitialized]);

  React.useEffect(() => {
    if (run && !isInitialized && steps.length > 0) {
      startTour();
    } else if (!run && isInitialized) {
      stopTour();
    }
  }, [run, isInitialized, steps.length, startTour, stopTour]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopTour();
    };
  }, [stopTour]);

  return null;
};
