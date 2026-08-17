import React from "react";

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />
);

export default SkeletonBlock;
