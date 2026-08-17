import type { TemplateThumbnailProps } from "../../../../types/prescription";

/**
 * A scaled structural sketch of each backend template, drawn in the doctor's
 * own live palette so the tiles read as "my prescription in six layouts"
 * rather than six unrelated brand colours.
 *
 * The shapes mirror `InfinityMedisetu_BE/src/htmltamplates/report_card{1..6}.ts`:
 * ruled left margin, letterhead split, cream handwritten pad, banner header,
 * banner + side rail, and outlined cards.
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
          {line("18%", tone)}
          {line("30%", tone)}
          {line("16%", tone)}
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
            {line("26%", colors.color4)}
          </div>
          {line("100%", colors.color1, "1px")}
          <div className="flex gap-[4px]">
            {line("28%", colors.color5)}
            {line("22%", colors.color5)}
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
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          <div className="flex items-start justify-between">
            {line("34%", colors.color1, "4px")}
            <div className="flex flex-col items-end gap-[2px]">
              {line("34px", colors.color3)}
              {line("24px", colors.color4)}
            </div>
          </div>
          {line("100%", colors.color1, "1px")}
          <div className="flex gap-[4px]">
            {line("30%", colors.color5)}
            {line("20%", colors.color5)}
          </div>
          {line("12%", colors.color1, "5px")}
          {tableRows(colors.color5)}
        </div>
        <div style={{ height: "3px", backgroundColor: colors.color1 }} />
      </div>,
      colors.color8,
    );
  }

  if (templateValue === "template3") {
    return shell(
      <div className="flex h-full flex-col">
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          <div className="flex items-start justify-between">
            {line("34%", colors.color1, "4px")}
            {line("24%", colors.color4)}
          </div>
          <div
            className="flex gap-[4px] rounded-[3px] p-[3px]"
            style={{ backgroundColor: "#fefbf5", border: "1px solid #e9e0cf" }}
          >
            {line("34%", colors.color5)}
            {line("24%", colors.color5)}
          </div>
          {line("14%", colors.color1, "6px")}
          {tableRows("#d9cfb8")}
        </div>
      </div>,
      "#fffef7",
    );
  }

  if (templateValue === "template5") {
    return shell(
      <div className="flex h-full flex-col">
        <div
          className="flex items-center justify-between px-[6px] py-[4px]"
          style={{ backgroundColor: colors.color1 }}
        >
          {line("38%", colors.color8, "4px")}
          {line("24%", colors.color8, "2px")}
        </div>
        <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
          <div
            className="flex gap-[4px] rounded-[3px] p-[3px]"
            style={{ border: `1px solid ${colors.color5}` }}
          >
            {line("30%", colors.color5)}
            {line("18%", colors.color5)}
            {line("18%", colors.color5)}
          </div>
          {line("14%", colors.color1, "5px")}
          {/* Narrow rail beside the medication table — this template's signature. */}
          <div className="flex flex-1 gap-[4px]">
            <div
              className="flex w-[26%] flex-col gap-[3px] rounded-[3px] p-[3px]"
              style={{ backgroundColor: colors.color7 }}
            >
              {line("70%", colors.color1)}
              {line("100%", colors.color5)}
              {line("85%", colors.color5)}
            </div>
            <div className="flex flex-1 flex-col gap-[3px]">
              <div style={{ height: "4px", backgroundColor: colors.color1 }} />
              {tableRows(colors.color5)}
            </div>
          </div>
        </div>
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
      </div>,
      colors.color8,
    );
  }

  if (templateValue === "template6") {
    return shell(
      <div className="flex h-full flex-col">
        <div
          className="flex items-center justify-between px-[6px] py-[5px]"
          style={{ backgroundColor: colors.color1 }}
        >
          {line("40%", colors.color8, "5px")}
          {line("24%", colors.color8, "2px")}
        </div>
        <div className="flex flex-1 flex-col gap-[3px] p-[5px]">
          {/* Meta strip, then the full-width vitals strip that identifies this one. */}
          <div
            className="flex gap-[4px] rounded-[3px] p-[3px]"
            style={{ border: `1px solid ${colors.color5}` }}
          >
            {line("30%", colors.color5)}
            {line("18%", colors.color5)}
            {line("18%", colors.color5)}
          </div>
          <div
            className="flex gap-[4px] rounded-[3px] p-[3px]"
            style={{ backgroundColor: colors.color7, border: `1px solid ${colors.color2}` }}
          >
            {line("16%", colors.color1)}
            {line("14%", colors.color5)}
            {line("14%", colors.color5)}
            {line("14%", colors.color5)}
          </div>
          <div className="flex flex-1 gap-[4px]">
            <div
              className="flex w-[24%] flex-col gap-[3px] rounded-[3px] p-[3px]"
              style={{ backgroundColor: colors.color7 }}
            >
              {line("70%", colors.color1)}
              {line("100%", colors.color5)}
              {line("85%", colors.color5)}
            </div>
            <div className="flex flex-1 flex-col gap-[3px]">
              <div style={{ height: "4px", backgroundColor: colors.color1 }} />
              {tableRows(colors.color5)}
            </div>
          </div>
        </div>
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
      </div>,
      colors.color8,
    );
  }

  return shell(
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between px-[6px] py-[4px]"
        style={{ backgroundColor: colors.color1 }}
      >
        {line("38%", colors.color8, "4px")}
        {line("24%", colors.color8, "2px")}
      </div>
      <div className="flex flex-1 flex-col gap-[5px] p-[6px]">
        <div
          className="flex gap-[4px] rounded-[3px] p-[3px]"
          style={{ backgroundColor: colors.color7 }}
        >
          {line("34%", colors.color5)}
          {line("22%", colors.color5)}
        </div>
        {line("12%", colors.color1, "5px")}
        <div style={{ height: "4px", backgroundColor: colors.color1 }} />
        {tableRows(colors.color5)}
      </div>
      <div style={{ height: "4px", backgroundColor: colors.color1 }} />
    </div>,
    colors.color8,
  );
};

export default TemplateThumbnail;
