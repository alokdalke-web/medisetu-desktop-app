const MAX_OUTPUT_BYTES = 80 * 1024;
const DIMENSION_STEPS = [640, 560, 480, 420, 360, 320, 280, 240];
const QUALITY_STEPS = [0.5, 0.4, 0.32, 0.25, 0.2, 0.16, 0.12, 0.1];

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function toCompressedBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  for (const maxDim of DIMENSION_STEPS) {
    const ratio = Math.min(1, maxDim / Math.max(originalWidth, originalHeight));
    const width = Math.round(originalWidth * ratio);
    const height = Math.round(originalHeight * ratio);

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      throw new Error("Canvas is not supported in this browser.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");

      if (estimateBase64Bytes(base64) <= MAX_OUTPUT_BYTES) {
        bitmap.close();

        return base64;
      }
    }
  }

  const canvas = document.createElement("canvas");

  canvas.width = 200;
  canvas.height = Math.max(1, Math.round((originalHeight / originalWidth) * 200));

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Canvas is not supported in this browser.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.08);

  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}
