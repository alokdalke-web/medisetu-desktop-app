import { Chip } from "@heroui/chip";

import type { ScanInputPayload } from "../../types/prescription-scanner";

type PayloadPreviewProps = {
  payload: ScanInputPayload;
};

/** Payload preview shown after upload or direct input. */
export function ScannerPayloadPreview({ payload }: PayloadPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm text-default-600">
        <Chip color={payload.imageBase64 ? "success" : "default"} size="sm" variant="flat">
          Image File: {payload.imageBase64 ? "✓" : "—"}
        </Chip>
        <Chip color={payload.imageUrl ? "success" : "default"} size="sm" variant="flat">
          Image URL: {payload.imageUrl ? "✓" : "—"}
        </Chip>
      </div>

      {payload.imageBase64 && (
        <img
          alt="Prescription preview"
          className="max-h-72 rounded-large border border-default-200 bg-default-50 p-2 object-contain"
          src={`data:image/*;base64,${payload.imageBase64}`}
        />
      )}
      {!payload.imageBase64 && payload.imageUrl && (
        <img
          alt="Prescription from URL"
          className="max-h-72 rounded-large border border-default-200 bg-default-50 p-2 object-contain"
          src={payload.imageUrl}
        />
      )}
    </div>
  );
}
