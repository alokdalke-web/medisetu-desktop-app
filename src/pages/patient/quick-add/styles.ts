export const compactCityStateFieldBase = `
  min-w-0

  [&_[data-slot='label']]:!mb-2
  [&_[data-slot='label']]:!block
  [&_[data-slot='label']]:!h-4
  [&_[data-slot='label']]:!min-h-4
  [&_[data-slot='label']]:!leading-4
  [&_[data-slot='label']]:!text-[12px]
  [&_[data-slot='label']]:!font-semibold
  [&_[data-slot='label']]:!text-[#100E1C]

  [&_[data-slot='input-wrapper']]:!box-border
  [&_[data-slot='input-wrapper']]:!flex
  [&_[data-slot='input-wrapper']]:!items-center
  [&_[data-slot='input-wrapper']]:!h-10
  [&_[data-slot='input-wrapper']]:!min-h-10
  [&_[data-slot='input-wrapper']]:!max-h-11
  [&_[data-slot='input-wrapper']]:!rounded-lg
  [&_[data-slot='input-wrapper']]:!border
  [&_[data-slot='input-wrapper']]:!border-slate-200
  [&_[data-slot='input-wrapper']]:!bg-white
  [&_[data-slot='input-wrapper']]:!px-4
  [&_[data-slot='input-wrapper']]:!py-0
  [&_[data-slot='input-wrapper']]:!shadow-none
  [&_[data-slot='input-wrapper']]:after:!hidden

  [&_[data-slot='trigger']]:!box-border
  [&_[data-slot='trigger']]:!flex
  [&_[data-slot='trigger']]:!items-center
  [&_[data-slot='trigger']]:!h-11
  [&_[data-slot='trigger']]:!min-h-11
  [&_[data-slot='trigger']]:!max-h-11
  [&_[data-slot='trigger']]:!rounded-lg
  [&_[data-slot='trigger']]:!border
  [&_[data-slot='trigger']]:!border-slate-200
  [&_[data-slot='trigger']]:!bg-white
  [&_[data-slot='trigger']]:!px-4
  [&_[data-slot='trigger']]:!py-0
  [&_[data-slot='trigger']]:!shadow-none

  [&_[data-slot='inner-wrapper']]:!flex
  [&_[data-slot='inner-wrapper']]:!h-full
  [&_[data-slot='inner-wrapper']]:!items-center

  [&_[data-slot='mainWrapper']]:!gap-0
  [&_[data-slot='base']]:!gap-0

  [&_input]:!h-full
  [&_input]:!leading-none
  [&_input]:!text-[13px]
  [&_input]:!font-semibold
  [&_input]:!text-[#100E1C]
  [&_input::placeholder]:!text-slate-400

  [&_[data-slot='value']]:!leading-none
  [&_[data-slot='value']]:!text-[13px]
  [&_[data-slot='value']]:!font-semibold
  [&_[data-slot='value']]:!text-slate-500

  [&_[data-slot='selectorIcon']]:!shrink-0

  [&_[data-slot='error-message']]:!mt-1
  [&_[data-slot='error-message']]:!block
  [&_[data-slot='error-message']]:!min-h-[16px]
  [&_[data-slot='error-message']]:!text-[11px]
  [&_[data-slot='error-message']]:!leading-4
  [&_[data-slot='error-message']]:!font-medium
`;

export const fieldBase = `
  min-w-0

  [&_[data-slot='label']]:!mb-2
  [&_[data-slot='label']]:!block
  [&_[data-slot='label']]:!h-4
  [&_[data-slot='label']]:!min-h-4
  [&_[data-slot='label']]:!truncate
  [&_[data-slot='label']]:!whitespace-nowrap
  [&_[data-slot='label']]:!leading-4
  [&_[data-slot='label']]:!text-[12px]
  [&_[data-slot='label']]:!font-semibold
  [&_[data-slot='label']]:!text-[#100E1C]

  [&_[data-slot='input-wrapper']]:!h-11
  [&_[data-slot='input-wrapper']]:!min-h-11
  [&_[data-slot='input-wrapper']]:!rounded-lg
  [&_[data-slot='input-wrapper']]:!bg-white
  [&_[data-slot='input-wrapper']]:!border
  [&_[data-slot='input-wrapper']]:!border-slate-200
  [&_[data-slot='input-wrapper']]:!shadow-none
  [&_[data-slot='input-wrapper']]:!transition
  [&_[data-slot='input-wrapper']]:after:!hidden
  [&_[data-slot='input-wrapper']]:focus-within:!border-primary
  [&_[data-slot='input-wrapper']]:focus-within:!ring-2
  [&_[data-slot='input-wrapper']]:focus-within:!ring-primary/10
  [&_[data-slot='input-wrapper']]:data-[invalid=true]:!border-danger

  [&_[data-slot='trigger']]:!h-11
  [&_[data-slot='trigger']]:!min-h-11
  [&_[data-slot='trigger']]:!rounded-lg
  [&_[data-slot='trigger']]:!bg-white
  [&_[data-slot='trigger']]:!border
  [&_[data-slot='trigger']]:!border-slate-200
  [&_[data-slot='trigger']]:!shadow-none
  [&_[data-slot='trigger']]:!transition
  [&_[data-slot='trigger']]:focus-within:!border-primary
  [&_[data-slot='trigger']]:focus-within:!ring-2
  [&_[data-slot='trigger']]:focus-within:!ring-primary/10
  [&_[data-slot='trigger']]:data-[invalid=true]:!border-danger

  [&_[data-slot='inner-wrapper']]:!h-full
  [&_[data-slot='inner-wrapper']]:!items-center

  [&_input]:!h-full
  [&_input]:!text-[13px]
  [&_input]:!font-semibold
  [&_input]:!text-[#100E1C]
  [&_input::placeholder]:!text-slate-400

  [&_[data-slot='value']]:!text-[13px]
  [&_[data-slot='value']]:!font-semibold
  [&_[data-slot='value']]:!text-slate-500

  [&_[data-slot='error-message']]:!mt-1
  [&_[data-slot='error-message']]:!min-h-[16px]
  [&_[data-slot='error-message']]:!text-[11px]
  [&_[data-slot='error-message']]:!leading-4
  [&_[data-slot='error-message']]:!font-medium
`;

export const requiredMark = `
  [&_[data-slot='label']]:after:content-['*']
  [&_[data-slot='label']]:after:ml-1
  [&_[data-slot='label']]:after:text-red-500
`;

export const fieldShell = "min-w-0 min-h-[70px]";
export const fullFieldShell = "min-w-0 min-h-[70px] col-span-2 sm:col-span-1";
