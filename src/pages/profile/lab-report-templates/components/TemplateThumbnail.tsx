import type { TemplateThumbnailProps } from "../../../../types/lab-report";

/**
 * A scaled structural sketch of each backend template, drawn in the lab's own
 * live palette so the tiles read as "my report in four layouts" rather than
 * four unrelated brand colours.
 *
 * The shapes mirror `helpers/templateHtml.ts` (`labReportTemplate1..4`): ruled
 * left margin, letterhead pad, cream handwritten pad, and banner header.
 */
const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
  templateValue,
  colors,
  fontFamily,
}) => {
  const line = (width: string, tone: string, height = "2px") => (
    <div
      style={{ width, height, backgroundColor: tone, borderRadius: "1px" }}
    />
  );

  const tableRows = (tone: string, count = 3) => (
    <div className="flex flex-col gap-[3px]">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-[3px]">
          {line("30%", tone)}
          {line("16%", tone)}
          {line("22%", tone)}
        </div>
      ))}
    </div>
  );

  const shell = (children: React.ReactNode, background: string) => (
    <div
      aria-hidden="true"
      className="h-full w-full overflow-hidden rounded-[3px]"
      style={{ backgroundColor: background, fontFamily }}
    >
      {children}
    </div>
  );

  if (templateValue === "template1") {
    return shell(
      <div className="flex h-full">
        <div style={{ width: "3px", backgroundColor: colors.color1 }} />
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          <div className="flex items-start justify-between">
            {line("40%", colors.color1, "3px")}
            {line("22%", colors.color4)}
          </div>
          {line("100%", colors.color1, "1px")}
          <div className="flex gap-[4px]">
            {line("24%", colors.color5)}
            {line("24%", colors.color5)}
            {line("18%", colors.color5)}
          </div>
          {line("14%", colors.color1, "5px")}
          {tableRows(colors.color5)}
        </div>
      </div>,
      colors.color8,
    );
  }

  if (templateValue === "template2") {
    return shell(
      <div className="flex h-full flex-col">
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
        <div className="flex flex-col gap-[3px] p-[6px] pb-[4px]">
          {line("46%", colors.color3, "4px")}
          {line("30%", colors.color4)}
        </div>
        <div
          className="mx-[6px] flex gap-[4px] rounded-[3px] p-[4px]"
          style={{ backgroundColor: colors.color7 }}
        >
          {line("26%", colors.color5)}
          {line("26%", colors.color5)}
          {line("20%", colors.color5)}
        </div>
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          {line("30%", colors.color1, "5px")}
          {tableRows(colors.color5)}
        </div>
      </div>,
      colors.color8,
    );
  }

  if (templateValue === "template3") {
    return shell(
      <div className="flex h-full flex-col">
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
        <div className="flex flex-col gap-[3px] p-[6px] pb-[4px]">
          {line("46%", colors.color3, "4px")}
          {line("30%", colors.color4)}
        </div>
        <div
          className="mx-[6px] flex gap-[4px] rounded-[3px] p-[4px]"
          style={{ backgroundColor: "#fefbf5", border: "1px solid #e9e0cf" }}
        >
          {line("26%", "#d9cfb8")}
          {line("26%", "#d9cfb8")}
          {line("20%", "#d9cfb8")}
        </div>
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          {tableRows("#d9cfb8")}
        </div>
      </div>,
      "#fffef7",
    );
  }

  return shell(
    <div className="flex h-full flex-col">
      <div
        className="flex flex-col gap-[3px] px-[6px] py-[5px]"
        style={{ backgroundColor: colors.color1 }}
      >
        {line("46%", colors.color8, "4px")}
        {line("30%", colors.color8, "2px")}
      </div>
      <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
        <div
          className="flex gap-[4px] rounded-[4px] p-[4px]"
          style={{ backgroundColor: colors.color7 }}
        >
          {line("26%", colors.color5)}
          {line("26%", colors.color5)}
          {line("20%", colors.color5)}
        </div>
        {tableRows(colors.color5)}
      </div>
    </div>,
    colors.color8,
  );
};

export default TemplateThumbnail;
