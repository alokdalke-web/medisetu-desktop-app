// components/common/PageContainer.tsx
import React from "react";

const PageContainer: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => (
  <div
    className={[
    
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

export default PageContainer;