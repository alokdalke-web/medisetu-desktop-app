import { accessApi } from "./accessApi";
import { appointmentApi } from "./appointmentApi";
import { authApi } from "./authApi";
import { clinicApi } from "./clinicApi";
import { doctorApi } from "./doctorApi";
import { feedbackApi } from "./feedbackApi";
import { globalApi } from "./globalApi";
import { medicineApi } from "./medicineApi";
import { patientApi } from "./patientApi";
import { prescriptionApi } from "./prescriptionApi";
import { reportApi } from "./reportApi";
import { settingApi } from "./settingApi";
import { subscriptionApi } from "./subscriptionApi";
import { usersApi } from "./usersApi";
import { cityApi } from "./cityApi";
import { dashboardApi } from "./dashboardApi";
import { testApi } from "./testApi";
import { pharmacyApi } from "./pharmacyApi";
import { stocksApi } from "./stocksApi";
import { labApi } from "./labApi";
import { labAssistantApi } from "./labAssistantApi";
import { labDashboardApi } from "./labDashboardApi";
import { supplierApi } from "./supplierApi";
import { pharmaciesApi } from "./pharmaciesApi";
import { productApi } from "./productApi";
import { prescriptionQueueApi } from "./prescriptionQueueApi";
import { autoAlignGeminiApi } from "./autoAlignGeminiApi";
import { manualPrescriptionApi } from "./manualPrescriptionApi";
import { requestApi } from "./requestApi";
import { limitationsApi } from "./limitationsApi";
import { planLimitsApi } from "./planLimitsApi";
import { referralApi } from "./referralApi";
import { bannerApi } from "./bannerApi";
import { reportsOverviewApi } from "./reportsOverviewApi";
import { couponApi } from "./couponApi";
import { appUpdateApi } from "./appUpdateApi";
import { cancellationPolicyApi } from "./cancellationPolicyApi";

export const allApiSlices = [
  authApi,
  reportApi,
  appointmentApi,
  clinicApi,
  patientApi,
  subscriptionApi,
  settingApi,
  accessApi,
  dashboardApi,
  doctorApi,
  feedbackApi,
  usersApi,
  medicineApi,
  prescriptionApi,
  globalApi,
  cityApi,
  testApi,
  pharmacyApi,
  stocksApi,
  labApi,
  labAssistantApi,
  labDashboardApi,
  supplierApi,
  pharmaciesApi,
  productApi,
  prescriptionQueueApi,
  autoAlignGeminiApi,
  manualPrescriptionApi,
  requestApi,
  limitationsApi,
  planLimitsApi,
  referralApi,
  bannerApi,
  reportsOverviewApi,
  couponApi,
  appUpdateApi,
  cancellationPolicyApi,
];

