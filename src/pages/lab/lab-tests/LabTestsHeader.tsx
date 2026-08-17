import { motion } from "framer-motion";

import { LabScreenInfoTooltip } from "../components/LabScreenInfoTooltip";

type LabTestsHeaderProps = {
  pageTitle: string;
  pageSubtitle: string;
  infoTitle: string;
  infoDescription: string;
  infoItems?: string[];
  guideSection?: string;
  linkLabel?: string;
};

export function LabTestsHeader({
  pageTitle,
  pageSubtitle,
  infoTitle,
  infoDescription,
  infoItems,
  guideSection,
  linkLabel,
}: LabTestsHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-950 dark:text-white md:text-[26px]">
          {pageTitle}
        </h1>
        <LabScreenInfoTooltip
          title={infoTitle}
          description={infoDescription}
          items={infoItems}
          placement="right"
          guideSection={guideSection}
          linkLabel={linkLabel}
        />
      </div>
      <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-white">
        {pageSubtitle}
      </p>
    </motion.div>
  );
}
