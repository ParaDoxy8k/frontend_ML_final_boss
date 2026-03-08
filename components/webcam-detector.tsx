"use client"

import Webcam from "react-webcam"
import { useRef, useState, useEffect,useCallback } from "react"
import { Camera, CameraOff, ScanLine, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"

interface Detection {
  class: string
  confidence: number
  box: number[]
}

export default function WebcamDetector() {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [detections, setDetections] = useState<Detection[]>([])
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartCamera = useCallback(() => {
    setRunning(true)
    setError(null)
    setDetections([])
  }, [])

  const handleStopCamera = useCallback(() => {
    setRunning(false)
  }, [])

  const detectFrame = async () => {
    try {
      if (!webcamRef.current) return
      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) return

      const blob = await (await fetch(imageSrc)).blob()

      const formData = new FormData()
      formData.append("file", blob)

      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData
      })

      const data = await res.json()

      setDetections(data.detections)
      drawBoxes(data.detections)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to connect to the detection API. Make sure the backend is running at http://localhost:8000."
        )
      } finally {
        setLoading(false)
      }
    }
    

  const drawBoxes = (detections: Detection[]) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")

    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = "red"
    ctx.lineWidth = 2
    ctx.font = "16px Arial"

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box

      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      ctx.fillText(
        `${det.class} ${det.confidence.toFixed(2)}`,
        x1,
        y1 - 5
      )
    })
  }

  useEffect(() => {
    let interval: any

    if (running) {
      interval = setInterval(() => {
        detectFrame()
      }, 500)
    }

    return () => clearInterval(interval)
  }, [running])

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <Button
            onClick={handleStartCamera}
            className="gap-2 bg-primary text-primary-foreground hover:opacity-90"
          >
            <Camera className="size-4" />
            Start Detection
          </Button>
        ) : (
          <>
            <Button
              onClick={handleStopCamera}
              variant="secondary"
              className="gap-2"
            >
              <CameraOff className="size-4" />
              Stop Camera
            </Button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert className="border-orange-500/40 bg-orange-500/10">
          <AlertTriangle className="size-4 text-orange-400" />
          <AlertDescription className="text-orange-300 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera / Preview area */}
      <Card className="bg-muted/30 border-border overflow-hidden">
        <CardContent className="p-0 relative">
          {running  && (
            <div className="relative w-full aspect-video">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
                onUserMediaError={() =>
                  setError(
                    "Camera access denied. Please allow camera permissions and try again."
                  )
                }
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 top-1/2 h-px bg-primary/50 animate-pulse" />
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 text-foreground">
                    <Spinner className="size-8 text-primary" />
                    <span className="text-sm font-medium">Analyzing frame...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {!running && (
            <div className="flex flex-col items-center justify-center aspect-video gap-4 text-muted-foreground">
              <div className="size-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Camera className="size-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Camera Inactive</p>
                <p className="text-xs opacity-60">Press &quot;Start Detection&quot; to begin</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
      /> */}

      {/* <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute top-0 left-0"
      /> */}

      {/* <button
        onClick={() => setRunning(!running)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {running ? "Stop Detection" : "Start Detection"}
      </button> */}
    </div>
  )
}