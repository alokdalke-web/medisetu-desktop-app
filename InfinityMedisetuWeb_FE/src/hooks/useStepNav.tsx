// useStepNav.ts
import { useLocation, useNavigate } from "react-router"; 

export const STEP_PATHS = [
  "/step1",
  "/doctor",
  "/services",
  "/availability",
] as const;

export function useStepNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const idx = STEP_PATHS.findIndex((p) => pathname.startsWith(p));
  const current = idx >= 0 ? idx : 0;

  const clamp = (n: number) => Math.max(0, Math.min(n, STEP_PATHS.length - 1));
  const goTo = (i: number) => nav(STEP_PATHS[clamp(i)]);
  const goNext = () => current < STEP_PATHS.length - 1 && nav(STEP_PATHS[current + 1]);
  const goPrev = () => current > 0 && nav(STEP_PATHS[current - 1]);

  return { current, goTo, goNext, goPrev, steps: STEP_PATHS };
}
