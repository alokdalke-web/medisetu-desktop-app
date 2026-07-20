import React, { useState } from 'react';
import { type CornerPoints } from 'jscanify/client';
import { useOpenCV } from './useOpenCV';
import { CameraScanner } from './CameraScanner';
import { CropEditor } from './CropEditor';

type Phase = 'scanning' | 'cropping';

interface CapturedState {
  snap: HTMLCanvasElement;
  corners: CornerPoints;
  frameSrc: string;
}

export interface DocumentScannerProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ onCapture, onCancel }) => {
  const { cvReady, cvError, scannerRef } = useOpenCV();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [captured, setCaptured] = useState<CapturedState | null>(null);

  const handleCaptured = (
    snap: HTMLCanvasElement,
    corners: CornerPoints,
    frameSrc: string,
  ) => {
    setCaptured({ snap, corners, frameSrc });
    setPhase('cropping');
  };

  const handleRetake = () => {
    setCaptured(null);
    setPhase('scanning');
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col pb-6">
      <div className="w-full flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Document Scanner</h2>
        {phase === 'scanning' && (
          <span className="text-xs text-default-500">
            {cvError ? 'Engine failed' : !cvReady ? 'Loading engine…' : 'Ready'}
          </span>
        )}
        {phase === 'cropping' && (
          <span className="text-xs px-2 py-1 rounded-full border border-primary text-primary bg-primary/10">
            ADJUST CORNERS
          </span>
        )}
      </div>

      {phase === 'scanning' && (
        <CameraScanner
          cvReady={cvReady}
          cvError={cvError}
          scannerRef={scannerRef}
          onCaptured={handleCaptured}
          onCancel={onCancel}
        />
      )}

      {phase === 'cropping' && captured && scannerRef.current && (
        <CropEditor
          frameSrc={captured.frameSrc}
          frameW={captured.snap.width}
          frameH={captured.snap.height}
          sourceCanvas={captured.snap}
          initialBoundary={captured.corners}
          scanner={scannerRef.current}
          onConfirm={onCapture}
          onRetake={handleRetake}
        />
      )}

      {/* Edge case: scanner not yet ready when cropping phase entered */}
      {phase === 'cropping' && captured && !scannerRef.current && (
        <p className="text-sm text-default-500 text-center py-10">
          {cvError
            ? `OpenCV engine failed to load: ${cvError}`
            : 'Waiting for OpenCV engine…'}
        </p>
      )}
    </div>
  );
};

export default DocumentScanner;
