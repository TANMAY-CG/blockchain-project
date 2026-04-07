import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

type Props = {
  onDetected: (productId: string) => void;
};

export function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reader = useMemo(() => new BrowserMultiFormatReader(), []);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
    };
  }, [reader]);

  async function start() {
    setError(null);
    setIsRunning(true);
    setCameraActive(false);

    try {
      if (!videoRef.current) throw new Error('Video element not ready');
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      // Ask permission first; otherwise many browsers return empty device lists.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (!videoRef.current) throw new Error('Video element not ready');
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();

      setCameraActive(true);
      controlsRef.current = await reader.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          const raw = result.getText().trim();
          if (raw) {
            onDetected(raw);
            stop();
          }
        } else if (err) {
          // ignore per-frame decode errors
        }
      });
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Camera permission denied'
          : e instanceof DOMException && e.name === 'NotFoundError'
            ? 'No camera found'
            : e instanceof Error
              ? e.message
              : 'Unable to start camera';
      setError(msg);
      setIsRunning(false);
      setCameraActive(false);
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRunning(false);
    setCameraActive(false);
  }

  return (
    <div className="scanner-wrap">
      <div className="scanner-actions">
        {!isRunning ? (
          <button type="button" className="btn-submit scanner-btn" onClick={start}>
            Start camera scan
          </button>
        ) : (
          <button type="button" className="btn-submit scanner-btn" onClick={stop}>
            Stop
          </button>
        )}
      </div>

      <div className="scanner-camera-box">
        {!cameraActive ? (
          <div className="scanner-placeholder">Camera preview will appear here</div>
        ) : null}
        <video ref={videoRef} className={`scanner-video ${cameraActive ? 'scanner-video--show' : 'scanner-video--hide'}`} muted playsInline />
      </div>

      {error ? <div className="scanner-error">{error}</div> : null}
    </div>
  );
}

