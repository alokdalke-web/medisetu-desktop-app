import React from "react";
import { useLazyGetMedicineDataQuery } from "../../../../redux/api/medicineApi";
import { dedupeGlobalMedicines } from "../helpers/medicineDedupe";
import type { GlobalMedicineItem } from "../../../../types/prescription";

const PAGE_SIZE = 5;
const MIN_CHARS = 2;

/**
 * Paged search against the shared drug database.
 *
 * Runs for every valid query — not only when the clinic list is empty — so the
 * "other available medicines" section is always populated. Owns its own state
 * rather than RTK Query cache because results accumulate across pages.
 */
export const useGlobalMedicineSearch = (
  debouncedQuery: string,
  enabled: boolean,
  clinicMedicines: unknown[],
) => {
  const [trigger, { isFetching }] = useLazyGetMedicineDataQuery();
  const [items, setItems] = React.useState<GlobalMedicineItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);

  const searchTerm = debouncedQuery.trim();

  React.useEffect(() => {
    if (!enabled || searchTerm.length < MIN_CHARS) {
      setItems([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    let isCurrent = true;

    const run = async () => {
      setItems([]);
      setLoading(true);
      setError(false);
      setPage(1);
      setHasMore(true);

      try {
        const res = await trigger({
          medicine_name: searchTerm,
          page: 1,
          limit: PAGE_SIZE,
        }).unwrap();

        if (!isCurrent) return;

        if (res?.success) {
          const next = res?.data ?? [];
          setItems(next);
          setHasMore(
            res?.pagination
              ? res.pagination.currentPage < res.pagination.totalPages
              : next.length === PAGE_SIZE,
          );
        } else {
          setItems([]);
          setHasMore(false);
        }
      } catch {
        if (!isCurrent) return;
        setError(true);
        setItems([]);
        setHasMore(false);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void run();

    return () => {
      isCurrent = false;
    };
  }, [searchTerm, enabled, trigger]);

  const loadMore = React.useCallback(async () => {
    if (!hasMore || loading || isFetching) return;

    const nextPage = page + 1;
    setLoading(true);

    try {
      const res = await trigger({
        medicine_name: searchTerm,
        page: nextPage,
        limit: PAGE_SIZE,
      }).unwrap();

      if (res?.success) {
        const next = res?.data ?? [];
        setItems((prev) => [...prev, ...next]);
        setPage(nextPage);
        setHasMore(
          res?.pagination
            ? res.pagination.currentPage < res.pagination.totalPages
            : next.length === PAGE_SIZE,
        );
      }
    } catch {
      // A failed "load more" leaves the already-loaded pages on screen; the
      // section-level error banner is reserved for a failed first page.
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, isFetching, page, searchTerm, trigger]);

  const visibleItems = React.useMemo(
    () => dedupeGlobalMedicines(items, clinicMedicines),
    [items, clinicMedicines],
  );

  return { visibleItems, loading, error, loadMore, hasMore };
};
