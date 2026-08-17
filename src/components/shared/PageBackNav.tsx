import React from "react";
import { Link, useNavigate } from "react-router";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";

export type Crumb = {
  label: string;
  to?: string;
};

type PageBackNavProps = {
  /** Path the back button (and any non-final linked crumb) navigates to by default. */
  backTo: string;
  /** Breadcrumb trail, first-to-last. The last item renders as the current (non-link) page. */
  crumbs: Crumb[];
  className?: string;
};

/**
 * Shared back-button + breadcrumb bar. Currently used by the user feature's
 * detail/edit/create pages (UserDetails, AddUser, UserEdit) so back-navigation
 * consistently returns to the caller's role tab instead of resetting to a
 * default list view — safe to reuse on other pages needing the same pattern.
 */
const PageBackNav: React.FC<PageBackNavProps> = ({
  backTo,
  crumbs,
  className = "",
}) => {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => navigate(backTo)}
        aria-label="Go back"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-default-200 text-default-500 transition-colors hover:border-default-300 hover:bg-default-100 hover:text-default-900 dark:border-default-100 dark:hover:bg-default-50/10 dark:hover:text-white"
      >
        <FiArrowLeft className="cursor-pointer h-4 w-4" />
      </button>
      <nav
        className="flex min-w-0 items-center gap-2 text-sm text-default-400"
        aria-label="Breadcrumb"
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && (
                <FiChevronRight className="shrink-0 opacity-60" aria-hidden />
              )}
              {!isLast && crumb.to ? (
                <Link
                  to={crumb.to}
                  className="shrink-0 hover:text-default-900 hover:underline underline-offset-4 dark:hover:text-white"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "truncate font-semibold text-primary"
                      : "shrink-0 text-default-400"
                  }
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );
};

export default PageBackNav;
