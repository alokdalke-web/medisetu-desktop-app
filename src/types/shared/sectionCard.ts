import type React from "react";

export interface SectionCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** Optional leading glyph rendered in an accent tile beside the title. */
  icon?: React.ReactNode;
  /** Optional trailing control (e.g. a "View all" link) aligned with the title. */
  action?: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}
