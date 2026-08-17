import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";

import PlaceHandlebars from "./placeHandlebars";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ContrastIcon,
  DropletIcon,
  FocusIcon,
  LightBulbIcon,
  MoonFilledIcon,
  PlusCircleIcon,
  RedoIcon,
  SparklesIcon,
  SunFilledIcon,
  ThermometerIcon,
  UndoIcon,
  XMarkIcon,
} from "../../components/icons";
import type { IconSvgProps } from "../../types";


// ─── Types ───────────────────────────────────────────────────────────────────

type ImageFilterProps = {
  imageFile: File;
  onBack?: () => void;
};

type FilterValues = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  sharpness: number;
};

type FilterHistoryState = {
  past: FilterValues[];
  present: FilterValues;
  future: FilterValues[];
};

type FilterMutation = FilterValues | ((current: FilterValues) => FilterValues);

type ImageMetrics = {
  averageLuminance: number;
  contrastSpread: number;
  averageSaturation: number;
  darkPixelRatio: number;
  brightPixelRatio: number;
  colorTemperature: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_HISTORY_STEPS = 100;
const MAX_ANALYSIS_EDGE = 400;
const PREVIEW_ERROR_MESSAGE =
  "Could not load this file preview. Please choose a supported image format.";

const FILTER_META: Record<
  keyof FilterValues,
  {
    label: string;
    min: number;
    max: number;
    default: number;
    unit: string;
    icon: ComponentType<IconSvgProps>;
  }
> = {
  brightness: {
    label: "Brightness",
    min: 0,
    max: 200,
    default: 100,
    unit: "%",
    icon: SunFilledIcon,
  },
  contrast: {
    label: "Contrast",
    min: 0,
    max: 200,
    default: 100,
    unit: "%",
    icon: ContrastIcon,
  },
  saturation: {
    label: "Saturation",
    min: 0,
    max: 200,
    default: 100,
    unit: "%",
    icon: DropletIcon,
  },
  warmth: {
    label: "Warmth",
    min: -50,
    max: 50,
    default: 0,
    unit: "",
    icon: ThermometerIcon,
  },
  highlights: {
    label: "Highlights",
    min: -50,
    max: 50,
    default: 0,
    unit: "",
    icon: SparklesIcon,
  },
  shadows: {
    label: "Shadows",
    min: -50,
    max: 50,
    default: 0,
    unit: "",
    icon: MoonFilledIcon,
  },
  vibrance: {
    label: "Vibrance",
    min: -50,
    max: 50,
    default: 0,
    unit: "",
    icon: SparklesIcon,
  },
  sharpness: {
    label: "Sharpness",
    min: 0,
    max: 5,
    default: 0,
    unit: "",
    icon: FocusIcon,
  },
};

const createDefaultFilters = (): FilterValues =>
  Object.fromEntries(
    Object.entries(FILTER_META).map(([k, v]) => [k, v.default]),
  ) as FilterValues;

const createFilterHistoryState = (
  present: FilterValues = createDefaultFilters(),
): FilterHistoryState => ({ past: [], present, future: [] });

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const areFiltersEqual = (a: FilterValues, b: FilterValues): boolean =>
  (Object.keys(a) as (keyof FilterValues)[]).every((k) => a[k] === b[k]);

// ─── Canvas Rendering ─────────────────────────────────────────────────────────

const applySharpen = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
) => {
  if (amount <= 0) return;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const factor = amount * 0.4;
  const kernel = [
    0,
    -factor,
    0,
    -factor,
    1 + 4 * factor,
    -factor,
    0,
    -factor,
    0,
  ];
  const copy = new Uint8ClampedArray(d);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          kernel[0] * copy[((y - 1) * w + (x - 1)) * 4 + c] +
          kernel[1] * copy[((y - 1) * w + x) * 4 + c] +
          kernel[2] * copy[((y - 1) * w + (x + 1)) * 4 + c] +
          kernel[3] * copy[(y * w + (x - 1)) * 4 + c] +
          kernel[4] * copy[idx + c] +
          kernel[5] * copy[(y * w + (x + 1)) * 4 + c] +
          kernel[6] * copy[((y + 1) * w + (x - 1)) * 4 + c] +
          kernel[7] * copy[((y + 1) * w + x) * 4 + c] +
          kernel[8] * copy[((y + 1) * w + (x + 1)) * 4 + c];

        d[idx + c] = clamp(Math.round(val), 0, 255);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

const applyAdvancedPixelOps = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filters: FilterValues,
) => {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const warmth = filters.warmth / 50;
  const highlightShift = filters.highlights / 50;
  const shadowShift = filters.shadows / 50;
  const vibrance = filters.vibrance / 50;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;

    // Warmth: shift red/blue channels
    r = clamp(r + warmth * 0.08, 0, 1);
    b = clamp(b - warmth * 0.06, 0, 1);
    g = clamp(g + warmth * 0.01, 0, 1);

    // Luminance-based highlights & shadows
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const hlMask = Math.pow(lum, 2); // brighter pixels get more highlight boost
    const shMask = Math.pow(1 - lum, 2); // darker pixels get more shadow boost

    r = clamp(
      r + hlMask * highlightShift * 0.25 + shMask * shadowShift * 0.3,
      0,
      1,
    );
    g = clamp(
      g + hlMask * highlightShift * 0.25 + shMask * shadowShift * 0.3,
      0,
      1,
    );
    b = clamp(
      b + hlMask * highlightShift * 0.25 + shMask * shadowShift * 0.3,
      0,
      1,
    );

    // Vibrance: selectively boost less-saturated pixels
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
    const vibranceFactor = vibrance * (1 - sat) * 0.4;
    const avg = (r + g + b) / 3;

    r = clamp(r + (r - avg) * vibranceFactor, 0, 1);
    g = clamp(g + (g - avg) * vibranceFactor, 0, 1);
    b = clamp(b + (b - avg) * vibranceFactor, 0, 1);

    d[i] = Math.round(r * 255);
    d[i + 1] = Math.round(g * 255);
    d[i + 2] = Math.round(b * 255);
  }

  ctx.putImageData(imageData, 0, 0);
};

const renderToCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  filters: FilterValues,
) => {
  const w = image.naturalWidth || image.width;
  const h = image.naturalHeight || image.height;

  if (!w || !h) return;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  // CSS filter layer (brightness, contrast, saturation)
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
  ctx.drawImage(image, 0, 0, w, h);
  ctx.filter = "none";

  // Pixel-level advanced ops (warmth, highlights, shadows, vibrance)
  applyAdvancedPixelOps(ctx, w, h, filters);

  // Sharpness convolution
  if (filters.sharpness > 0) {
    applySharpen(ctx, w, h, filters.sharpness);
  }
};

// ─── Image Analysis & Auto-Enhance ───────────────────────────────────────────

const analyzeImageMetrics = (image: HTMLImageElement): ImageMetrics | null => {
  const sw = image.naturalWidth || image.width;
  const sh = image.naturalHeight || image.height;

  if (!sw || !sh) return null;

  const scale =
    Math.max(sw, sh) > MAX_ANALYSIS_EDGE
      ? MAX_ANALYSIS_EDGE / Math.max(sw, sh)
      : 1;
  const W = Math.max(1, Math.round(sw * scale));
  const H = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.drawImage(image, 0, 0, W, H);
  let px: Uint8ClampedArray;

  try {
    px = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null;
  }

  const n = px.length / 4;

  if (!n) return null;

  let lumSum = 0,
    lumSqSum = 0,
    satSum = 0,
    darkCount = 0,
    brightCount = 0;
  let rSum = 0,
    bSum = 0;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    lumSum += lum;
    lumSqSum += lum * lum;
    if (lum < 60) darkCount++;
    if (lum > 200) brightCount++;
    const mx = Math.max(r, g, b),
      mn = Math.min(r, g, b);

    satSum += mx === 0 ? 0 : ((mx - mn) / mx) * 100;
    rSum += r;
    bSum += b;
  }

  const avg = lumSum / n;
  const variance = lumSqSum / n - avg * avg;

  return {
    averageLuminance: avg,
    contrastSpread: Math.sqrt(Math.max(0, variance)),
    averageSaturation: satSum / n,
    darkPixelRatio: darkCount / n,
    brightPixelRatio: brightCount / n,
    colorTemperature: (rSum - bSum) / (n * 255), // positive = warm
  };
};

const getAutoEnhanceFilters = (m: ImageMetrics): FilterValues => {
  // ── Documents need clean white backgrounds ──────────────────────────────
  // Push brightness to clear any paper yellowing / scan grey, but don't blow out text
  const bgGrey = Math.max(0, 200 - m.averageLuminance); // how far from white
  const brightnessBoost = bgGrey * 0.55 + m.darkPixelRatio * 8;

  // High contrast is critical for legible text on paper
  // Low spread = washed out scan → needs more contrast punch
  const contrastBoost = clamp((55 - m.contrastSpread) * 0.9, -10, 55);

  // Documents should be desaturated — colour casts (scanner lamp, photo) must go
  // Pull saturation toward neutral; small residual for colour diagrams/charts
  const satBoost = clamp((25 - m.averageSaturation) * 0.5, -40, 8);

  // Warmth: aggressively neutralise warm scanner/camera colour cast
  // Slightly cool bias gives crisper perceived whites on print
  const warmth = clamp(-m.colorTemperature * 35 - 4, -20, 4);

  // Shadows: recover dark ink detail without mudding mid-tones
  const shadowLift = clamp(m.darkPixelRatio * 12, 0, 10);

  // Highlights: protect whites from blowing — paper must stay white, not grey
  const highlightProtect = clamp(-m.brightPixelRatio * 8, -8, 0);

  // Vibrance: suppress any stray colour; small positive only for diagram docs
  const vibranceVal = clamp(
    Math.round((20 - m.averageSaturation) * 0.25),
    -6,
    6,
  );

  // Sharpness: always sharpen for print — text edges must be crisp
  // Low-contrast scans get maximum sharpening
  const sharpnessVal = m.contrastSpread < 25 ? 3.5
    : m.contrastSpread < 40 ? 2.5
    : 1.5;

  return {
    brightness:  clamp(Math.round(100 + brightnessBoost), 95, 195),
    contrast:    clamp(Math.round(100 + contrastBoost),   105, 165),
    saturation:  clamp(Math.round(100 + satBoost),         55, 108),
    warmth:      clamp(Math.round(warmth),                -20,   4),
    highlights:  clamp(Math.round(highlightProtect),      -10,   0),
    shadows:     clamp(Math.round(shadowLift),              0,  12),
    vibrance:    clamp(vibranceVal,                        -8,   6),
    sharpness:   sharpnessVal,
  };
};

const getShadowRemovalFilters = (m: ImageMetrics): FilterValues => {
  // ── Goal: eliminate cast shadows from physical documents (folded pages,   ──
  // ── overhead lighting, phone-captured docs) while keeping ink readable.   ──

  const intensity = m.darkPixelRatio;         // 0–1: how much shadow area
  const isSevere  = intensity > 0.35;         // harsh shadow, e.g. book spine

  // Brightness: lift enough to reveal shadowed text without blowing white areas
  const brightnessBoost = intensity * 45 + (isSevere ? 12 : 0);

  // Contrast: compensate for the flattening that brightness causes
  // Increase strongly so lifted text doesn't become grey mush on paper
  const contrastBoost = clamp(intensity * 30 + 12, 15, 50);

  // Saturation: shadows often carry colour (blue/purple from phone cameras)
  // Pull toward neutral so printed output doesn't show tinted patches
  const satBoost = clamp((30 - m.averageSaturation) * 0.4 - 8, -35, 5);

  // Warmth: shadows skew cool (blue cast) — add a gentle warm offset to match
  // the lit area, but don't over-warm or paper will print yellow
  const warmth = clamp(intensity * 10 - m.colorTemperature * 20, -6, 14);

  // Shadow slider: the primary lever — lifts dark tones selectively
  const shadowLift = clamp(Math.round(intensity * 42 + (isSevere ? 8 : 0)), 14, 48);

  // Highlights: protect bright paper regions from blowing; keep whites true
  const highlightProtect = isSevere ? -8 : -4;

  // Vibrance: slight desaturation suppresses residual colour in shadow zones
  const vibranceVal = clamp(Math.round(intensity * 6 - 4), -8, 4);

  // Sharpness: always high — shadow removal can soften perceived edges,
  // and print demands crisp ink strokes
  const sharpnessVal = isSevere ? 3.0 : 2.0;

  return {
    brightness:  clamp(Math.round(100 + brightnessBoost), 105, 190),
    contrast:    clamp(Math.round(100 + contrastBoost),   112, 155),
    saturation:  clamp(Math.round(100 + satBoost),         60, 105),
    warmth:      clamp(Math.round(warmth),                  -6,  14),
    highlights:  highlightProtect,
    shadows:     shadowLift,
    vibrance:    vibranceVal,
    sharpness:   sharpnessVal,
  };
};

// ─── Keyboard helper ──────────────────────────────────────────────────────────

const isTypingTarget = (t: EventTarget | null): boolean => {
  if (t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement)
    return true;
  if (t instanceof HTMLInputElement) return t.type !== "range";

  return t instanceof HTMLElement && t.isContentEditable;
};

// ─── Slider Component ─────────────────────────────────────────────────────────

type SliderProps = {
  filterKey: keyof FilterValues;
  value: number;
  onChange: (key: keyof FilterValues, value: number) => void;
};

const FilterSlider = ({ filterKey, value, onChange }: SliderProps) => {
  const meta = FILTER_META[filterKey];
  const Icon = meta.icon;
  const isDefault = value === meta.default;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="flex w-5 shrink-0 items-center justify-center text-zinc-500">
          <Icon aria-hidden="true" size={13} />
        </span>
        <span className="flex-1 text-xs font-medium text-zinc-700">
          {meta.label}
        </span>
        <span
          className={`rounded px-2 py-0.5 font-mono text-[11px] ${isDefault ? "bg-zinc-100 text-zinc-500" : "bg-amber-100 text-amber-700"}`}
        >
          {value > 0 && meta.min < 0 ? "+" : ""}
          {value}
          {meta.unit}
        </span>
      </div>
      <div className="px-0.5">
        <input
          aria-label={meta.label}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-emerald-600 outline-none"
          max={meta.max}
          min={meta.min}
          step={filterKey === "sharpness" ? 0.5 : 1}
          type="range"
          value={value}
          onChange={(e) => onChange(filterKey, Number(e.target.value))}
        />
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ImageFilter = ({ imageFile, onBack }: ImageFilterProps) => {
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [filterHistory, setFilterHistory] = useState<FilterHistoryState>(() =>
    createFilterHistoryState(),
  );
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageReady, setIsImageReady] = useState(false);
  const [isPlacingHandlebars, setIsPlacingHandlebars] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"basic" | "advanced">("basic");

  const filters = filterHistory.present;
  const canUndo = filterHistory.past.length > 0;
  const canRedo = filterHistory.future.length > 0;
  const hasImageError = Boolean(imageError);

  // CSS filter string for PlaceHandlebars compatibility
  const cssFilter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

  // ── Canvas repaint ──────────────────────────────────────────────────────────

  const repaintCanvas = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (isPlacingHandlebars) return;
      const img = sourceImageRef.current;
      const canvas = previewCanvasRef.current;

      if (!img || !canvas || !isImageReady || hasImageError) return;
      renderToCanvas(canvas, img, filters);
    });
  }, [filters, hasImageError, isImageReady, isPlacingHandlebars]);

  useEffect(() => {
    repaintCanvas();
  }, [repaintCanvas]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // ── Filter history helpers ─────────────────────────────────────────────────

  const applyFilterChange = useCallback((next: FilterMutation) => {
    setFilterHistory((s) => {
      const nextFilters = typeof next === "function" ? next(s.present) : next;

      if (areFiltersEqual(s.present, nextFilters)) return s;
      const nextPast = [...s.past, s.present];

      if (nextPast.length > MAX_HISTORY_STEPS) nextPast.shift();

      return { past: nextPast, present: nextFilters, future: [] };
    });
  }, []);

  const setFilter = useCallback(
    (key: keyof FilterValues, value: number) => {
      applyFilterChange((c) => ({ ...c, [key]: value }));
    },
    [applyFilterChange],
  );

  const resetFilters = useCallback(
    () => applyFilterChange(createDefaultFilters()),
    [applyFilterChange],
  );

  const undoFilterChange = useCallback(() => {
    setFilterHistory((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      const nextFuture = [s.present, ...s.future];

      if (nextFuture.length > MAX_HISTORY_STEPS) nextFuture.pop();

      return { past: s.past.slice(0, -1), present: prev, future: nextFuture };
    });
  }, []);

  const redoFilterChange = useCallback(() => {
    setFilterHistory((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      const nextPast = [...s.past, s.present];

      if (nextPast.length > MAX_HISTORY_STEPS) nextPast.shift();

      return { past: nextPast, present: next, future: rest };
    });
  }, []);

  // ── Image file change ──────────────────────────────────────────────────────

  useEffect(() => {
    let isActive = true;

    setImageError(null);
    setIsImageReady(false);
    setIsPlacingHandlebars(false);
    setFilterHistory(createFilterHistoryState());
    const url = URL.createObjectURL(imageFile);
    const img = new Image();

    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!isActive) return;
      sourceImageRef.current = img;
      setImageError(null);
      setIsImageReady(true);
    };
    img.onerror = () => {
      if (!isActive) return;
      sourceImageRef.current = null;
      setImageError(PREVIEW_ERROR_MESSAGE);
      setIsImageReady(false);
    };
    img.src = url;

    setImageUrl(url);

    return () => {
      isActive = false;
      sourceImageRef.current = null;
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // ── Auto adjust helpers ────────────────────────────────────────────────────

  const runAdjustment = useCallback(
    (buildFilters: (m: ImageMetrics) => FilterValues) => {
      const img = sourceImageRef.current;

      if (!img || !isImageReady || hasImageError) return;
      const metrics = analyzeImageMetrics(img);

      if (metrics) applyFilterChange(buildFilters(metrics));
    },
    [applyFilterChange, hasImageError, isImageReady],
  );

  const autoEnhanceImage = useCallback(
    () => runAdjustment(getAutoEnhanceFilters),
    [runAdjustment],
  );
  const removeShadow = useCallback(
    () => runAdjustment(getShadowRemovalFilters),
    [runAdjustment],
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (!mod || e.altKey) return;
      const k = e.key.toLowerCase();

      if (k === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        undoFilterChange();
      }
      if ((k === "y" || (k === "z" && e.shiftKey)) && canRedo) {
        e.preventDefault();
        redoFilterChange();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [canRedo, canUndo, redoFilterChange, undoFilterChange]);

  // ── Place handlebars ───────────────────────────────────────────────────────

  const goToPlaceHandlebars = () => {
    if (!isImageReady || imageError) return;
    setIsPlacingHandlebars(true);
  };

  if (isPlacingHandlebars) {
    return (
      <PlaceHandlebars
        filters={cssFilter}
        imageUrl={imageUrl}
        onBack={() => setIsPlacingHandlebars(false)}
        onError={(msg: string) => {
          setImageError(msg);
          setIsPlacingHandlebars(false);
        }}
        onImageReady={() => {
          setImageError(null);
          setIsImageReady(true);
        }}
      />
    );
  }

  // ── Sliders grouped ────────────────────────────────────────────────────────

  const basicKeys: (keyof FilterValues)[] = [
    "brightness",
    "contrast",
    "saturation",
  ];
  const advancedKeys: (keyof FilterValues)[] = [
    "warmth",
    "highlights",
    "shadows",
    "vibrance",
    "sharpness",
  ];
  const topButtonBase =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";
  const topButtonDanger =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-red-300 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40";
  const topButtonPrimary =
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40";
  const tabButtonBase =
    "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition";
  const sectionTitleClass =
    "mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600";
  const smartButtonClass =
    "rounded-lg border border-zinc-300 bg-white px-2 py-2 text-center text-[11px] font-medium text-zinc-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh_-_12rem)] min-h-0 flex-col bg-zinc-50 text-zinc-900">
      {/* ── Top action bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 bg-white px-4 py-2.5">
        {onBack && (
          <button className={topButtonBase} onClick={onBack}>
            <ArrowLeftIcon aria-hidden="true" size={14} />
            Back
          </button>
        )}
        <div className="mr-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
          <span>Apply Filter on Image</span>
        </div>


        <div className="flex-1" />

        <button
          className={topButtonBase}
          disabled={!canUndo}
          onClick={undoFilterChange}
        >
          <UndoIcon aria-hidden="true" size={14} />
          Undo
        </button>
        <button
          className={topButtonBase}
          disabled={!canRedo}
          onClick={redoFilterChange}
        >
          <RedoIcon aria-hidden="true" size={14} />
          Redo
        </button>
        <button className={topButtonDanger} onClick={resetFilters}>
          <XMarkIcon aria-hidden="true" size={14} />
          Reset
        </button>

        <button
          className={topButtonPrimary}
          disabled={!isImageReady || hasImageError}
          onClick={goToPlaceHandlebars}
        >
          <PlusCircleIcon aria-hidden="true" size={14} />
          Next <ArrowRightIcon aria-hidden="true" size={14} />
        </button>
      </div>

      {/* ── Main body ─────────────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_320px]">
        {/* Left: canvas preview */}
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-zinc-100">
          {imageError ? (
            <p className="px-6 py-10 text-center text-sm text-red-600">
              {imageError}
            </p>
          ) : (
            <canvas
              ref={previewCanvasRef}
              className="max-h-full max-w-full rounded object-contain shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
            />
          )}

          {isImageReady && !imageError && (
            <span className="absolute bottom-3.5 right-3.5 rounded border border-zinc-200 bg-white/90 px-2 py-1 font-mono text-[10px] tracking-[0.05em] text-zinc-600">
              CANVAS · PNG
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex flex-col overflow-y-auto border-t border-zinc-200 bg-white lg:overflow-hidden lg:border-l lg:border-t-0">
          <div className="px-4 pt-3">
            <div className={sectionTitleClass}>Adjustments</div>

            {/* Tab switcher */}
            <div className="mb-3 flex gap-1 rounded-lg bg-zinc-100 p-1">
              <button
                className={`${tabButtonBase} ${activeGroup === "basic"
                    ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-500 hover:text-zinc-700"
                  }`}
                onClick={() => setActiveGroup("basic")}
              >
                Basic
              </button>
              <button
                className={`${tabButtonBase} ${activeGroup === "advanced"
                    ? "bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200"
                    : "text-zinc-500 hover:text-zinc-700"
                  }`}
                onClick={() => setActiveGroup("advanced")}
              >
                Advanced
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-3 px-4 pb-3">
            {(activeGroup === "basic" ? basicKeys : advancedKeys).map((k) => (
              <FilterSlider
                key={k}
                filterKey={k}
                value={filters[k]}
                onChange={setFilter}
              />
            ))}
          </div>

          <div className="mx-4 my-1.5 h-px bg-zinc-200" />

          {/* Smart actions */}
          <div className="px-4 pb-3">
            <div className={sectionTitleClass}>Smart Tools</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={smartButtonClass}
                disabled={!isImageReady || hasImageError}
                onClick={autoEnhanceImage}
              >
                <span className="mb-0.5 flex justify-center text-zinc-500">
                  <SparklesIcon aria-hidden="true" size={16} />
                </span>
                Auto Enhance
              </button>
              <button
                className={smartButtonClass}
                disabled={!isImageReady || hasImageError}
                onClick={removeShadow}
              >
                <span className="mb-0.5 flex justify-center text-zinc-500">
                  <LightBulbIcon aria-hidden="true" size={16} />
                </span>
                Lift Shadows
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageFilter;
