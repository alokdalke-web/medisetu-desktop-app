import { useEffect, useRef, useState } from 'react';
import type JScanify from 'jscanify/client';
import { getCv, type CvModule } from './scannerUtils';

type OpenCvModule = CvModule & {
  onRuntimeInitialized?: (() => void) | null;
};

type JScanifyConstructor = new () => JScanify;

type ScannerLibraries = {
  cv: OpenCvModule;
  JScanify: JScanifyConstructor;
};

let scannerLibrariesPromise: Promise<ScannerLibraries> | null = null;

const setGlobalCv = (module: CvModule) => {
  (window as Window & { cv?: CvModule }).cv = module;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Failed to load OpenCV engine.';
};

const normalizeOpenCvModule = (module: unknown): OpenCvModule => {
  const candidate = module as { default?: unknown };

  return (candidate.default ?? module) as OpenCvModule;
};

const normalizeJScanifyModule = (module: unknown): JScanifyConstructor => {
  const candidate = module as { default?: unknown };

  return (candidate.default ?? module) as JScanifyConstructor;
};

const loadScannerLibraries = () => {
  if (!scannerLibrariesPromise) {
    scannerLibrariesPromise = Promise.all([
      import('@techstark/opencv-js'),
      import('jscanify/client'),
    ])
      .then(([opencvModule, jscanifyModule]) => ({
        cv: normalizeOpenCvModule(opencvModule),
        JScanify: normalizeJScanifyModule(jscanifyModule),
      }))
      .catch((error) => {
        scannerLibrariesPromise = null;
        throw error;
      });
  }

  return scannerLibrariesPromise;
};

/** Loads OpenCV from npm package once and returns a stable JScanify instance ref. */
export function useOpenCV() {
  const scannerRef = useRef<JScanify | null>(null);
  const librariesRef = useRef<ScannerLibraries | null>(null);
  const [cvReady, setCvReady] = useState(() => Boolean(getCv()?.Mat));
  const [cvError, setCvError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntimeInitialized: (() => void) | undefined;

    const ensureScanner = (JScanifyConstructor: JScanifyConstructor) => {
      if (!scannerRef.current) {
        scannerRef.current = new JScanifyConstructor();
      }
    };

    const markReady = (
      opencv: OpenCvModule,
      JScanifyConstructor: JScanifyConstructor,
    ) => {
      if (cancelled) return;

      setGlobalCv(opencv);

      if (opencv.Mat) {
        setCvReady(true);
        setCvError(null);
        ensureScanner(JScanifyConstructor);
      }
    };

    void loadScannerLibraries()
      .then((libraries) => {
        if (cancelled) return;

        librariesRef.current = libraries;
        const opencv = libraries.cv;
        const JScanifyConstructor = libraries.JScanify;

        setGlobalCv(opencv);

        if (opencv.Mat) {
          markReady(opencv, JScanifyConstructor);

          return;
        }

        const previousOnRuntimeInitialized = opencv.onRuntimeInitialized;
        const onRuntimeInitialized = () => {
          previousOnRuntimeInitialized?.();
          markReady(opencv, JScanifyConstructor);
        };

        opencv.onRuntimeInitialized = onRuntimeInitialized;

        const poll = window.setInterval(() => {
          if (!cancelled && opencv.Mat) {
            markReady(opencv, JScanifyConstructor);
            window.clearInterval(poll);
          }
        }, 100);

        cleanupRuntimeInitialized = () => {
          window.clearInterval(poll);

          if (opencv.onRuntimeInitialized === onRuntimeInitialized) {
            opencv.onRuntimeInitialized = previousOnRuntimeInitialized;
          }
        };
      })
      .catch((error) => {
        if (cancelled) return;

        setCvReady(false);
        setCvError(getErrorMessage(error));
        console.error('Failed to load scanner libraries.', error);
      });

    return () => {
      cancelled = true;
      cleanupRuntimeInitialized?.();
    };
  }, []);

  useEffect(() => {
    if (cvReady && !scannerRef.current && librariesRef.current) {
      scannerRef.current = new librariesRef.current.JScanify();
    }
  }, [cvReady]);

  return { cvReady, cvError, scannerRef };
}
