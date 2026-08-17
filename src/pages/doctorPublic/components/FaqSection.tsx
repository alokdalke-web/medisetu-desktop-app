import type { PublicFaq } from "../helpers/doctorPublicContent";
import SectionCard from "./SectionCard";

interface FaqSectionProps {
  faqs: PublicFaq[];
}

const FaqSection: React.FC<FaqSectionProps> = ({ faqs }) => (
  <SectionCard title="Frequently asked questions">
    <div className="divide-y divide-line">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-3 first:pt-0 last:pb-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-text">
            {faq.question}
            <span className="shrink-0 text-text-subtle transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{faq.answer}</p>
        </details>
      ))}
    </div>
  </SectionCard>
);

export default FaqSection;
