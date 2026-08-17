type TitleOptions = {
  fullWidth?: boolean;
};

type SubtitleOptions = {
  fullWidth?: boolean;
};

export const title = ({ fullWidth = false }: TitleOptions = {}) =>
  [
    "tracking-tight inline font-semibold",
    "text-[2.3rem] lg:text-5xl",
    fullWidth ? "w-full block" : "",
  ]
    .filter(Boolean)
    .join(" ");

export const subtitle = ({ fullWidth = true }: SubtitleOptions = {}) =>
  [
    "my-2 text-lg lg:text-xl text-default-500 block max-w-full",
    fullWidth ? "w-full" : "w-full md:w-1/2",
  ]
    .filter(Boolean)
    .join(" ");
