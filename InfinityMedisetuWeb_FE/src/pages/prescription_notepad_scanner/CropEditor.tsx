import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Chip } from '@heroui/chip';
import { Divider } from '@heroui/divider';
import { Tooltip } from '@heroui/tooltip';
import type JScanify from 'jscanify/client';
import { type CornerPoints } from 'jscanify/client';
import {
  KEYS, CYAN, clamp, exSize, polyPts,
  normalizeCorners, getCv,
  type HandleKey,
} from './scannerUtils';
import { compressCanvas } from './compressCanvas';

const LOUPE_R = 54;
const LOUPE_ZOOM = 3.5;

// ─── Inset guard: keep detected corners at least this many px from frame edges ──
// This prevents handles from being placed on the very edge of the container,
// making them unreachable. Expressed as a fraction of the shorter dimension.
const EDGE_INSET_FRAC = 0.015; // 1.5% inset from each side

// ─── Multi-pass preprocessing configs for auto-detect ────────────────────────
interface PrepConfig {
  label: string;
  /** Gaussian blur kernel size (odd) before edge/threshold */
  blur: number;
  /** Adaptive threshold neighborhood block size (odd, >= 3) */
  adaptiveBlock: number;
  /** Adaptive threshold constant subtracted from mean */
  adaptiveC: number;
  /** Morphological close iterations to heal the paper mask */
  closeIters: number;
  /** Optional Canny low threshold (post-mask refinement) */
  cannyLow?: number;
  /** Optional Canny high threshold (post-mask refinement) */
  cannyHigh?: number;
  /** Optional dilation iterations to reconnect weak edges */
  dilate?: number;
  /** CLAHE clip limit for adaptive contrast */
  claheClip: number;
  /** Use Lab color space lightness channel instead of plain grayscale */
  useLabL: boolean;
}

const PREP_CONFIGS: PrepConfig[] = [
  // Pass 1: Lab-L default for white-on-white separation
  { label: 'lab-balanced', blur: 5, adaptiveBlock: 11, adaptiveC: 2, closeIters: 1, cannyLow: 25, cannyHigh: 75, dilate: 1, claheClip: 2.5, useLabL: true  },
  // Pass 2: Lab-L aggressive for washed-out edges
  { label: 'lab-strong',   blur: 7, adaptiveBlock: 15, adaptiveC: 4, closeIters: 2, cannyLow: 15, cannyHigh: 55, dilate: 2, claheClip: 4.0, useLabL: true  },
  // Pass 3: Gray fallback with larger local threshold window
  { label: 'gray-wide',    blur: 5, adaptiveBlock: 19, adaptiveC: 3, closeIters: 2, cannyLow: 20, cannyHigh: 70, dilate: 2, claheClip: 2.0, useLabL: false },
  // Pass 4: High-contrast scenes where CLAHE can overboost noise
  { label: 'no-clahe',     blur: 3, adaptiveBlock: 11, adaptiveC: 2, closeIters: 1, cannyLow: 35, cannyHigh: 100, dilate: 1, claheClip: 0,   useLabL: true  },
  // Pass 5: Very soft edges, heavier blur and closing
  { label: 'soft-edge',    blur: 9, adaptiveBlock: 21, adaptiveC: 5, closeIters: 3, cannyLow: 10, cannyHigh: 45, dilate: 2, claheClip: 3.0, useLabL: true  },
];

const MIN_DOC_AREA_RATIO = 0.3;
const MAX_DOC_AREA_RATIO = 0.92;
const STABLE_CORNER_PX = 10;

type CvScalar = [number, number?, number?, number?];

interface CvSizeLike {
  width?: number;
  height?: number;
}

interface CvPointLike {
  x?: number;
  y?: number;
}

interface CvMatLike {
  rows?: number;
  data32S?: Int32Array | number[];
  copyTo: (dst: CvMatLike) => void;
  delete: () => void;
}

interface CvMatVectorLike {
  size: () => number;
  get: (index: number) => CvMatLike;
  delete: () => void;
}

interface CvClaheLike {
  apply: (src: CvMatLike, dst: CvMatLike) => void;
  delete: () => void;
}

interface OpenCvApi {
  imread: (src: HTMLCanvasElement) => CvMatLike;
  mean: (src: CvMatLike) => CvScalar;
  cvtColor: (src: CvMatLike, dst: CvMatLike, code: number) => void;
  split: (src: CvMatLike, dst: CvMatVectorLike) => void;
  adaptiveThreshold: (
    src: CvMatLike,
    dst: CvMatLike,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ) => void;
  morphologyEx: (
    src: CvMatLike,
    dst: CvMatLike,
    op: number,
    kernel: CvMatLike,
    anchor?: CvPointLike,
    iterations?: number,
  ) => void;
  GaussianBlur: (src: CvMatLike, dst: CvMatLike, ksize: CvSizeLike, sigmaX: number) => void;
  Canny: (src: CvMatLike, dst: CvMatLike, threshold1: number, threshold2: number) => void;
  getStructuringElement: (shape: number, ksize: CvSizeLike) => CvMatLike;
  dilate: (src: CvMatLike, dst: CvMatLike, kernel: CvMatLike, anchor?: CvPointLike, iterations?: number) => void;
  findContours: (
    image: CvMatLike,
    contours: CvMatVectorLike,
    hierarchy: CvMatLike,
    mode: number,
    method: number,
  ) => void;
  arcLength: (curve: CvMatLike, closed: boolean) => number;
  approxPolyDP: (curve: CvMatLike, approxCurve: CvMatLike, epsilon: number, closed: boolean) => void;
  contourArea: (contour: CvMatLike) => number;
  Mat: {
    new (): CvMatLike;
    ones: (rows: number, cols: number, type: number) => CvMatLike;
  };
  MatVector: {
    new (): CvMatVectorLike;
  };
  CLAHE: {
    new (clipLimit: number, tileGridSize: CvSizeLike): CvClaheLike;
  };
  Size: {
    new (width: number, height: number): CvSizeLike;
  };
  Point: {
    new (x: number, y: number): CvPointLike;
  };
  COLOR_RGBA2GRAY: number;
  COLOR_RGBA2RGB: number;
  COLOR_RGB2Lab: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY: number;
  MORPH_CLOSE: number;
  MORPH_RECT: number;
  RETR_EXTERNAL: number;
  CHAIN_APPROX_SIMPLE: number;
  CV_8U: number;
}

interface DetectionMeta {
  corners: CornerPoints;
  score: number;
  label: string;
}

function toOrderedCorners(rawPts: Array<{ x: number; y: number }>): CornerPoints {
  const sums = rawPts.map((p) => p.x + p.y);
  const diffs = rawPts.map((p) => p.x - p.y);

  const topLeftCorner = rawPts[sums.indexOf(Math.min(...sums))];
  const bottomRightCorner = rawPts[sums.indexOf(Math.max(...sums))];
  const topRightCorner = rawPts[diffs.indexOf(Math.max(...diffs))];
  const bottomLeftCorner = rawPts[diffs.indexOf(Math.min(...diffs))];

  return { topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner };
}

function averageCornerDistance(a: CornerPoints, b: CornerPoints): number {
  const sq = (v: number) => v * v;
  const d = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt(sq(p1.x - p2.x) + sq(p1.y - p2.y));

  return (
    d(a.topLeftCorner, b.topLeftCorner) +
    d(a.topRightCorner, b.topRightCorner) +
    d(a.bottomRightCorner, b.bottomRightCorner) +
    d(a.bottomLeftCorner, b.bottomLeftCorner)
  ) / 4;
}

function estimateLuma(cv: OpenCvApi, sourceCanvas: HTMLCanvasElement): number {
  let src: CvMatLike | null = null;
  let gray: CvMatLike | null = null;
  try {
    src = cv.imread(sourceCanvas);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    const mean = cv.mean(gray);
    return Number(mean?.[0] ?? 0);
  } catch {
    return 0;
  } finally {
    gray?.delete?.();
    src?.delete?.();
  }
}

function findBestQuadFromMask(
  cv: OpenCvApi,
  mask: CvMatLike,
  frameW: number,
  frameH: number,
): CornerPoints | null {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  let bestCorners: CornerPoints | null = null;
  let bestScore = -1;

  try {
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      try {
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows !== 4) continue;

        const area = Math.abs(cv.contourArea(approx));
        const areaRatio = area / (frameW * frameH);
        if (areaRatio < MIN_DOC_AREA_RATIO || areaRatio > MAX_DOC_AREA_RATIO) continue;

        const d = approx.data32S;
        if (!d || d.length < 8) continue;

        const rawPts = [
          { x: d[0], y: d[1] },
          { x: d[2], y: d[3] },
          { x: d[4], y: d[5] },
          { x: d[6], y: d[7] },
        ];

        const ordered = toOrderedCorners(rawPts);
        const normalised = normalizeCorners(ordered, frameW, frameH);
        const inset = insetCorners(normalised, frameW, frameH);
        const score = scoreBoundary(inset, frameW, frameH);
        if (score > bestScore) {
          bestScore = score;
          bestCorners = inset;
        }
      } finally {
        approx.delete();
        cnt.delete();
      }
    }

    return bestCorners;
  } finally {
    hierarchy.delete();
    contours.delete();
  }
}

// ─── Score a detected boundary: higher = better ──────────────────────────────
// Scoring heuristics:
//   1. Area — larger quadrilateral relative to frame is better
//   2. Rectangularity — how close the quad is to a rectangle (angle check)
//   3. Inset-compliance — penalize corners too close to any edge
function scoreBoundary(
  b: CornerPoints,
  frameW: number,
  frameH: number,
): number {
  const pts = [
    b.topLeftCorner,
    b.topRightCorner,
    b.bottomRightCorner,
    b.bottomLeftCorner,
  ];

  // Shoelace area
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  area = Math.abs(area) / 2;
  const frameArea = frameW * frameH;
  const areaRatio = area / frameArea; // 0..1

  // Penalise if area is suspiciously large (> 98% → likely detected the whole frame, not the doc)
  if (areaRatio > 0.98) return -1;
  // Penalise if too small
  if (areaRatio < 0.02) return -1;

  // Rectangularity: check interior angles are close to 90°
  let angleScore = 0;
  for (let i = 0; i < 4; i++) {
    const prev = pts[(i + 3) % 4];
    const curr = pts[i];
    const next = pts[(i + 1) % 4];
    const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const dot = v1x * v2x + v1y * v2y;
    const len = Math.sqrt((v1x * v1x + v1y * v1y) * (v2x * v2x + v2y * v2y));
    if (len === 0) continue;
    const cosA = clamp(dot / len, -1, 1);
    const angleDeg = (Math.acos(cosA) * 180) / Math.PI;
    // Perfect rect angle = 90°; penalise deviation
    const deviation = Math.abs(angleDeg - 90);
    angleScore += Math.max(0, 1 - deviation / 45); // 0 at 45° off, 1 at exactly 90°
  }
  angleScore /= 4; // 0..1

  // Inset penalty: count how many corners are too close to the frame boundary
  const minInsetX = frameW * EDGE_INSET_FRAC;
  const minInsetY = frameH * EDGE_INSET_FRAC;
  let edgePenalty = 0;
  for (const p of pts) {
    if (p.x < minInsetX || p.x > frameW - minInsetX ||
        p.y < minInsetY || p.y > frameH - minInsetY) {
      edgePenalty += 0.15;
    }
  }

  return areaRatio * 0.5 + angleScore * 0.5 - edgePenalty;
}

// ─── Inset corners so they're never on the frame boundary ────────────────────
function insetCorners(
  b: CornerPoints,
  frameW: number,
  frameH: number,
): CornerPoints {
  const minX = frameW * EDGE_INSET_FRAC;
  const minY = frameH * EDGE_INSET_FRAC;
  const maxX = frameW - minX;
  const maxY = frameH - minY;

  const inset = (p: { x: number; y: number }) => ({
    x: clamp(p.x, minX, maxX),
    y: clamp(p.y, minY, maxY),
  });

  return {
    topLeftCorner:     inset(b.topLeftCorner),
    topRightCorner:    inset(b.topRightCorner),
    bottomRightCorner: inset(b.bottomRightCorner),
    bottomLeftCorner:  inset(b.bottomLeftCorner),
  };
}

// ─── Fallback: smart default that covers 85% of the frame, centered ──────────
function centeredDefault(frameW: number, frameH: number): CornerPoints {
  const padX = frameW * 0.075;
  const padY = frameH * 0.075;
  return {
    topLeftCorner:     { x: padX,          y: padY          },
    topRightCorner:    { x: frameW - padX, y: padY          },
    bottomRightCorner: { x: frameW - padX, y: frameH - padY },
    bottomLeftCorner:  { x: padX,          y: frameH - padY },
  };
}

// ─── Run one preprocessing pass and attempt JScanify detection ───────────────
// Returns inset+scored CornerPoints or null if detection failed.
function runDetectionPass(
  cv: OpenCvApi,
  sourceCanvas: HTMLCanvasElement,
  cfg: PrepConfig,
  frameW: number,
  frameH: number,
): { corners: CornerPoints; score: number } | null {
  let src: CvMatLike | null = null;
  let processed: CvMatLike | null = null;
  let clahe: CvClaheLike | null = null;
  let closeKernel: CvMatLike | null = null;

  try {
    src = cv.imread(sourceCanvas);

    if (cfg.useLabL) {
      const rgb = new cv.Mat();
      const lab = new cv.Mat();
      const planes = new cv.MatVector();
      processed = new cv.Mat();
      cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
      cv.cvtColor(rgb, lab, cv.COLOR_RGB2Lab);
      cv.split(lab, planes);
      planes.get(0).copyTo(processed);
      planes.delete();
      lab.delete();
      rgb.delete();
    } else {
      processed = new cv.Mat();
      cv.cvtColor(src, processed, cv.COLOR_RGBA2GRAY);
    }

    // ── CLAHE adaptive contrast enhancement ──
    if (cfg.claheClip > 0) {
      const enhanced = new cv.Mat();
      clahe = new cv.CLAHE(cfg.claheClip, new cv.Size(8, 8));
      clahe.apply(processed, enhanced);
      processed.delete();
      processed = enhanced;
    }

    // ── Gaussian blur ──
    if (cfg.blur > 1) {
      const blurred = new cv.Mat();
      const ksize = new cv.Size(cfg.blur, cfg.blur);
      cv.GaussianBlur(processed, blurred, ksize, 0);
      processed.delete();
      processed = blurred;
    }

    // ── Adaptive threshold to separate paper from near-white background ──
    {
      const thresholded = new cv.Mat();
      const block = Math.max(3, cfg.adaptiveBlock | 1);
      cv.adaptiveThreshold(
        processed,
        thresholded,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        block,
        cfg.adaptiveC,
      );
      processed.delete();
      processed = thresholded;
    }

    // ── Morphological close to heal holes in the paper region ──
    closeKernel = cv.Mat.ones(5, 5, cv.CV_8U);
    {
      const closed = new cv.Mat();
      cv.morphologyEx(processed, closed, cv.MORPH_CLOSE, closeKernel, new cv.Point(-1, -1), cfg.closeIters);
      processed.delete();
      processed = closed;
    }

    // Optional edge refinement for weak boundaries
    if (cfg.cannyLow !== undefined && cfg.cannyHigh !== undefined) {
      const edges = new cv.Mat();
      cv.Canny(processed, edges, cfg.cannyLow, cfg.cannyHigh);
      processed.delete();
      processed = edges;
    }

    if ((cfg.dilate ?? 0) > 0) {
      const reconnectKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const dilated = new cv.Mat();
      cv.dilate(processed, dilated, reconnectKernel, new cv.Point(-1, -1), cfg.dilate ?? 0);
      reconnectKernel.delete();
      processed.delete();
      processed = dilated;
    }

    const detected = findBestQuadFromMask(cv, processed, frameW, frameH);
    if (!detected) return null;

    const score = scoreBoundary(detected, frameW, frameH);

    if (score < 0) return null;

    return { corners: detected, score };

  } catch {
    return null;
  } finally {
    src?.delete?.();
    processed?.delete?.();
    clahe?.delete?.();
    closeKernel?.delete?.();
  }
}

// ─── God-level multi-pass auto-detect ────────────────────────────────────────
// Tries every prep config, collects all valid candidates, returns the best scored one.
function multiPassDetect(
  sourceCanvas: HTMLCanvasElement,
  frameW: number,
  frameH: number,
  fallbackCorners?: CornerPoints,
): {
  corners: CornerPoints;
  confidence: 'high' | 'medium' | 'low';
  glareRisk: boolean;
} {
  const cv = getCv() as OpenCvApi | null;
  if (!cv?.imread) {
    return {
      corners: fallbackCorners ?? centeredDefault(frameW, frameH),
      confidence: 'low',
      glareRisk: false,
    };
  }

  const glareRisk = estimateLuma(cv, sourceCanvas) > 235;
  const candidates: DetectionMeta[] = [];

  for (const cfg of PREP_CONFIGS) {
    try {
      const result = runDetectionPass(cv, sourceCanvas, cfg, frameW, frameH);
      if (result && result.score > 0) {
        candidates.push({ ...result, label: cfg.label });
      }
    } catch {
      // Continue to next pass
    }
  }

  if (candidates.length === 0) {
    return {
      corners: fallbackCorners ?? centeredDefault(frameW, frameH),
      confidence: 'low',
      glareRisk,
    };
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Stability validation (frame-less equivalent): require multiple detection passes
  // to agree on corner coordinates within a 10px average tolerance.
  const stableMatches = candidates.filter(
    (c) => averageCornerDistance(c.corners, best.corners) <= STABLE_CORNER_PX,
  ).length;

  // Confidence based on quality + agreement
  let confidence: 'high' | 'medium' | 'low';
  if (stableMatches >= 3 && best.score > 0.6) {
    confidence = 'high';
  } else if (stableMatches >= 2 && best.score > 0.4) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { corners: best.corners, confidence, glareRisk };
}

function chooseBestBoundary(
  detected: CornerPoints,
  fallback: CornerPoints,
  frameW: number,
  frameH: number,
  confidence: 'high' | 'medium' | 'low',
): CornerPoints {
  const detectedScore = scoreBoundary(detected, frameW, frameH);
  const fallbackScore = scoreBoundary(fallback, frameW, frameH);

  // Do not replace a good incoming boundary with a weaker low-confidence result.
  if (confidence === 'low' && detectedScore < fallbackScore + 0.05) {
    return fallback;
  }

  // For medium/high confidence, still avoid regressions unless detection is at least comparable.
  if (detectedScore + 0.02 < fallbackScore) {
    return fallback;
  }

  return detected;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface CropEditorProps {
  frameSrc: string;
  frameW: number;
  frameH: number;
  sourceCanvas: HTMLCanvasElement;
  initialBoundary: CornerPoints;
  scanner: JScanify;
  onConfirm: (base64: string) => void;
  onRetake: () => void;
  confirmLabel?: string;
  retakeLabel?: string;
  title?: string;
}

const confidenceColor: Record<'high' | 'medium' | 'low', 'success' | 'warning' | 'danger'> = {
  high:   'success',
  medium: 'warning',
  low:    'danger',
};
const confidenceLabel: Record<'high' | 'medium' | 'low', string> = {
  high:   'High confidence',
  medium: 'Medium confidence',
  low:    'Low — adjust manually',
};

export const CropEditor: React.FC<CropEditorProps> = ({
  frameSrc, frameW, frameH, sourceCanvas, initialBoundary,
  scanner, onConfirm, onRetake,
  confirmLabel = 'Use This Image',
  retakeLabel  = 'Retake',
  title        = 'Adjust Document Crop',
}) => {
  const uid    = useId().replace(/:/g, '-');
  const maskId = `crop-mask-${uid}`;

  const svgRef       = useRef<SVGSVGElement>(null);
  const loupeRef     = useRef<HTMLCanvasElement>(null);
  const frameImgRef  = useRef<HTMLImageElement | null>(null);
  const isMountRef   = useRef(true);

  const [boundary,        setBoundary]        = useState<CornerPoints>(initialBoundary);
  const [dragging,        setDragging]        = useState<HandleKey | null>(null);
  const [loupePos,        setLoupePos]        = useState<{ clientX: number; clientY: number; flipLeft: boolean } | null>(null);
  const [extracted,       setExtracted]       = useState<string | null>(null);
  const [isAutoAdjusting, setIsAutoAdjusting] = useState(false);
  const [confidence,      setConfidence]      = useState<'high' | 'medium' | 'low' | null>(null);
  const [glareRisk,       setGlareRisk]       = useState(false);
  const didVibrateRef = useRef(false);

  // Pre-load frame image
  useEffect(() => {
    const img = new Image();
    const onLoad = () => { frameImgRef.current = img; };
    img.addEventListener('load', onLoad);
    img.src = frameSrc;
    return () => {
      img.removeEventListener('load', onLoad);
      frameImgRef.current = null;
    };
  }, [frameSrc]);

  // ── On mount: immediately run the god-level auto-detect ──────────────────
  useEffect(() => {
    setIsAutoAdjusting(true);
    // Yield one frame so React paints the loading state
    setTimeout(() => {
      try {
        const { corners, confidence: conf, glareRisk: glare } = multiPassDetect(
          sourceCanvas,
          frameW,
          frameH,
          initialBoundary,
        );
        const chosen = chooseBestBoundary(corners, initialBoundary, frameW, frameH, conf);
        setBoundary(chosen);
        setConfidence(conf);
        setGlareRisk(glare);
      } catch {
        setBoundary(initialBoundary);
        setConfidence('low');
        setGlareRisk(false);
      } finally {
        setIsAutoAdjusting(false);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — only run on mount

  // ── Preview extraction ────────────────────────────────────────────────────
  const genPreview = useCallback((c: CornerPoints) => {
    try {
      const { w, h } = exSize(c);
      if (w < 1 || h < 1) return;
      const out = scanner.extractPaper(sourceCanvas, w, h, c);
      if (!out) { setExtracted(null); return; }
      setExtracted(compressCanvas(out));
    } catch {
      setExtracted(null);
    }
  }, [scanner, sourceCanvas]);

  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;
      genPreview(boundary);
      return;
    }
    const t = setTimeout(() => genPreview(boundary), 80);
    return () => clearTimeout(t);
  }, [boundary, genPreview]);

  useEffect(() => {
    if (isAutoAdjusting) return;

    const hasValidDetection = confidence === 'high' || confidence === 'medium';
    if (!hasValidDetection) {
      didVibrateRef.current = false;
      return;
    }

    if (didVibrateRef.current) return;
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
      didVibrateRef.current = true;
    }
  }, [confidence, isAutoAdjusting]);

  // ── Corner dragging ───────────────────────────────────────────────────────
  const updatePt = useCallback((handle: HandleKey, cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    // Allow manual drag all the way to the very edge (no inset clamp here)
    setBoundary((b) => ({
      ...b,
      [handle]: {
        x: clamp(((cx - r.left) / r.width)  * frameW, 0, frameW),
        y: clamp(((cy - r.top)  / r.height) * frameH, 0, frameH),
      },
    }));
  }, [frameW, frameH]);

  // ── Loupe ─────────────────────────────────────────────────────────────────
  const renderLoupeFrame = useCallback((ix: number, iy: number) => {
    const loupe = loupeRef.current;
    const img   = frameImgRef.current;
    if (!loupe || !img) return;
    const ctx = loupe.getContext('2d');
    if (!ctx) return;
    const S = LOUPE_R * 2;
    if (loupe.width !== S)  loupe.width  = S;
    if (loupe.height !== S) loupe.height = S;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.arc(LOUPE_R, LOUPE_R, LOUPE_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, S, S);
    const zw = S / LOUPE_ZOOM, zh = S / LOUPE_ZOOM;
    ctx.drawImage(img, ix - zw / 2, iy - zh / 2, zw, zh, 0, 0, S, S);
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(LOUPE_R - 10, LOUPE_R); ctx.lineTo(LOUPE_R + 10, LOUPE_R); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(LOUPE_R, LOUPE_R - 10); ctx.lineTo(LOUPE_R, LOUPE_R + 10); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = CYAN;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(LOUPE_R, LOUPE_R, LOUPE_R - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  const drawLoupe = useCallback((svgClientX: number, svgClientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const ix = ((svgClientX - r.left) / r.width)  * frameW;
    const iy = ((svgClientY - r.top)  / r.height) * frameH;
    setLoupePos({ clientX: svgClientX, clientY: svgClientY, flipLeft: svgClientX > r.left + r.width * 0.7 });
    renderLoupeFrame(ix, iy);
  }, [frameW, frameH, renderLoupeFrame]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updatePt(dragging, e.clientX, e.clientY);
    drawLoupe(e.clientX, e.clientY);
  }, [dragging, updatePt, drawLoupe]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    setLoupePos(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (extracted) onConfirm(extracted.replace(/^data:image\/\w+;base64,/, ''));
  }, [extracted, onConfirm]);

  // ── Manual re-run of auto-adjust (button press) ───────────────────────────
  const handleAutoAdjust = useCallback(() => {
    setIsAutoAdjusting(true);
    setConfidence(null);
    setTimeout(() => {
      try {
        const { corners, confidence: conf, glareRisk: glare } = multiPassDetect(
          sourceCanvas,
          frameW,
          frameH,
          boundary,
        );
        const chosen = chooseBestBoundary(corners, boundary, frameW, frameH, conf);
        setBoundary(chosen);
        setConfidence(conf);
        setGlareRisk(glare);
      } catch {
        setConfidence('low');
        setGlareRisk(false);
      } finally {
        setIsAutoAdjusting(false);
      }
    }, 0);
  }, [sourceCanvas, frameW, frameH, boundary]);

  const handleSelectFull = useCallback(() => {
    setConfidence(null);
    setGlareRisk(false);
    setBoundary({
      topLeftCorner:     { x: 0,      y: 0      },
      topRightCorner:    { x: frameW, y: 0      },
      bottomRightCorner: { x: frameW, y: frameH },
      bottomLeftCorner:  { x: 0,      y: frameH },
    });
  }, [frameW, frameH]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-4">

      {/* Header */}
      {title ? (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            {confidence && !isAutoAdjusting && (
              <Chip
                color={confidenceColor[confidence]}
                size="sm"
                variant="flat"
              >
                {confidenceLabel[confidence]}
              </Chip>
            )}
            {glareRisk && !isAutoAdjusting && (
              <Chip color="danger" size="sm" variant="flat">
                Too much glare, move slightly
              </Chip>
            )}
            {isAutoAdjusting && (
              <Chip color="primary" size="sm" variant="flat">
                Detecting…
              </Chip>
            )}
            {!isAutoAdjusting && !confidence && (
              <Chip color="primary" size="sm" variant="flat">
                Drag corners to adjust
              </Chip>
            )}
          </div>
        </div>
      ) : null}

      {/* Two-column layout */}
      <div className="flex flex-col gap-4 lg:flex-row">

        {/* ── Corner editor ── */}
        <Card shadow="sm" className="flex-1 min-w-0">
          <CardHeader className="flex flex-col gap-2 pb-2">
            <div className="flex w-full items-center justify-between">
              <h3 className="text-sm font-medium">Adjust Corners</h3>
              <span className="text-xs text-default-500">
                Drag handles to align with document edges
              </span>
            </div>
            {confidence === 'low' && !isAutoAdjusting && (
              <span className="text-xs text-danger">
                Auto-crop is uncertain. Center the paper and reduce glare for a better snap.
              </span>
            )}
            <div className="flex w-full gap-2">
              <Tooltip
                content="Run multi-pass OpenCV detection across 5 preprocessing strategies and pick the best result"
                placement="bottom"
              >
                <Button
                  size="sm"
                  color="secondary"
                  variant="flat"
                  isLoading={isAutoAdjusting}
                  onPress={handleAutoAdjust}
                  className="flex-1"
                >
                  Auto Adjust
                </Button>
              </Tooltip>
              <Tooltip
                content="Select the entire image as the crop area"
                placement="bottom"
              >
                <Button
                  size="sm"
                  color="default"
                  variant="flat"
                  onPress={handleSelectFull}
                  isDisabled={isAutoAdjusting}
                  className="flex-1"
                >
                  Select Full Image
                </Button>
              </Tooltip>
            </div>
          </CardHeader>

          <CardBody className="p-0 overflow-visible">
            <div className="relative">
              <img
                src={frameSrc}
                alt="Captured document"
                className="block w-full h-auto rounded-b-large select-none"
                draggable={false}
              />
              <svg
                ref={svgRef}
                viewBox={`0 0 ${frameW} ${frameH}`}
                className="absolute inset-0 w-full h-full"
                style={{ cursor: dragging ? 'none' : 'default', touchAction: 'none' }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                <defs>
                  <mask id={maskId}>
                    <rect width="100%" height="100%" fill="white" />
                    <polygon points={polyPts(boundary)} fill="black" />
                  </mask>
                </defs>

                {/* Dim outside selection */}
                <rect
                  width="100%" height="100%"
                  fill="rgba(0,0,0,0.5)"
                  mask={`url(#${maskId})`}
                />
                {/* Selection polygon */}
                <polygon
                  points={polyPts(boundary)}
                  fill="rgba(0,111,238,0.12)"
                  stroke={CYAN}
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                {/* Corner handles */}
                {KEYS.map((k: HandleKey) => {
                  const p = boundary[k];
                  const onDown = (e: React.PointerEvent<SVGCircleElement>) => {
                    e.preventDefault();
                    (e.target as Element).setPointerCapture(e.pointerId);
                    setDragging(k);
                    setConfidence(null); // manual edit clears confidence badge
                    updatePt(k, e.clientX, e.clientY);
                    drawLoupe(e.clientX, e.clientY);
                  };
                  return (
                    <g key={String(k)}>
                      {/* Large invisible hit target */}
                      <circle cx={p.x} cy={p.y} r={44} fill="transparent" onPointerDown={onDown} />
                      {/* Handle ring */}
                      <circle
                        cx={p.x} cy={p.y} r={16}
                        fill="#0f172a"
                        stroke={CYAN}
                        strokeWidth={dragging === k ? 7 : 4.5}
                        style={{ cursor: 'grab', filter: `drop-shadow(0 0 8px ${CYAN})` }}
                        onPointerDown={onDown}
                      />
                      {/* Centre dot */}
                      <circle cx={p.x} cy={p.y} r={5} fill={CYAN} onPointerDown={onDown} />
                    </g>
                  );
                })}
              </svg>

              {/* Loupe magnifier */}
              {dragging && loupePos && (
                <div
                  style={{
                    position:      'fixed',
                    left: loupePos.flipLeft
                      ? loupePos.clientX - LOUPE_R * 2 - 24
                      : loupePos.clientX + LOUPE_R + 12,
                    top:           loupePos.clientY - LOUPE_R,
                    pointerEvents: 'none',
                    zIndex:        9999,
                  }}
                >
                  <canvas
                    ref={loupeRef}
                    className="rounded-full"
                    style={{ boxShadow: `0 0 0 2.5px ${CYAN}, 0 8px 32px rgba(0,0,0,0.7)` }}
                  />
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── Crop preview ── */}
        <Card shadow="sm" className="lg:w-60 flex-shrink-0">
          <CardHeader className="pb-1">
            <h3 className="text-sm font-medium">Crop Preview</h3>
          </CardHeader>
          <Divider />
          <CardBody className="flex items-center justify-center min-h-[180px]">
            {extracted ? (
              <img
                src={extracted}
                alt="Cropped document preview"
                className="max-w-full max-h-72 object-contain rounded-large border border-default-200 shadow-sm"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-default-400">
                <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Processing…</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button color="default" variant="flat" onPress={onRetake} isDisabled={isAutoAdjusting}>
          {retakeLabel}
        </Button>
        <Button
          color="primary"
          isDisabled={!extracted || isAutoAdjusting}
          onPress={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
};

export default CropEditor;