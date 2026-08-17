
// Shared across the role-dashboards — see UI_REMEDIATION_LOG.md #42.
/** Arrow icon rotated 90° (pointing right) matching Figma solar:arrow-up-linear */
const ArrowUpRight = ({ className = "" }: { className?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    className={`shrink-0 rotate-90 ${className}`}
  >
    <path
      d="M12 19V5M5 12L12 5L19 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ArrowUpRight;
