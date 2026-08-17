import { useMemo } from "react";
import type {
  ClinicWithDoctors,
  RequestDoctor,
} from "../../../../redux/api/requestApi";
import type {
  ActiveBoardStatus,
  RequestCard,
  RequestDoctorWithClinic,
} from "./types";
import { BOARD_STATUSES } from "./constants";
import {
  getDoctorId,
  getClinicId,
  getBoardStatus,
} from "./utils";

/**
 * Transform API response to RequestCard array with filtering
 */
export const useRequestCards = (
  data: RequestDoctor[] | undefined,
): RequestCard[] => {
  return useMemo<RequestCard[]>(() => {
    const doctors = (data ?? []) as unknown as RequestDoctorWithClinic[];

    return doctors
      .filter((doctor) => Boolean(doctor?.clinic))
      .map((doctor, index) => {
        const doctorId = getDoctorId(doctor);
        const clinic = doctor.clinic as ClinicWithDoctors;
        const clinicId = getClinicId(clinic);

        return {
          id: doctorId || `${clinicId}-${index}`,
          doctorId,
          clinic,
          doctor,
          status: getBoardStatus(doctor.userStatus, doctor.isArchive),
          createdAt: doctor.createdAt ?? null,
        };
      });
  }, [data]);
};

/**
 * Filter request cards by search query
 */
export const useSearchedRequestCards = (
  requestCards: RequestCard[],
  searchQuery: string,
): RequestCard[] => {
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requestCards;

    return requestCards.filter((card) =>
      String(card.doctor.name ?? "").toLowerCase().includes(query),
    );
  }, [searchQuery, requestCards]);
};

/**
 * Split request cards into active and archived
 */
export const useActiveAndArchivedCards = (
  searchedCards: RequestCard[],
): {
  activeRequestCards: RequestCard[];
  archivedRequestCards: RequestCard[];
} => {
  const activeRequestCards = useMemo(
    () => searchedCards.filter((card) => card.status !== "Archive"),
    [searchedCards],
  );

  const archivedRequestCards = useMemo(
    () => searchedCards.filter((card) => card.status === "Archive"),
    [searchedCards],
  );

  return { activeRequestCards, archivedRequestCards };
};

/**
 * Group request cards by status
 */
export const useGroupedRequests = (
  activeRequestCards: RequestCard[],
): Record<ActiveBoardStatus, RequestCard[]> => {
  return useMemo(
    () =>
      BOARD_STATUSES.reduce(
        (acc, status) => {
          acc[status] = activeRequestCards.filter(
            (card) => card.status === status,
          );
          return acc;
        },
        {} as Record<ActiveBoardStatus, RequestCard[]>,
      ),
    [activeRequestCards],
  );
};
