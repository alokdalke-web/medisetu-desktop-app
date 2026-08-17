
// Shared across the role-dashboards (Admin, Receptionist, ...) — promoted
// here after ReceptionistDash.tsx turned out to duplicate this verbatim from
// AdminDash.tsx. See UI_REMEDIATION_LOG.md #42.
const Sk = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />
);

export default Sk;
