/**
 * BannerProvider
 *
 * Fetches eligible banners for ALL placements in a single request
 * (GET /banners/eligible/all) and distributes them via context so that
 * every <BannerDisplay placement="X" /> instance on a page — no matter
 * how many are mounted (dashboard top, sidebar, insights widget, mobile
 * drawer, etc.) — reads from one shared cache entry instead of firing
 * its own network request per placement.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import {
  useGetAllEligibleBannersQuery,
  useDismissBannerMutation,
  useTrackBannerMutation,
  useTrackBannerBatchMutation,
  type Banner,
  type EligibleBannersByPlacement,
} from "../redux/api/bannerApi";

const TRACK_FLUSH_INTERVAL_MS = 10_000;
import type { BannerPlacement } from "../schemas/banner";

interface BannerContextValue {
  bannersByPlacement: EligibleBannersByPlacement;
  isLoading: boolean;
  dismissedIds: Set<string>;
  dismissBanner: (id: string) => Promise<void>;
  trackClick: (id: string) => void;
  trackImpression: (id: string) => void;
}

const EMPTY_BANNERS: EligibleBannersByPlacement = {
  DASHBOARD_TOP: [],
  DASHBOARD_SIDEBAR: [],
  INSIGHTS_WIDGET: [],
  APPOINTMENT_HEADER: [],
  LOGIN_PAGE: [],
  BILLING_PAGE: [],
};

const BannerContext = createContext<BannerContextValue | null>(null);

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.token);
  const isSuperAdmin = useSelector(
    (state: RootState) => (state.auth.user as { userType?: string | null } | null)?.userType === "Super_Admin",
  );

  // All placements are authenticated and served by the batched endpoint —
  // there is no public (unauthenticated) placement anymore.
  const { data: bannersByPlacement = EMPTY_BANNERS, isLoading } = useGetAllEligibleBannersQuery(undefined, {
    skip: !isAuthenticated || isSuperAdmin,
  });

  const [dismiss] = useDismissBannerMutation();
  const [track] = useTrackBannerMutation();
  const [trackBatch] = useTrackBannerBatchMutation();
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const trackedRef = useRef<Set<string>>(new Set());
  // Forces re-render when dismissedIdsRef changes, without re-fetching anything.
  const [, forceRerender] = React.useReducer((c) => c + 1, 0);

  // Impressions/clicks are queued and flushed as a single batched request
  // instead of one POST per event — this is what previously multiplied
  // network calls whenever several banners were visible at once.
  const eventQueueRef = useRef<Array<{ bannerId: string; eventType: "impression" | "click" }>>([]);

  const flushQueue = useCallback(() => {
    if (eventQueueRef.current.length === 0) return;
    const events = eventQueueRef.current;
    eventQueueRef.current = [];
    trackBatch({ events }).catch(() => {});
  }, [trackBatch]);

  useEffect(() => {
    const timer = setInterval(flushQueue, TRACK_FLUSH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushQueue();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", flushQueue);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", flushQueue);
      flushQueue();
    };
  }, [flushQueue]);

  const trackImpression = useCallback(
    (id: string) => {
      if (!isAuthenticated) return;
      if (!trackedRef.current.has(id)) {
        trackedRef.current.add(id);
        eventQueueRef.current.push({ bannerId: id, eventType: "impression" });
      }
    },
    [isAuthenticated],
  );

  const trackClick = useCallback(
    (id: string) => {
      if (!isAuthenticated) return;
      eventQueueRef.current.push({ bannerId: id, eventType: "click" });
    },
    [isAuthenticated],
  );

  const dismissBanner = useCallback(
    async (id: string) => {
      dismissedIdsRef.current.add(id);
      forceRerender();

      try {
        if (isAuthenticated) {
          // Dismissal is low-frequency and precedes an immediate cache
          // update, so it's sent right away rather than queued.
          await track({ id, event: "dismissal" }).unwrap().catch(() => {});
        }
        await dismiss(id).unwrap().catch(() => {});
      } catch {
        dismissedIdsRef.current.delete(id);
        forceRerender();
      }
    },
    [dismiss, track, isAuthenticated],
  );

  const value = useMemo<BannerContextValue>(
    () => ({
      bannersByPlacement,
      isLoading,
      dismissedIds: dismissedIdsRef.current,
      dismissBanner,
      trackClick,
      trackImpression,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bannersByPlacement, isLoading, dismissBanner, trackClick, trackImpression, dismissedIdsRef.current.size],
  );

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
};

export function useBannerContext(): BannerContextValue {
  const ctx = useContext(BannerContext);
  if (!ctx) {
    throw new Error("useBannerContext must be used within a BannerProvider");
  }
  return ctx;
}

export function usePlacementBanners(placement: BannerPlacement): {
  banners: Banner[];
  isLoading: boolean;
  dismissBanner: (id: string) => Promise<void>;
  trackClick: (id: string) => void;
  trackImpression: (id: string) => void;
} {
  const { bannersByPlacement, isLoading, dismissedIds, dismissBanner, trackClick, trackImpression } =
    useBannerContext();

  const raw = bannersByPlacement[placement] ?? [];

  const banners = useMemo(
    () =>
      raw
        .filter((b) => !dismissedIds.has(b.id))
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw, dismissedIds.size],
  );

  // Mirrors the previous per-placement useBanners behavior: fire an impression
  // once per banner id the first time it's seen for this placement.
  useEffect(() => {
    banners.forEach((b) => trackImpression(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners]);

  return { banners, isLoading, dismissBanner, trackClick, trackImpression };
}
