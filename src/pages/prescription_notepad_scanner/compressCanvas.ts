const MAX_B64_BYTES = 80 * 1024;
const DIM_STEPS = [1280, 960, 800, 640, 480, 400, 320];
const Q_STEPS = [0.82, 0.7, 0.58, 0.46, 0.36, 0.28, 0.2, 0.14, 0.1];

function b64Bytes(b64: string): number {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

/** Compress a canvas to a JPEG data-URL within 80 KB. */
export function compressCanvas(src: HTMLCanvasElement): string {
  const ow = src.width, oh = src.height;
  for (const maxDim of DIM_STEPS) {
    const ratio = Math.min(1, maxDim / Math.max(ow, oh));
    const w = Math.round(ow * ratio), h = Math.round(oh * ratio);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(src, 0, 0, w, h);
    for (const q of Q_STEPS) {
      const dataUrl = c.toDataURL('image/jpeg', q);
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      if (b64Bytes(b64) <= MAX_B64_BYTES) return dataUrl;
    }
  }
  // Last resort: 200px wide
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = Math.max(1, Math.round((oh / ow) * 200));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.08);
}

/** Load a File into an offscreen canvas at native resolution. */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(c);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
