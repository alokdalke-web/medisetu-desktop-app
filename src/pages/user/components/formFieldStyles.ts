/**
 * Shared field styling for the user feature's forms (AddUser, UserEdit), so the
 * "Add User" and "Edit User" screens present the same input/select box look
 * (border color, radius, shadow, hover/focus ring) instead of drifting apart.
 * Scoped to this feature folder only — no other page imports this.
 */

/** classNames for HeroUI-backed `InputField` instances (merges cleanly with its defaults). */
export const inputFieldClassNames = {
  label: "text-[13px] font-semibold text-slate-700 dark:!text-slate-200",
  inputWrapper:
    "min-h-12 rounded-lg border-slate-200 bg-white px-3 shadow-sm transition-colors hover:border-primary/50 data-[focus=true]:border-primary data-[focus=true]:ring-2 data-[focus=true]:ring-primary/10 dark:!border-[#38445a] dark:!bg-[#0f1728]",
  input: "text-sm text-slate-800 placeholder:text-slate-400 dark:!text-slate-100",
};

export const fieldRadius = "lg" as const;

/**
 * `SelectField` hardcodes its own `classNames`, ignoring anything passed in, so its
 * trigger box can only be restyled by targeting the rendered `data-slot` elements
 * directly (with `!important`) from an ancestor — applied only within this form,
 * not the shared `SelectField` component itself.
 */
export const selectFieldOverrideClassName =
  "[&_[data-slot='trigger']]:!min-h-12 " +
  "[&_[data-slot='trigger']]:!rounded-lg " +
  "[&_[data-slot='trigger']]:!border " +
  "[&_[data-slot='trigger']]:!border-slate-200 " +
  "[&_[data-slot='trigger']]:!bg-white " +
  "[&_[data-slot='trigger']]:!shadow-sm " +
  "[&_[data-slot='trigger']]:!px-3 " +
  "dark:[&_[data-slot='trigger']]:!border-[#38445a] " +
  "dark:[&_[data-slot='trigger']]:!bg-[#0f1728] " +
  "[&_[data-slot='label']]:!text-[13px] " +
  "[&_[data-slot='label']]:!font-semibold " +
  "[&_[data-slot='label']]:!text-slate-700 " +
  "dark:[&_[data-slot='label']]:!text-slate-200 " +
  "[&_[data-slot='value']]:!text-sm " +
  "[&_[data-slot='value']]:!text-slate-800 " +
  "dark:[&_[data-slot='value']]:!text-slate-100";
