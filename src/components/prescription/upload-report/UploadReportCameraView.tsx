import { Button } from "@heroui/react";
import type React from "react";
import { FiCamera, FiRotateCw } from "react-icons/fi";
import Webcam from "react-webcam";

type UploadReportCameraViewProps = {
  webcamRef: React.RefObject<Webcam | null>;
  facingMode: "user" | "environment";
  setFacingMode: React.Dispatch<React.SetStateAction<"user" | "environment">>;
  goBack: () => void;
  capture: () => void;
};

const pillCancel =
  "h-12 px-10 rounded-full border border-emerald-700/60 text-emerald-800 bg-white";
const pillPrimary =
  "h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800";

const UploadReportCameraView = ({
  webcamRef,
  facingMode,
  setFacingMode,
  goBack,
  capture,
}: UploadReportCameraViewProps) => (
  <>
    <div className="mb-4 text-center">
      <h3 className="text-lg font-semibold text-slate-900">Take a Photo</h3>
      <p className="text-sm text-slate-500">
        Position the document within the frame
      </p>
    </div>

    <div className="relative overflow-hidden rounded-lg bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          width: 1280,
          height: 720,
          facingMode,
        }}
        className="w-full"
        mirrored={facingMode === "user"}
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg border-4 border-primary/50" />
    </div>

    <div className="mt-5 flex items-center justify-center gap-4">
      <Button radius="full" variant="bordered" className={pillCancel} onPress={goBack}>
        Back
      </Button>

      <Button
        isIconOnly
        radius="full"
        color="primary"
        variant="flat"
        onPress={() =>
          setFacingMode((p) => (p === "user" ? "environment" : "user"))
        }
      >
        <FiRotateCw />
      </Button>

      <Button
        radius="full"
        className={pillPrimary}
        onPress={capture}
        startContent={<FiCamera />}
      >
        Capture
      </Button>
    </div>
  </>
);

export default UploadReportCameraView;
