"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, AlertTriangle, Activity } from "lucide-react";
import type {
  Detection,
  DetectionHistoryItem,
} from "@/components/detection-results";

const API_ENDPOINT = "https://ml.nekowave.fun/detect";
const INFERENCE_INTERVAL_MS = 66;

const CLASS_COLORS: Record<string, string> = {
  Belt: "#22d3ee",
  Necktie: "#a78bfa",
  Shoes: "#34d399",
  Missing_Necktie: "#f87171",
  Missing_shoes: "#fb923c",
  Belt_Missing: "#f43f5e",
  boy: "#00B7EB",
  girl: "#FF00FF",
  shirt: "#8622FF",
  Missing_shirt: "#FF8000",
  Missing_trousers: "#a0522d",
  Trousers: "#0000FF",
};
function getClassColor(cls: string) {
  return CLASS_COLORS[cls] ?? "#facc15";
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  scaleX: number,
  scaleY: number,
) {
  detections.forEach((det) => {
    const [x1, y1, x2, y2] = det.box;
    const sx1 = x1 * scaleX;
    const sy1 = y1 * scaleY;
    const sw = (x2 - x1) * scaleX;
    const sh = (y2 - y1) * scaleY;
    const color = getClassColor(det.class);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx1, sy1, sw, sh);

    const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
    ctx.font = "bold 13px 'Geist', sans-serif";
    const textW = ctx.measureText(label).width;
    const labelH = 20;
    const labelY = sy1 > labelH + 4 ? sy1 - labelH - 4 : sy1 + 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(sx1, labelY, textW + 10, labelH, 4);
    ctx.fill();

    ctx.fillStyle = "#0a0a0a";
    ctx.fillText(label, sx1 + 5, labelY + 14);
  });
}

interface WebcamDetectorProps {
  onDetectionComplete: (item: DetectionHistoryItem) => void;
}

export function WebcamDetector({ onDetectionComplete }: WebcamDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastInferenceRef = useRef<number>(0);
  const inferringRef = useRef(false);
  const lastSnapshotRef = useRef<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [inferencing, setInferencing] = useState(false);
  const fpsCounterRef = useRef({ frames: 0, last: performance.now() });

  // Draw overlay on every animation frame
  // The canvas pixel dimensions are kept equal to the video's native resolution so
  // bounding-box coordinates (which come from the original frame) map 1:1 with no
  // manual scaling needed.  CSS "width:100%;height:100%" then lets the browser
  // scale the canvas visually to fill the container.
  const drawOverlay = useCallback((currentDetections: Detection[]) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;

    const { videoWidth, videoHeight } = video;
    if (videoWidth === 0 || videoHeight === 0) return;

    // Only resize when the native resolution actually changes (avoids thrashing)
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // scaleX/scaleY = 1 because we draw in the video's native pixel space
    drawDetections(ctx, currentDetections, 1, 1);

    // FPS counter
    const now = performance.now();
    fpsCounterRef.current.frames++;
    const elapsed = now - fpsCounterRef.current.last;
    if (elapsed >= 500) {
      setFps(Math.round((fpsCounterRef.current.frames / elapsed) * 1000));
      fpsCounterRef.current = { frames: 0, last: now };
    }
  }, []);

  const sendFrame = useCallback(
    async (imageSrc: string) => {
      inferringRef.current = true;
      setInferencing(true);
      try {
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(API_ENDPOINT, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error(`API ${response.status}`);

        const data = await response.json();
        const dets: Detection[] = data.detections ?? [];
        setDetections(dets);

        onDetectionComplete({
          id: `webcam-rt-${Date.now()}`,
          timestamp: new Date(),
          detections: dets,
          imageSrc,
          source: "webcam",
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Detection API unreachable. Ensure backend is running at http://localhost:8000.",
        );
      } finally {
        inferringRef.current = false;
        setInferencing(false);
      }
    },
    [onDetectionComplete],
  );

  // Main render loop
  const startRenderLoop = useCallback(
    (currentDetections: React.MutableRefObject<Detection[]>) => {
      const loop = () => {
        const video = videoRef.current;
        if (!video) return;

        drawOverlay(currentDetections.current);

        const now = performance.now();

        if (
          !inferringRef.current &&
          now - lastInferenceRef.current >= INFERENCE_INTERVAL_MS
        ) {
          lastInferenceRef.current = now;

          const capture = document.createElement("canvas");
          capture.width = video.videoWidth;
          capture.height = video.videoHeight;

          const ctx = capture.getContext("2d");

          if (ctx && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0);

            capture.toBlob(
              async (blob) => {
                if (!blob) return;

                inferringRef.current = true;

                const formData = new FormData();
                formData.append("file", blob, "frame.jpg");

                try {
                  const res = await fetch(API_ENDPOINT, {
                    method: "POST",
                    body: formData,
                  });

                  const data = await res.json();

                  currentDetections.current = data.detections;
                } catch (err) {
                  console.error("Detection error", err);
                }

                inferringRef.current = false;
              },
              "image/jpeg",
              0.8,
            );
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    },
    [drawOverlay],
  );

  // Keep a ref to latest detections so the render loop always uses fresh data
  const detectionsRef = useRef<Detection[]>([]);
  useEffect(() => {
    detectionsRef.current = detections;
  }, [detections]);

  const handleStartCamera = useCallback(async () => {
    setError(null);
    setDetections([]);
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          fpsCounterRef.current = { frames: 0, last: performance.now() };
          startRenderLoop(detectionsRef);
        };
      }
    } catch {
      setError(
        "Camera access denied. Please allow camera permissions and try again.",
      );
      setCameraActive(false);
    }
  }, [startRenderLoop]);

  const handleStopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    inferringRef.current = false;
    setCameraActive(false);
    setDetections([]);
    setInferencing(false);
    setFps(0);

    // Clear overlay
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!cameraActive ? (
          <Button
            onClick={handleStartCamera}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
          >
            <Camera className="size-4" />
            Start Live Detection
          </Button>
        ) : (
          <Button
            onClick={handleStopCamera}
            variant="secondary"
            className="gap-2"
          >
            <CameraOff className="size-4" />
            Stop Camera
          </Button>
        )}

        {cameraActive && (
          <div className="flex items-center gap-2 ml-auto">
            {inferencing && (
              <Badge
                variant="outline"
                className="gap-1.5 border-primary/40 text-primary text-xs"
              >
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                Inferencing
              </Badge>
            )}
            <Badge
              variant="outline"
              className="gap-1.5 border-border text-muted-foreground text-xs"
            >
              <Activity className="size-3" />
              {fps} fps
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 border-border text-muted-foreground text-xs"
            >
              {detections.length} detection{detections.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert className="border-orange-500/40 bg-orange-500/10">
          <AlertTriangle className="size-4 text-orange-400" />
          <AlertDescription className="text-orange-300 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Video + overlay */}
      <Card className="bg-muted/30 border-border overflow-hidden">
        <CardContent className="p-0">
          {cameraActive ? (
            <div className="relative w-full aspect-video">
              {/* Raw video feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              {/* Transparent canvas overlay for bounding boxes */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {/* Corner brackets */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
              {/* Live badge */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-foreground">
                  LIVE
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center aspect-video gap-4 text-muted-foreground">
              <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Camera className="size-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Camera Inactive</p>
                <p className="text-xs opacity-60">
                  Press &quot;Start Live Detection&quot; to begin real-time
                  analysis
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detection summary strip */}
      {cameraActive && detections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detections.map((det, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs gap-1.5"
              style={{
                borderColor: `${getClassColor(det.class)}55`,
                color: getClassColor(det.class),
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: getClassColor(det.class) }}
              />
              {det.class} &mdash; {(det.confidence * 100).toFixed(0)}%
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
