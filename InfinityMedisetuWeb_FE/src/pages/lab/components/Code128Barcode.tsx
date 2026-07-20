import {
  buildCode128Geometry,
  type Code128BarcodeOptions,
  type Code128Geometry,
} from "../utils/code128Barcode";

type Code128BarcodeProps = Code128BarcodeOptions & {
  className?: string;
};

export function Code128Barcode({
  value,
  moduleWidth = 2,
  barHeight = 58,
  quietZone = 12,
  showText = true,
  className,
}: Code128BarcodeProps) {
  let geometry: Code128Geometry;

  try {
    geometry = buildCode128Geometry({
      value,
      moduleWidth,
      barHeight,
      quietZone,
      showText,
    });
  } catch (err) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
        {err instanceof Error
          ? err.message
          : "Could not render this barcode value."}
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={`Barcode ${value}`}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      className={className}
    >
      <rect width="100%" height="100%" fill="#fff" />
      {geometry.rects.map((rect, index) => (
        <rect
          key={`${rect.x}-${rect.width}-${index}`}
          x={rect.x}
          y={0}
          width={rect.width}
          height={barHeight}
          fill="#0f172a"
        />
      ))}
      {showText && (
        <text
          x={geometry.width / 2}
          y={geometry.textY}
          textAnchor="middle"
          fontFamily="monospace"
          fontSize="14"
          fontWeight="700"
          fill="#0f172a"
        >
          {value}
        </text>
      )}
    </svg>
  );
}
