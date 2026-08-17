import jsPDF from "jspdf";
import type { CropArea, FilterType } from "./types";

declare const cv: any;

export const POLL_INTERVAL_MS = 2500;

export const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  );
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`;
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }

    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (typeof err.data === "string" && err.data.trim()) {
      return err.data;
    }

    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (err.status !== undefined) {
      return `Request failed with status ${String(err.status)}`;
    }
  }

  return fallback;
}

export class ImageProcessor {
  static toGrayscale(imageData: ImageData): ImageData {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
    }
    return imageData;
  }

  static adjustBrightnessContrast(
    imageData: ImageData,
    brightness: number,
    contrast: number,
  ): ImageData {
    const d = imageData.data;
    const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        d[i + j] = Math.min(
          255,
          Math.max(0, f * (d[i + j] - 128) + 128 + brightness),
        );
      }
    }
    return imageData;
  }

  static autoEnhance(imageData: ImageData): ImageData {
    const d = imageData.data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        min = Math.min(min, d[i + j]);
        max = Math.max(max, d[i + j]);
      }
    }
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < d.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          d[i + j] = ((d[i + j] - min) / range) * 255;
        }
      }
    }
    return imageData;
  }

  static sharpen(imageData: ImageData): ImageData {
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              sum +=
                data[((y + ky) * width + (x + kx)) * 4 + c] *
                kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          output[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
        }
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 4; c++) output[idx + c] = data[idx + c];
        }
      }
    }

    return new ImageData(output, width, height);
  }
}

export const rotateImage = (src: string, angle: number): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const c = document.createElement("canvas");
      c.width = img.width * cos + img.height * sin;
      c.height = img.width * sin + img.height * cos;

      const ctx = c.getContext("2d")!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

export const flipImage = (src: string, h: boolean, v: boolean): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;

      const ctx = c.getContext("2d")!;
      ctx.translate(h ? c.width : 0, v ? c.height : 0);
      ctx.scale(h ? -1 : 1, v ? -1 : 1);
      ctx.drawImage(img, 0, 0);

      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

export const cropImage = (src: string, area: CropArea): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = area.width;
      c.height = area.height;
      c.getContext("2d")!.drawImage(
        img,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        area.width,
        area.height,
      );
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

export const applyFilter = (
  src: string,
  filterType: FilterType,
): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, c.width, c.height);
      let processed: ImageData;

      switch (filterType) {
        case "grayscale":
          processed = ImageProcessor.toGrayscale(imageData);
          break;
        case "enhance":
          processed = ImageProcessor.autoEnhance(imageData);
          break;
        case "sharpen":
          processed = ImageProcessor.sharpen(imageData);
          break;
        case "bw":
          processed = ImageProcessor.toGrayscale(imageData);
          for (let i = 0; i < processed.data.length; i += 4) {
            const v = processed.data[i] > 150 ? 255 : 0;
            processed.data[i] =
              processed.data[i + 1] =
              processed.data[i + 2] =
                v;
          }
          break;
      }

      ctx.putImageData(processed, 0, 0);
      resolve(c.toDataURL("image/jpeg", 0.95));
    };
    img.src = src;
  });

export const autoDetectDocument = (imageSrc: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const src = cv.imread(canvas);
        const maxWidth = 1000;

        if (src.cols > maxWidth) {
          const scale = maxWidth / src.cols;
          cv.resize(src, src, new cv.Size(maxWidth, src.rows * scale));
        }

        const gray = new cv.Mat();
        const blur = new cv.Mat();
        const edges = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
        cv.Canny(blur, edges, 50, 150);

        const kernel = cv.getStructuringElement(
          cv.MORPH_RECT,
          new cv.Size(5, 5),
        );
        cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE,
        );

        let biggest = null;
        let maxArea = 0;

        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);
          if (area < 80000) continue;

          const peri = cv.arcLength(cnt, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, 0.04 * peri, true);

          if (approx.rows >= 4) {
            const rect = cv.boundingRect(cnt);
            const ratio = rect.width / rect.height;
            if (ratio > 0.5 && ratio < 2 && area > maxArea) {
              biggest = approx;
              maxArea = area;
            }
          }
        }

        if (biggest) {
          const pts: { x: number; y: number }[] = [];
          for (let i = 0; i < 4; i++) {
            pts.push({
              x: biggest.intPtr(i, 0)[0],
              y: biggest.intPtr(i, 0)[1],
            });
          }

          pts.sort((a, b) => a.y - b.y);
          const top = pts.slice(0, 2).sort((a, b) => a.x - b.x);
          const bottom = pts.slice(2, 4).sort((a, b) => a.x - b.x);
          const ordered = [top[0], top[1], bottom[1], bottom[0]];

          const w = Math.max(
            Math.hypot(
              ordered[1].x - ordered[0].x,
              ordered[1].y - ordered[0].y,
            ),
            Math.hypot(
              ordered[2].x - ordered[3].x,
              ordered[2].y - ordered[3].y,
            ),
          );

          const h = Math.max(
            Math.hypot(
              ordered[3].x - ordered[0].x,
              ordered[3].y - ordered[0].y,
            ),
            Math.hypot(
              ordered[2].x - ordered[1].x,
              ordered[2].y - ordered[1].y,
            ),
          );

          const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            ordered[0].x,
            ordered[0].y,
            ordered[1].x,
            ordered[1].y,
            ordered[2].x,
            ordered[2].y,
            ordered[3].x,
            ordered[3].y,
          ]);

          const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,
            w,
            0,
            w,
            h,
            0,
            h,
          ]);

          const M = cv.getPerspectiveTransform(srcTri, dstTri);
          const dst = new cv.Mat();
          cv.warpPerspective(src, dst, M, new cv.Size(w, h));
          cv.imshow(canvas, dst);

          dst.delete();
          srcTri.delete();
          dstTri.delete();
          M.delete();
        }

        src.delete();
        gray.delete();
        blur.delete();
        edges.delete();
      } catch (_e) {
        /* cv might not be loaded */
      }

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    img.src = imageSrc;
  });

export const multiImagesToPdf = async (
  images: string[],
  fileName: string,
): Promise<{ file: File; dataUrl: string }> => {
  const loadImg = (src: string): Promise<HTMLImageElement> =>
    new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = src;
    });

  const imgs = await Promise.all(images.map(loadImg));
  const first = imgs[0];

  const pdf = new jsPDF({
    orientation: first.width > first.height ? "landscape" : "portrait",
    unit: "px",
    format: [first.width, first.height],
  });

  for (let idx = 0; idx < imgs.length; idx++) {
    const img = imgs[idx];
    if (idx > 0) {
      pdf.addPage(
        [img.width, img.height],
        img.width > img.height ? "landscape" : "portrait",
      );
    }

    pdf.addImage(
      images[idx],
      "JPEG",
      0,
      0,
      img.width,
      img.height,
      undefined,
      "FAST",
    );
  }

  const pdfBlob = pdf.output("blob");
  const pdfDataUrl = pdf.output("datauristring");
  const pdfFile = new File([pdfBlob], `${fileName}.pdf`, {
    type: "application/pdf",
  });

  return { file: pdfFile, dataUrl: pdfDataUrl };
};
