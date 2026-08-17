import React, { useState } from "react";
import { useNavigate } from "react-router";
import { FiPlus } from "react-icons/fi";

import { useGetPharmaciesQuery } from "../../../redux/api/pharmacyApi";
import PharmacyCard from "./PharmacyCard";
import CreatePharmacyModal from "./CreatePharmacyModal";

const PharmacyTabContent: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useGetPharmaciesQuery({
    page: 1,
    pageSize: 20,
  });

  const pharmacies = data?.pharmacies ?? [];

  const hasAnyPharmacy = pharmacies.length > 0;

  const handleViewDetails = (id: string) => {
    navigate(`/configuration/pharmacy/${id}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[228px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-lg bg-slate-100" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 w-2/3 rounded bg-slate-100" />
                  <div className="h-3 w-4/5 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100" />
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="h-12 rounded-lg bg-slate-100" />
                <div className="h-12 rounded-lg bg-slate-100" />
              </div>
              <div className="mt-5 h-10 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-semibold text-slate-950 dark:text-white sm:text-[18px]">
            Total Pharmacies{" "}
            <span className="text-primary">({pharmacies.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-active"
          >
            <FiPlus className="text-[14px]" />
            Add Pharmacy
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {pharmacies.map((pharmacy) => (
            <PharmacyCard
              key={pharmacy.id}
              pharmacy={pharmacy}
              onViewDetails={handleViewDetails}
            />
          ))}

          {!hasAnyPharmacy && (
            <button
              id="tour-add-pharmacy-btn"
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="group flex min-h-[228px] w-full items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-white p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-[#111726] dark:border-primary/20 dark:hover:bg-primary/10"
            >
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-white">
                  <FiPlus className="text-[22px]" />
                </div>

                <div className="mt-3 text-sm font-bold text-slate-900 dark:text-white sm:text-[15px]">
                  Add New Pharmacy
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      <CreatePharmacyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
};

const PharmacyTab: React.FC = () => {
  return <PharmacyTabContent />;
};

export default PharmacyTab;
