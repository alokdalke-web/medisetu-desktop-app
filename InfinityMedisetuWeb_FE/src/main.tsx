import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserHistory } from "history";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

import App from "./App.tsx";
import AppHistoryRouter from "./routes/AppHistoryRouter.tsx";
import store from "./redux/store.ts";
import "./index.css";

// ✅ history package instance (used for blocking)
const history = createBrowserHistory() as any;

// ✅ Add missing methods React Router expects
history.createURL = (to: any) =>
  new URL(history.createHref(to), window.location.origin);

history.encodeLocation = (to: any) => {
  const url = history.createURL(to);
  return { pathname: url.pathname, search: url.search, hash: url.hash };
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppHistoryRouter history={history} basename="/app">
      <Provider store={store}>
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <HeroUIProvider>
            <ToastProvider placement="top-center" toastOffset={16} />
            <App />
          </HeroUIProvider>
        </GoogleOAuthProvider>
      </Provider>
    </AppHistoryRouter>
  </StrictMode>
);
