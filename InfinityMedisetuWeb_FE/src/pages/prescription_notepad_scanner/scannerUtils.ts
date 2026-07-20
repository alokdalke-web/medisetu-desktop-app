import { type CornerPoints, type Point } from 'jscanify/client';

export type HandleKey = keyof CornerPoints;
export type { CornerPoints, Point };

export const KEYS: HandleKey[] = [
  'topLeftCorner',
  'topRightCorner',
  'bottomRightCorner',
  'bottomLeftCorner',
];

export const LOCK_FRAMES = 6;
export const LOCK_THRESH = 28;
export const AUTO_MS = 1400;
export const LOOP_MS = 80;
export const CYAN = '#22d3ee';
export const DARK_STROKE = '#0f172a';
export const LIGHT_STROKE = '#22d3ee';

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

export const dist = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const defCorners = (w: number, h: number): CornerPoints => {
  const ix = w * 0.12, iy = h * 0.12;
  return {
    topLeftCorner: { x: ix, y: iy },
    topRightCorner: { x: w - ix, y: iy },
    bottomRightCorner: { x: w - ix, y: h - iy },
    bottomLeftCorner: { x: ix, y: h - iy },
  };
};

export const normalizeCorners = (
  raw: Partial<CornerPoints> | null | undefined,
  w: number,
  h: number,
): CornerPoints => {
  const fb = defCorners(w, h);
  const fix = (p: Partial<Point> | undefined, d: Point): Point =>
    typeof p?.x === 'number' && typeof p.y === 'number'
      ? { x: clamp(p.x, 0, w), y: clamp(p.y, 0, h) }
      : d;
  return {
    topLeftCorner: fix(raw?.topLeftCorner, fb.topLeftCorner),
    topRightCorner: fix(raw?.topRightCorner, fb.topRightCorner),
    bottomRightCorner: fix(raw?.bottomRightCorner, fb.bottomRightCorner),
    bottomLeftCorner: fix(raw?.bottomLeftCorner, fb.bottomLeftCorner),
  };
};

export const exSize = (c: CornerPoints) => ({
  w: Math.max(
    1,
    Math.round(
      (dist(c.topLeftCorner, c.topRightCorner) +
        dist(c.bottomLeftCorner, c.bottomRightCorner)) /
        2,
    ),
  ),
  h: Math.max(
    1,
    Math.round(
      (dist(c.topLeftCorner, c.bottomLeftCorner) +
        dist(c.topRightCorner, c.bottomRightCorner)) /
        2,
    ),
  ),
});

export const polyPts = (c: CornerPoints) =>
  [c.topLeftCorner, c.topRightCorner, c.bottomRightCorner, c.bottomLeftCorner]
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

export const area = (c: CornerPoints) => {
  const p = [
    c.topLeftCorner,
    c.topRightCorner,
    c.bottomRightCorner,
    c.bottomLeftCorner,
  ];
  return (
    Math.abs(
      p.reduce((s, pt, i) => {
        const j = (i + 1) % 4;
        return s + pt.x * p[j].y - p[j].x * pt.y;
      }, 0),
    ) / 2
  );
};

export const cornersStable = (a: CornerPoints, b: CornerPoints) =>
  KEYS.every((k) => dist(a[k], b[k]) < LOCK_THRESH);

export const getLuma = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

export const getAverageLuma = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) => {
  try {
    const data = ctx.getImageData(w / 2, h / 2, 1, 1).data;
    return getLuma(data[0], data[1], data[2]);
  } catch {
    return 128;
  }
};

export const getAdaptiveStroke = (luma: number) =>
  luma > 180 ? DARK_STROKE : LIGHT_STROKE;

export type CvModule = {
  Mat?: unknown;
  imread: (src: HTMLCanvasElement) => { delete?: () => void };
};

export const getCv = (): CvModule | undefined =>
  (window as Window & { cv?: CvModule }).cv;
