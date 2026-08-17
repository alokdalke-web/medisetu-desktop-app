import { useMemo, useState } from "react";

import { parseAboutSections } from "../helpers/doctorAbout";
import SectionCard from "./SectionCard";

const COLLAPSED_BLOCKS = 2;

interface AboutSectionProps {
  title: string;
  about: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ title, about }) => {
  const blocks = useMemo(() => parseAboutSections(about), [about]);
  const [expanded, setExpanded] = useState(false);

  const isLong = blocks.length > COLLAPSED_BLOCKS;
  const visible = expanded || !isLong ? blocks : blocks.slice(0, COLLAPSED_BLOCKS);

  return (
    <SectionCard title={title}>
      <div className="max-w-prose space-y-4">
        {visible.map((block, i) => (
          <div key={`${block.heading ?? "p"}-${i}`}>
            {block.heading && (
              <h3 className="mb-1 text-sm font-semibold text-text">{block.heading}</h3>
            )}
            {block.body && (
              <p className="whitespace-pre-line text-[15px] leading-7 text-text-muted">
                {block.body}
              </p>
            )}
          </div>
        ))}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-3 text-sm font-semibold text-primary hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </SectionCard>
  );
};

export default AboutSection;
