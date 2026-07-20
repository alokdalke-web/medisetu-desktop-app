import {
  configureStore,
  combineReducers,
  type Middleware,
} from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import clinicSetupReducer from "./slices/clinicSetupSlice";
import authReducer from "./slices/authSlice";
import notificationReducer from "./slices/notificationSlice";
import roleReducer from "./slices/roleSlice";
import callReducer from "./slices/callSlice";
import queueReducer from "./slices/queueSlice";

import { allApiSlices } from "./api/apiRoot";
import { labDashboardApi } from "./api/labDashboardApi";
import { pharmaDashApi } from "./api/pharmaDashApi";
import { securityApi } from "./api/securityApi";
import { mfaLoginApi, mfaManagementApi } from "./api/mfaApi";
import { prescriptionTemplateApi } from "./api/prescriptionTemplateApi";
import { prescriptionScannerApi } from "./api/prescriptionScannerApi";
import { doctorPrescriptionTemplateApi } from "./api/doctorPrescriptionTemplateApi";
import { myGalleryApi } from "./api/myGalleryApi";
import { quickPrintTemplateApi } from "./api/quickPrintTemplateApi";

import { logoutMiddleware } from "./middlewares/logoutMiddleware";

/* -----------------------------------------------------
   ✅ Build UNIQUE api slices (avoid duplicate middleware)
----------------------------------------------------- */
const apiSlices = (() => {
  const map = new Map<string, any>(); // key = reducerPath

  for (const api of [
    ...allApiSlices,
    labDashboardApi,
    pharmaDashApi,
    securityApi,
    mfaLoginApi,
    mfaManagementApi,
    prescriptionTemplateApi,
    prescriptionScannerApi,
    doctorPrescriptionTemplateApi,
    myGalleryApi,
    quickPrintTemplateApi,
  ]) {
    if (!map.has(api.reducerPath)) {
      map.set(api.reducerPath, api);
    }
  }

  return Array.from(map.values());
})();

/* -----------------------------------------------------
   ✅ BUILD API REDUCERS dynamically from apiSlices
----------------------------------------------------- */
const apiReducers = apiSlices.reduce<Record<string, any>>((acc, api) => {
  acc[api.reducerPath] = api.reducer;
  return acc;
}, {});

/* -----------------------------------------------------
   ✅ Combine all reducers (normal reducers + API reducers)
----------------------------------------------------- */
const rootReducer = combineReducers({
  clinicSetup: clinicSetupReducer,
  auth: authReducer,
  notifications: notificationReducer,
  role: roleReducer,
  call: callReducer,
  queue: queueReducer,

  // ✅ RTK Query reducers auto-added
  ...apiReducers,
});

/* -----------------------------------------------------
   ✅ Build UNIQUE middlewares dynamically
----------------------------------------------------- */
const apiMiddlewares: Middleware[] = Array.from(
  new Set(apiSlices.map((api) => api.middleware)),
);

/* -----------------------------------------------------
   ✅ Configure Store
----------------------------------------------------- */
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(...apiMiddlewares, logoutMiddleware),
  devTools: true,
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
