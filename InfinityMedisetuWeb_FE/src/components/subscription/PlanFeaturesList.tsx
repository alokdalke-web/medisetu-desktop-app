import { FiCheck, FiLock } from "react-icons/fi";
import type { PlanFeature } from "../../redux/api/subscriptionApi";

interface PlanFeaturesListProps {
  features: PlanFeature[];
  isLocked?: boolean;
  /** Max number of features to render. Defaults to 3 (current-plan teaser). */
  limit?: number;
  /** "grid" (default) for the current-plan card, "list" for plan comparison cards. */
  layout?: "grid" | "list";
}

function FeatureItem({
  title,
  subtitle,
  isLocked = false,
}: {
  title: string;
  subtitle: string;
  isLocked?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${isLocked ? "opacity-60" : ""}`}>
      <span
        className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${isLocked ? "bg-default-300" : "bg-primary"} text-white`}
      >
        {isLocked ? (
          <FiLock className="text-[10px]" />
        ) : (
          <FiCheck className="text-[12px]" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-default-900">{title}</p>
        <p className="text-xs text-default-500">{subtitle}</p>
      </div>
    </div>
  );
}

/** Resolve feature name from either transformed or raw API shape */
const getFeatureName = (feature: any): string =>
  feature.name || feature.displayName || feature.featureKey || "";

/** Resolve feature description */
const getFeatureDescription = (feature: any): string =>
  feature.description || "";

/** Check if a feature should be displayed (marketing feature) */
const isDisplayableFeature = (feature: any): boolean => {
  // Already filtered by transformResponse — has a `name`
  if (feature.name) return true;
  // Raw API shape — only show marketing features that are enabled
  if ("isMarketingFeature" in feature) {
    return feature.isMarketingFeature === true && feature.enabled !== false;
  }
  return true;
};

const PlanFeaturesList = ({
  features,
  isLocked = false,
  limit = 3,
  layout = "grid",
}: PlanFeaturesListProps) => {
  // Filter to displayable features and take up to `limit`
  const displayFeatures = features.filter(isDisplayableFeature).slice(0, limit);

  if (displayFeatures.length === 0) {
    return (
      <p className="text-sm text-default-500 col-span-3">
        No features available
      </p>
    );
  }

  return (
    <div
      className={
        layout === "list"
          ? "flex flex-col gap-3"
          : "grid grid-cols-1 gap-4 sm:grid-cols-3"
      }
    >
      {displayFeatures.map((feature) => (
        <FeatureItem
          key={feature.id}
          title={getFeatureName(feature)}
          subtitle={getFeatureDescription(feature)}
          isLocked={isLocked}
        />
      ))}
    </div>
  );
};

export default PlanFeaturesList;
