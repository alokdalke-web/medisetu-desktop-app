import type { ComponentType, LazyExoticComponent } from "react";

export type AppRouteElement =
  | ComponentType<any>
  | LazyExoticComponent<ComponentType<any>>;

export interface AppRoute {
  key?: string;
  path?: string;
  index?: boolean;

  element?: AppRouteElement;
  authRequired?: boolean;
  public?: boolean;
  children?: AppRoute[];
}
