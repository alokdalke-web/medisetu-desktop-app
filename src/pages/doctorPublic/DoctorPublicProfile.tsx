import { useMemo } from "react";
import { addToast } from "@heroui/react";
import { useNavigate, useParams } from "react-router";
import { useSelector } from "react-redux";

import type { RootState } from "../../redux/store";
import { useGetPublicDoctorProfileQuery } from "../../redux/api/publicDoctorApi";
import AboutSection from "./components/AboutSection";
import BookingSidebar from "./components/BookingSidebar";
import ClinicCard from "./components/ClinicCard";
import CredentialsSection from "./components/CredentialsSection";
import DoctorHero from "./components/DoctorHero";
import FaqSection from "./components/FaqSection";
import PublicPageFooter from "./components/PublicPageFooter";
import PublicPageHeader from "./components/PublicPageHeader";
import ReviewItem from "./components/ReviewItem";
import SectionCard from "./components/SectionCard";
import {
  buildFaqs,
  getDoctorDisplayName,
  getSpecializations,
} from "./helpers/doctorPublicContent";
import { usePublicProfileSeo } from "./hooks/usePublicProfileSeo";

const DoctorPublicProfile: React.FC = () => {
  const { doctorId = "" } = useParams();
  const navigate = useNavigate();
  const token = useSelector((state: RootState) => state.auth.token);

  const { data, isLoading, isError } = useGetPublicDoctorProfileQuery(doctorId, {
    skip: !doctorId,
  });

  usePublicProfileSeo(data);

  const specializations = useMemo(
    () => (data ? getSpecializations(data.doctor) : []),
    [data],
  );
  const faqs = useMemo(() => (data ? buildFaqs(data) : []), [data]);

  const handleBook = () => {
    if (!token) {
      navigate("/login", { state: { from: `/doctor/${doctorId}` } });
      return;
    }
    navigate("/appointment/new", { state: { doctorId } });
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = data ? getDoctorDisplayName(data.doctor.name) : "Doctor profile";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Share sheet dismissed — fall through to copying instead.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      addToast({ title: "Profile link copied", color: "success" });
    } catch {
      addToast({ title: "Could not copy the link", color: "danger" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-muted">
        <PublicPageHeader onShare={handleShare} isAuthenticated={!!token} />
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
          <div className="h-44 animate-pulse rounded-2xl bg-surface" />
          <div className="h-48 animate-pulse rounded-2xl bg-surface" />
          <div className="h-64 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-muted">
        <PublicPageHeader onShare={handleShare} isAuthenticated={!!token} />
        <div className="mx-auto flex flex-1 max-w-md flex-col items-center justify-center p-6 text-center">
          <h1 className="text-xl font-semibold text-text">Profile not available</h1>
          <p className="mt-2 text-sm text-text-muted">
            This doctor profile does not exist or is no longer published.
          </p>
        </div>
        <PublicPageFooter />
      </div>
    );
  }

  const { doctor, rating, totalPatients, clinics, reviews } = data;
  const canBook = clinics.some((c) => c.onlineBookingEnabled);
  const displayName = getDoctorDisplayName(doctor.name);
  const hasCredentials = doctor.qualifications.length > 0 || !!doctor.registrationNumber;

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted">
      <PublicPageHeader
        onShare={handleShare}
        onBook={handleBook}
        canBook={canBook}
        doctor={doctor}
        isAuthenticated={!!token}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:pb-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 sm:space-y-6">
            <DoctorHero
              doctor={doctor}
              rating={rating}
              totalPatients={totalPatients}
              primaryCity={clinics[0]?.city ?? null}
              clinicCount={clinics.length}
            />

            {specializations.length > 0 && (
              <SectionCard title="Specialisations">
                <div className="flex flex-wrap gap-2">
                  {specializations.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-secondarybtn px-3 py-1.5 text-sm text-primary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {doctor.about && (
              <AboutSection title={`About ${displayName}`} about={doctor.about} />
            )}

            {hasCredentials && <CredentialsSection doctor={doctor} />}

            {clinics.length > 0 && (
              <div className="space-y-4">
                <h2 className="px-1 text-lg font-semibold text-text">
                  {clinics.length > 1 ? `Clinics (${clinics.length})` : "Clinic"}
                </h2>
                {clinics.map((clinic) => (
                  <ClinicCard key={clinic.id} clinic={clinic} onBook={handleBook} />
                ))}
              </div>
            )}

            {reviews.items.length > 0 && (
              <SectionCard title={`Patient reviews (${reviews.total})`}>
                <ul className="space-y-4">
                  {reviews.items.map((review) => (
                    <ReviewItem key={review.id} review={review} />
                  ))}
                </ul>
              </SectionCard>
            )}

            {faqs.length > 0 && <FaqSection faqs={faqs} />}
          </div>

          <div className="hidden lg:block">
            <BookingSidebar clinics={clinics} canBook={canBook} onBook={handleBook} />
          </div>
        </div>
      </main>

      <PublicPageFooter />

      {canBook && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface p-3 lg:hidden">
          <button
            type="button"
            onClick={handleBook}
            className="min-h-12 w-full rounded-lg bg-primary font-medium text-white"
          >
            Book appointment
          </button>
        </div>
      )}
    </div>
  );
};

export default DoctorPublicProfile;
