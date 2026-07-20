import React, { lazy } from "react";
import { Navigate } from "react-router";
import AuthRoute from "./AuthRoute";

import PrescriptionWorkspace from "../components/PrescriptionWorkspace";
import OnboardingLayout from "../Layouts/OnboardingLayout";
import MainLayout from "../Layouts/MainLayout";
import PatientLayout from "../Layouts/PatientLayout";

import Appointment from "../pages/appointment/Appointment";
import AppointmentCalendarPage from "../pages/appointment/AppointmentCalendarPage";
import AppointmentDetails from "../pages/appointment/AppointmentDetails";
import EditPrescription from "../pages/appointment/EditPrescription";
import NewAppointmentWrapper from "../pages/appointment/NewAppointmentWrapper";
import PatientAppointment from "../pages/appointment/PatientAppointment";
import PatientNewAppointment from "../pages/appointment/PatientNewAppointment";
import Reschedule from "../pages/appointment/Reschedule";

import EditAllTimeSlots from "../pages/clinic/EditAllTimeSlots";

import Login from "../pages/auth/Login";
import MfaVerify from "../pages/auth/MfaVerify";
import NewPass from "../pages/auth/NewPass";
import ResetPass from "../pages/auth/ResetPass";
import SetPassword from "../pages/auth/SetPassword";
import Signup from "../pages/auth/Signup";
import SignupEmail from "../pages/auth/SignupEmail";
import SignupOtp from "../pages/auth/SignupOtp";
import VerifyEmail from "../pages/auth/VerifyEmail";
import AddBatch from "../pages/pharmacy/AddBatch";

import BatchDetails from "../pages/pharmacy/BatchDetails";
import NewInvoice from "../pages/pharmacy/NewInvoice";
import PharmacyInvoice from "../pages/pharmacy/PharmacyInvoice";
import PharmacyInvoiceDetails from "../pages/pharmacy/PharmacyInvoiceDetails";
import PharmacyMedicine from "../pages/pharmacy/PharmacyMedicine";
import PharmacySales from "../pages/pharmacy/PharmacySales";
import PharmacyStocks from "../pages/pharmacy/PharmacyStocks";
import PharmacyDashboardNew from "../pages/pharmacies/PharmacistDashboard";
import PrescriptionDetails from "../pages/pharmacy/PrescriptionDetails";
import PrescriptionQueue from "../pages/pharmacy/PrescriptionQueue";
import Supplier from "../pages/pharmacy/Supplier";
import SupplierDetails from "../pages/pharmacy/SupplierDetails";
import MedicineDetails from "../pages/pharmacy/MedicineDetails";
import PharmacistPrescriptions from "../pages/pharmacies/PharmacistPrescriptions";
import PharmacistMedicines from "../pages/pharmacies/PharmacistMedicines";
import PharmacistStock from "../pages/pharmacies/PharmacistStock";
import PharmacistAddStock from "../pages/pharmacies/PharmacistAddStock";
import PharmacistEditStock from "../pages/pharmacies/PharmacistEditStock";
import PharmacistSales from "../pages/pharmacies/PharmacistSales";
import PharmacistSuppliers from "../pages/pharmacies/PharmacistSuppliers";

import Dashboard from "../pages/dashboard/Dashboard";
import Welcome from "../pages/dashboard/Welcome";
import LabDash from "../pages/dashboard/LabDash";
import ClinicSetup from "../pages/clinic-setup/ClinicSetup";

import Doctor from "../pages/doctor/Doctor";
import NotFound from "../pages/NotFound";

import PatientNotification from "../pages/notification/PatientNotification";

import AddPatient from "../pages/patient/AddPatient";
import Patient from "../pages/patient/Patient";
import PatientDetails from "../pages/patient/PatientDetails";
import PatientEdit from "../pages/patient/PatientEdit";
import PatientHistory from "../pages/patient/PatientHistory";

import SubscribedPatients from "../pages/SubcribedPatients";

import ClinicAvailability from "../pages/profile/ClinicAvailability";
import ClinicDetails from "../pages/profile/ClinicDetails";
import ClinicEdit from "../pages/profile/ClinicEdit";
import ClinicSettings from "../pages/profile/ClinicSettings";

import EditProfile from "../pages/profile/EditProfile";
import EditServicePage from "../pages/profile/EditServicePage";
import Medicines from "../pages/profile/Medicines";
import Overview from "../pages/profile/Overview";
import Profile from "../pages/profile/Profile";
import NoShowPolicySettings from "../pages/profile/NoShowPolicySettings";
import CancellationPolicySettings from "../pages/profile/CancellationPolicySettings";
import SecurityAccess from "../pages/profile/SecurityAccess";
import Referral from "../pages/profile/Referrals";
import PrescriptionTemplates from "../pages/profile/prescriptionTemplates";
import PrescriptionPreference from "../pages/profile/PrescriptionPreference";
import ServicesPrice from "../pages/profile/ServicesPrice";
import SubscriptionBilling from "../pages/subscription/SubscriptionBilling";
import SubscriptionRenew from "../pages/subscription/SubscriptionRenew";
import SubscriptionInvoices from "../pages/subscription/SubscriptionInvoices";

import NoShowPage from "../pages/noshow/NoShowPage";
import PatientNoShowHistoryPage from "../pages/noshow/PatientNoShowHistoryPage";

import PatientReport from "../pages/report/PatientReport";
import Report from "../pages/report/Report";
import ReportDetails from "../pages/report/ReportDetails";
import Reports from "../pages/reports/Reports";
import PatientReports from "../pages/reports/PatientReports";
import AppointmentReports from "../pages/reports/AppointmentReports";
import MedicineReports from "../pages/reports/MedicineReports";
import RevenueReports from "../pages/reports/RevenueReports";
import StaffReports from "../pages/reports/StaffReports";
import CustomReports from "../pages/reports/CustomReports";

import PatientSetting from "../pages/settings/PatientSetting";

import AddUser from "../pages/user/AddUser";
import LabDetails from "../pages/user/LabDetails";
import PharmacyDetails from "../pages/user/pharmacy/PharmacyDetails";
import UserDetails from "../pages/user/UserDetails";
import Users from "../pages/user/Users";

import Configuration from "../pages/configuration/Configuration";
import LabConfiguration from "../pages/configuration/LabConfiguration";
import PharmacyConfiguration from "../pages/configuration/PharmacyConfiguration";
import NotificationSettings from "../pages/notification-settings/NotificationSettings";

import ClinicDetailPage from "../pages/dashboard/superadmin/ClinicDetailPage";
import ClinicsPage from "../pages/dashboard/superadmin/ClinicsPage";
import RequestPage from "../pages/dashboard/superadmin/RequestPage";
import SubscriptionPlans from "../pages/dashboard/superadmin/SubscriptionPlans";
import PlanLimitsPage from "../pages/dashboard/superadmin/planlimt/PlanLimitsPage";
import ProfileRequest from "../pages/dashboard/superadmin/ProfileRequest";
import ReferralsPage from "../pages/dashboard/superadmin/Referral/ReferralsPage";
import BannersPage from "../pages/dashboard/superadmin/BannersPage";
import CouponsPage from "../pages/dashboard/superadmin/CouponsPage";
import AppUpdatePage from "../pages/dashboard/superadmin/AppUpdatePage";

import { GuidelinesPage } from "../pages/guidelines/GuidelinesPage";
import CookiePolicy from "../pages/legal/CookiePolicy";
import TestCatalog from "../pages/test-catalog/TestCatalog";

import MedicineSetup from "../pages/medicine/MedicineSetup";
import type { AppRoute } from "./routes.types";
import LabQueue from "../pages/lab/LabQueue";
import AddLabTestPage from "../pages/lab/AddLabTestPage";
import AddWalkInTestPage from "../pages/lab/AddWalkInTestPage";
import LabTestsPage from "../pages/lab/LabTestsPage";
import SampleTrackingPage from "../pages/lab/SampleTrackingPage";
import PublicLabBarcodeDetails from "../pages/lab/PublicLabBarcodeDetails";
import SwitchToPhonePage from "../pages/prescription_notepad_scanner/switchToPhone";
import NewPharmacistSale from "../pages/pharmacies/NewPharmacistSale";
import ProcessPrescription from "../pages/pharmacies/ProcessPrescription";
import noLoss from "../pages/profile/noLoss";
import PharmacyPatientSubscription from "../pages/pharmacies/PharmacistPatientSubscription";
import GenerateSaleFromSubscription from "../pages/pharmacies/GenerateSaleFromSubscription";

const PrescriptionNotepadScannerPage = lazy(
  () => import("../pages/prescription_notepad_scanner/scanner"),
);

export const routes: AppRoute[] = [
  {
    authRequired: false,
    children: [
      { key: "welcome", path: "/", element: Welcome, public: true },
      { key: "login", path: "/login", element: Login, public: true },
      {
        key: "mfaVerify",
        path: "/mfa-verify",
        element: MfaVerify,
        public: true,
      },
      {
        key: "signupEmail",
        path: "/signup-email",
        element: SignupEmail,
        public: true,
      },
      {
        key: "signupOtp",
        path: "/signup-otp",
        element: SignupOtp,
        public: true,
      },
      {
        key: "signupToken",
        path: "/signup/:token",
        element: Signup,
        public: true,
      },
      { key: "signup", path: "/signup", element: Signup, public: true },
      {
        key: "forgotPassword",
        path: "/forgot-password",
        element: ResetPass,
        public: true,
      },
      {
        key: "resetPassword",
        path: "/reset-password",
        element: NewPass,
        public: true,
      },
      {
        key: "setPassword",
        path: "/set-password",
        element: SetPassword,
        public: true,
      },
      {
        key: "verifyEmail",
        path: "/verify-email",
        element: VerifyEmail,
        public: true,
      },
      {
        key: "switchToPhone",
        path: "/switch-to-phone",
        element: SwitchToPhonePage,
        public: true,
      },
      {
        key: "publicLabBarcode",
        path: "/lab/barcodes/:barcodeValue",
        element: PublicLabBarcodeDetails,
      },
    ],
  },

  {
    key: "guidelines",
    path: "/guidelines",
    element: GuidelinesPage,
    authRequired: false,
  },

  {
    key: "cookiePolicy",
    path: "/cookie-policy",
    element: CookiePolicy,
    authRequired: false,
  },

  // ✅ Super Admin protected routes
  {
    key: "superadmin-protected",
    path: "",
    element: () =>
      React.createElement(AuthRoute, { allowedRoles: ["Super_Admin"] }),
    authRequired: true,
    children: [
      {
        key: "superadmin-layout",
        path: "",
        element: MainLayout,
        authRequired: true,
        children: [
          {
            key: "subscriptionPlans",
            path: "subscription-plans",
            element: SubscriptionPlans,
          },
          {
            key: "planLimits",
            path: "plan-limits",
            element: PlanLimitsPage,
          },
          {
            key: "request",
            path: "request",
            element: RequestPage,
          },
          {
            key: "profileRequest",
            path: "profile-request",
            element: ProfileRequest,
          },
          {
            key: "superAdminReferrals",
            path: "referrals",
            element: ReferralsPage,
          },
          { key: "clinics", path: "clinics", element: ClinicsPage },
          {
            key: "clinicDetails",
            path: "clinics/:id",
            element: ClinicDetailPage,
          },
          {
            key: "coupons",
            path: "coupons",
            element: CouponsPage,
          },
          {
            key: "superAdminBanners",
            path: "banners",
            element: BannersPage,
          },
        ],
      },
    ],
  },

  // ✅ Onboarding Layout (no sidebar)
  {
    key: "onboarding-layout",
    path: "",
    element: OnboardingLayout,
    authRequired: true,
    children: [
      { key: "clinicSetup", path: "clinic-setup", element: ClinicSetup },
    ],
  },

  {
    key: "admin-layout",
    path: "",
    element: MainLayout,
    authRequired: true,
    children: [
      { key: "user", path: "users", element: Users },
      { key: "addUser", path: "user/new", element: AddUser },
      { key: "userDetails", path: "user/:id", element: UserDetails },
      { key: "configuration", path: "configuration", element: Configuration },
      { key: "configurationLab", path: "configuration/lab", element: LabConfiguration },
      { key: "configurationPharmacy", path: "configuration/pharmacy", element: PharmacyConfiguration },
      { key: "notificationSettingsStandalone", path: "notification-settings", element: NotificationSettings },
      { key: "subscription", path: "subscription", element: SubscriptionBilling },
      { key: "subscriptionRenew", path: "subscription/renew", element: SubscriptionRenew },
      { key: "subscriptionInvoices", path: "subscription/invoices", element: SubscriptionInvoices },
      {
        key: "pharmacyDetails",
        path: "configuration/pharmacy/:id",
        element: PharmacyDetails,
      },
      { key: "labDetails", path: "configuration/labs/:labId", element: LabDetails },
      { key: "testCatalog", path: "test-catalog", element: TestCatalog },
      { key: "doctorAdmin", path: "doctors", element: Doctor },

      { key: "dashboard", path: "dashboard", element: Dashboard },
      {
        key: "prescription-notepad-scanner",
        path: "prescription-notepad-scanner",
        element: PrescriptionNotepadScannerPage,
      },
      { key: "noShow", path: "no-show", element: NoShowPage },
      { key: "patients", path: "patients", element: Patient },
      {
        key: "patientNoShowHistory",
        path: "no-show/history/patient/:id",
        element: PatientNoShowHistoryPage,
      },

      {
        key: "profile",
        path: "profile",
        element: Profile,
        children: [
          { key: "overview", index: true, element: Overview },
          { key: "profileEdit", path: "edit", element: EditProfile },

          { key: "clinic", path: "clinic", element: ClinicDetails },
          { key: "clinicEdit", path: "clinic/edit", element: ClinicEdit },
          { key: "services", path: "services", element: ServicesPrice },
          {
            key: "servicesEdit",
            path: "services/edit/:id",
            element: EditServicePage,
          },
          {
            key: "servicesAdd",
            path: "services/new",
            element: EditServicePage,
          },

          { key: "security", path: "security", element: SecurityAccess },
          {
            key: "appUpdates",
            path: "app-updates",
            element: AppUpdatePage,
          },
          { key: "referral", path: "referral", element: Referral },
          {
            key: "prescriptionTemplates",
            path: "prescription-templates",
            element: PrescriptionTemplates,
          },
          {
            key: "prescriptionPreference",
            path: "prescription-preference",
            element: PrescriptionPreference,
          },
          {
            key: "noShowPolicyProfile",
            path: "no-show-policy",
            element: NoShowPolicySettings,
          },
          {
            key: "cancellationPolicyProfile",
            path: "cancellation-policy",
            element: CancellationPolicySettings,
          },
          {
            key: "noLoss",
            path: "no-loss",
            element: noLoss,
          },
          {
            key: "notificationSettings",
            path: "my-notifications",
            element: ClinicSettings,
          },
          {
            key: "availability",
            path: "availability",
            element: ClinicAvailability,
          },
          {
            key: "editAllTimeSlots",
            path: "availability/edit-all",
            element: EditAllTimeSlots,
          },
          { key: "profileMedicines", path: "medicines", element: Medicines },
          {
            key: "medicineSetup",
            path: "medicines/setup",
            element: MedicineSetup,
          },
          {
            key: "medicineSetupEdit",
            path: "medicines/setup/:id",
            element: MedicineSetup,
          },
        ],
      },

      { key: "appointment", path: "appointment", element: Appointment },
      {
        key: "appointmentCalendar",
        path: "appointment/calendar",
        element: AppointmentCalendarPage,
      },
      {
        key: "appointmentNew",
        path: "appointment/new",
        element: NewAppointmentWrapper,
      },
      {
        key: "appointmentNewPatient",
        path: "appointment/new/patient",
        element: PatientNewAppointment,
      },
      {
        key: "appointmentDetails",
        path: "appointment/:id",
        element: AppointmentDetails,
      },
      {
        key: "reschedule",
        path: "appointment/:id/reschedule",
        element: Reschedule,
      },
      {
        key: "editPrescription",
        path: "appointment/:id/edit-prescription",
        element: EditPrescription,
      },


      { key: "addPatient", path: "patient/new", element: AddPatient },
      { key: "patientDetails", path: "patient/:id", element: PatientDetails },
      { key: "patientEdit", path: "patient/:id/edit", element: PatientEdit },
      {
        key: "patientHistory",
        path: "patient/:id/history",
        element: PatientHistory,
      },
      {
        key: "subscribedPatients",
        path: "payment-history",
        element: SubscribedPatients,
      },

      { key: "report", path: "report", element: Report },
      { key: "reportDetails", path: "report/:id", element: ReportDetails },
      { key: "reports", path: "reports", element: Reports },
      { key: "patientReports", path: "reports/patients", element: PatientReports },
      { key: "appointmentReports", path: "reports/appointments", element: AppointmentReports },
      { key: "medicineReports", path: "reports/medicines", element: MedicineReports },
      { key: "revenueReports", path: "reports/revenue", element: RevenueReports },
      { key: "staffReports", path: "reports/staff", element: StaffReports },
      { key: "customReports", path: "reports/custom", element: CustomReports },

      { key: "demo", path: "demo", element: PrescriptionWorkspace },
    ],
  },

  {
    key: "patient-layout",
    path: "",
    element: PatientLayout,
    authRequired: true,
    children: [
      {
        key: "patientAppointment",
        path: "patient-appointment",
        element: PatientAppointment,
      },
      { key: "patientReport", path: "patient-report", element: PatientReport },
      {
        key: "patientSetting",
        path: "patient-setting",
        element: PatientSetting,
      },
      {
        key: "patientNotification",
        path: "patient-notification",
        element: PatientNotification,
      },
    ],
  },

  {
    path: "/pharmacy",
    element: MainLayout,
    authRequired: true,
    children: [
      { key: "pharmaDashboard", path: "dashboard", element: PharmacyDashboardNew },
      {
        key: "pharmacistPrescriptions",
        path: "prescriptions",
        element: PharmacistPrescriptions,
      },
      {
        key: "pharmacistMedicines",
        path: "medicines",
        element: PharmacistMedicines,
      },
      {
        key: "pharmacistStock",
        path: "stock",
        element: PharmacistStock,
      },
      {
        key: "pharmacistAddStock",
        path: "stock/add",
        element: PharmacistAddStock,
      },
      {
        key: "pharmacistEditStock",
        path: "stock/edit/:id",
        element: PharmacistEditStock,
      },
      {
        key: "pharmacistSales",
        path: "sales",
        element: PharmacistSales,
      },
      {
        key: "pharmacistNewSale",
        path: "sales/new",
        element: NewPharmacistSale,
      },
      {
        key: "pharmacistProcessPrescription",
        path: "prescriptions/process/:prescriptionId",
        element: ProcessPrescription,
      },
      {
        key: "pharmacistSuppliers",
        path: "suppliers",
        element: PharmacistSuppliers,
      },
      {
        key: "pharmacyPatientSubscription",
        path: "patient-subscription",
        element: PharmacyPatientSubscription,
      },
      {
        key: "GenerateSaleFromSubscription",
        path: "patient-subscription/generate-sale/:subscriptionId",
        element: GenerateSaleFromSubscription,
      },
      { key: "pharmacyStocks", path: "stocks", element: PharmacyStocks },
      { key: "pharmacyMedicine", path: "medicine", element: PharmacyMedicine },
      {
        key: "pharmacyMedicineDetails",
        path: "medicine/:productId",
        element: MedicineDetails,
      },
      { key: "pharmacyInvoice", path: "invoice", element: PharmacyInvoice },
      {
        key: "pharmacyInvoiceDetails",
        path: "invoice/:invoiceId",
        element: PharmacyInvoiceDetails,
      },
      { key: "pharmacyNewInvoice", path: "invoice/new", element: NewInvoice },
      { key: "pharmacySales", path: "sales", element: PharmacySales },
      {
        key: "pharmacyPrescriptionQueue",
        path: "prescription-queue",
        element: PrescriptionQueue,
      },
      {
        key: "prescriptionDetails",
        path: "prescription-queue/:id",
        element: PrescriptionDetails,
      },
      { key: "pharmacySupplier", path: "supplier", element: Supplier },
      {
        key: "pharmacySupplierDetails",
        path: "supplier/:supplierId",
        element: SupplierDetails,
      },
      {
        key: "pharmacyAddBatch",
        path: "supplier/:supplierId/add-batch",
        element: AddBatch,
      },
      {
        key: "pharmacyBatchDetails",
        path: "supplier/:supplierId/batch/:batchId",
        element: BatchDetails,
      },
    ],
  },

  {
    key: "lab-protected",
    path: "/lab",
    element: () =>
      React.createElement(AuthRoute, { allowedRoles: ["Lab_Assistant"] }),
    authRequired: true,
    children: [
      {
        key: "lab-layout",
        path: "",
        element: MainLayout,
        authRequired: true,
        children: [
          {
            key: "labIndex",
            index: true,
            element: () =>
              React.createElement(Navigate, {
                to: "/lab/dashboard",
                replace: true,
              }),
          },
          { key: "labDashboard", path: "dashboard", element: LabDash },
          {
            key: "labAllTests",
            path: "all-tests",
            element: () => React.createElement(LabTestsPage, { mode: "all" }),
          },
          {
            key: "labAssignedTests",
            path: "assigned",
            element: () =>
              React.createElement(LabTestsPage, { mode: "assigned" }),
          },
          {
            key: "labWalkInTest",
            path: "walk-in-test",
            element: AddWalkInTestPage,
          },
          {
            key: "labSampleTracking",
            path: "tests/:id/sample-tracking",
            element: SampleTrackingPage,
          },
          {
            key: "labQueue",
            path: "queue",
            element: LabQueue,
          },
          {
            key: "labAddTest",
            path: "queue/add-test",
            element: AddLabTestPage,
          },
        ],
      },
    ],
  },

  { key: "notFound", path: "*", element: NotFound },
];
