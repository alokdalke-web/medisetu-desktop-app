import type { ChangeEvent } from "react";

import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { Tab, Tabs } from "@heroui/tabs";
import { useState } from "react";

import type { CornerPoints } from "jscanify/client";
import { CropEditor } from "../../pages/prescription_notepad_scanner/CropEditor";
import DocumentScanner from "../../pages/prescription_notepad_scanner/DocumentScanner";
import type JScanify from "jscanify/client";

type ScannerDirectUploadCardProps = {
  directImageBase64: string;
  directImageUrl: string;
  onSelectDirectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onScannerCapture: (base64: string) => void;
  onImageUrlChange: (value: string) => void;
  onProcessNow: () => void;
  /** Crop editor props — provided when an image is ready for cropping */
  cropSession?: {
    frameSrc: string;
    frameW: number;
    frameH: number;
    sourceCanvas: HTMLCanvasElement;
    initialBoundary: CornerPoints;
    scanner: JScanify;
  } | null;
  onCropConfirm?: (base64: string) => void;
  onCropCancel?: () => void;
  /** True while OpenCV is still loading */
  cvLoading?: boolean;
};

export function ScannerDirectUploadCard({
  directImageBase64,
  directImageUrl,
  onSelectDirectFile,
  onScannerCapture,
  onImageUrlChange,
  onProcessNow,
  cropSession,
  onCropConfirm,
  onCropCancel,
  cvLoading,
}: ScannerDirectUploadCardProps) {
  const [isScanning, setIsScanning] = useState(false);

  return (
    <>
      <Card shadow="sm">
        <CardHeader className="flex flex-col items-start gap-1">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
              </svg>
            <h2 className="text-lg font-semibold">
              Upload Directly</h2>
            </div>
            {cvLoading && (
              <Chip size="sm" variant="flat" color="warning">
                Loading engine…
              </Chip>
            )}
          </div>
          <p className="text-sm text-default-500">
            Skip the phone and upload a prescription image right here.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Tabs
            aria-label="Direct scan input modes"
            color="primary"
            variant="underlined"
          >
            <Tab key="file" title="Image File">
              <div className="space-y-3 pt-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-default-600">
                    Camera capture
                  </label>
                  <Button
                    color="primary"
                    fullWidth
                    onPress={() => setIsScanning(true)}
                    variant="flat"
                  >
                    {directImageBase64 ? "Rescan Document" : "Open Document Scanner"}
                  </Button>
                </div>
                <div>
                  <label
                    className="mb-1 block text-xs font-medium text-default-600"
                    htmlFor="direct-upload"
                  >
                    Gallery / files
                  </label>
                  <input
                    accept="image/*"
                    className="block w-full cursor-pointer rounded-medium border border-default-200 bg-content1 px-3 py-2 text-sm file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                    id="direct-upload"
                    type="file"
                    onChange={onSelectDirectFile}
                  />
                  <p className="mt-1 text-xs text-default-400">
                    Opens the crop editor — adjust corners before processing.
                  </p>
                </div>
                {directImageBase64 && (
                  <div className="rounded-large border border-success-200 bg-success-50 p-2">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Chip size="sm" color="success" variant="flat">✓ Ready</Chip>
                    </div>
                    <img
                      alt="Selected preview"
                      className="max-h-40 w-full rounded-large border border-default-200 object-contain"
                      src={`data:image/jpeg;base64,${directImageBase64}`}
                    />
                  </div>
                )}
              </div>
            </Tab>

            <Tab key="url" title="Image URL">
              <div className="pt-3">
                <Input
                  label="Image URL"
                  placeholder="https://example.com/prescription.jpg"
                  value={directImageUrl}
                  variant="bordered"
                  onValueChange={onImageUrlChange}
                />
              </div>
            </Tab>
          </Tabs>

          <Divider />

          <Button
            color="primary"
            isDisabled={!directImageBase64 && !directImageUrl}
            onPress={onProcessNow}
          >
            Process Now
          </Button>
        </CardBody>
      </Card>

      <Modal
        isOpen={isScanning}
        onOpenChange={(open) => {
          if (!open) setIsScanning(false);
        }}
        size="5xl"
        scrollBehavior="inside"
        backdrop="blur"
        hideCloseButton
      >
        <ModalContent>
          <ModalBody className="pb-6 pt-4">
            <DocumentScanner
              onCapture={(base64) => {
                onScannerCapture(base64);
                setIsScanning(false);
              }}
              onCancel={() => setIsScanning(false)}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Crop editor — opens as a full-width Modal on desktop */}
      <Modal
        isOpen={Boolean(cropSession)}
        onOpenChange={(open) => { if (!open) onCropCancel?.(); }}
        size="5xl"
        scrollBehavior="inside"
        backdrop="blur"
        hideCloseButton
      >
        <ModalContent>
          <ModalHeader className="flex items-center justify-between">
            <span className="text-lg font-semibold">Adjust Document Crop</span>
            <Chip color="primary" variant="flat" size="sm">Drag corners to align</Chip>
          </ModalHeader>
          <ModalBody className="pb-6">
            {cropSession && (
              <CropEditor
                frameSrc={cropSession.frameSrc}
                frameW={cropSession.frameW}
                frameH={cropSession.frameH}
                sourceCanvas={cropSession.sourceCanvas}
                initialBoundary={cropSession.initialBoundary}
                scanner={cropSession.scanner}
                onConfirm={(base64) => { onCropConfirm?.(base64); }}
                onRetake={() => { onCropCancel?.(); }}
                confirmLabel="Use This Crop"
                retakeLabel="Cancel"
                title=""
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
