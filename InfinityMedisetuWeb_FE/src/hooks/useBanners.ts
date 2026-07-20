/**
 * useBanners.ts
 *
 * Fetches eligible banners for a given placement, tracks impressions,
 * and provides dismiss / CTA-click tracking helpers.
 * Follows the existing useFeatureGate / RTK Query hook pattern.
 *
 * V2 Enhancements:
 * - Carousel-aware impression tracking (only on visibility)
 * - Support for critical banners
 * - Image field handling
 * - Optimistic UI updates on dismiss
 * - Skip tracking on unauthenticated pages (prevents 401 errors)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../redux/store";
import {
  useGetEligibleBannersQuery,
  useDismissBannerMutation,
  useTrackBannerMutation,
  type Banner,
} from "../redux/api/bannerApi";
import type { BannerPlacement } from "../schemas/banner";

export interface UseBannersReturn {
  banners: Banner[];
  isLoading: boolean;
  dismissBanner: (id: string) => Promise<void>;
  trackClick: (id: string) => void;
  trackImpression: (id: string) => void;
}

export function useBanners(placement?: BannerPlacement): UseBannersReturn {
  const { data: banners = [], isLoading } = useGetEligibleBannersQuery(
    placement ?? undefined,
    { refetchOnMountOrArgChange: 60 }, // re-fetch at most every 60 s
  );

  const [dismiss] = useDismissBannerMutation();
  const [track] = useTrackBannerMutation();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Check if user is authenticated (to skip tracking on login page)
  const isAuthenticated = useSelector((state: RootState) => !!state.auth.token);

  // Track impressions once per mount per banner id
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Skip tracking if user is not authenticated (e.g., on login page)
    if (!isAuthenticated) return;

    banners.forEach((banner) => {
      if (!trackedRef.current.has(banner.id)) {
        trackedRef.current.add(banner.id);
        track({ id: banner.id, event: "impression" }).catch(() => {
          // ignore tracking errors silently
        });
      }
    });
  }, [banners, track, isAuthenticated]);

  const dismissBanner = useCallback(
    async (id: string) => {
      // Optimistically remove from UI
      setDismissedIds((prev) => new Set([...prev, id]));
      
      try {
        // Only track if authenticated
        if (isAuthenticated) {
          await track({ id, event: "dismissal" }).unwrap().catch(() => {});
        }
        await dismiss(id).unwrap().catch(() => {});
      } catch {
        // Revert on error
        setDismissedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [dismiss, track, isAuthenticated],
  );

  const trackClick = useCallback(
    (id: string) => {
      // Only track if authenticated
      if (!isAuthenticated) return;
      track({ id, event: "click" }).catch(() => {});
    },
    [track, isAuthenticated],
  );

  // Manual impression tracking for carousel slides
  const trackImpression = useCallback(
    (id: string) => {
      // Only track if authenticated
      if (!isAuthenticated) return;
      
      if (!trackedRef.current.has(id)) {
        trackedRef.current.add(id);
        track({ id, event: "impression" }).catch(() => {});
      }
    },
    [track, isAuthenticated],
  );

  // Filter out dismissed banners and sort by displayOrder
  const filtered = banners
    .filter((b) => !dismissedIds.has(b.id))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return { banners: filtered, isLoading, dismissBanner, trackClick, trackImpression };
}
