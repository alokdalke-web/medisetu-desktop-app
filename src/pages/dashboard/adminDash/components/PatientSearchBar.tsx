import type { PatientSearchBarProps } from "../../../../types/adminDash";
import { initials } from "../helpers/adminDashFormatters";

const PatientSearchBar = ({
  containerRef,
  searchTerm,
  setSearchTerm,
  showSearchResults,
  setShowSearchResults,
  debouncedSearch,
  isSearching,
  searchResults,
  navigate,
}: PatientSearchBarProps) => (
  <div
    ref={containerRef}
    className="relative w-full sm:w-[220px] lg:w-[260px] xl:w-[280px] shrink-0 "
  >
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        setShowSearchResults(true);
      }}
      onFocus={() => setShowSearchResults(true)}
      placeholder="Search patients..."
      aria-label="Search patients"
      aria-haspopup="listbox"
      aria-expanded={showSearchResults && debouncedSearch.trim().length >= 2}
      className="w-full rounded-xl border border-line bg-surface py-2.5 pr-4 pl-10 text-[14px] text-text placeholder:text-text-muted focus:ring-1 focus:ring-primary/30 focus:outline-none"
    />
    <svg
      className="absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    {isSearching && (
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    )}

    {/* Search Results Dropdown */}
    {showSearchResults && debouncedSearch.trim().length >= 2 && (
      <div
        role="listbox"
        aria-label="Patient search results"
        className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[320px] overflow-y-auto rounded-xl border border-line bg-surface shadow-lg dark:shadow-none"
      >
        {searchResults?.users && searchResults.users.length > 0 ? (
          searchResults.users.map((patient: any) => (
            <button
              key={patient.id ?? patient._id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                navigate(`/patient/${patient.id ?? patient._id}`);
                setShowSearchResults(false);
                setSearchTerm("");
              }}
              className="cursor-pointer flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50 dark:hover:bg-surface-muted"
            >
              {patient.profileImage ? (
                <img
                  src={patient.profileImage}
                  alt={patient.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-text-muted">
                  {initials(patient.name ?? "")}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  {patient.name}
                </p>
                <p className="truncate text-[11px] text-text-muted">
                  {patient.email || patient.mobile || ""}
                </p>
              </div>
            </button>
          ))
        ) : !isSearching ? (
          <div className="px-3 py-4 text-center text-sm text-text-muted">
            No patients found
          </div>
        ) : null}
      </div>
    )}
  </div>
);

export default PatientSearchBar;
