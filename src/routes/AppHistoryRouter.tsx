import { useLayoutEffect, useState, type ReactNode } from "react";
import { Router } from "react-router";

type AppHistoryRouterProps = {
  basename: string;
  children: ReactNode;
  history: any;
};

const AppHistoryRouter = ({
  basename,
  children,
  history,
}: AppHistoryRouterProps) => {
  const [state, setState] = useState({
    action: history.action,
    location: history.location,
  });

  useLayoutEffect(() => history.listen(setState), [history]);

  return (
    <Router
      basename={basename}
      location={state.location}
      navigationType={state.action}
      navigator={history}
    >
      {children}
    </Router>
  );
};

export default AppHistoryRouter;
