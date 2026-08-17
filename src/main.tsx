import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserHistory, createHashHistory } from "history";
import { HeroUIProvider } from "@heroui/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import AppToastProvider from "./components/shared/AppToastProvider.tsx";
import AppHistoryRouter from "./routes/AppHistoryRouter.tsx";
import { BannerProvider } from "./hooks/BannerProvider.tsx";
import store from "./redux/store.ts";
import "./index.css";

// Check if we are running in Electron
const isElectron = typeof window !== 'undefined' && Boolean((window as any).ipcAPI);

// ✅ history package instance (used for blocking)
// [Electron] Hash routing is required in the packaged app since it's served
// from the file:// protocol, where browser history routing breaks.
const history = isElectron ? createHashHistory() as any : createBrowserHistory() as any;

// ✅ Add missing methods React Router expects
history.createURL = (to: any) =>
  new URL(history.createHref(to), window.location.origin);

history.encodeLocation = (to: any) => {
  const url = history.createURL(to);
  return { pathname: url.pathname, search: url.search, hash: url.hash };
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppHistoryRouter history={history} basename={isElectron ? "" : "/app"}>
      <Provider store={store}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <HeroUIProvider>
            <BannerProvider>
              <AppToastProvider />
              <App />
            </BannerProvider>
          </HeroUIProvider>
        </GoogleOAuthProvider>
      </Provider>
    </AppHistoryRouter>
  </StrictMode>
);
