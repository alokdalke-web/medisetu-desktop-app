interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
    <h2 className="mb-4 text-lg font-semibold text-text">{title}</h2>
    {children}
  </section>
);

export default SectionCard;
