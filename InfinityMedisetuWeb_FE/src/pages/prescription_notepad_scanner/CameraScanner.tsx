import React, { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@heroui/button';
import type JScanify from 'jscanify/client';
import { type CornerPoints } from 'jscanify/client';
import {
  LOCK_FRAMES, AUTO_MS, LOOP_MS,
  area, cornersStable, normalizeCorners, defCorners, getCv,
  getAverageLuma, getAdaptiveStroke,
} from './scannerUtils';

export interface CameraScannerProps {
  cvReady: boolean;
  cvError?: string | null;
  scannerRef: React.MutableRefObject<JScanify | null>;
  /** Called when a frame is captured and ready for cropping */
  onCaptured: (
    snap: HTMLCanvasElement,
    corners: CornerPoints,
    frameSrc: string,
  ) => void;
  onCancel: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  cvReady, cvError, scannerRef, onCaptured, onCancel,
}) => {
  const webcamRef  = useRef<Webcam>(null);
  const rawRef     = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stableRef  = useRef(0);
  const lastCRef   = useRef<CornerPoints | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef   = useRef(false); // prevent double-fire on auto-lock

  const [facing, setFacing]     = useState<'environment' | 'user'>('environment');
  const [camReady, setCamReady] = useState(false);
  const [camErr, setCamErr]     = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const doCapture = useCallback((detected?: CornerPoints) => {
    const raw = rawRef.current;
    if (!raw || !raw.width) return;
    const c = detected ?? lastCRef.current ?? defCorners(raw.width, raw.height);
    const snap = document.createElement('canvas');
    snap.width = raw.width; snap.height = raw.height;
    snap.getContext('2d')!.drawImage(raw, 0, 0);
    const frameSrc = raw.toDataURL('image/jpeg', 0.97);
    onCaptured(snap, c, frameSrc);
  }, [onCaptured]);

  // Detection loop
  useEffect(() => {
    if (!cvReady) return;
    const id = setInterval(() => {
      const scanner = scannerRef.current;
      const video = webcamRef.current?.video;
      const raw = rawRef.current, overlay = overlayRef.current;
      if (!scanner || !video || !raw || !overlay || !video.videoWidth) return;

      const [W, H] = [video.videoWidth, video.videoHeight];
      [raw, overlay].forEach((c) => {
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      });
      const rawCtx = raw.getContext('2d')!;
      const oc = overlay.getContext('2d')!;
      rawCtx.drawImage(video, 0, 0, W, H);
      oc.drawImage(video, 0, 0, W, H);
      oc.fillStyle = 'rgba(0,0,0,0.45)';
      oc.fillRect(0, 0, W, H);

      let corners: CornerPoints | null = null;
      let mat: unknown = null;
      let contour: unknown = null;
      try {
        const cv = getCv();
        if (!cv?.imread) return;
        mat = cv.imread(raw);
        contour = scanner.findPaperContour(mat as Parameters<typeof scanner.findPaperContour>[0]);
        if (contour) {
          corners = normalizeCorners(
            scanner.getCornerPoints(
              contour as Parameters<typeof scanner.getCornerPoints>[0],
              mat as Parameters<typeof scanner.getCornerPoints>[1],
            ),
            W, H,
          );
        }
      } catch {
        corners = null;
      } finally {
        (contour as { delete?: () => void } | null)?.delete?.();
        (mat as { delete?: () => void } | null)?.delete?.();
      }

      if (!corners || area(corners) < W * H * 0.10) {
        stableRef.current = 0; lastCRef.current = corners; setProgress(0); return;
      }
      stableRef.current = lastCRef.current && cornersStable(corners, lastCRef.current)
        ? Math.min(stableRef.current + 1, LOCK_FRAMES) : 0;
      lastCRef.current = corners;
      const prog = stableRef.current / LOCK_FRAMES;
      setProgress(prog);

      const locked = prog >= 1;
      const avgLuma = getAverageLuma(rawCtx, W, H);
      const strokeColor = getAdaptiveStroke(avgLuma);
      const pts = [corners.topLeftCorner, corners.topRightCorner, corners.bottomRightCorner, corners.bottomLeftCorner];

      // Cutout + brighten inside
      oc.save(); oc.globalCompositeOperation = 'destination-out';
      oc.beginPath(); pts.forEach((p, i) => i ? oc.lineTo(p.x, p.y) : oc.moveTo(p.x, p.y)); oc.closePath(); oc.fill(); oc.restore();
      oc.save(); oc.beginPath(); pts.forEach((p, i) => i ? oc.lineTo(p.x, p.y) : oc.moveTo(p.x, p.y)); oc.closePath(); oc.clip(); oc.drawImage(video, 0, 0, W, H); oc.restore();

      // Outer stroke keeps boundary visible in high-glare scenes.
      oc.save(); oc.strokeStyle = 'black'; oc.globalAlpha = 0.6; oc.lineWidth = locked ? 8 : 6; oc.lineJoin = 'round';
      oc.beginPath(); pts.forEach((p, i) => i ? oc.lineTo(p.x, p.y) : oc.moveTo(p.x, p.y)); oc.closePath(); oc.stroke(); oc.restore();

      // Inner adaptive stroke preserves contrast across bright/dark backgrounds.
      oc.save(); oc.strokeStyle = strokeColor; oc.globalAlpha = 1; oc.lineWidth = locked ? 4 : 3; oc.lineJoin = 'round'; oc.shadowColor = strokeColor; oc.shadowBlur = locked ? 18 : 10;
      oc.beginPath(); pts.forEach((p, i) => i ? oc.lineTo(p.x, p.y) : oc.moveTo(p.x, p.y)); oc.closePath(); oc.stroke(); oc.restore();

      // Dual-layer corner markers for reliable visibility on white paper.
      pts.forEach((p) => {
        oc.save(); oc.strokeStyle = 'black'; oc.globalAlpha = 0.6; oc.lineWidth = 6;
        oc.beginPath(); oc.arc(p.x, p.y, 7, 0, Math.PI * 2); oc.stroke(); oc.restore();

        oc.save(); oc.fillStyle = strokeColor; oc.shadowColor = strokeColor; oc.shadowBlur = 12;
        oc.beginPath(); oc.arc(p.x, p.y, 5, 0, Math.PI * 2); oc.fill(); oc.restore();
      });

      if (locked && !firedRef.current) {
        firedRef.current = true;
        setIsLocked(true);
        timerRef.current = setTimeout(() => doCapture(corners!), AUTO_MS);
      }
    }, LOOP_MS);

    return () => {
      clearInterval(id);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [cvReady, scannerRef, doCapture]);

  const manualCapture = () => {
    const v = webcamRef.current?.video, raw = rawRef.current;
    if (!v || !raw || !v.videoWidth) return;
    raw.width = v.videoWidth; raw.height = v.videoHeight;
    raw.getContext('2d')!.drawImage(v, 0, 0);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    doCapture();
  };

  const resetLock = () => {
    firedRef.current = false;
    setIsLocked(false);
    setProgress(0);
    stableRef.current = 0;
    lastCRef.current = null;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const statusText = camErr ? 'CAMERA ERROR'
    : cvError ? 'ENGINE ERROR'
    : !camReady ? 'AWAITING CAMERA'
    : !cvReady ? 'LOADING ENGINE'
    : isLocked ? 'LOCKED — CAPTURING'
    : progress > 0.5 ? 'STABILISING…'
    : 'SEARCHING';

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Viewfinder */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-[3/4] md:aspect-video shadow-lg">
        <Webcam
          audio={false}
          key={facing}
          mirrored={facing === 'user'}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          onUserMedia={() => { setCamReady(true); setCamErr(null); }}
          onUserMediaError={(e) => { setCamReady(false); setCamErr(typeof e === 'string' ? e : e.message); }}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          videoConstraints={{ facingMode: { ideal: facing } }}
        />
        <canvas ref={overlayRef} className="block w-full h-full object-cover" />
        {progress > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-cyan-400 transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        )}
        {progress === 0 && camReady && cvReady && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="text-xs tracking-widest text-white whitespace-nowrap">
                POINT AT A FLAT DOCUMENT
              </span>
            </div>
          </div>
        )}
        {/* Floating status badge */}
        <div className={`absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full border backdrop-blur-md transition-all ${
          isLocked
            ? 'border-primary text-primary bg-primary/20'
            : 'border-white/20 text-white bg-black/80'
        }`}>
          {statusText}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-default-500">
          {camErr ?? (cvError
            ? `OpenCV engine failed to load: ${cvError}`
            : !camReady
            ? 'Waiting for camera…'
            : !cvReady
            ? 'Loading OpenCV engine…'
            : isLocked
            ? 'Locked. Auto-capturing…'
            : 'Auto-capture on stable document.')}
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button
            color="default" variant="flat" size="sm"
            onPress={() => setFacing((m) => m === 'environment' ? 'user' : 'environment')}
          >
            Flip Camera
          </Button>
          {isLocked ? (
            <>
              <Button color="default" variant="flat" size="sm" onPress={resetLock}>Reset</Button>
              <Button
                color="primary" size="sm"
                onPress={() => {
                  if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
                  doCapture();
                }}
              >
                Proceed
              </Button>
            </>
          ) : (
            <Button
              color="primary" size="sm"
              isDisabled={!camReady || !cvReady || Boolean(cvError)}
              onPress={manualCapture}
            >
              Capture
            </Button>
          )}
          <Button color="danger" variant="light" size="sm" onPress={onCancel}>Cancel</Button>
        </div>
      </div>

      <canvas ref={rawRef} style={{ display: 'none' }} />
    </div>
  );
};

export default CameraScanner;
